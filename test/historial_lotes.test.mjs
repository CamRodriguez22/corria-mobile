import test from 'node:test';
import assert from 'node:assert/strict';
import { cargarHistorialCompleto } from '../src/logic.js';
import { agruparLotes } from '../src/galeria.js';

const med = (n, dia, extra = {}) => ({ id_medicion: `m${n}`, timestamp: `${dia}T15:00:00Z`, area_corroida_pct: '5', ...extra });
const dia = (n) => `2026-11-${String(n).padStart(2, '0')}`;

// Servidor falso: `todas` más recientes primero; respeta limit y hasta (día UTC, inclusivo) y marca truncado con rango.
function servidor(todas) {
  const llamadas = [];
  const pedir = async (limit, params = {}) => {
    llamadas.push({ limit, ...params });
    let l = [...todas].sort((a, z) => (a.timestamp < z.timestamp ? 1 : -1));
    if (params.hasta) l = l.filter((m) => m.timestamp.slice(0, 10) <= params.hasta);
    const truncado = l.length > limit;
    return params.hasta ? { mediciones: l.slice(0, limit), truncado } : { mediciones: l.slice(0, limit) };
  };
  return { pedir, llamadas };
}

test('una sola página: termina completo sin pedir más', async () => {
  const s = servidor([med(1, dia(1)), med(2, dia(2))]);
  const r = await cargarHistorialCompleto(s.pedir, { limite: 10 });
  assert.equal(r.completo, true);
  assert.equal(r.lista.length, 2);
  assert.equal(s.llamadas.length, 1);
});

test('pagina con `hasta` hasta traer todo, sin duplicar y de la más reciente a la más antigua', async () => {
  const todas = Array.from({ length: 25 }, (_, i) => med(i + 1, dia(i + 1)));
  const s = servidor(todas);
  const progreso = [];
  const r = await cargarHistorialCompleto(s.pedir, { limite: 10, onProgreso: (l) => progreso.push(l.length) });
  assert.equal(r.completo, true);
  assert.equal(r.lista.length, 25);
  assert.equal(new Set(r.lista.map((m) => m.id_medicion)).size, 25);
  assert.equal(r.lista[0].id_medicion, 'm25');
  assert.ok(s.llamadas.length > 1);
  assert.equal(s.llamadas[0].hasta, undefined);
  assert.ok(s.llamadas.slice(1).every((c) => c.hasta));
  assert.deepEqual(progreso, [...progreso].sort((a, b) => a - b)); // crece sin retroceder
  assert.equal(progreso.at(-1), 25);
});

test('un lote grande queda completo tras paginar (conteo y fotos)', async () => {
  const lote = Array.from({ length: 22 }, (_, i) => med(i + 1, dia(1 + (i % 20)), { lote_id: 'L1', lote_nombre: 'YOLO' }));
  const otras = Array.from({ length: 6 }, (_, i) => med(100 + i, dia(21 + i)));
  const s = servidor([...lote, ...otras]);
  const r = await cargarHistorialCompleto(s.pedir, { limite: 10 });
  assert.equal(r.completo, true);
  const { lotes } = agruparLotes(r.lista);
  assert.equal(lotes.find((l) => l.id === 'L1').items.length, 22);
});

test('sin avance (misma página repetida) corta en vez de repetir sin fin', async () => {
  const fijas = [med(1, dia(5)), med(2, dia(5))];
  let n = 0;
  const pedir = async () => (n++, { mediciones: fijas, truncado: true });
  const r = await cargarHistorialCompleto(pedir, { limite: 2, maxPaginas: 20 });
  assert.equal(r.lista.length, 2);
  assert.ok(n <= 3, `pidió ${n} veces`);
  assert.equal(r.completo, true);
});

test('maxPaginas limita las consultas y devuelve completo: false', async () => {
  let n = 0;
  const pedir = async () => ({ mediciones: [med(++n, dia(Math.max(1, 28 - n)))], truncado: true });
  const r = await cargarHistorialCompleto(pedir, { limite: 1, maxPaginas: 3 });
  assert.equal(r.completo, false);
  assert.equal(n, 3);
});

test('un error conserva lo ya traído y lo informa', async () => {
  let n = 0;
  const pedir = async () => {
    if (n++ === 1) throw new Error('Sin conexión con el servidor.');
    return { mediciones: [med(1, dia(9)), med(2, dia(8))] , truncado: true };
  };
  const r = await cargarHistorialCompleto(pedir, { limite: 2 });
  assert.equal(r.completo, false);
  assert.equal(r.lista.length, 2);
  assert.equal(r.error.message, 'Sin conexión con el servidor.');
});

test('si la sesión cambió (vigente false) corta sin más llamadas', async () => {
  const s = servidor(Array.from({ length: 25 }, (_, i) => med(i + 1, dia(i + 1))));
  let vivo = true;
  const r = await cargarHistorialCompleto(async (l, p) => { const x = await s.pedir(l, p); vivo = false; return x; }, { limite: 10, vigente: () => vivo });
  assert.equal(r.cancelado, true);
  assert.equal(r.completo, false);
  assert.equal(s.llamadas.length, 1);
});

test('transformar se aplica a cada página', async () => {
  const s = servidor([med(1, dia(1))]);
  const r = await cargarHistorialCompleto(s.pedir, { limite: 5, transformar: (l) => l.map((m) => ({ ...m, marca: true })) });
  assert.equal(r.lista[0].marca, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BLOQUES,
  DEMO_SUB,
  generarMediciones,
  listarRecientes,
  obtenerMedicion,
  renombrar,
  renombrarLoteEnStore,
  eliminar,
  nuevaMedicion,
  calcularIndicadores,
  fotoDeUri,
  diaLocal,
} from '../src/demo/datos.js';
import { nivelDePct } from '../src/niveles.js';

const AHORA = Date.parse('2026-11-07T15:00:00Z');
const BASE = 'http://localhost:3006';
const datos = () => generarMediciones(AHORA, BASE);

test('genera ~60 mediciones deterministas con los 4 niveles y niveles coherentes con el %', () => {
  const a = datos();
  assert.deepEqual(a, datos());
  assert.ok(a.length >= 55 && a.length <= 70, `total ${a.length}`);
  assert.deepEqual([...new Set(a.map((m) => m.nivel_corrosion))].sort(), [0, 1, 2, 3]);
  for (const m of a) assert.equal(m.nivel_corrosion, nivelDePct(m.area_corroida_pct));
  assert.equal(new Set(a.map((m) => m.id_medicion)).size, a.length);
});

test('hay lotes de 3 a 8 fotos, fotos sueltas y mediciones de otros usuarios', () => {
  const a = datos();
  const lotes = {};
  a.filter((m) => m.lote_id).forEach((m) => (lotes[m.lote_id] = (lotes[m.lote_id] || 0) + 1));
  const tam = Object.values(lotes);
  assert.ok(tam.length >= 5);
  assert.ok(tam.every((n) => n >= 3 && n <= 8));
  assert.ok(a.some((m) => !m.lote_id));
  assert.ok(a.some((m) => m.tomado_por_id !== DEMO_SUB));
  assert.ok(a.some((m) => m.tomado_por_id === DEMO_SUB));
});

test('abarca ~4 meses, nada en el futuro y todas en puntos del catálogo', () => {
  const a = datos();
  const ids = new Set(BLOQUES.map((b) => b.id_bloque));
  const t = a.map((m) => Date.parse(m.timestamp));
  assert.ok(Math.max(...t) <= AHORA);
  assert.ok((AHORA - Math.min(...t)) / 86400000 > 90);
  assert.ok(a.every((m) => ids.has(m.id_punto)));
});

test('listarRecientes: orden, límite, truncado y sin campos pesados', () => {
  const r = listarRecientes(datos(), { limit: 10 });
  assert.equal(r.mediciones.length, 10);
  assert.equal(r.truncado, true);
  assert.equal(r.total, 10);
  assert.ok(r.mediciones.every((m) => !('detecciones' in m) && !('clima' in m) && !('mascaras' in m)));
  const ts = r.mediciones.map((m) => m.timestamp);
  assert.deepEqual(ts, [...ts].sort().reverse());
  assert.equal(listarRecientes(datos(), { limit: 1000 }).truncado, false);
});

test('listarRecientes: desde/hasta filtran por día local (UTC-5)', () => {
  const a = datos();
  const hasta = diaLocal(a[20].timestamp);
  const r = listarRecientes(a, { limit: 1000, hasta });
  assert.ok(r.mediciones.every((m) => diaLocal(m.timestamp) <= hasta));
  assert.ok(r.mediciones.length < a.length);
  const desde = diaLocal(a[5].timestamp);
  const r2 = listarRecientes(a, { limit: 1000, desde });
  assert.ok(r2.mediciones.every((m) => diaLocal(m.timestamp) >= desde));
});

test('obtenerMedicion conserva detecciones y clima', () => {
  const a = datos();
  const m = a.find((x) => x.nivel_corrosion > 0);
  const [full] = obtenerMedicion(a, m.id_punto, m.id_medicion);
  assert.ok(Array.isArray(full.detecciones));
  assert.ok(full.clima.temperatura_c != null);
  assert.deepEqual(obtenerMedicion(a, 'otro', m.id_medicion), []);
});

test('renombrar, renombrar lote y eliminar mutan como el backend', () => {
  const a = datos();
  assert.ok(renombrar(a, a[0].id_medicion, 'Nuevo'));
  assert.equal(a[0].nombre, 'Nuevo');
  assert.equal(renombrar(a, 'MED-no-existe', 'x'), false);
  const lote = a.filter((m) => m.lote_id === a.find((x) => x.lote_id).lote_id);
  const r = renombrarLoteEnStore(a, lote.map((m) => ({ id_punto: m.id_punto, id_medicion: m.id_medicion })), 'Lote X');
  assert.equal(r.renombradas, lote.length);
  assert.ok(lote.every((m) => m.lote_nombre === 'Lote X'));
  const b = eliminar(a, a[3].id_medicion);
  assert.equal(b.length, a.length - 1);
});

test('nuevaMedicion usa la forma del POST /medicion y el nivel correcto', () => {
  const foto = fotoDeUri('http://localhost:3006/foto01.jpg');
  assert.equal(foto.n, 1);
  const m = nuevaMedicion({ ahoraMs: AHORA, base: BASE, bloque: BLOQUES[0], foto, loteId: 'lote_1', loteNombre: 'L', idMed: 'MED-x' });
  assert.equal(typeof m.area_corroida_pct, 'number');
  assert.equal(m.nivel_corrosion, nivelDePct(foto.pct));
  assert.equal(m.id_punto, BLOQUES[0].id_bloque);
  assert.equal(m.tomado_por_id, DEMO_SUB);
  assert.equal(m.url_thumbnail, `${BASE}/thumb01.jpg`);
  assert.equal(fotoDeUri('file:///x.png'), null);
});

test('calcularIndicadores cuenta puntos, niveles y mediciones de 30 días', () => {
  const a = datos();
  const i = calcularIndicadores(a, BLOQUES, AHORA);
  assert.equal(i.total_puntos, BLOQUES.length);
  assert.equal(i.por_nivel.reduce((s, n) => s + n, 0) + i.sin_mediciones, BLOQUES.length);
  const hoy = diaLocal(new Date(AHORA).toISOString());
  const corte = diaLocal(new Date(Date.parse(hoy + 'T12:00:00Z') - 29 * 86400000).toISOString());
  assert.equal(i.mediciones_30d, a.filter((m) => diaLocal(m.timestamp) >= corte).length);
});

// ───────── historial por punto y resumen diario (F2/F3) ─────────
import { listarPorPunto, resumenDiario } from '../src/demo/datos.js';

test('listarPorPunto replica el handler: sin rango límite 50 y sin truncado; con rango trae truncado', () => {
  const a = datos();
  const punto = BLOQUES[0].id_bloque;
  const todas = a.filter((m) => m.id_punto === punto);
  const r = listarPorPunto(a, punto, {});
  assert.equal(r.id_punto, punto);
  assert.equal(r.total, Math.min(50, todas.length));
  assert.equal('truncado' in r, false);
  assert.ok(r.mediciones.every((m) => !('detecciones' in m) && !('clima' in m)));
  assert.ok(r.mediciones.every((m, i, arr) => i === 0 || arr[i - 1].timestamp >= m.timestamp));

  const corta = listarPorPunto(a, punto, { limite: 3, desde: '2026-01-01' });
  assert.equal(corta.mediciones.length, 3);
  assert.equal(corta.truncado, todas.length > 3);
  const hasta = listarPorPunto(a, punto, { hasta: '2026-09-30' });
  assert.ok(hasta.mediciones.every((m) => diaLocal(m.timestamp) <= '2026-09-30'));
  assert.equal(hasta.truncado, false);
  assert.deepEqual(listarPorPunto(a, 'NO-EXISTE', {}).mediciones, []);
});

test('resumenDiario agrega por día local UTC-5 con la forma del backend', () => {
  const a = datos();
  const r = resumenDiario(a, 2026);
  assert.equal(r.anio, 2026);
  assert.equal(r.id_punto, null);
  assert.equal(r.truncado, false);
  assert.equal(r.totales.imagenes, a.length);
  assert.equal(r.dias.reduce((s, d) => s + d.total, 0), a.length);
  const fechas = r.dias.map((d) => d.fecha);
  assert.deepEqual(fechas, [...fechas].sort());
  for (const d of r.dias) {
    assert.equal(d.por_nivel.reduce((x, y) => x + y, 0), d.total);
    assert.equal(d.peor_nivel, Math.max(...d.por_nivel.map((n, i) => (n ? i : -1))));
    assert.ok(d.max_pct >= d.promedio_pct);
    assert.ok(d.min_pct <= d.promedio_pct); // min_pct existe en el handler real (api_mediciones)
    assert.ok(d.nivel_ponderado >= 0 && d.nivel_ponderado <= 3);
    assert.deepEqual(Object.keys(d).sort(), ['fecha', 'lotes', 'max_pct', 'min_pct', 'nivel_ponderado', 'nivel_promedio', 'peor_nivel', 'por_nivel', 'promedio_pct', 'total']);
  }
  const unPunto = resumenDiario(a, 2026, BLOQUES[1].id_bloque);
  assert.equal(unPunto.id_punto, BLOQUES[1].id_bloque);
  assert.equal(unPunto.totales.imagenes, a.filter((m) => m.id_punto === BLOQUES[1].id_bloque).length);
  assert.equal(resumenDiario(a, 2025).dias.length, 0);
});

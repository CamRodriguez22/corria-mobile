import test from 'node:test';
import assert from 'node:assert/strict';
import { resumenDePunto, filaDePunto, filasDePuntos, totalFotosPuntos } from '../src/puntos.js';

const med = (id, ts, pct) => ({ id_medicion: id, timestamp: ts, area_corroida_pct: String(pct) });
const dia = (fecha, total, promedio_pct, peor_nivel = 1) => ({ fecha, total, promedio_pct, peor_nivel });
const ok = (dias, truncado = false) => ({ estado: 'ok', dias, truncado });

test('resumenDePunto suma las fotos y toma el promedio del día más reciente con fotos', () => {
  const r = resumenDePunto([dia('2026-11-01', 3, 2), dia('2026-11-05', 4, 12), dia('2026-11-06', 0, null)]);
  assert.deepEqual(r, { fotos: 7, dia: '2026-11-05', promedio: 12, nivel: 2 });
});

test('resumenDePunto: sin días con fotos devuelve null; sin promedio usa el peor nivel', () => {
  assert.equal(resumenDePunto([]), null);
  assert.equal(resumenDePunto(undefined), null);
  assert.equal(resumenDePunto([dia('2026-11-01', 0, null)]), null);
  assert.deepEqual(resumenDePunto([dia('2026-11-01', 2, null, 3)]), { fotos: 2, dia: '2026-11-01', promedio: null, nivel: 3 });
});

test('filaDePunto usa el servidor cuando todos los años llegaron y no hay truncado', () => {
  const items = [med('a', '2026-11-05T15:00:00Z', 30)];
  const f = filaDePunto({ clave: 'P1', nombre: 'Punto A', items, resumenes: [ok([dia('2026-11-05', 9, 30, 3)])] });
  assert.equal(f.fuente, 'servidor');
  assert.equal(f.fotos, 9);
  assert.equal(f.estado.nivel, 3);
});

test('filaDePunto cae a las fotos cargadas si falta un año, hay error o truncado', () => {
  const items = [med('a', '2026-11-05T15:00:00Z', 5), med('b', '2026-11-04T15:00:00Z', 1)];
  for (const resumenes of [[], [ok([dia('2026-11-05', 9, 5)]), undefined], [{ estado: 'cargando', dias: [] }], [ok([dia('2026-11-05', 9, 5)], true)]]) {
    const f = filaDePunto({ clave: 'P1', nombre: 'A', items, resumenes });
    assert.equal(f.fuente, 'local');
    assert.equal(f.fotos, 2);
    assert.equal(f.estado.dia, '2026-11-05');
  }
});

test('filaDePunto: un punto sin fotos queda con estado null y 0 fotos', () => {
  assert.equal(filaDePunto({ clave: 'P1', nombre: 'A', items: [], resumenes: [ok([])] }).fotos, 0);
  const f = filaDePunto({ clave: 'P1', nombre: 'A' });
  assert.equal(f.estado, null);
  assert.equal(f.fotos, 0);
});

test('filaDePunto no muestra menos fotos que las que ya están a la vista', () => {
  const items = [med('a', '2026-11-05T15:00:00Z', 5), med('b', '2026-11-04T15:00:00Z', 1)];
  const f = filaDePunto({ clave: 'P1', nombre: 'A', items, resumenes: [ok([dia('2026-11-05', 1, 5)])] });
  assert.equal(f.fuente, 'local');
  assert.equal(f.fotos, 2);
});

test('filasDePuntos ordena del más grave al menos grave y deja sin fotos al final; total de fotos', () => {
  const a = filaDePunto({ clave: 'A', nombre: 'A', items: [], resumenes: [] });
  const b = filaDePunto({ clave: 'B', nombre: 'B', items: [med('1', '2026-11-05T15:00:00Z', 2)] });
  const c = filaDePunto({ clave: 'C', nombre: 'C', items: [med('2', '2026-11-05T15:00:00Z', 40), med('3', '2026-11-05T16:00:00Z', 30)] });
  const orden = filasDePuntos([a, b, c]);
  assert.deepEqual(orden.map((x) => x.clave), ['C', 'B', 'A']);
  assert.equal(totalFotosPuntos(orden), 3);
});

import { chipsDePuntos, puntoDeTendencia } from '../src/puntos.js';
import { estadoPunto } from '../src/galeria.js';

const grupo = (clave, nombre, items) => ({ clave, bloque: { nombre }, items, estado: estadoPunto(items) });

test('chipsDePuntos: del más grave al menos grave, sin fotos al final, sin "Fotos sin punto", con nombre de punto', () => {
  const grupos = [
    grupo('A', 'Bloque A · Cubierta', []),
    grupo('B', 'Bloque B · Fachada', [med('1', '2026-11-05T15:00:00Z', 2)]),
    grupo('SIN_BLOQUE', 'Sin punto', [med('9', '2026-11-05T15:00:00Z', 90)]),
    grupo('C', 'Bloque C · Puente', [med('2', '2026-11-05T15:00:00Z', 40)]),
  ];
  const chips = chipsDePuntos(grupos);
  assert.deepEqual(chips.map((c) => c.clave), ['C', 'B', 'A']);
  assert.deepEqual(chips.map((c) => c.nivel), [3, 1, null]);
  assert.equal(chips[0].nombre, 'Punto C · Puente');
  assert.deepEqual(chipsDePuntos([]), []);
});

test('puntoDeTendencia: el elegido, si no el de atención, si no el primero; null sin puntos', () => {
  const claves = ['C', 'B', 'A'];
  assert.equal(puntoDeTendencia('B', 'C', claves), 'B');
  assert.equal(puntoDeTendencia(null, 'A', claves), 'A');
  assert.equal(puntoDeTendencia('Z', 'Y', claves), 'C'); // elegido y atención ya no existen
  assert.equal(puntoDeTendencia(null, undefined, claves), 'C');
  assert.equal(puntoDeTendencia('B', 'C', []), null);
});

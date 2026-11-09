import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTexto, coincideTexto, camposNombre, fechaValida, rangoPersonalizado } from '../src/filtroFotos.js';
import { filtrarMediciones, FILTROS_VACIOS, hayFiltros, rangoEfectivo, aplicarFiltrosADias } from '../src/linea.js';

const HOY = '2026-11-09';
const m = (id, ts, pct, extra = {}) => ({ id_medicion: id, id_punto: 'P1', timestamp: ts, area_corroida_pct: String(pct), ...extra });
const fotos = [
  m('a', '2026-11-08T15:00:00Z', 30, { nombre: 'Unión soldada', lote_nombre: 'Inspección semana 1' }),
  m('b', '2026-11-01T15:00:00Z', 12, { nombre: 'Viga 4B' }),
  m('c', '2026-10-05T15:00:00Z', 0, { lote_nombre: 'Inspección semana 1' }),
  m('d', '2026-10-20T15:00:00Z', 3, { bloque_nombre: 'Bloque C · Puente peatonal' }),
];
const ids = (f, opc = {}) => filtrarMediciones(fotos, { ...FILTROS_VACIOS, ...f }, { hoy: HOY, ...opc }).map((x) => x.id_medicion);

test('normalizarTexto quita tildes, mayúsculas y espacios repetidos', () => {
  assert.equal(normalizarTexto('  Unión   SOLDADA '), 'union soldada');
  assert.equal(normalizarTexto(null), '');
});

test('coincideTexto: todas las palabras, en cualquier orden y campo; vacío coincide', () => {
  assert.equal(coincideTexto('', ['x']), true);
  assert.equal(coincideTexto('   ', []), true);
  assert.equal(coincideTexto('soldada union', ['Unión soldada']), true);
  assert.equal(coincideTexto('viga puente', ['Viga 4B', 'Punto C · Puente']), true);
  assert.equal(coincideTexto('viga zzz', ['Viga 4B']), false);
  assert.equal(coincideTexto('abc', [null, undefined]), false);
});

test('camposNombre incluye foto, lote y punto', () => {
  assert.deepEqual(camposNombre({ nombre: 'a', lote_nombre: 'b', bloque_nombre: 'c' }).filter(Boolean), ['a', 'b', 'c']);
  assert.deepEqual(camposNombre().filter(Boolean), []);
});

test('fechaValida y rangoPersonalizado', () => {
  assert.equal(fechaValida('2026-02-28'), true);
  assert.equal(fechaValida('2026-02-30'), false);
  assert.equal(fechaValida('2026-13-01'), false);
  assert.equal(fechaValida('26-1-1'), false);
  assert.equal(fechaValida(undefined), false);
  assert.deepEqual(rangoPersonalizado('2026-11-05', '2026-11-01'), { desde: '2026-11-01', hasta: '2026-11-05' }); // al revés: se intercambian
  assert.deepEqual(rangoPersonalizado('2026-11-05', ''), { desde: '2026-11-05' });
  assert.deepEqual(rangoPersonalizado('basura', '2026-11-05'), { hasta: '2026-11-05' });
  assert.deepEqual(rangoPersonalizado('', 'x'), {});
});

test('filtrarMediciones por nombre de foto, de lote y de punto', () => {
  assert.deepEqual(ids({ texto: 'viga' }), ['b']);
  assert.deepEqual(ids({ texto: 'UNION' }), ['a']);
  assert.deepEqual(ids({ texto: 'semana' }), ['a', 'c']);
  assert.deepEqual(ids({ texto: 'puente' }), ['d']);
  assert.deepEqual(ids({ texto: 'Punto A' }, { nombresExtra: () => 'Punto A · Cubierta' }), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids({ texto: 'cubierta viga' }, { nombresExtra: () => 'Punto A · Cubierta' }), ['b']);
  assert.deepEqual(ids({ texto: 'nada que ver' }), []);
});

test('filtrarMediciones por rango propio de fechas (inclusive) y por niveles', () => {
  assert.deepEqual(ids({ preset: 'personalizado', desde: '2026-10-20', hasta: '2026-11-01' }), ['b', 'd']);
  assert.deepEqual(ids({ preset: 'personalizado', desde: '2026-11-01' }), ['a', 'b']);
  assert.deepEqual(ids({ preset: 'personalizado', hasta: '2026-10-20' }), ['c', 'd']);
  assert.deepEqual(ids({ preset: 'personalizado', desde: 'mal', hasta: '' }), ['a', 'b', 'c', 'd']); // sin fechas válidas: no limita
  assert.deepEqual(ids({ niveles: [3] }), ['a']);
  assert.deepEqual(ids({ niveles: [0, 1] }), ['c', 'd']);
});

test('los filtros se combinan (nombre + nivel + fechas)', () => {
  assert.deepEqual(ids({ texto: 'semana', niveles: [3] }), ['a']);
  assert.deepEqual(ids({ texto: 'semana', preset: 'personalizado', desde: '2026-10-01', hasta: '2026-10-31' }), ['c']);
  assert.deepEqual(ids({ texto: 'semana', niveles: [2] }), []);
});

test('un día elegido manda sobre el rango propio', () => {
  assert.deepEqual(rangoEfectivo({ ...FILTROS_VACIOS, dia: '2026-11-08', preset: 'personalizado', desde: '2026-01-01' }, HOY), { desde: '2026-11-08', hasta: '2026-11-08' });
  assert.deepEqual(ids({ dia: '2026-11-08', preset: 'personalizado', desde: '2026-01-01' }), ['a']);
});

test('hayFiltros reconoce texto y rango propio, pero no un rango propio vacío o inválido', () => {
  assert.equal(hayFiltros(FILTROS_VACIOS), false);
  assert.equal(hayFiltros({ ...FILTROS_VACIOS, texto: '  ' }), false);
  assert.equal(hayFiltros({ ...FILTROS_VACIOS, texto: 'viga' }), true);
  assert.equal(hayFiltros({ ...FILTROS_VACIOS, preset: 'personalizado' }), false);
  assert.equal(hayFiltros({ ...FILTROS_VACIOS, preset: 'personalizado', desde: 'xx' }), false);
  assert.equal(hayFiltros({ ...FILTROS_VACIOS, preset: 'personalizado', desde: '2026-11-01' }), true);
});

test('el calendario sigue el rango propio de fechas', () => {
  const dias = [{ fecha: '2026-10-05', total: 2 }, { fecha: '2026-11-01', total: 3 }, { fecha: '2026-11-08', total: 1 }];
  const r = aplicarFiltrosADias(dias, { ...FILTROS_VACIOS, preset: 'personalizado', desde: '2026-11-01', hasta: '2026-11-05' }, HOY);
  assert.deepEqual(r.map((d) => d.total), [0, 3, 0]);
});

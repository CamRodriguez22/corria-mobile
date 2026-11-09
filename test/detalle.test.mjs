import test from 'node:test';
import assert from 'node:assert/strict';
import { necesitaDetalleCompleto, fusionarDetalle, actualizarDetalleSiEs } from '../src/detalle.js';
import { mezclarMediciones } from '../src/logic.js';

const base = { id_medicion: 'm1', id_punto: 'P1' };

test('I1: una foto recién subida (con detecciones pero sin máscaras) pide el detalle completo', () => {
  assert.equal(necesitaDetalleCompleto({ ...base, detecciones: [{}], clima: {} }), true);
  assert.equal(necesitaDetalleCompleto({ ...base }), true);
});

test('I1: no se vuelve a pedir si ya trae las máscaras o la marca de detalle completo', () => {
  assert.equal(necesitaDetalleCompleto({ ...base, mascaras: [] }), false);
  assert.equal(necesitaDetalleCompleto({ ...base, mascaras: [{ puntos: [] }] }), false);
  assert.equal(necesitaDetalleCompleto({ ...base, _detalleCompleto: true }), false);
});

test('I1: sin id_punto o sin id no hay nada que pedir', () => {
  assert.equal(necesitaDetalleCompleto({ id_medicion: 'x' }), false);
  assert.equal(necesitaDetalleCompleto(null), false);
});

test('I1: tras fusionar, el detalle trae máscara y queda marcado como completo', () => {
  const abierta = { ...base, detecciones: [{}], nombre: 'a' };
  const r = fusionarDetalle({ prev: abierta, abierta, completa: { ...base, mascaras: [{ puntos: [] }], contorno_placa: { puntos: [] } }, ahora: 5 });
  assert.equal(Array.isArray(r.mascaras), true);
  assert.equal(necesitaDetalleCompleto(r), false);
});

test('I4: las URL frescas y su sello ganan sobre las del detalle abierto', () => {
  const abierta = { ...base, url_imagen: 'vieja', url_thumbnail: 'tvieja', _urlTs: 1 };
  const r = fusionarDetalle({ prev: abierta, abierta, completa: { ...base, url_imagen: 'nueva', url_thumbnail: 'tnueva' }, ahora: 9999 });
  assert.equal(r.url_imagen, 'nueva');
  assert.equal(r.url_thumbnail, 'tnueva');
  assert.equal(r._urlTs, 9999);
});

test('I4: se conserva lo local: _localUri y el nombre cambiado mientras llegaba la respuesta', () => {
  const abierta = { ...base, nombre: 'a', _localUri: 'file:///x.jpg' };
  const prev = { ...abierta, nombre: 'renombrada' };
  const r = fusionarDetalle({ prev, abierta, completa: { ...base, nombre: 'a' }, ahora: 1 });
  assert.equal(r._localUri, 'file:///x.jpg');
  assert.equal(r.nombre, 'renombrada');
  // si no hubo renombrado local, manda el nombre del servidor
  assert.equal(fusionarDetalle({ prev: abierta, abierta, completa: { ...base, nombre: 'del servidor' }, ahora: 1 }).nombre, 'del servidor');
});

test('I4: mezclarMediciones refresca las URL de un duplicado con sello más reciente y conserva lo demás', () => {
  const vieja = { id_medicion: 'm1', timestamp: '2026-11-01T10:00:00Z', url_imagen: 'v', url_thumbnail: 'tv', _urlTs: 100, nombre: 'local' };
  const nueva = { id_medicion: 'm1', timestamp: '2026-11-01T10:00:00Z', url_imagen: 'n', url_thumbnail: 'tn', _urlTs: 200, nombre: 'otro' };
  const { lista, agregadas } = mezclarMediciones([vieja], [nueva]);
  assert.equal(agregadas, 0);
  assert.equal(lista[0].url_imagen, 'n');
  assert.equal(lista[0].url_thumbnail, 'tn');
  assert.equal(lista[0]._urlTs, 200);
  assert.equal(lista[0].nombre, 'local');
});

test('I4: un duplicado más viejo o sin sello no pisa las URL cargadas; el conteo de nuevas no cambia', () => {
  const act = { id_medicion: 'm1', timestamp: '2026-11-01T10:00:00Z', url_imagen: 'n', _urlTs: 200 };
  assert.equal(mezclarMediciones([act], [{ ...act, url_imagen: 'v', _urlTs: 100 }]).lista[0].url_imagen, 'n');
  assert.equal(mezclarMediciones([act], [{ ...act, url_imagen: 'v', _urlTs: undefined }]).lista[0].url_imagen, 'n');
  const r = mezclarMediciones([act], [{ ...act, _urlTs: 300 }, { id_medicion: 'm2', timestamp: '2026-11-02T10:00:00Z' }]);
  assert.equal(r.agregadas, 1);
  assert.equal(r.lista.length, 2);
});

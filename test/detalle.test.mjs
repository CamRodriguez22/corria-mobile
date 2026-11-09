import test from 'node:test';
import assert from 'node:assert/strict';
import { necesitaDetalleCompleto } from '../src/detalle.js';

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

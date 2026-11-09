import test from 'node:test';
import assert from 'node:assert/strict';
import { borradorDe, notasCambiaron } from '../src/notas.js';

test('I2: el borrador de una foto es lo guardado para ESA foto; otra foto parte vacía', () => {
  const obs = { A: { espesor: '3', descripcion: 'óxido en la esquina' } };
  assert.deepEqual(borradorDe(obs, 'A'), { espesor: '3', descripcion: 'óxido en la esquina' });
  assert.deepEqual(borradorDe(obs, 'B'), { espesor: '', descripcion: '' });
  assert.deepEqual(borradorDe(undefined, 'B'), { espesor: '', descripcion: '' });
  assert.deepEqual(borradorDe(obs, null), { espesor: '', descripcion: '' });
});

test('I2: tras reintentar, el resultado B no hereda las notas de A y no cuenta como cambio', () => {
  const obs = { A: { espesor: '3', descripcion: 'nota de A' } };
  const b = borradorDe(obs, 'B');
  assert.equal(notasCambiaron({ hayResultado: true, guardada: obs.B, espesor: b.espesor, descripcion: b.descripcion }), false);
  // Si el borrador de A siguiera en pantalla, sí se guardaría bajo B (el defecto que se corrige):
  assert.equal(notasCambiaron({ hayResultado: true, guardada: obs.B, espesor: '3', descripcion: 'nota de A' }), true);
});

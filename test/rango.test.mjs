import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoRango, vacioDeActividad } from '../src/linea.js';

test('I7: un error al cargar el rango se reporta como error, no como "parcial"', () => {
  assert.deepEqual(estadoRango({ truncado: false, error: 'Sin conexión con el servidor.' }), { parcial: false, error: 'Sin conexión con el servidor.' });
  assert.deepEqual(estadoRango({ truncado: true, error: 'x' }), { parcial: false, error: 'x' });
});

test('I7: truncado sin error es parcial; sin datos o éxito normal no es nada', () => {
  assert.deepEqual(estadoRango({ truncado: true }), { parcial: true, error: '' });
  assert.deepEqual(estadoRango({ truncado: false }), { parcial: false, error: '' });
  assert.deepEqual(estadoRango(undefined), { parcial: false, error: '' });
  assert.deepEqual(estadoRango({ error: '' }), { parcial: false, error: '' });
});

test('I7: con error la lista vacía muestra el error (con reintento), nunca "Sin fotos"', () => {
  assert.equal(vacioDeActividad({ error: 'Sin conexión' }), 'error');
  assert.equal(vacioDeActividad({ error: '' }), 'sin-fotos');
  assert.equal(vacioDeActividad(), 'sin-fotos');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { decidirSalida, guardarNota, MENSAJE_NOTA_AL_SALIR } from '../src/notas.js';

test('I11: si el guardado falló al salir, no se continúa (nota_fallida)', () => {
  assert.equal(decidirSalida({ cambioNotas: true, guardadoOk: false }), 'nota_fallida');
});

test('I11: guardado bien, sin cambios o sin dato: se sigue con la salida normal', () => {
  assert.equal(decidirSalida({ cambioNotas: true, guardadoOk: true }), 'seguir');
  assert.equal(decidirSalida({ cambioNotas: false, guardadoOk: false }), 'seguir');
  assert.equal(decidirSalida(), 'seguir');
});

test('I11: cuando el almacenamiento falla el borrador no se pierde y el siguiente intento puede guardar', async () => {
  const obsMap = {};
  const falla = await guardarNota({ obsMap, id: 'A', espesor: '3', descripcion: 'nota', guardar: async () => false });
  assert.equal(falla.ok, false);
  assert.deepEqual(falla.obsMap, {}); // el mapa guardado no cambia; el texto sigue en el estado de la pantalla
  assert.equal(decidirSalida({ cambioNotas: true, guardadoOk: falla.ok }), 'nota_fallida');
  const bien = await guardarNota({ obsMap, id: 'A', espesor: '3', descripcion: 'nota', guardar: async () => true });
  assert.equal(bien.ok, true);
  assert.equal(decidirSalida({ cambioNotas: true, guardadoOk: bien.ok }), 'seguir');
});

test('I11: el mensaje al usuario ofrece la consecuencia sin jerga', () => {
  assert.match(MENSAJE_NOTA_AL_SALIR, /nota/i);
  assert.match(MENSAJE_NOTA_AL_SALIR, /perderá/);
});

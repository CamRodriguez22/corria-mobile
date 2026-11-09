import test from 'node:test';
import assert from 'node:assert/strict';
import { validarFoto, MENSAJE_FOTO_PEQUENA, MENSAJE_FOTOS_PEQUENAS } from '../src/subida.js';

test('validarFoto: sin foto, pequeña, justa y sin medidas', () => {
  assert.equal(validarFoto(null), 'No se recibió ninguna foto.');
  assert.equal(validarFoto({ uri: 'x', width: 639, height: 900 }), MENSAJE_FOTO_PEQUENA);
  assert.equal(validarFoto({ uri: 'x', width: 900, height: 479 }), MENSAJE_FOTO_PEQUENA);
  assert.equal(validarFoto({ uri: 'x', width: 640, height: 480 }), '');
  assert.equal(validarFoto({ uri: 'x' }), ''); // sin medidas no se bloquea
});

test('los mensajes de foto pequeña no muestran píxeles ni requisitos de resolución', () => {
  for (const m of [MENSAJE_FOTO_PEQUENA, MENSAJE_FOTOS_PEQUENAS]) {
    assert.doesNotMatch(m, /\d|px|píxel|resoluci/i);
    assert.match(m, /pequeñ/);
  }
});

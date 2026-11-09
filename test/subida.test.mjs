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

import { necesitaConvertirAJpeg } from '../src/subida.js';

test('necesitaConvertirAJpeg: JPEG y PNG se suben tal cual; HEIC, HEIF, WebP y otros se convierten', () => {
  for (const mimeType of ['image/jpeg', 'image/jpg', 'IMAGE/JPEG', 'image/png']) assert.equal(necesitaConvertirAJpeg({ mimeType }), false, mimeType);
  for (const mimeType of ['image/heic', 'image/heif', 'image/heic-sequence', 'image/webp', 'image/avif', 'image/gif']) assert.equal(necesitaConvertirAJpeg({ mimeType }), true, mimeType);
});

test('necesitaConvertirAJpeg: sin MIME usa la extensión del nombre o de la URI; sin pistas no convierte', () => {
  assert.equal(necesitaConvertirAJpeg({ fileName: 'IMG_0001.HEIC' }), true);
  assert.equal(necesitaConvertirAJpeg({ uri: 'file:///x/foto.heif?v=2' }), true);
  assert.equal(necesitaConvertirAJpeg({ uri: 'file:///x/foto.JPG' }), false);
  assert.equal(necesitaConvertirAJpeg({ uri: 'file:///x/foto.png' }), false);
  assert.equal(necesitaConvertirAJpeg({ uri: 'content://media/external/images/42' }), false);
  assert.equal(necesitaConvertirAJpeg({ mimeType: 'image/heic', uri: 'x.jpg' }), true); // el MIME manda
  assert.equal(necesitaConvertirAJpeg(), false);
});

import { paramsLote, puedeContinuar, MODO_INDIVIDUAL, MODO_LOTE, TEXTO_MODO } from '../src/subida.js';

test('paramsLote: Individual nunca lleva lote, aunque haya un lote de antes', () => {
  assert.deepEqual(paramsLote({ modo: MODO_INDIVIDUAL, loteId: 'lote_1', loteNombre: 'Inspección' }), { loteId: undefined, loteNombre: undefined });
  assert.deepEqual(paramsLote({}), { loteId: undefined, loteNombre: undefined });
});

test('paramsLote: Lote conserva el id y el nombre (sin espacios sobrantes)', () => {
  assert.deepEqual(paramsLote({ modo: MODO_LOTE, loteId: 'lote_1', loteNombre: '  Inspección  ' }), { loteId: 'lote_1', loteNombre: 'Inspección' });
  assert.deepEqual(paramsLote({ modo: MODO_LOTE, loteId: '', loteNombre: '' }), { loteId: undefined, loteNombre: undefined });
});

test('puedeContinuar: punto siempre; en Lote también el nombre', () => {
  assert.equal(puedeContinuar({ modo: MODO_INDIVIDUAL, bloqueSel: '' }), false);
  assert.equal(puedeContinuar({ modo: MODO_INDIVIDUAL, bloqueSel: 'P1' }), true);
  assert.equal(puedeContinuar({ modo: MODO_LOTE, bloqueSel: 'P1', loteNombre: '  ' }), false);
  assert.equal(puedeContinuar({ modo: MODO_LOTE, bloqueSel: 'P1', loteNombre: 'Nov' }), true);
  assert.equal(puedeContinuar({ modo: MODO_LOTE, bloqueSel: '', loteNombre: 'Nov' }), false);
});

test('hay una línea de explicación corta por pestaña', () => {
  for (const m of [MODO_INDIVIDUAL, MODO_LOTE]) assert.ok(TEXTO_MODO[m].length > 10 && TEXTO_MODO[m].length < 100);
});

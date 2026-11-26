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

import { necesitaConvertirAJpeg, separarConversiones, mensajeFotosOmitidas } from '../src/subida.js';

test('necesitaConvertirAJpeg: solo JPEG se sube tal cual; PNG, HEIC, HEIF, WebP y otros se convierten', () => {
  for (const mimeType of ['image/jpeg', 'image/jpg', 'IMAGE/JPEG']) assert.equal(necesitaConvertirAJpeg({ mimeType }), false, mimeType);
  for (const mimeType of ['image/png', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/webp', 'image/avif', 'image/gif']) assert.equal(necesitaConvertirAJpeg({ mimeType }), true, mimeType);
});

test('necesitaConvertirAJpeg: sin MIME usa la extensión del nombre o de la URI; una URI sin pistas se convierte', () => {
  assert.equal(necesitaConvertirAJpeg({ fileName: 'IMG_0001.HEIC' }), true);
  assert.equal(necesitaConvertirAJpeg({ uri: 'file:///x/foto.heif?v=2' }), true);
  assert.equal(necesitaConvertirAJpeg({ uri: 'file:///x/foto.JPG' }), false);
  assert.equal(necesitaConvertirAJpeg({ uri: 'file:///x/foto.png' }), true);
  assert.equal(necesitaConvertirAJpeg({ fileName: 'captura.PNG' }), true);
  assert.equal(necesitaConvertirAJpeg({ uri: 'content://media/external/images/42' }), true);
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

import { opcionesSelector } from '../src/subida.js';

test('opcionesSelector: la cámara siempre recorta; Individual una foto recorta; varias y Lote no recortan', () => {
  assert.deepEqual(opcionesSelector({ modo: MODO_INDIVIDUAL, deCamara: true }), { fromCamera: true, allowsMultiple: false, recortar: true });
  assert.deepEqual(opcionesSelector({ modo: MODO_LOTE, deCamara: true }), { fromCamera: true, allowsMultiple: false, recortar: true });
  assert.deepEqual(opcionesSelector({ modo: MODO_INDIVIDUAL, unaSola: true }), { fromCamera: false, allowsMultiple: false, recortar: true });
  assert.deepEqual(opcionesSelector({ modo: MODO_INDIVIDUAL }), { fromCamera: false, allowsMultiple: true, recortar: false });
  assert.deepEqual(opcionesSelector({ modo: MODO_LOTE }), { fromCamera: false, allowsMultiple: true, recortar: false });
  assert.deepEqual(opcionesSelector({ modo: MODO_LOTE, unaSola: true }), { fromCamera: false, allowsMultiple: true, recortar: false }); // Lote siempre multiselección
});

test('nunca se pide recorte junto con selección múltiple', () => {
  for (const modo of [MODO_INDIVIDUAL, MODO_LOTE]) for (const deCamara of [true, false]) for (const unaSola of [true, false]) {
    const o = opcionesSelector({ modo, deCamara, unaSola });
    if (!o.fromCamera) assert.equal(o.recortar && o.allowsMultiple, false);
  }
});

const ok = (v) => ({ status: 'fulfilled', value: v });
const mal = (m) => ({ status: 'rejected', reason: new Error(m) });

test('separarConversiones: conserva las buenas en su orden y cuenta las omitidas', () => {
  const r = separarConversiones([ok('a'), mal('x'), ok('c'), mal('y')]);
  assert.deepEqual(r.buenas, ['a', 'c']);
  assert.equal(r.omitidas, 2);
  assert.equal(r.error.message, 'x');
});

test('separarConversiones: todas fallan -> sin buenas y el primer error; ninguna falla -> sin omitidas', () => {
  const todas = separarConversiones([mal('x'), mal('y')]);
  assert.deepEqual(todas.buenas, []);
  assert.equal(todas.omitidas, 2);
  assert.equal(todas.error.message, 'x');
  const ninguna = separarConversiones([ok(1), ok(2), ok(3)]);
  assert.deepEqual(ninguna.buenas, [1, 2, 3]);
  assert.equal(ninguna.omitidas, 0);
  assert.equal(ninguna.error, null);
});

test('mensajeFotosOmitidas: singular y plural', () => {
  assert.equal(mensajeFotosOmitidas(1), 'No se pudo preparar 1 foto; se omitió.');
  assert.equal(mensajeFotosOmitidas(3), 'No se pudo preparar 3 fotos; se omitieron.');
});


test('unknown content providers convert unless JPEG metadata is available', () => {
  const uri = 'content://media/external/images/42';
  assert.equal(necesitaConvertirAJpeg({ uri, mimeType: '  ' }), true);
  assert.equal(necesitaConvertirAJpeg({ uri, fileName: 'photo' }), true);
  assert.equal(necesitaConvertirAJpeg({ uri: 'file:///photos/unknown' }), true);
  assert.equal(necesitaConvertirAJpeg({ uri, mimeType: 'image/jpeg' }), false);
  assert.equal(necesitaConvertirAJpeg({ uri, fileName: 'photo.JPEG' }), false);
  assert.equal(necesitaConvertirAJpeg({ uri, mimeType: 'image/png', fileName: 'photo.jpg' }), true);
  assert.equal(necesitaConvertirAJpeg({}), false);
});

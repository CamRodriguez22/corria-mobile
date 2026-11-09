import test from 'node:test';
import assert from 'node:assert/strict';
import { esperarImagenLista, mensajeCaptura, MENSAJE_IMAGEN_NO_CARGO, MENSAJE_IMAGEN_TARDA } from '../src/descarga.js';

const sinEspera = () => Promise.resolve();

test('I12: si la foto ya cargó, se puede capturar sin esperar', async () => {
  assert.equal(await esperarImagenLista(() => 'lista', { dormir: sinEspera }), 'lista');
  assert.equal(mensajeCaptura('lista'), '');
});

test('I12: espera mientras carga y captura solo cuando onLoad marcó la foto como lista', async () => {
  const estados = ['cargando', 'cargando', 'cargando', 'lista'];
  let n = 0;
  let espero = 0;
  const r = await esperarImagenLista(() => estados[Math.min(n++, estados.length - 1)], { dormir: async () => { espero++; } });
  assert.equal(r, 'lista');
  assert.equal(espero, 3);
});

test('I12: si la foto falla al cargar se aborta con un mensaje claro (no se comparte el marcador)', async () => {
  const r = await esperarImagenLista(() => 'error', { dormir: sinEspera });
  assert.equal(r, 'error');
  assert.equal(mensajeCaptura(r), MENSAJE_IMAGEN_NO_CARGO);
});

test('I12: si nunca carga ni falla, se rinde por tiempo con su mensaje', async () => {
  let espero = 0;
  const r = await esperarImagenLista(() => 'cargando', { timeoutMs: 500, cada: 100, dormir: async () => { espero++; } });
  assert.equal(r, 'tiempo');
  assert.equal(espero, 5);
  assert.equal(mensajeCaptura(r), MENSAJE_IMAGEN_TARDA);
});

test('I12: un fallo que llega durante la espera también aborta', async () => {
  const estados = ['cargando', 'cargando', 'error'];
  let n = 0;
  assert.equal(await esperarImagenLista(() => estados[n++], { dormir: sinEspera }), 'error');
});

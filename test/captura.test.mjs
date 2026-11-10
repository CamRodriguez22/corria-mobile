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

import { prepararIntentoCaptura } from '../src/descarga.js';

test('I17: tras un fallo, el nuevo intento reinicia el estado y pide remontar la imagen', () => {
  assert.deepEqual(prepararIntentoCaptura('error'), { estado: 'cargando', remontar: true });
  assert.deepEqual(prepararIntentoCaptura('lista'), { estado: 'lista', remontar: false });
  assert.deepEqual(prepararIntentoCaptura('cargando'), { estado: 'cargando', remontar: false });
});

test('I17: ciclo error -> reintento -> carga: el segundo intento espera el nuevo onLoad y captura', async () => {
  // Simula DetailScreen: la imagen de captura falla, el usuario reintenta, se remonta y esta vez carga.
  let estado = 'cargando';
  const fallaPrimero = await esperarImagenLista(() => { estado = 'error'; return estado; }, { dormir: sinEspera });
  assert.equal(fallaPrimero, 'error');
  const prep = prepararIntentoCaptura(estado);
  estado = prep.estado;
  assert.equal(prep.remontar, true);
  let ciclos = 0;
  const r = await esperarImagenLista(() => {
    if (++ciclos === 3) estado = 'lista'; // el nuevo <Image> dispara onLoad
    return estado;
  }, { dormir: sinEspera });
  assert.equal(r, 'lista');
  assert.ok(ciclos >= 3, 'esperó el nuevo onLoad en vez de leer el error anterior');
});

test('I17: sin reiniciar el estado, el reintento leería el mismo error al instante (el defecto)', async () => {
  assert.equal(await esperarImagenLista(() => 'error', { dormir: sinEspera }), 'error');
});

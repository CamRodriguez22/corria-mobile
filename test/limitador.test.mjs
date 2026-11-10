import test from 'node:test';
import assert from 'node:assert/strict';
import { crearLimitador } from '../src/limitador.js';

const pausa = (ms = 0) => new Promise((r) => setTimeout(r, ms));

test('crearLimitador - nunca pasa del tope de tareas simultáneas', async () => {
  const lim = crearLimitador(3);
  let enCurso = 0;
  let maximo = 0;
  const tarea = async () => {
    enCurso++;
    maximo = Math.max(maximo, enCurso);
    await pausa(5);
    enCurso--;
  };
  await Promise.all(Array.from({ length: 10 }, () => lim.ejecutar(tarea)));
  assert.equal(maximo, 3);
  assert.equal(lim.activas, 0);
  assert.equal(lim.enEspera, 0);
});

test('crearLimitador - arranca las tareas en orden de llegada y devuelve cada resultado', async () => {
  const lim = crearLimitador(2);
  const inicios = [];
  const resultados = await Promise.all(
    [0, 1, 2, 3, 4].map((i) =>
      lim.ejecutar(async () => {
        inicios.push(i);
        await pausa(i === 0 ? 10 : 1);
        return i * 10;
      })
    )
  );
  assert.deepEqual(inicios, [0, 1, 2, 3, 4]);
  assert.deepEqual(resultados, [0, 10, 20, 30, 40]);
});

test('crearLimitador - una tarea que falla (async o síncrona) no detiene la cola', async () => {
  const lim = crearLimitador(1);
  const a = lim.ejecutar(async () => {
    throw new Error('falló a');
  });
  const b = lim.ejecutar(() => {
    throw new Error('falló b');
  });
  const c = lim.ejecutar(async () => 'ok');
  await assert.rejects(a, /falló a/);
  await assert.rejects(b, /falló b/);
  assert.equal(await c, 'ok');
  assert.equal(lim.activas, 0);
});

test('crearLimitador - tope inválido se trata como 1', async () => {
  const lim = crearLimitador(0);
  let enCurso = 0;
  let maximo = 0;
  await Promise.all(
    [1, 2, 3].map(() =>
      lim.ejecutar(async () => {
        enCurso++;
        maximo = Math.max(maximo, enCurso);
        await pausa(2);
        enCurso--;
      })
    )
  );
  assert.equal(maximo, 1);
});

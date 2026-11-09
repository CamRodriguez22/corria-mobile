import test from 'node:test';
import assert from 'node:assert/strict';
import { renombrarPorTandas, leerRespuestaRenombrado } from '../src/logic.js';

const items = (n, desde = 0) => Array.from({ length: n }, (_, i) => ({ id_punto: 'P', id_medicion: `m${desde + i}` }));

test('I8: solo cuentan los ids que el servidor devolvió en `ok`', () => {
  const r = leerRespuestaRenombrado({ ok: ['m0', 'm2'], error: [{ id_medicion: 'm1' }], nombre: 'Nuevo' }, items(3));
  assert.deepEqual(r, { renombrados: ['m0', 'm2'], fallidos: ['m1'], nombre: 'Nuevo' });
  // ids ajenos a la tanda se ignoran
  assert.deepEqual(leerRespuestaRenombrado({ ok: ['zzz'] }, items(1)).renombrados, []);
});

test('I8: una respuesta sin `ok` (formato anterior) se toma como todas renombradas', () => {
  assert.deepEqual(leerRespuestaRenombrado(undefined, items(2)), { renombrados: ['m0', 'm1'], fallidos: [], nombre: null });
  assert.deepEqual(leerRespuestaRenombrado({}, items(2)).fallidos, []);
});

test('I8: resultado parcial: "Se renombraron N de M fotos" y solo esos ids', async () => {
  const r = await renombrarPorTandas(items(4), async () => ({ ok: ['m0', 'm1', 'm3'], error: [{ id_medicion: 'm2', motivo: 'x' }], nombre: 'Inspección' }));
  assert.deepEqual(r.idsRenombrados, ['m0', 'm1', 'm3']);
  assert.deepEqual(r.fallidos, ['m2']);
  assert.equal(r.parcial, true);
  assert.equal(r.nombre, 'Inspección');
  assert.match(r.mensaje, /Se renombraron 3 de 4 fotos/);
});

test('I8: todo ok no es parcial y usa el nombre del servidor', async () => {
  const r = await renombrarPorTandas(items(2), async (t) => ({ ok: t.map((x) => x.id_medicion), error: [], nombre: 'Nombre normalizado' }));
  assert.equal(r.parcial, false);
  assert.equal(r.mensaje, '');
  assert.equal(r.nombre, 'Nombre normalizado');
});

test('I8: ninguna renombrada con 200 es un error (no "Lote renombrado")', async () => {
  await assert.rejects(
    () => renombrarPorTandas(items(2), async () => ({ ok: [], error: [{ id_medicion: 'm0' }, { id_medicion: 'm1' }] })),
    (e) => /ninguna foto/.test(e.message) && e.idsRenombrados.length === 0
  );
});

test('I8: varias tandas acumulan ok y fallidos; una tanda que lanza conserva las anteriores', async () => {
  let n = 0;
  const r = await renombrarPorTandas(items(150), async (t) => (n++ === 0 ? { ok: t.slice(1).map((x) => x.id_medicion), nombre: 'N' } : { ok: t.map((x) => x.id_medicion) }));
  assert.equal(r.idsRenombrados.length, 149);
  assert.deepEqual(r.fallidos, ['m0']);
  n = 0;
  await assert.rejects(
    () => renombrarPorTandas(items(150), async (t) => { if (n++ === 1) throw new Error('red'); return { ok: t.map((x) => x.id_medicion) }; }),
    (e) => e.idsRenombrados.length === 100 && /Se renombraron 100 de 150/.test(e.message)
  );
});

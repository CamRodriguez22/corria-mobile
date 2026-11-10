import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoRenombrarLote, AVISO_LOTE_CARGANDO, AVISO_LOTE_ERROR } from '../src/lotes.js';

test('I5: solo se renombra con el historial completo y permiso', () => {
  assert.deepEqual(estadoRenombrarLote({ historialEstado: 'ok', puedeGestionar: true }), { permitido: true, aviso: '', reintentar: false });
  assert.equal(estadoRenombrarLote({ historialEstado: 'ok', puedeGestionar: false }).permitido, false);
});

test('I5: cargando o sin empezar bloquea el renombrado y avisa', () => {
  for (const historialEstado of ['cargando', 'idle']) {
    const r = estadoRenombrarLote({ historialEstado, puedeGestionar: true });
    assert.equal(r.permitido, false);
    assert.equal(r.aviso, AVISO_LOTE_CARGANDO);
    assert.equal(r.reintentar, false);
  }
});

test('I5: con error del historial se bloquea, se avisa y se ofrece reintentar', () => {
  const r = estadoRenombrarLote({ historialEstado: 'error', puedeGestionar: true });
  assert.deepEqual(r, { permitido: false, aviso: AVISO_LOTE_ERROR, reintentar: true });
});

test('I5: por defecto (sin dato de estado) no bloquea', () => {
  assert.equal(estadoRenombrarLote().permitido, true);
});

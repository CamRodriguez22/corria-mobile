import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearClaveResumen, resumenesAfectados, nuevoToken, tokenVigente } from '../src/resumenes.js';

test('I3: claves de resumen de punto y globales', () => {
  assert.deepEqual(parsearClaveResumen('P1|2026'), { idPunto: 'P1', anio: 2026 });
  assert.deepEqual(parsearClaveResumen('2026'), { idPunto: null, anio: 2026 });
  assert.deepEqual(parsearClaveResumen(2026), { idPunto: null, anio: 2026 });
  assert.deepEqual(parsearClaveResumen('a|b|2025'), { idPunto: 'a|b', anio: 2025 });
  assert.equal(parsearClaveResumen('P1|x'), null);
});

test('I3: subir o borrar en un punto recarga sus resúmenes y los globales, no los de otros puntos', () => {
  const claves = ['P1|2026', 'P1|2025', 'P2|2026', '2026'];
  const r = resumenesAfectados(claves, 'P1');
  assert.deepEqual(r, [{ idPunto: 'P1', anio: 2026 }, { idPunto: 'P1', anio: 2025 }, { idPunto: null, anio: 2026 }]);
  assert.deepEqual(resumenesAfectados(claves, 'P9'), [{ idPunto: null, anio: 2026 }]);
  assert.deepEqual(resumenesAfectados([], 'P1'), []);
});

test('I3: una respuesta anterior a la recarga ya no es vigente', () => {
  const tokens = {};
  const lenta = nuevoToken(tokens, 'P1|2026');
  const recarga = nuevoToken(tokens, 'P1|2026');
  assert.equal(tokenVigente(tokens, 'P1|2026', lenta), false);
  assert.equal(tokenVigente(tokens, 'P1|2026', recarga), true);
  // otra clave no se ve afectada
  const otra = nuevoToken(tokens, 'P2|2026');
  assert.equal(tokenVigente(tokens, 'P2|2026', otra), true);
  assert.equal(tokenVigente(tokens, 'P1|2026', recarga), true);
});

import { invalidarTokens } from '../src/resumenes.js';
test('I3: invalidarTokens descarta todas las respuestas en vuelo', () => {
  const tokens = {};
  const a = nuevoToken(tokens, 'A');
  const b = nuevoToken(tokens, 'B');
  invalidarTokens(tokens);
  assert.equal(tokenVigente(tokens, 'A', a), false);
  assert.equal(tokenVigente(tokens, 'B', b), false);
  assert.equal(tokenVigente(tokens, 'A', nuevoToken(tokens, 'A')), true);
});

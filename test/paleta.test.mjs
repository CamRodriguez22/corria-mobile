import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORES_SOBRE_NIVEL, COLORES_NIVEL, COLORES_TEXTO_NIVEL, SUPERFICIES, TINTA, contraste, componer } from '../src/paleta.js';

// Los rellenos son los de la web (frontend/src/lib/statusUtils.js: COLORES_NIVEL).
test('rellenos de nivel idénticos a la web', () => {
  assert.deepEqual(COLORES_NIVEL, ['#16a34a', '#f59e0b', '#ea580c', '#dc2626']);
});

test('contraste: referencias conocidas', () => {
  assert.ok(Math.abs(contraste('#000000', '#ffffff') - 21) < 0.01);
  assert.ok(Math.abs(contraste('#ffffff', '#ffffff') - 1) < 0.001);
});

test('texto de cada nivel: >= 4,5:1 sobre fondo, superficie, tarjeta y su propio tinte', () => {
  COLORES_TEXTO_NIVEL.forEach((texto, i) => {
    for (const [nombre, fondo] of Object.entries(SUPERFICIES)) {
      assert.ok(contraste(texto, fondo) >= 4.5, `nivel ${i} sobre ${nombre}: ${contraste(texto, fondo).toFixed(2)}`);
      const tinte = componer(COLORES_NIVEL[i], 0.14, fondo);
      assert.ok(contraste(texto, tinte) >= 4.5, `nivel ${i} sobre tinte/${nombre}: ${contraste(texto, tinte).toFixed(2)}`);
    }
  });
});

test('íconos sobre el relleno del nivel con tinta: >= 3:1 (gráficos)', () => {
  COLORES_NIVEL.forEach((c, i) => assert.ok(contraste(TINTA, c) >= 3, `nivel ${i}: ${contraste(TINTA, c).toFixed(2)}`));
});

test('la tarjeta se distingue del fondo y la tinta lee sobre todo', () => {
  assert.ok(contraste(SUPERFICIES.surfaceAlt, SUPERFICIES.bg) > 1.05);
  for (const f of Object.values(SUPERFICIES)) assert.ok(contraste(TINTA, f) >= 12);
});

test('texto sobre el relleno de cada nivel (números del calendario): >= 4,5:1', () => {
  COLORES_NIVEL.forEach((c, i) => assert.ok(contraste(COLORES_SOBRE_NIVEL[i], c) >= 4.5, `nivel ${i}: ${contraste(COLORES_SOBRE_NIVEL[i], c).toFixed(2)}`));
});

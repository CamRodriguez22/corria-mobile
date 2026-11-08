import test from 'node:test';
import assert from 'node:assert/strict';
import { poligonosMascara, contornoPlaca, hayMascara, rectDeFoto, puntosAPixeles } from '../src/mascara.js';

const tri = [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.3, y: 0.6 }];

test('poligonosMascara: solo polígonos válidos (>= 3 puntos numéricos); sin máscara no inventa nada', () => {
  assert.deepEqual(poligonosMascara({ mascaras: [{ puntos: tri }, { puntos: tri.slice(0, 2) }, { puntos: [{ x: 'a', y: 1 }, tri[0], tri[1]] }] }), [tri]);
  assert.deepEqual(poligonosMascara({}), []);
  assert.deepEqual(poligonosMascara({ mascaras: [] }), []);
  assert.deepEqual(poligonosMascara(null), []);
  assert.equal(hayMascara({ mascaras: [] }), false);
  assert.equal(hayMascara({ mascaras: [{ puntos: tri }] }), true);
});

test('contornoPlaca: solo con >= 3 puntos', () => {
  assert.equal(contornoPlaca({ contorno_placa: { puntos: tri } }), tri);
  assert.equal(contornoPlaca({ contorno_placa: { puntos: [tri[0]] } }), null);
  assert.equal(contornoPlaca({ contorno_placa: null }), null);
});

test('rectDeFoto: cover llena la caja y recorta; contain cabe completa', () => {
  // foto apaisada 2:1 en caja cuadrada de 100
  assert.deepEqual(rectDeFoto(100, 100, 2, 'cover'), { x: -50, y: 0, w: 200, h: 100 });
  assert.deepEqual(rectDeFoto(100, 100, 2, 'contain'), { x: 0, y: 25, w: 100, h: 50 });
  // foto vertical 1:2
  assert.deepEqual(rectDeFoto(100, 100, 0.5, 'cover'), { x: 0, y: -50, w: 100, h: 200 });
  assert.deepEqual(rectDeFoto(100, 100, 0.5, 'contain'), { x: 25, y: 0, w: 50, h: 100 });
  // misma relación: sin recorte
  assert.deepEqual(rectDeFoto(300, 200, 1.5, 'cover'), { x: 0, y: 0, w: 300, h: 200 });
});

test('puntosAPixeles lleva [0,1] al rectángulo de la foto', () => {
  assert.equal(puntosAPixeles(tri, { x: 0, y: 0, w: 100, h: 200 }), '10.00,20.00 50.00,20.00 30.00,120.00');
  assert.equal(puntosAPixeles([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }], { x: -50, y: 0, w: 200, h: 100 }), '-50.00,0.00 150.00,100.00 150.00,0.00');
});

import { mascarasDemo } from '../src/demo/datos.js';
test('mascarasDemo (solo demo): polígonos válidos dentro de la foto y ninguno sin corrosión', () => {
  assert.deepEqual(mascarasDemo(0), []);
  for (const pct of [0.4, 8, 22, 35]) {
    const ms = poligonosMascara({ mascaras: mascarasDemo(pct, 3) });
    assert.ok(ms.length >= 1 && ms.length <= 4);
    for (const ps of ms) for (const p of ps) assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1, `${pct}: ${p.x},${p.y}`);
  }
});

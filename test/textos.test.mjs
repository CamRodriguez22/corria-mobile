import test from 'node:test';
import assert from 'node:assert/strict';
import { plural, formatoPct, pctCorto } from '../src/fechas.js';
import { pesoNumerico, familiaPara, FAMILIAS } from '../src/tipografia.js';

test('plural: singular solo con 1 (nunca "1 puntos" ni "0 punto")', () => {
  assert.equal(plural(1, 'punto', 'puntos'), '1 punto');
  assert.equal(plural(0, 'punto', 'puntos'), '0 puntos');
  assert.equal(plural(2, 'punto', 'puntos'), '2 puntos');
  assert.equal(plural(1, 'punto severo', 'puntos severos'), '1 punto severo');
  assert.equal(plural(1, 'foto cargada', 'fotos cargadas'), '1 foto cargada');
});

test('porcentajes con coma decimal y espacio duro antes del %', () => {
  assert.equal(formatoPct(20.04), '20,0\u00a0%');
  assert.equal(formatoPct('7.25', 2), '7,25\u00a0%');
  assert.equal(formatoPct(null), '—');
  assert.equal(pctCorto(0.4), '0,4\u00a0%');
});

test('tipografía: el peso elige la familia (RN ignora fontWeight con fuentes propias)', () => {
  assert.equal(pesoNumerico(undefined), 400);
  assert.equal(pesoNumerico('normal'), 400);
  assert.equal(pesoNumerico('bold'), 700);
  assert.equal(pesoNumerico('600'), 600);
  assert.equal(pesoNumerico('900'), 800);
  assert.equal(familiaPara(undefined, '700'), 'Outfit_700Bold');
  assert.equal(familiaPara('Outfit', '800'), 'Outfit_800ExtraBold');
  assert.equal(familiaPara('mono', '600'), 'IBMPlexMono_600SemiBold');
  assert.equal(familiaPara('mono', '800'), 'IBMPlexMono_700Bold'); // Plex Mono llega a 700
  assert.ok(FAMILIAS.includes('IBMPlexMono_400Regular') && FAMILIAS.includes('Outfit_500Medium'));
});

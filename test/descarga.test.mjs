import test from 'node:test';
import assert from 'node:assert/strict';
import { nombreArchivo, rgba, comandosSegmentacion, esUrlRemota, COLOR_CORROSION, COLOR_PLACA } from '../src/descarga.js';
import { COLORES_NIVEL } from '../src/paleta.js';

const tri = [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 0.5 }];

test('los colores de la descarga son los de FotoConMascara (nivel Severa y Sin corrosión)', () => {
  assert.equal(COLOR_CORROSION, COLORES_NIVEL[3]);
  assert.equal(COLOR_PLACA, COLORES_NIVEL[0]);
});

test('nombreArchivo: seguro y con la extensión de cada imagen', () => {
  assert.equal(nombreArchivo({ id_medicion: 'abc-123' }), 'foto-abc-123-original.jpg');
  assert.equal(nombreArchivo({ id_medicion: 'abc-123' }, 'corrosion'), 'foto-abc-123-corrosion.png');
  assert.equal(nombreArchivo({ id_medicion: '../x y/z' }), 'foto-xyz-original.jpg');
  assert.equal(nombreArchivo({}), 'foto-medicion-original.jpg');
  assert.equal(nombreArchivo(null, 'corrosion'), 'foto-medicion-corrosion.png');
});

test('rgba convierte hexadecimal y opacidad', () => {
  assert.equal(rgba('#dc2626', 0.45), 'rgba(220,38,38,0.45)');
});

test('comandosSegmentacion: manchas escaladas a píxeles y placa al final con su trazo', () => {
  const m = { mascaras: [{ puntos: tri }, { puntos: [{ x: 0, y: 0 }] }], contorno_placa: { puntos: tri } };
  const c = comandosSegmentacion(m, 1000, 500);
  assert.equal(c.length, 2); // la máscara de 1 punto se descarta
  assert.equal(c[0].tipo, 'mancha');
  assert.deepEqual(c[0].puntos[1], { x: 500, y: 0 });
  assert.deepEqual(c[0].puntos[2], { x: 500, y: 250 });
  assert.equal(c[0].relleno, 'rgba(220,38,38,0.45)');
  assert.equal(c[0].grosor, 2);
  assert.equal(c[1].tipo, 'placa');
  assert.equal(c[1].relleno, null);
  assert.equal(c[1].trazo, COLOR_PLACA);
  assert.equal(c[1].grosor, 3);
});

test('comandosSegmentacion: grosores mínimos en fotos pequeñas y vacío sin máscara', () => {
  const c = comandosSegmentacion({ mascaras: [{ puntos: tri }], contorno_placa: { puntos: tri } }, 400, 300);
  assert.equal(c[0].grosor, 1.5);
  assert.equal(c[1].grosor, 2.5);
  assert.deepEqual(comandosSegmentacion({}, 100, 100), []);
});

test('esUrlRemota', () => {
  assert.equal(esUrlRemota('https://s3.amazonaws.com/x.jpg?sig=1'), true);
  assert.equal(esUrlRemota('file:///data/x.jpg'), false);
  assert.equal(esUrlRemota('blob:http://localhost/abc'), false);
  assert.equal(esUrlRemota(null), false);
});

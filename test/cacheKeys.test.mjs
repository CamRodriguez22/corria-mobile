import test from 'node:test';
import assert from 'node:assert/strict';
import { claveCacheMiniatura, claveCacheImagen, marcarCarga } from '../src/miniaturas.js';

const AHORA = 1_000_000;
const med = (extra = {}) => marcarCarga([{ id_medicion: 'm1', url_thumbnail: 'https://s3/t?sig=1', url_imagen: 'https://s3/i?sig=1', ...extra }], AHORA)[0];

test('claves de caché: estables por medición y variante, no dependen de la firma de la URL', () => {
  const a = med();
  const b = med({ url_thumbnail: 'https://s3/t?sig=2', url_imagen: 'https://s3/i?sig=2' });
  assert.equal(claveCacheMiniatura(a, AHORA), 'm1:thumb');
  assert.equal(claveCacheImagen(a, AHORA), 'm1:full');
  assert.equal(claveCacheMiniatura(b, AHORA), claveCacheMiniatura(a, AHORA));
  assert.equal(claveCacheImagen(b, AHORA), claveCacheImagen(a, AHORA));
});

test('claves de caché: siguen a la URL de respaldo que realmente se pinta', () => {
  assert.equal(claveCacheMiniatura(med({ url_thumbnail: undefined }), AHORA), 'm1:full');
  assert.equal(claveCacheImagen(med({ url_imagen: undefined }), AHORA), 'm1:thumb');
});

test('claves de caché: null para fotos locales, sin id, sin URL o con URL vencida', () => {
  assert.equal(claveCacheMiniatura({ id_medicion: 'm1', _localUri: 'file:///a.jpg' }, AHORA), null);
  assert.equal(claveCacheImagen({ id_medicion: 'm1', _localUri: 'file:///a.jpg' }, AHORA), null);
  assert.equal(claveCacheMiniatura(med({ id_medicion: undefined }), AHORA), null);
  assert.equal(claveCacheImagen(med({ url_thumbnail: undefined, url_imagen: undefined }), AHORA), null);
  assert.equal(claveCacheMiniatura(med(), AHORA + 2 * 60 * 60 * 1000), null); // URL vencida: no se pinta
  assert.equal(claveCacheImagen(null), null);
});

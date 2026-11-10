import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPublicadorCarga } from '../src/carga.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

function setup() {
  const state = { current: true, offline: false, expired: 0, errors: [], photos: ['cached photo'], blocksError: false };
  const load = crearPublicadorCarga({
    sesionVigente: () => state.current,
    esSesionVencida: (error) => error.status === 401,
    alVencer: () => { state.expired++; state.offline = true; },
    alErrorPublicacion: (error) => { state.errors.push(error); state.offline = true; },
  });
  return { state, load };
}

test('resources publish progressively without waiting for the slowest request', async () => {
  const { load } = setup();
  const profile = deferred();
  const photos = deferred();
  const published = [];
  const running = Promise.all([
    load.tarea(profile.promise, (p) => published.push(p)),
    load.tarea(photos.promise, (p) => published.push(p)),
  ]);
  photos.resolve('photos');
  await flush();
  assert.deepEqual(published, ['photos']);
  profile.resolve('profile');
  await running;
  assert.deepEqual(published, ['photos', 'profile']);
});

test('a late 401 expires once and prevents subsequent resource publication', async () => {
  const { state, load } = setup();
  const auth = deferred(), late = deferred(), another401 = deferred();
  const published = [];
  const running = Promise.all([
    load.tarea(Promise.resolve('early'), (v) => published.push(v)),
    load.tarea(auth.promise, () => assert.fail('401 must not publish')),
    load.tarea(late.promise, () => assert.fail('expired resource must not publish')),
    load.tarea(another401.promise, () => assert.fail('401 must not publish')),
  ]);
  await flush();
  auth.reject({ status: 401 });
  await flush();
  late.resolve('late');
  another401.reject({ status: 401 });
  await running;
  assert.deepEqual(published, ['early']);
  assert.equal(state.expired, 1);
  assert.equal(state.offline, true);
});

test('photo failures keep cached photos and mark offline; point failures mark their own error', async () => {
  const { state, load } = setup();
  await Promise.all([
    load.tarea(Promise.reject(new Error('photos unavailable')), (photos) => { state.photos = photos; }, () => { state.offline = true; }),
    load.tarea(Promise.reject(new Error('points unavailable')), () => { state.blocksError = false; }, () => { state.blocksError = true; }),
  ]);
  assert.deepEqual(state.photos, ['cached photo']);
  assert.equal(state.offline, true);
  assert.equal(state.blocksError, true);
  assert.equal(state.expired, 0);
});

test('sync and async publication errors mark offline and survive a later successful resource', async () => {
  for (const publish of [() => { throw new Error('sync publish'); }, async () => { throw new Error('async publish'); }]) {
    const { state, load } = setup();
    await load.tarea(Promise.resolve('bad publication'), publish);
    await load.tarea(Promise.resolve('photos'), () => { state.offline = load.falloPublicacion; });
    assert.equal(state.offline, true);
    assert.equal(state.errors.length, 1);
    assert.equal(load.vigente(), true);
  }
});

test('session changes suppress resource results and errors', async () => {
  const { state, load } = setup();
  const result = deferred(), failure = deferred();
  const running = Promise.all([
    load.tarea(result.promise, () => assert.fail('stale publication')),
    load.tarea(failure.promise, () => assert.fail('stale publication'), () => assert.fail('stale error')),
  ]);
  state.current = false;
  result.resolve('old data');
  failure.reject({ status: 401 });
  await running;
  assert.equal(state.expired, 0);
  assert.equal(state.offline, false);
});

test('async publication guards prevent cache writes after session changes or a late 401', async () => {
  for (const expire of [false, true]) {
    const { state, load } = setup();
    const owner = deferred();
    const auth = deferred();
    const writes = [];
    const publishing = load.tarea(Promise.resolve('resource'), async (data, vigente) => {
      const sub = await owner.promise;
      if (vigente()) writes.push({ data, sub });
    });
    const authTask = load.tarea(auth.promise, () => {});
    await flush();
    if (expire) auth.reject({ status: 401 });
    else { state.current = false; auth.resolve(null); }
    await flush();
    owner.resolve('old account');
    await Promise.all([publishing, authTask]);
    assert.deepEqual(writes, []);
  }
});

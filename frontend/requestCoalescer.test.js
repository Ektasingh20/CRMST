import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestCoalescer } from './requestCoalescer.js';

test('concurrent reads share a request but return isolated objects', async () => {
  const cache = createRequestCoalescer();
  let loads = 0;
  const load = async () => { loads++; return { rows: [1] }; };
  const [a, b] = await Promise.all([cache.read('user:path', load), cache.read('user:path', load)]);
  assert.equal(loads, 1);
  a.rows.push(2);
  assert.deepEqual(b.rows, [1]);
  await cache.read('user:path', load);
  assert.equal(loads, 2);
});

test('mutations and different accounts cannot reuse an earlier request', async () => {
  const cache = createRequestCoalescer();
  let finish;
  const old = cache.read('a:path', () => new Promise(resolve => { finish = resolve; }));
  await Promise.resolve();
  cache.clear();
  assert.equal(await cache.read('a:path', async () => 'new'), 'new');
  assert.equal(await cache.read('b:path', async () => 'other account'), 'other account');
  finish('old');
  assert.equal(await old, 'old');
});

test('failed reads can be retried', async () => {
  const cache = createRequestCoalescer();
  await assert.rejects(cache.read('key', async () => { throw new Error('offline'); }));
  assert.equal(await cache.read('key', async () => 'online'), 'online');
});

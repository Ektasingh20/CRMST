import test from 'node:test';
import assert from 'node:assert/strict';
import { ReadCache } from '../itDashboard/src/cache.js';

test('versioned histories reuse reads and fetch again when a message arrives', async () => {
  const cache = new ReadCache(60000);
  let reads = 0;
  const load = async () => { reads++; return [{ text: 'message' }]; };
  const first = await cache.get('conversation:v1', load);
  first[0].text = 'local edit';
  assert.equal((await cache.get('conversation:v1', load))[0].text, 'message');
  assert.equal(reads, 1);
  await cache.get('conversation:v2', load);
  assert.equal(reads, 2);
  cache.clear();
  await cache.get('conversation:v2', load);
  assert.equal(reads, 3);
});

test('clearing during a read does not repopulate the cache with stale data', async () => {
  const cache = new ReadCache();
  let finish;
  const old = cache.get('key', () => new Promise(resolve => { finish = resolve; }));
  await Promise.resolve();
  cache.clear();
  await cache.get('key', async () => 'new');
  finish('old');
  await old;
  assert.equal(await cache.get('key', async () => 'unexpected'), 'new');
});

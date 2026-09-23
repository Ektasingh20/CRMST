import test from "node:test";
import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { createDocumentCache, cloneDocumentData } from "./documentCache.js";
import { createCollectionModel } from "./firestoreModel.js";

test("concurrent reads share one fetch and successful writes preserve a warm cache", async () => {
  const cache = createDocumentCache(60000);
  let reads = 0;
  const load = async () => { reads++; return [{ ref: { path: "items/1" }, data: { name: "old" } }]; };
  await Promise.all([cache.get(load), cache.get(load), cache.get(load)]);
  cache.put({ ref: { path: "items/1" }, data: { name: "new" } });
  assert.equal((await cache.get(load))[0].data.name, "new");
  cache.remove("items/1");
  assert.deepEqual(await cache.get(load), []);
  assert.equal(reads, 1);
});

test("an in-flight stale read cannot repopulate an invalidated cache", async () => {
  const cache = createDocumentCache(60000);
  let finish;
  const old = cache.get(() => new Promise((resolve) => { finish = resolve; }));
  await Promise.resolve();
  cache.clear();
  await cache.get(async () => ["new"]);
  finish(["old"]);
  await old;
  assert.deepEqual(await cache.get(() => { throw Error("unexpected read"); }), ["new"]);
});

test("failed loads can retry and expired caches fetch again", async () => {
  const cache = createDocumentCache(0);
  await assert.rejects(cache.get(async () => { throw Error("offline"); }));
  assert.deepEqual(await cache.get(async () => [1]), [1]);
  assert.deepEqual(await cache.get(async () => [2]), [2]);
});

test("copies isolate editable fields while retaining Firestore value types", () => {
  const source = { nested: { values: [1] }, time: Timestamp.now() };
  const copy = cloneDocumentData(source);
  copy.nested.values.push(2);
  assert.deepEqual(source.nested.values, [1]);
  assert.equal(copy.time.toMillis(), source.time.toMillis());
});

test("model edits do not leak before save; no-op saves cost no writes", async () => {
  const model = createCollectionModel("test", "Test");
  let reads = 0;
  let writes = 0;
  let fail = false;
  const ref = { id: "1", path: "test/1", async set() { if (fail) throw Error("offline"); writes++; } };
  Object.defineProperty(model, "collection", { value: {
    async get() { reads++; return { docs: [{ ref, data: () => ({ nested: { value: 1 } }) }] }; },
  } });
  const item = (await model.find())[0];
  await item.save();
  assert.equal(writes, 0);
  item.nested.value = 2;
  assert.equal((await model.find())[0].nested.value, 1);
  fail = true;
  await assert.rejects(item.save());
  assert.equal((await model.find())[0].nested.value, 1);
  fail = false;
  await item.save();
  assert.equal((await model.find())[0].nested.value, 2);
  await item.save();
  assert.equal(writes, 1);
  assert.equal(reads, 1);
});

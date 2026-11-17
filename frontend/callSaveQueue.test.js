import test from "node:test";
import assert from "node:assert/strict";
import { createCallSaveQueue } from "./callSaveQueue.js";

test("nearby edits to one contact share one write", async () => {
  const writes = [];
  const queue = createCallSaveQueue(async (_type, _id, patch) => {
    writes.push(patch);
    return { id: "one", ...patch };
  }, { delay: 10 });
  const first = queue.save("services", "one", { callStatus: "Completed" });
  const second = queue.save("services", "one", { interestStatus: "Interested", remark: "Call back" });
  const [a, b] = await Promise.all([first, second]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].remark, "Call back");
  assert.equal(a.remark, "Call back");
  assert.deepEqual(a, b);
});

test("edits arriving during a write are sent in order", async () => {
  const writes = [];
  let releaseFirst;
  const gate = new Promise((resolve) => { releaseFirst = resolve; });
  const queue = createCallSaveQueue(async (_type, _id, patch) => {
    writes.push(patch);
    if (writes.length === 1) await gate;
    return patch;
  }, { delay: 1 });
  const first = queue.save("services", "one", { remark: "first" });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const second = queue.save("services", "one", { remark: "second" });
  releaseFirst();
  await Promise.all([first, second]);
  assert.equal(writes.length, 2);
  assert.equal(writes[0].remark, "first");
  assert.equal(writes[1].remark, "second");
});

test("failed edits remain queued for a manual retry", async () => {
  let fail = true;
  const statuses = [];
  const queue = createCallSaveQueue(async (_type, _id, patch) => {
    if (fail) { const error = new Error("Conflict"); error.status = 409; throw error; }
    return patch;
  }, { delay: 1, onStatus: (item) => statuses.push(item.status) });
  await assert.rejects(queue.save("training", "one", { remark: "draft" }), /Conflict/);
  assert.equal(queue.hasPending(), true);
  fail = false;
  await queue.flush("training", "one");
  assert.equal(queue.hasPending(), false);
  assert.equal(statuses.at(-1), "saved");
});

test("the queue uses the latest saved revision for later edits", async () => {
  const revisions = [];
  const queue = createCallSaveQueue(async (_type, _id, patch) => {
    revisions.push(patch.expectedRevision);
    return { updatedAt: new Date().toISOString(), revision: patch.expectedRevision + 1 };
  }, { delay: 1 });
  await queue.save("services", "one", { remark: "first", expectedRevision: 2 });
  await queue.save("services", "one", { remark: "second", expectedRevision: 2 });
  assert.deepEqual(revisions, [2, 3]);
});

test("clearing a session discards queued customer edits", async () => {
  let writes = 0;
  const queue = createCallSaveQueue(async () => { writes += 1; }, { delay: 100 });
  const save = queue.save("services", "one", { remark: "private" });
  queue.clear();
  await assert.rejects(save, /Session ended/);
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(writes, 0);
});

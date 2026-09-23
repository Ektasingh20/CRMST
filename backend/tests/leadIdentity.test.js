import test from "node:test";
import assert from "node:assert/strict";
import { createLeadModel } from "../config/firestoreLeadModel.js";

test("same document name in different folders stays distinct when updating and deleting", async () => {
  const model = createLeadModel();
  const writes = [];
  const deletions = [];
  const records = ["Training A", "Training B"].map((interest, index) => {
    const ref = {
      id: "lead_19-09-2026", path: `leads/training/${interest}/lead_19-09-2026`,
      set: async (data) => writes.push({ path: ref.path, data }),
      delete: async () => deletions.push(ref.path),
    };
    return { ref, data: { id: ref.id, name: `Person ${index}`, interest } };
  });
  // Supply an in-memory Firestore snapshot through the cache loader.
  const { initializeApp, deleteApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = initializeApp({ projectId: "lead-identity-test" });
  const db = getFirestore(app);
  const original = db.collection;
  db.collection = () => ({ listDocuments: async () => [{ listCollections: async () => [{ get: async () => ({ docs: records.map(({ ref, data }) => ({ ref, data: () => data })) }) }] }] });
  try {
    const rows = await model.find();
    assert.notEqual(rows[0].id, rows[1].id);
    assert.equal(rows[0].id, records[0].ref.path);
    await model.findOneAndUpdate({ _id: rows[1]._id }, { id: rows[0].id, notes: "Only second record" });
    assert.equal(writes.length, 1);
    assert.equal(writes[0].path, records[1].ref.path);
    assert.equal(writes[0].data.id, records[1].ref.path);
    await model.findOneAndDelete({ id: rows[0].id });
    assert.deepEqual(deletions, [records[0].ref.path]);
  } finally {
    db.collection = original;
    await deleteApp(app);
  }
});

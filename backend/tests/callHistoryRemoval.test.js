import test, { mock } from "node:test";
import assert from "node:assert/strict";

const path = "listData/services/crmExecutives/crm_01/calls/call_1";
const savedLeadPath = "listData/services/crmExecutives/crm_01/calls/call_2";
const stored = new Map([[path, { callId: "call_1", listType: "services", assignedTo: "crm_01",
  callStatus: "", revision: 0, updatedAt: "2026-11-14T00:00:00.000Z" }],
[savedLeadPath, { callId: "call_2", listType: "services", assignedTo: "crm_01",
  callStatus: "Follow Up", interestStatus: "Interested", remark: "original", leadDraft: { name: "Saved lead" },
  revision: 0, updatedAt: "2026-11-14T00:00:00.000Z" }]]);
let updateCount = 0;
class DocumentRef {
  constructor(value) { this.path = value; this.id = value.split("/").at(-1); }
  collection(name) {
    if (name === "history") throw new Error("History documents must not be written.");
    return new CollectionRef(`${this.path}/${name}`);
  }
  async get() {
    const data = stored.get(this.path);
    return { id: this.id, ref: this, exists: Boolean(data), data: () => data && { ...data } };
  }
}
class CollectionRef {
  constructor(value) { this.path = value; }
  doc(id) { return new DocumentRef(`${this.path}/${id}`); }
}
const db = {
  collection: (name) => new CollectionRef(name),
  runTransaction: async (work) => work({
    get: (ref) => ref.get(),
    update: (ref, changes) => {
      updateCount += 1;
      stored.set(ref.path, { ...stored.get(ref.path), ...changes });
    },
  }),
};
mock.module("firebase-admin/firestore", { namedExports: {
  getFirestore: () => db,
  FieldPath: { documentId: () => "__name__" },
  FieldValue: { serverTimestamp: () => "SERVER_TIME" },
} });
const { updateCallRecord } = await import("../config/firestoreCallListModel.js");

test("a committed edit updates one call document and its retry does not add a write", async () => {
  const patch = { callStatus: "Pending", mutationId: "save_12345678", expectedRevision: 0 };
  const first = await updateCallRecord("services", "call_1", patch, "crm_01", "crm_01");
  const retry = await updateCallRecord("services", "call_1", patch, "crm_01", "crm_01");
  assert.equal(first.revision, 1);
  assert.equal(retry.revision, 1);
  assert.equal(updateCount, 1);
  assert.equal(stored.get(path).lastMutationId, patch.mutationId);
});

test("a saved lead form locks every field except Follow Up changing to Completed", async () => {
  await assert.rejects(
    updateCallRecord("services", "call_2", { remark: "must not change", mutationId: "locked_remark_1", expectedRevision: 0 }, "crm_01", "crm_01"),
    (error) => error.status === 409 && /only Follow Up can change to Completed/.test(error.message),
  );
  assert.equal(stored.get(savedLeadPath).remark, "original");

  const completed = await updateCallRecord("services", "call_2", {
    callStatus: "Completed", mutationId: "complete_saved_1", expectedRevision: 0,
  }, "crm_01", "crm_01");
  assert.equal(completed.callStatus, "Completed");

  await assert.rejects(
    updateCallRecord("services", "call_2", { callStatus: "Follow Up", mutationId: "reopen_saved_1", expectedRevision: 1 }, "crm_01", "crm_01"),
    (error) => error.status === 409,
  );
});

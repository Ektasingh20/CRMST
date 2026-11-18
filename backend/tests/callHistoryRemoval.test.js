import test, { mock } from "node:test";
import assert from "node:assert/strict";

const path = "listData/services/crmExecutives/crm_01/calls/call_1";
const savedLeadPath = "listData/services/crmExecutives/crm_01/calls/call_2";
const approvedLeadPath = "listData/services/crmExecutives/crm_01/calls/call_3";
const stored = new Map([[path, { callId: "call_1", listType: "services", assignedTo: "crm_01",
  callStatus: "", revision: 0, updatedAt: "2026-11-14T00:00:00.000Z" }],
[savedLeadPath, { callId: "call_2", listType: "services", assignedTo: "crm_01",
  callStatus: "Follow Up", interestStatus: "Interested", remark: "original", leadDraft: { name: "Saved lead" },
  revision: 0, updatedAt: "2026-11-14T00:00:00.000Z" }],
[approvedLeadPath, { callId: "call_3", listType: "services", assignedTo: "crm_01",
  callStatus: "Follow Up", callLeadStatus: "Approved", leadCreated: true, remark: "approved remark",
  leadDraft: { name: "Approved lead" }, revision: 0, updatedAt: "2026-11-14T00:00:00.000Z" }]]);
let updateCount = 0;
let nextGeneratedId = 0;
const batchWrites = [];
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
  doc(id) { return new DocumentRef(`${this.path}/${id || `generated_${++nextGeneratedId}`}`); }
}
const db = {
  collection: (name) => new CollectionRef(name),
  collectionGroup: () => ({ where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) }),
  batch: () => ({
    set: (ref, data) => batchWrites.push({ path: ref.path, data }),
    commit: async () => {},
  }),
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
const { createCallRecord, updateCallRecord } = await import("../config/firestoreCallListModel.js");

test("manual call contacts can be saved without service, call status, or remark", async () => {
  const created = await createCallRecord("services", {
    name: "Ganesh",
    contact: "8948957545",
    serviceId: "",
    callStatus: "",
    remark: "",
  }, { id: "crm_01" });

  assert.equal(created.program, "");
  assert.equal(created.serviceId, "");
  assert.equal(created.callStatus, "");
  assert.equal(created.remark, "");
  assert.ok(batchWrites.some(({ data }) => data.callId === created.id));
});

test("a committed edit updates one call document and its retry does not add a write", async () => {
  const patch = { callStatus: "Pending", mutationId: "save_12345678", expectedRevision: 0 };
  const first = await updateCallRecord("services", "call_1", patch, "crm_01", "crm_01");
  const retry = await updateCallRecord("services", "call_1", patch, "crm_01", "crm_01");
  assert.equal(first.revision, 1);
  assert.equal(retry.revision, 1);
  assert.equal(updateCount, 1);
  assert.equal(stored.get(path).lastMutationId, patch.mutationId);
});

test("CRM can edit a saved lead contact until approval, except its name and number", async () => {
  const updated = await updateCallRecord("services", "call_2", {
    remark: "Updated remark",
    interestStatus: "Not Interested",
    program: "Updated service",
    callLeadStatus: "Rejected",
    callLeadStatusSelected: true,
    mutationId: "draft_edit_123",
    expectedRevision: 0,
  }, "crm_01", "crm_01");
  assert.equal(updated.remark, "Updated remark");
  assert.equal(updated.interestStatus, "Not Interested");
  assert.equal(updated.program, "Updated service");
  assert.equal(updated.callLeadStatus, "Rejected");

  await assert.rejects(
    updateCallRecord("services", "call_2", { name: "Changed name", mutationId: "locked_name_123", expectedRevision: 1 }, "crm_01", "crm_01"),
    (error) => error.status === 409 && /only Follow Up can change to Completed/.test(error.message),
  );
  await assert.rejects(
    updateCallRecord("services", "call_2", { contact: "9876543210", mutationId: "locked_phone_123", expectedRevision: 1 }, "crm_01", "crm_01"),
    (error) => error.status === 409,
  );
  await assert.rejects(
    updateCallRecord("services", "call_2", { remark: "Admin edit", mutationId: "admin_edit_123", expectedRevision: 1 }, "crm_01", ""),
    (error) => error.status === 409,
  );
  await assert.rejects(
    updateCallRecord("services", "call_2", { callLeadStatus: "Approved", mutationId: "approve_bypass_123", expectedRevision: 1 }, "crm_01", "crm_01"),
    (error) => error.status === 409,
  );

  const completed = await updateCallRecord("services", "call_2", {
    callStatus: "Completed", mutationId: "complete_saved_1", expectedRevision: 1,
  }, "crm_01", "crm_01");
  assert.equal(completed.callStatus, "Completed");

  await assert.rejects(
    updateCallRecord("services", "call_2", { callStatus: "Follow Up", mutationId: "reopen_saved_1", expectedRevision: 2 }, "crm_01", "crm_01"),
    (error) => error.status === 409,
  );
});

test("approved CRM leads allow call actions and Follow Up completion, but not detail edits", async () => {
  const called = await updateCallRecord("services", "call_3", {
    callClicked: true, mutationId: "approved_call_123", expectedRevision: 0,
  }, "crm_01", "crm_01");
  assert.equal(called.lastCallClickedAt !== undefined, true);

  const messaged = await updateCallRecord("services", "call_3", {
    whatsappClicked: true, mutationId: "approved_whats_123", expectedRevision: 1,
  }, "crm_01", "crm_01");
  assert.equal(messaged.whatsappClicked, true);

  await assert.rejects(
    updateCallRecord("services", "call_3", { remark: "Cannot edit", mutationId: "approved_edit_123", expectedRevision: 2 }, "crm_01", "crm_01"),
    (error) => error.status === 409,
  );
  const completed = await updateCallRecord("services", "call_3", {
    callStatus: "Completed", mutationId: "approved_done_123", expectedRevision: 2,
  }, "crm_01", "crm_01");
  assert.equal(completed.callStatus, "Completed");
});

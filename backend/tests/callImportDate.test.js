import test, { mock } from "node:test";
import assert from "node:assert/strict";

const documents = new Map();
let existingContacts = [];
class DocumentRef {
  constructor(path) { this.path = path; this.id = path.split("/").at(-1); }
  collection(name) {
    if (name === "history") throw new Error("Import must not create history documents.");
    return new CollectionRef(`${this.path}/${name}`);
  }
  async get() {
    const data = documents.get(this.path);
    return { id: this.id, ref: this, exists: Boolean(data), data: () => data };
  }
  async create(data) { documents.set(this.path, data); }
  async set(data) { documents.set(this.path, data); }
}
class CollectionRef {
  constructor(path) { this.path = path; }
  doc(id) { return new DocumentRef(`${this.path}/${id}`); }
}
const db = {
  collection: (name) => new CollectionRef(name),
  collectionGroup: () => ({ where: (field, operator, value) => ({ get: async () => ({
    docs: existingContacts.filter((contact) => field === "contact" && operator === "in" && value.includes(contact))
      .map((contact) => ({ data: () => ({ contact, uploadBatchId: "another_batch" }) })),
  }) }) }),
  batch: () => {
    const writes = [];
    return {
      set: (ref, data) => writes.push([ref, data]),
      create: (ref, data) => writes.push([ref, data]),
      commit: async () => writes.forEach(([ref, data]) => documents.set(ref.path, data)),
    };
  },
};
mock.module("firebase-admin/firestore", { namedExports: {
  getFirestore: () => db,
  FieldPath: { documentId: () => "__name__" },
  FieldValue: { serverTimestamp: () => "SERVER_TIME" },
} });
const { importCallRecords, uploadDayInIndia } = await import("../config/firestoreCallListModel.js");

test("import keeps each supplied contact date separate from the upload timestamp", async () => {
  const rows = await importCallRecords({ listType: "services", assignedTo: "crm_01", uploadedBy: "admin",
    uploadBatchId: "batch_date_123", rows: [
      { date: "01-08-2026", name: "First", contact: "9876543210" },
      { date: "2026-08-02", name: "Second", contact: "9876543211" },
    ] });
  assert.deepEqual(rows.map((row) => row.date), ["2026-08-01", "2026-08-02"]);
  assert.ok(rows.every((row) => row.uploadDate === uploadDayInIndia(row.createdAt)));
  assert.ok(documents.has("listData/services/crmExecutives/crm_01/dates/2026-08-01"));
  assert.ok(documents.has("listData/services/crmExecutives/crm_01/dates/2026-08-02"));
  assert.equal([...documents.keys()].filter((path) => path.includes("/dates/2026-08-01/calls/")).length, 1);
  assert.equal([...documents.keys()].filter((path) => path.includes("/dates/2026-08-02/calls/")).length, 1);
  assert.equal([...documents.keys()].filter((path) => path === "listData/services/crmExecutives/crm_01/calls").length, 0);
  assert.ok([...documents.keys()].every((path) => !path.includes("/history/")));
});

test("two-column imports still use the actual upload day", async () => {
  const rows = await importCallRecords({ listType: "training", assignedTo: "crm_01", uploadedBy: "admin",
    uploadBatchId: "batch_date_456", rows: [{ name: "Third", contact: "9876543212" }] });
  assert.equal(rows[0].date, rows[0].uploadDate);
  assert.ok([...documents.keys()].some((path) => path.includes(`/dates/${rows[0].date}/calls/`)));
});

test("invalid supplied dates stop the import before creating a batch", async () => {
  const before = documents.size;
  await assert.rejects(importCallRecords({ listType: "services", assignedTo: "crm_01", uploadedBy: "admin",
    uploadBatchId: "batch_date_789", rows: [{ excelRow: 7, date: "31-02-2026", name: "Fourth", contact: "9876543213" }] }),
  (error) => error.status === 422 && error.issues[0].row === 7 && error.issues[0].field === "Date");
  assert.equal(documents.size, before);
});

test("all invalid rows are returned together and no upload document is created", async () => {
  const before = documents.size;
  await assert.rejects(importCallRecords({ listType: "services", assignedTo: "crm_01", uploadedBy: "admin",
    uploadBatchId: "batch_bad_rows_123", rows: [
      { excelRow: 2, date: "01-08-2026", name: "", contact: "9876543214" },
      { excelRow: 9, date: "2026-08-02", name: "Second", contact: "abc" },
    ] }), (error) => error.status === 422 && error.issues.length === 2
      && error.issues[0].row === 2 && error.issues[1].row === 9);
  assert.equal(documents.size, before);
});

test("a number already in CRM blocks the entire file before writing a batch", async () => {
  const before = documents.size;
  existingContacts = ["9876543215"];
  try {
    await assert.rejects(importCallRecords({ listType: "services", assignedTo: "crm_01", uploadedBy: "admin",
      uploadBatchId: "batch_duplicate_123", rows: [
        { excelRow: 3, name: "New", contact: "9876543216" },
        { excelRow: 6, name: "Existing", contact: "9876543215" },
      ] }), (error) => error.status === 422 && error.issues.length === 1 && error.issues[0].row === 6);
    assert.equal(documents.size, before);
  } finally { existingContacts = []; }
});

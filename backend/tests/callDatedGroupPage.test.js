import test, { mock } from "node:test";
import assert from "node:assert/strict";

const docs = Array.from({ length: 32 }, (_, index) => {
  const day = index < 16 ? "2026-11-13" : "2026-11-14";
  const type = index % 2 ? "training" : "services";
  const assignedTo = index % 3 ? "crm_01" : "crm_02";
  const id = `call_${String(index).padStart(2, "0")}`;
  const path = `listData/${type}/crmExecutives/${assignedTo}/dates/${day}/calls/${id}`;
  const data = { callId: id, listType: type, assignedTo, date: day,
    createdAt: `2026-11-14T${String(Math.floor(index / 2)).padStart(2, "0")}:00:00.000Z`, name: id };
  return { id, ref: { path }, data: () => data };
});

class Query {
  constructor(filters = [], count = Infinity, after = null) {
    this.filters = filters; this.count = count; this.after = after;
  }
  where(field, operator, value) { return new Query([...this.filters, [field, operator, value]], this.count, this.after); }
  orderBy() { return this; }
  limit(count) { return new Query(this.filters, count, this.after); }
  startAfter(createdAt, path) { return new Query(this.filters, this.count, [createdAt, path]); }
  async get() {
    const matching = docs.filter((doc) => this.filters.every(([field, , value]) => doc.data()[field] === value))
      .sort((a, b) => b.data().createdAt.localeCompare(a.data().createdAt) || b.ref.path.localeCompare(a.ref.path))
      .filter((doc) => !this.after || doc.data().createdAt < this.after[0]
        || (doc.data().createdAt === this.after[0] && doc.ref.path < this.after[1]))
      .slice(0, this.count);
    return { docs: matching, size: matching.length };
  }
}
const db = { collectionGroup: () => new Query() };
mock.module("firebase-admin/firestore", { namedExports: {
  getFirestore: () => db,
  FieldPath: { documentId: () => "__name__" },
  FieldValue: { serverTimestamp: () => "SERVER_TIME" },
} });
const { pageAdminCallRecords } = await import("../config/firestoreCallListModel.js");

test("indexed group pages visit calls across date folders once", async () => {
  const first = await pageAdminCallRecords({ limit: 25 });
  const second = await pageAdminCallRecords({ limit: 25, cursor: first.nextCursor });
  assert.equal(first.items.length, 25);
  assert.equal(second.items.length, 7);
  assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.items, ...second.items].map((row) => row.id)).size, 32);
});

test("indexed employee filter spans service and training date folders", async () => {
  const page = await pageAdminCallRecords({ assignedTo: "crm_02", limit: 25 });
  assert.equal(page.items.length, docs.filter((doc) => doc.data().assignedTo === "crm_02").length);
  assert.ok(page.items.every((row) => row.assignedTo === "crm_02"));
});

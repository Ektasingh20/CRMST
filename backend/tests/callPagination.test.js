import test, { mock } from "node:test";
import assert from "node:assert/strict";

const records = new Map();
let aggregateReads = 0;
class DocumentRef {
  constructor(path) { this.path = path; this.id = path.split("/").at(-1); }
  collection(name) { return new CollectionRef(`${this.path}/${name}`); }
  async get() {
    const collectionPath = this.path.split("/").slice(0, -1).join("/");
    const match = (records.get(collectionPath) || []).find((record) => record.id === this.id);
    return { id: this.id, ref: this, exists: Boolean(match), data: () => match?.data };
  }
}
class CollectionRef {
  constructor(path) { this.path = path; }
  doc(id) { return new DocumentRef(`${this.path}/${id}`); }
  async listDocuments() {
    const prefix = `${this.path}/`;
    return [...new Set([...records.keys()].filter((path) => path.startsWith(prefix)).map((path) => path.slice(prefix.length).split("/")[0]))]
      .map((id) => this.doc(id));
  }
  where(field, operator, value) { return new Query(this).where(field, operator, value); }
  orderBy(field, direction) { return new Query(this).orderBy(field, direction); }
  async get() { return new Query(this).get(); }
  count() { return { get: async () => {
    aggregateReads += 1;
    return { data: () => ({ count: (records.get(this.path) || []).length }) };
  } }; }
}
class Query {
  constructor(collection) { this.collection = collection; this.filters = []; this.max = Infinity; this.after = null; }
  where(field, operator, value) { this.filters.push([field, operator, value]); return this; }
  orderBy() { return this; }
  limit(value) { this.max = value; return this; }
  startAfter(createdAt, id) { this.after = [createdAt, id]; return this; }
  async get() {
    const docs = (records.get(this.collection.path) || []).map(({ id, data }) => ({
      id, ref: new DocumentRef(`${this.collection.path}/${id}`), data: () => data,
    })).filter((doc) => this.filters.every(([field, operator, value]) => {
      const actual = String(doc.data()[field] || "");
      if (operator === ">") return actual > value;
      if (operator === ">=") return actual >= value;
      if (operator === "<") return actual < value;
      return doc.data()[field] === value;
    }))
      .sort((left, right) => String(right.data().createdAt || "").localeCompare(String(left.data().createdAt || "")) || right.id.localeCompare(left.id))
      .filter((doc) => !this.after || String(doc.data().createdAt).localeCompare(this.after[0]) < 0
        || (doc.data().createdAt === this.after[0] && doc.id.localeCompare(this.after[1]) < 0))
      .slice(0, this.max);
    return { docs, size: docs.length, empty: docs.length === 0 };
  }
}
const db = {
  collection: (name) => new CollectionRef(name),
  collectionGroup: () => {
    const query = { where: () => query, orderBy: () => query, limit: () => query,
      get: async () => { throw Object.assign(new Error("Index is building."), { code: 9 }); } };
    return query;
  },
};
mock.module("firebase-admin/firestore", { namedExports: {
  getFirestore: () => db,
  FieldPath: { documentId: () => "__name__" },
  FieldValue: { serverTimestamp: () => "SERVER_TIME" },
} });
const { pageAdminCallRecords, countAllCallRecords, listCallRecords, getCallRecord, clearCallListReadCache } = await import("../config/firestoreCallListModel.js");

for (const type of ["services", "training"]) {
  for (const employee of ["crm_01", "crm_02", "crm_03"]) {
    const path = `listData/${type}/crmExecutives/${employee}/calls`;
    records.set(path, Array.from({ length: 12 }, (_, index) => ({
      id: `${employee}_${String(index).padStart(2, "0")}`,
      data: { listType: type, assignedTo: employee, createdAt: `2026-11-${String(14 - Math.floor(index / 4)).padStart(2, "0")}T10:00:00.000Z`,
        name: index === 0 && employee === "crm_01" ? "Pooja Sharma" : "Other customer",
        contact: index === 0 && employee === "crm_01" ? "9876543210" : "9123456780",
        program: index % 2 ? "Website Development" : "",
        callStatus: index % 2 ? "Completed" : "Pending",
        interestStatus: index % 2 ? "Interested" : "Not Interested" },
    })));
  }
}

test("admin pagination visits every call once across employee and type streams", async () => {
  const seen = new Set();
  let cursor = "";
  let pages = 0;
  do {
    const result = await pageAdminCallRecords({ limit: 25, cursor });
    assert.ok(result.items.length <= 25);
    result.items.forEach((row) => seen.add(`${row.listType}:${row.id}`));
    cursor = result.nextCursor || "";
    pages += 1;
    assert.ok(pages < 10);
  } while (cursor);
  assert.equal(seen.size, 72);
  assert.equal((await countAllCallRecords()).total, 72);
  const readsAfterFirstCount = aggregateReads;
  assert.equal((await countAllCallRecords()).total, 72);
  assert.equal(aggregateReads, readsAfterFirstCount);
});

test("employee and type filters keep the cursor scoped", async () => {
  const first = await pageAdminCallRecords({ type: "services", assignedTo: "crm_01", limit: 5 });
  assert.equal(first.items.length, 5);
  assert.ok(first.items.every((row) => row.listType === "services" && row.assignedTo === "crm_01"));
  const second = await pageAdminCallRecords({ type: "services", assignedTo: "crm_01", limit: 5, cursor: first.nextCursor });
  assert.equal(second.items.length, 5);
  assert.equal(new Set([...first.items, ...second.items].map((row) => row.id)).size, 10);
  await assert.rejects(pageAdminCallRecords({ type: "training", assignedTo: "crm_01", cursor: first.nextCursor }), /cursor does not match/);
});

test("admin filters keep exact results and cursor positions", async () => {
  const seen = new Set();
  let cursor = "";
  do {
    const page = await pageAdminCallRecords({ callStatus: "Completed", interest: "Interested", program: "Website Development", limit: 7, cursor });
    page.items.forEach((row) => {
      assert.equal(row.callStatus, "Completed");
      assert.equal(row.interestStatus, "Interested");
      seen.add(`${row.listType}:${row.id}`);
    });
    cursor = page.nextCursor || "";
  } while (cursor);
  assert.equal(seen.size, 36);
  const first = await pageAdminCallRecords({ callStatus: "Completed", limit: 5 });
  await assert.rejects(pageAdminCallRecords({ callStatus: "Pending", limit: 5, cursor: first.nextCursor }), /cursor does not match/);
});

test("date range and name or phone search page only matching calls", async () => {
  const datePage = await pageAdminCallRecords({ fromDate: "2026-11-13", toDate: "2026-11-13", limit: 50 });
  assert.equal(datePage.items.length, 24);
  assert.ok(datePage.items.every((row) => row.createdAt.startsWith("2026-11-13")));
  const namePage = await pageAdminCallRecords({ search: "pooja" });
  assert.equal(namePage.items.length, 2);
  const phonePage = await pageAdminCallRecords({ search: "98765" });
  assert.equal(phonePage.items.length, 2);
  await assert.rejects(pageAdminCallRecords({ fromDate: "2026-11-15", toDate: "2026-11-13" }), /Invalid date range/);
});

test("date filtering uses the date supplied for a contact, not the upload timestamp", async () => {
  const row = records.get("listData/services/crmExecutives/crm_01/calls")[0];
  row.data.date = "2026-08-01";
  try {
    const page = await pageAdminCallRecords({ fromDate: "2026-08-01", toDate: "2026-08-01" });
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].id, row.id);
  } finally { delete row.data.date; }
});

test("employee records remain available while collection-group indexes are building", async () => {
  const delegated = records.get("listData/services/crmExecutives/crm_02/calls")[0];
  delegated.data.callLeadAssignedTo = "crm_01";
  try {
    const rows = await listCallRecords("", "crm_01");
    assert.equal(rows.length, 25);
    assert.ok(rows.every((row) => row.assignedTo === "crm_01" || row.callLeadAssignedTo === "crm_01"));
  } finally { delete delegated.data.callLeadAssignedTo; }
});

test("a later request does not return contacts deleted outside the API", async () => {
  const path = "listData/services/crmExecutives/crm_01/calls";
  const original = records.get(path);
  const before = await listCallRecords("services", "crm_01");
  assert.ok(before.length > 0);
  records.set(path, []);
  try {
    clearCallListReadCache();
    const after = await listCallRecords("services", "crm_01");
    assert.equal(after.some((row) => row.assignedTo === "crm_01"), false);
  } finally { records.set(path, original); }
});

test("call lookup falls back to direct collections without a callId group index", async () => {
  const row = await getCallRecord("services", "crm_02_00", "crm_03");
  assert.equal(row.id, "crm_02_00");
  assert.equal(row.assignedTo, "crm_02");
});

test("dated call folders appear beside older direct calls in pages, counts, and lookups", async () => {
  const path = "listData/services/crmExecutives/crm_03/dates/2026-08-01/calls";
  records.set(path, [{ id: "dated_01", data: { callId: "dated_01", listType: "services", assignedTo: "crm_03",
    date: "2026-08-01", createdAt: "2026-11-15T10:00:00.000Z", name: "Dated contact", contact: "9876543219" } }]);
  try {
    assert.equal((await countAllCallRecords()).total, 73);
    const page = await pageAdminCallRecords({ type: "services", assignedTo: "crm_03", limit: 5 });
    assert.equal(page.items[0].id, "dated_01");
    assert.equal((await getCallRecord("services", "dated_01", "crm_03")).name, "Dated contact");
    const employee = await listCallRecords("services", "crm_03");
    assert.ok(employee.some((row) => row.id === "dated_01"));
  } finally { records.delete(path); }
});

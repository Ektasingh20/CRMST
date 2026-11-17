import test, { mock } from "node:test";
import assert from "node:assert/strict";

let nestedReads = 0;
let legacyReads = 0;

const taskData = {
  id: "TASK-1", title: "Cached task", assigneeId: "crm_01", assignee: "Ram",
  createdAt: "2026-11-14T10:00:00.000Z",
};

class Ref {
  constructor(path) { this.path = path; this.id = path.split("/").at(-1); }
  collection(name) { return new Collection(`${this.path}/${name}`); }
  async get() { return { exists: false, ref: this, id: this.id, data: () => undefined }; }
  async delete() {}
}

class Query {
  constructor(kind) { this.kind = kind; }
  limit() { return this; }
  async get() {
    if (this.kind === "legacy") legacyReads += 1;
    return { docs: [] };
  }
}

class Collection {
  constructor(path) { this.path = path; }
  doc(id) { return new Ref(`${this.path}/${id || "auto"}`); }
  where() { return new Query("legacy"); }
  async get() {
    if (this.path === "tasks/crm_01/assignedTasks") {
      nestedReads += 1;
      const ref = new Ref(`${this.path}/${taskData.id}`);
      return { docs: [{ id: taskData.id, ref, data: () => ({ ...taskData }) }] };
    }
    return { docs: [] };
  }
}

const db = {
  collection: (name) => new Collection(name),
  collectionGroup: () => new Query("group"),
  batch: () => ({ set() {}, delete() {}, async commit() {} }),
};

mock.module("firebase-admin/firestore", { namedExports: { getFirestore: () => db } });
const { default: Task } = await import("../models/Task.js");

test("repeated task loads share the short cache and a write invalidates it", async () => {
  const first = await Task.findForUser("crm_01");
  const second = await Task.findForUser("crm_01");
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(nestedReads, 1);
  assert.equal(legacyReads, 1);

  await Task.create({ ...taskData, id: "TASK-2" });
  await Task.findForUser("crm_01");
  assert.equal(nestedReads, 2);
  assert.equal(legacyReads, 2);
});

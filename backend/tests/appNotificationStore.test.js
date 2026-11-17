import test, { mock } from "node:test";
import assert from "node:assert/strict";

const records = new Map();
let collectionReads = 0;

function snapshot(path) {
  return {
    id: path.split("/").at(-1),
    ref: document(path),
    exists: records.has(path),
    data: () => records.get(path),
  };
}

function document(path) {
  return {
    id: path.split("/").at(-1),
    path,
    collection: (name) => collection(`${path}/${name}`),
    get: async () => snapshot(path),
    update: async (data) => records.set(path, { ...records.get(path), ...data }),
  };
}

function collection(path, filter = () => true) {
  const query = {
    path,
    doc: (id) => document(`${path}/${id}`),
    where: (field, operator, value) => collection(path, (data) => operator === "==" && data[field] === value),
    orderBy() { return this; },
    limit() { return this; },
    get: async () => {
      collectionReads += 1;
      return ({
      docs: [...records.entries()]
        .filter(([key, data]) => key.startsWith(`${path}/`) && key.split("/").length === path.split("/").length + 1 && filter(data))
        .map(([key]) => snapshot(key)),
      });
    },
  };
  return query;
}

const db = {
  collection,
  batch() {
    const writes = [];
    return {
      set: (ref, data, options) => writes.push({ ref, data, options }),
      async commit() {
        writes.forEach(({ ref, data, options }) => records.set(ref.path, options?.merge ? { ...records.get(ref.path), ...data } : data));
      },
    };
  },
};

const staffRef = document("users/crm/members/crm_03");
const users = new Map([
  ["crm_03", { _id: "crm_03", id: "crm_03", name: "CRM User", dept: "CRM", role: "CRM Executive", _ref: staffRef }],
  ["student_10004", { _id: "student_10004", id: "student_10004", name: "Student Name", dept: "Student", role: "Student" }],
]);

mock.module("firebase-admin/firestore", { namedExports: { getFirestore: () => db } });
mock.module("../models/User.js", { defaultExport: {
  findById: (id) => Promise.resolve(users.has(String(id)) ? [users.get(String(id))] : []),
  findOne: async ({ id }) => users.get(String(id)) || null,
} });

const { createAppNotification, listAppNotifications, markAppNotificationRead } = await import("../services/appNotificationStore.js");

test("staff notifications are nested below the immutable user document", async () => {
  records.clear();
  await createAppNotification("crm_03", { id: "NOTIF-staff", type: "task_assigned", message: "A task was assigned." });
  const path = "users/crm/members/crm_03/notifications/NOTIF-staff";
  assert.equal(records.get(path).recipientId, "crm_03");
  assert.equal(records.get(path).recipientName, "CRM User");
  assert.equal(records.has("notifications/NOTIF-staff"), false);
});

test("student notifications use the student ID folder and store the display name as metadata", async () => {
  records.clear();
  await createAppNotification("student_10004", { id: "NOTIF-student", type: "course_update", message: "Course updated." });
  assert.deepEqual(records.get("students/student_10004"), { studentId: "student_10004", studentName: "Student Name" });
  assert.equal(records.get("students/student_10004/notifications/NOTIF-student").recipientId, "student_10004");
});

test("reads merge legacy records during rollout and updates nested records in place", async () => {
  records.clear();
  records.set("users/crm/members/crm_03/notifications/NOTIF-new", { id: "NOTIF-new", recipientId: "crm_03", message: "New", read: false, createdAt: "2026-11-17T10:00:00.000Z" });
  records.set("notifications/NOTIF-old", { id: "NOTIF-old", recipientId: "crm_03", message: "Old", read: false, createdAt: "2026-11-16T10:00:00.000Z" });
  assert.deepEqual((await listAppNotifications("crm_03")).map((item) => item.id), ["NOTIF-new", "NOTIF-old"]);
  assert.equal((await markAppNotificationRead("crm_03", "NOTIF-new")).read, true);
  assert.equal(records.get("users/crm/members/crm_03/notifications/NOTIF-new").read, true);
});

test("repeated notification polling reuses the recipient snapshot", async () => {
  records.clear();
  records.set("students/student_10004/notifications/NOTIF-cache", { id: "NOTIF-cache", recipientId: "student_10004", message: "Cached", read: false, createdAt: "2026-11-17T11:00:00.000Z" });
  collectionReads = 0;
  assert.equal((await listAppNotifications("student_10004")).length, 1);
  const readsAfterFirstLoad = collectionReads;
  assert.ok(readsAfterFirstLoad > 0);
  assert.equal((await listAppNotifications("student_10004")).length, 1);
  assert.equal(collectionReads, readsAfterFirstLoad);
});

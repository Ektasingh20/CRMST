import test, { mock } from "node:test";
import assert from "node:assert/strict";

const conversations = new Map();
const arrayUnion = (...values) => ({ __arrayUnion: values });

function makeDocument(id) {
  const record = conversations.get(id);
  const ref = {
    path: `hrHelpdeskConversations/${id}`,
    get: async () => makeDocument(id),
    update: async (updates) => {
      for (const [key, value] of Object.entries(updates)) {
        record[key] = value?.__arrayUnion
          ? [...new Set([...(record[key] || []), ...value.__arrayUnion])]
          : value;
      }
    },
    collection: () => ({
      orderBy() { return this; },
      limit() { return this; },
      get: async () => ({ docs: [] }),
    }),
  };
  return {
    id,
    exists: Boolean(record),
    data: () => record,
    ref,
  };
}

function makeQuery(filters = []) {
  return {
    where(field, operation, value) {
      return makeQuery([...filters, [field, operation, value]]);
    },
    orderBy() { return this; },
    limit() { return this; },
    get: async () => ({
      docs: [...conversations.entries()]
        .filter(([, record]) => filters.every(([field, operation, value]) => operation === "array-contains"
          ? (record[field] || []).includes(value)
          : record[field] === value))
        .map(([id]) => makeDocument(id)),
    }),
  };
}

mock.module("firebase-admin/firestore", { namedExports: {
  FieldValue: { arrayUnion },
  getFirestore: () => ({
    collection: () => ({
      doc: (id) => makeDocument(id).ref,
      ...makeQuery(),
    }),
  }),
} });
mock.module("../middleware/auth.js", { namedExports: { authenticate: (req, res, next) => next() } });
mock.module("../utils/roles.js", { namedExports: {
  isAdmin: (user) => user?.role === "Admin",
  isHrUser: (user) => user?.role === "HR",
} });
mock.module("../models/User.js", { defaultExport: {} });
mock.module("../../frontend/src/itUserRoles.js", { namedExports: { isITDepartment: (user) => user?.dept === "IT" } });

const { default: router } = await import("../routes/hrHelpdesk.js");
const conversationId = "8f31c82b-3ba7-4e1b-8a77-3dd854f132e9";
const employee = { id: "crm-1", role: "CRM Executive", dept: "CRM" };
const hr = { id: "hr-1", role: "HR", dept: "HR" };

function response() {
  return {
    code: 200,
    status(code) { this.code = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

async function callRoute(path, method, user, params = {}) {
  const layer = router.stack.find((item) => item.route?.path === path && item.route.methods[method]);
  const res = response();
  await layer.route.stack[0].handle({ user, params }, res);
  return res;
}

test("deleting a conversation hides it only for the signed-in participant", async () => {
  conversations.clear();
  conversations.set(conversationId, {
    subject: "Schedule question",
    createdById: employee.id,
    participantIds: [employee.id, hr.id],
    hiddenFor: [],
    updatedAt: new Date().toISOString(),
  });

  const deleted = await callRoute("/conversations/:id", "delete", employee, { id: conversationId });
  const employeeList = await callRoute("/conversations", "get", employee);
  const hrList = await callRoute("/conversations", "get", hr);

  assert.equal(deleted.code, 200);
  assert.deepEqual(conversations.get(conversationId).hiddenFor, [employee.id]);
  assert.deepEqual(employeeList.body, []);
  assert.equal(hrList.body.length, 1);
});

test("a participant cannot reopen a conversation after hiding it", async () => {
  conversations.clear();
  conversations.set(conversationId, {
    subject: "Schedule question",
    createdById: employee.id,
    participantIds: [employee.id, hr.id],
    hiddenFor: [employee.id],
  });

  const result = await callRoute("/conversations/:id/messages", "get", employee, { id: conversationId });

  assert.equal(result.code, 404);
  assert.equal(result.body.error, "Helpdesk conversation not found.");
});

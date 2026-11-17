import test, { mock } from "node:test";
import assert from "node:assert/strict";

const conversations = new Map();
const arrayUnion = (...values) => ({ __arrayUnion: values });

function makeDocument(owner, id) {
  const record = conversations.get(`${owner}/${id}`);
  const ref = {
    path: `hrHelpdeskEmployees/${owner}/hrHelpdeskThreads/${id}`,
    get: async () => makeDocument(owner, id),
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
  return { id, exists: Boolean(record), data: () => record, ref };
}

function makeQuery(owner = null, filters = []) {
  return {
    where(field, operation, value) {
      return makeQuery(owner, [...filters, [field, operation, value]]);
    },
    orderBy() { return this; },
    limit() { return this; },
    get: async () => ({
      docs: [...conversations.entries()]
        .filter(([key, record]) => (!owner || key.startsWith(`${owner}/`))
          && filters.every(([field, operation, value]) => operation === "array-contains"
            ? (record[field] || []).includes(value)
            : record[field] === value))
        .map(([key]) => {
          const [employeeId, id] = key.split("/");
          return makeDocument(employeeId, id);
        }),
    }),
  };
}

mock.module("firebase-admin/firestore", { namedExports: {
  FieldValue: { arrayUnion },
  getFirestore: () => ({
    collection: (name) => ({
      doc: (owner) => name === "hrHelpdeskEmployees"
        ? { collection: () => ({ doc: (id) => makeDocument(owner, id).ref, ...makeQuery(owner) }) }
        : { get: async () => ({ exists: false }) },
      ...makeQuery(),
    }),
    collectionGroup: () => makeQuery(),
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

async function callRoute(routePath, method, user, params = {}, query = {}) {
  const layer = router.stack.find((item) => item.route?.path === routePath && item.route.methods[method]);
  const res = response();
  await layer.route.stack[0].handle({ user, params, query, body: {} }, res);
  return res;
}

test("deleting a conversation hides it only for the signed-in participant", async () => {
  conversations.clear();
  conversations.set(`${employee.id}/${conversationId}`, {
    conversationId,
    employeeId: employee.id,
    subject: "Schedule question",
    createdById: employee.id,
    participantIds: [employee.id, hr.id],
    hiddenFor: [],
    updatedAt: new Date().toISOString(),
  });

  const deleted = await callRoute("/conversations/:id", "delete", employee, { id: conversationId }, { employeeId: employee.id });
  const employeeList = await callRoute("/conversations", "get", employee);
  const hrList = await callRoute("/conversations", "get", hr);

  assert.equal(deleted.code, 200);
  assert.deepEqual(conversations.get(`${employee.id}/${conversationId}`).hiddenFor, [employee.id]);
  assert.deepEqual(employeeList.body, []);
  assert.equal(hrList.body.length, 1);
});

test("a participant cannot reopen a conversation after hiding it", async () => {
  conversations.clear();
  conversations.set(`${employee.id}/${conversationId}`, {
    conversationId,
    employeeId: employee.id,
    subject: "Schedule question",
    createdById: employee.id,
    participantIds: [employee.id, hr.id],
    hiddenFor: [employee.id],
  });

  const result = await callRoute("/conversations/:id/messages", "get", employee, { id: conversationId }, { employeeId: employee.id });
  assert.equal(result.code, 404);
  assert.equal(result.body.error, "Helpdesk conversation not found.");
});

test("an employee cannot read another employee's nested conversation", async () => {
  conversations.clear();
  conversations.set(`${employee.id}/${conversationId}`, {
    conversationId,
    employeeId: employee.id,
    createdById: employee.id,
    participantIds: [employee.id, hr.id],
  });

  const other = { id: "crm-2", role: "CRM Executive", dept: "CRM" };
  const list = await callRoute("/conversations", "get", other);
  const messages = await callRoute("/conversations/:id/messages", "get", other, { id: conversationId }, { employeeId: employee.id });

  assert.deepEqual(list.body, []);
  assert.equal(messages.code, 403);
  assert.equal(messages.body.error, "You can only access your own helpdesk conversations.");
});

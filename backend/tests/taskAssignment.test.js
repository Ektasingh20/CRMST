import test, { mock } from "node:test";
import assert from "node:assert/strict";

const employees = new Map([
  ["it_01", { id: "it_01", name: "IT Employee", role: "Developer", dept: "IT", status: "Active" }],
  ["ops_01", { id: "ops_01", name: "Operations Employee", role: "Operations", dept: "Operations", status: "Active" }],
  ["ram_01", { id: "ram_01", name: "Ram", username: "ram", role: "CRM Executive", dept: "Admin", status: "Active" }],
  ["admin_02", { id: "admin_02", name: "Other Admin", role: "Admin", dept: "Admin", status: "Active" }],
  ["student_01", { id: "student_01", name: "Student", role: "Student", dept: "Student", status: "Active" }],
  ["former_01", { id: "former_01", name: "Former Employee", role: "HR", dept: "HR", status: "Inactive" }],
]);
const createdTasks = [];
const notifications = [];
const Task = {
  find: async () => [],
  create: async (data) => {
    const task = { ...data, toObject() { return { ...data }; } };
    createdTasks.push(task);
    return task;
  },
};

mock.module("../models/Task.js", { defaultExport: Task });
mock.module("../models/User.js", { defaultExport: {
  findOne: async (filter) => {
    const user = employees.get(String(filter.id || filter._id || ""));
    return user ? { ...user, toObject: () => ({ ...user }) } : null;
  },
} });
mock.module("../middleware/auth.js", { namedExports: { authenticate: (req, res, next) => next() } });
mock.module("../services/appNotifications.js", { namedExports: {
  notifyUser: async (recipientId, payload) => notifications.push({ recipientId, payload }),
} });

const { default: router } = await import("../routes/tasks.js");
const admin = { id: "admin_01", name: "Admin", role: "Admin" };

async function postTask(user, body) {
  const layer = router.stack.find((item) => item.route?.path === "/" && item.route.methods.post);
  const response = {
    code: 200,
    status(code) { this.code = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  await layer.route.stack[0].handle({ user, body }, response);
  return response;
}

test("Admin can assign tasks to any non-student account", async () => {
  createdTasks.length = 0;
  notifications.length = 0;
  for (const employee of [employees.get("it_01"), employees.get("ops_01"), employees.get("ram_01"), employees.get("admin_02"), employees.get("former_01")]) {
    const response = await postTask(admin, { title: "Review deployment", assigneeId: employee.id, dueDate: "2026-11-20" });
    assert.equal(response.code, 201);
    assert.equal(response.body.assigneeId, employee.id);
    assert.equal(response.body.assignee, employee.name);
  }
  assert.equal(createdTasks.length, 5);
  assert.deepEqual(notifications.map((notification) => notification.recipientId), ["it_01", "ops_01", "ram_01", "admin_02", "former_01"]);
});

test("Admin task assignment rejects student and unknown accounts", async () => {
  createdTasks.length = 0;

  const student = await postTask(admin, { title: "Student task", assigneeId: "student_01" });
  const unknown = await postTask(admin, { title: "Unknown task", assigneeId: "missing_01" });

  assert.equal(student.code, 400);
  assert.equal(unknown.code, 400);
  assert.equal(createdTasks.length, 0);
});

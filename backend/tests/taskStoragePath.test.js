import test from "node:test";
import assert from "node:assert/strict";
import { taskDocumentPath } from "../models/Task.js";

test("employee tasks use separate per-user Firestore folders", () => {
  assert.equal(
    taskDocumentPath("crm_03", "TASK-20261114-001"),
    "tasks/crm_03/assignedTasks/TASK-20261114-001",
  );
  assert.equal(
    taskDocumentPath("HR/User 01", "TASK-20261114-002"),
    "tasks/HR%2FUser%2001/assignedTasks/TASK-20261114-002",
  );
});

test("task paths require both an employee and task ID", () => {
  assert.throws(() => taskDocumentPath("", "TASK-1"), /assignee/i);
  assert.throws(() => taskDocumentPath("crm_03", ""), /task ID/i);
});

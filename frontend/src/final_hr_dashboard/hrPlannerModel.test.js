import test from "node:test";
import assert from "node:assert/strict";
import { plannerKey, readPlanner, plannerStatus, togglePlannerStep, filterPlanner, taskToPlanner, plannerToTask } from "./hrPlannerModel.js";

test("existing tasks keep IDs, assigners, status and extra fields through workspace edits", () => {
  const task = { id: 42, assignedTo: 7, assignedBy: 2, title: "Follow up", description: "Call client", due: "2026-10-18", priority: "High", status: "In Progress", reminder: "Daily", custom: "preserve" };
  const workspaceItem = taskToPlanner(task);
  assert.equal(workspaceItem.id, "task:42");
  assert.deepEqual(plannerToTask(workspaceItem, [{ id: 7 }]), task);
  const edited = plannerToTask({ ...workspaceItem, title: "Updated", employeeId: "8" }, [{ id: 7 }, { id: 8 }]);
  assert.equal(edited.assignedTo, 8);
  assert.equal(edited.assignedBy, 2);
  assert.equal(edited.custom, "preserve");
  assert.equal(edited.id, 42);
});

test("workspace tasks complete, reopen and support any employee ID", () => {
  const record = { id: "legacy", assignedTo: "it_03", assignedBy: 1, title: "Fix bug", status: "Done" };
  const workspaceItem = taskToPlanner(record);
  assert.equal(workspaceItem.done, true);
  assert.equal(plannerToTask({ ...workspaceItem, done: false }, []).status, "Pending");
  const created = plannerToTask(item({ type: "Task", employeeId: "it_03", done: true }), [{ id: "it_03", dept: "IT" }]);
  assert.equal(created.assignedTo, "it_03");
  assert.equal(created.status, "Done");
  assert.equal(created.assignedBy, 1);
});

test("employee filter combines tasks and planner items without mixing employees", () => {
  const entries = [item(), taskToPlanner({ id: 4, assignedTo: 1, title: "Task", status: "Pending" }), item({ id: "other", employeeId: "2" })];
  assert.equal(filterPlanner(entries, { query: "", type: "All", status: "Open", employeeId: "1" }, "2026-10-17").length, 2);
});

const item = (overrides = {}) => ({ id: "one", title: "Orientation", type: "Onboarding", employeeId: "1", due: "2026-10-17", notes: "Prepare welcome kit", done: false, steps: [{ label: "Documents", done: false }, { label: "Orientation", done: false }], ...overrides });

test("planner storage is separate for each company and HR profile", () => {
  assert.notEqual(plannerKey({ company: "A", crm: "1" }), plannerKey({ company: "A", crm: "2" }));
  assert.notEqual(plannerKey({ company: "A", crm: "1" }), plannerKey({ company: "B", crm: "1" }));
  assert.notEqual(plannerKey({ company: "A:B", crm: "C" }), plannerKey({ company: "A", crm: "B:C" }));
});

test("valid saved items round trip, malformed and inaccessible storage recover", () => {
  const items = [item()];
  assert.deepEqual(readPlanner({ getItem: () => JSON.stringify(items) }, "key"), { items, error: "" });
  for (const raw of ["{", "null", "{}", '[{"id":"one"}]']) {
    const result = readPlanner({ getItem: () => raw }, "key");
    assert.deepEqual(result.items, []);
    assert.ok(result.error);
  }
  assert.ok(readPlanner({ getItem() { throw new Error("Blocked"); } }, "key").error);
  assert.deepEqual(readPlanner({ getItem: () => null }, "key"), { items: [], error: "" });
});

test("due dates distinguish today, overdue, future, undated, and completed", () => {
  const today = "2026-10-17";
  assert.equal(plannerStatus(item(), today), "Due today");
  assert.equal(plannerStatus(item({ due: "2026-10-16" }), today), "Overdue");
  assert.equal(plannerStatus(item({ due: "2026-10-18" }), today), "Open");
  assert.equal(plannerStatus(item({ due: "" }), today), "Open");
  assert.equal(plannerStatus(item({ due: "2026-10-16", done: true }), today), "Completed");
});

test("finishing onboarding completes the item and unchecking a step reopens it", () => {
  const original = item();
  const partial = togglePlannerStep(original, 0);
  assert.equal(partial.done, false);
  const complete = togglePlannerStep(partial, 1);
  assert.equal(complete.done, true);
  assert.equal(togglePlannerStep(complete, 0).done, false);
  assert.equal(original.steps[0].done, false);
});

test("combined filters search notes and show urgent open items before completed items", () => {
  const items = [item({ id: "finished", done: true, due: "2026-10-01" }), item({ id: "undated", due: "" }), item({ id: "urgent", type: "Reminder", due: "2026-10-16" }), item()];
  const filters = { query: "", type: "All", status: "All" };
  assert.deepEqual(filterPlanner(items, filters, "2026-10-17").map((entry) => entry.id), ["urgent", "one", "undated", "finished"]);
  assert.deepEqual(filterPlanner(items, { query: " WELCOME ", type: "Reminder", status: "Overdue" }, "2026-10-17").map((entry) => entry.id), ["urgent"]);
  assert.equal(filterPlanner(items, { ...filters, status: "Open" }, "2026-10-17").length, 3);
  assert.equal(filterPlanner(items, { ...filters, query: "no match" }, "2026-10-17").length, 0);
});

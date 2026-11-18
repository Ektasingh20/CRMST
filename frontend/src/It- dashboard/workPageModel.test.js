import test from "node:test";
import assert from "node:assert/strict";
import {
  filterITNotifications,
  filterTasks,
  getTaskStatusCounts,
  inclusiveLeaveDuration,
  notificationDestination,
} from "./workPageModel.js";

test("task filters and status totals cover legacy and current status labels", () => {
  const tasks = [
    { title: "Build report", status: "To Do", priority: "High", createdAt: "2026-11-18T10:00:00Z" },
    { title: "Review report", status: "In Progress", priority: "Medium", createdAt: "2026-11-17T10:00:00Z" },
    { title: "Ship report", status: "Done", priority: "High", createdAt: "2026-11-16T10:00:00Z" },
  ];
  assert.deepEqual(getTaskStatusCounts(tasks), { all: 3, "To Do": 1, "In Progress": 1, Completed: 1 });
  assert.deepEqual(filterTasks(tasks, { query: "report", priority: "High", from: "2026-11-17" }).map((task) => task.title), ["Build report"]);
});

test("leave duration is inclusive and invalid date ranges have zero days", () => {
  assert.equal(inclusiveLeaveDuration("2026-11-18", "2026-11-18"), 1);
  assert.equal(inclusiveLeaveDuration("2026-11-18", "2026-11-20"), 3);
  assert.equal(inclusiveLeaveDuration("2026-11-20", "2026-11-18"), 0);
});

test("IT notifications exclude bulk call-list alerts and route work updates to IT pages", () => {
  const notifications = [
    { id: "task-1", type: "task_assigned", message: "A task was assigned to you." },
    { id: "calls-1", type: "call_list_assignment", message: "Call list assigned." },
    { id: "calls-2", message: "300 new training contacts were assigned to you." },
  ];
  assert.deepEqual(filterITNotifications(notifications).map((item) => item.id), ["task-1"]);
  assert.equal(notificationDestination(notifications[0]), "tasks");
  assert.equal(notificationDestination({ message: "Your leave request was approved." }), "leave-request");
});

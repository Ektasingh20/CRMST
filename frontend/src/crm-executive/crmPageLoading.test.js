import test from "node:test";
import assert from "node:assert/strict";
import { isCrmPageLoading } from "./crmPageLoading.js";

const ready = { callsLoading: false, leadsLoading: false, tasksLoaded: true, attendanceLoaded: true, leavesLoaded: true, notificationsLoaded: true };

test("CRM pages show a loader for the data they need", () => {
  assert.equal(isCrmPageLoading("tasks", { ...ready, tasksLoaded: false }), true);
  assert.equal(isCrmPageLoading("dashboard", { ...ready, callsLoading: true }), true);
  assert.equal(isCrmPageLoading("approvedleads", { ...ready, leadsLoading: true }), true);
  assert.equal(isCrmPageLoading("trainingcalllist", { ...ready, callsLoading: true }), true);
  assert.equal(isCrmPageLoading("attendancereport", { ...ready, attendanceLoaded: false }), true);
  assert.equal(isCrmPageLoading("leaverequest", { ...ready, leavesLoaded: false }), true);
  assert.equal(isCrmPageLoading("notifications", { ...ready, notificationsLoaded: false }), true);
});

test("loaded pages do not show a loader", () => {
  for (const tab of ["dashboard", "servicecalllist", "trainingcalllist", "leads", "approvedleads", "salesreports", "tasks", "markattendance", "attendancereport", "leaverequest", "notifications", "settings"]) {
    assert.equal(isCrmPageLoading(tab, ready), false, tab);
  }
});

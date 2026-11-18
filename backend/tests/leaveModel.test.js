import test from "node:test";
import assert from "node:assert/strict";
import { getLeaveById, listApprovedLeavesBetween, listEmployeeLeaves, listLeaves } from "../models/Leave.js";
import { validateLeaveApplicationDates } from "../utils/leaveDuration.js";

function document(id, data) {
  return { id, data: () => data };
}

test("employee leave history uses one employee-scoped collection-group read", async () => {
  const filters = [];
  let reads = 0;
  const docs = [
    document("older", { employeeId: "it_01", from: "2026-11-01", to: "2026-11-01", appliedOn: "2026-11-01" }),
    document("newer", { employeeId: "it_01", from: "2026-11-10", to: "2026-11-10", appliedOn: "2026-11-10" }),
  ];
  const query = {
    where(field, operator, value) { filters.push([field, operator, value]); return this; },
    async get() { reads += 1; return { docs }; },
  };
  const leaves = await listEmployeeLeaves("it_01", {
    collectionGroup(name) { assert.equal(name, "leaves"); return query; },
  });

  assert.deepEqual(filters, [["employeeId", "==", "it_01"]]);
  assert.equal(reads, 1);
  assert.deepEqual(leaves.map((leave) => leave.id), ["newer", "older"]);
});

test("admin leave history uses one collection-group read instead of scanning every parent", async () => {
  let reads = 0;
  const docs = [
    document("parent-metadata", { employeeName: "Ekta" }),
    document("leave", { employeeId: "it_01", from: "2026-11-10", to: "2026-11-10", appliedOn: "2026-11-10" }),
  ];
  const leaves = await listLeaves({
    collectionGroup(name) {
      assert.equal(name, "leaves");
      return { async get() { reads += 1; return { docs }; } };
    },
    collection() { throw new Error("Parent scans must not be used."); },
  });

  assert.equal(reads, 1);
  assert.deepEqual(leaves.map((leave) => leave.id), ["leave"]);
});

test("leave decisions look up only the requested backend document", async () => {
  const filters = [];
  let limit = 0;
  const query = {
    where(field, operator, value) { filters.push([field, operator, value]); return this; },
    limit(value) { limit = value; return this; },
    async get() { return { docs: [document("leave-1", { id: "leave-1", from: "2026-11-20", to: "2026-11-20" })] }; },
  };
  const leave = await getLeaveById("leave-1", { collectionGroup: () => query });
  assert.equal(leave.id, "leave-1");
  assert.deepEqual(filters, [["id", "==", "leave-1"]]);
  assert.equal(limit, 1);
});

test("employee leave history falls back to one collection-group scan while its index is building", async () => {
  const docs = [
    document("mine", { employeeId: "crm_05", from: "2026-11-19", to: "2026-11-19" }),
    document("other", { employeeId: "crm_02", from: "2026-11-19", to: "2026-11-19" }),
  ];
  let filteredReads = 0;
  let fallbackReads = 0;
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const leaves = await listEmployeeLeaves("crm_05", {
      collectionGroup() {
        return {
          filtered: false,
          where() { this.filtered = true; return this; },
          async get() {
            if (this.filtered) {
              filteredReads += 1;
              throw Object.assign(new Error("index building"), { code: 9 });
            }
            fallbackReads += 1;
            return { docs };
          },
        };
      },
    });
    assert.deepEqual(leaves.map((leave) => leave.id), ["mine"]);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(filteredReads, 1);
  assert.equal(fallbackReads, 1);
});

test("leave decisions fall back to one collection-group scan while the ID index is building", async () => {
  const docs = [
    document("leave-1", { id: "leave-1", from: "2026-11-20", to: "2026-11-20" }),
    document("leave-2", { id: "leave-2", from: "2026-11-21", to: "2026-11-21" }),
  ];
  let filteredReads = 0;
  let fallbackReads = 0;
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const leave = await getLeaveById("leave-2", {
      collectionGroup() {
        return {
          filtered: false,
          where() { this.filtered = true; return this; },
          limit() { return this; },
          async get() {
            if (this.filtered) {
              filteredReads += 1;
              throw Object.assign(new Error("index building"), { code: "failed-precondition" });
            }
            fallbackReads += 1;
            return { docs };
          },
        };
      },
    });
    assert.equal(leave.id, "leave-2");
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(filteredReads, 1);
  assert.equal(fallbackReads, 1);
});

test("leave application dates allow today and future dates but reject past dates", () => {
  assert.equal(validateLeaveApplicationDates("2026-11-18", "2026-11-18", "2026-11-18"), "");
  assert.equal(validateLeaveApplicationDates("2026-11-19", "2026-11-21", "2026-11-18"), "");
  assert.match(validateLeaveApplicationDates("2026-11-17", "2026-11-18", "2026-11-18"), /future date/);
  assert.match(validateLeaveApplicationDates("2026-11-20", "2026-11-19", "2026-11-18"), /end date/);
});

test("approved leave lookup uses one indexed collection-group query and filters overlap", async () => {
  const docs = [
    document("overlap", {
      id: "overlap", employeeId: "crm_02", from: "2026-09-10", to: "2026-09-12", status: "Approved",
    }),
    document("old", {
      id: "old", employeeId: "crm_02", from: "2026-08-01", to: "2026-08-02", status: "Approved",
    }),
    document("rejected", {
      id: "rejected", employeeId: "crm_02", from: "2026-09-10", to: "2026-09-12", status: "Rejected",
    }),
  ];
  const filters = [];
  let reads = 0;
  const query = {
    where(field, operator, value) {
      filters.push([field, operator, value]);
      return this;
    },
    async get() {
      reads += 1;
      return { docs };
    },
  };
  const leaves = await listApprovedLeavesBetween("2026-09-01", "2026-09-30", {
    collectionGroup(name) {
      assert.equal(name, "leaves");
      return query;
    },
  });

  assert.deepEqual(filters, [
    ["status", "in", ["Approved", "approved"]],
    ["from", "<=", "2026-09-30"],
  ]);
  assert.equal(reads, 1);
  assert.deepEqual(leaves.map((leave) => leave.id), ["overlap"]);
});

test("missing-index fallback performs one collection-group scan, not one query per parent", async () => {
  const docs = [
    document("leave-1", {
      id: "leave-1", employeeId: "crm_02", from: "2026-09-10", to: "2026-09-12", status: "Approved",
    }),
    document("leave-2", {
      id: "leave-2", employeeId: "crm_03", from: "2026-09-10", to: "2026-09-12", status: "Approved",
    }),
    document("outside", {
      id: "outside", employeeId: "crm_02", from: "2026-08-01", to: "2026-08-02", status: "Approved",
    }),
  ];
  let queryReads = 0;
  let fallbackReads = 0;
  let parentReads = 0;
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const leaves = await listApprovedLeavesBetween("2026-09-01", "2026-09-30", {
      collectionGroup(name) {
        assert.equal(name, "leaves");
        const query = {
          filtered: false,
          where() { this.filtered = true; return this; },
          async get() {
            queryReads += 1;
            if (this.filtered) throw Object.assign(new Error("index missing"), { code: 9 });
            fallbackReads += 1;
            return { docs };
          },
        };
        return query;
      },
      collection() {
        parentReads += 1;
        throw new Error("Parent collection scans should not be used.");
      },
    });
    assert.deepEqual(leaves.map((leave) => leave.id).sort(), ["leave-1", "leave-2"]);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(queryReads, 2);
  assert.equal(fallbackReads, 1);
  assert.equal(parentReads, 0);
});

test("approved leave lookup rethrows failures unrelated to a missing index", async () => {
  const query = {
    where() { return this; },
    async get() { throw Object.assign(new Error("permission denied"), { code: 7 }); },
  };
  const db = { collectionGroup() { return query; } };
  await assert.rejects(listApprovedLeavesBetween("2026-09-01", "2026-09-30", db), { code: 7 });
});

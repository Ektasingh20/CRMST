import test from "node:test";
import assert from "node:assert/strict";
import { listApprovedLeavesBetween } from "../models/Leave.js";

function document(id, data) {
  return { id, data: () => data };
}

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

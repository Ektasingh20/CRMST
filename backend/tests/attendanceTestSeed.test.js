import test from "node:test";
import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { calculateAttendancePayroll, buildAttendanceMonthRows } from "../../shared/attendanceClassification.js";
import { ATTENDANCE_TEST_SOURCE, buildNovemberRamTestRecords } from "../services/attendanceTestSeed.js";
import {
  attendanceDataFingerprint,
  decodeFirestoreValue,
  encodeFirestoreValue,
  sameAttendanceData,
} from "../services/attendanceTestManifest.js";

test("Ram's synthetic test attendance uses the existing schema, exact statuses, and payroll exclusion", () => {
  const records = buildNovemberRamTestRecords({
    employeeId: "crm_02",
    employeeName: "Ram",
    employeeUid: "ram-firebase-uid",
    seedOperationId: "ram-attendance-test-1234-abcd1234",
  });
  const totals = records.reduce((counts, { status }) => {
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(totals, { holiday: 3, present: 6, leave: 2, absent: 5 });
  assert.equal(records.length, 16);
  assert.equal(records[0].record.employeeId, "crm_02");
  assert.equal(records[0].record.employeeUid, "ram-firebase-uid");
  assert.equal(records[0].record.recordId, "ATT-20261101-crm_02");
  assert.equal(records[0].record.source, ATTENDANCE_TEST_SOURCE);
  assert.equal(records[0].record.isTestData, true);
  assert.equal(records[0].record.excludedFromPayroll, true);
  assert.equal(records[0].record.remark, "Temporary test record — not verified attendance");
  assert.equal(records[0].record.payable, false);
  assert.equal(records.filter(({ record }) => record.simulatedPunches).length, 6);
  assert.ok(records.filter(({ status }) => status !== "present")
    .every(({ record }) => !record.checkInAt && !record.checkOutAt && !record.checkIn && !record.checkOut));

  const rows = buildAttendanceMonthRows({
    attendance: records.map(({ record }) => record),
    month: "2026-11",
    joinedDate: "2026-09-06",
    today: "2026-11-16",
    now: new Date("2026-11-16T05:30:00.000Z"),
    employeeId: "crm_02",
    calendar: { weeklyHolidays: [0] },
  });
  const sampleRows = rows.filter((row) => row.isTestData);
  const displayedTotals = sampleRows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(displayedTotals, { Holiday: 3, Present: 6, Leave: 2, Absent: 5 });
  assert.equal(sampleRows.find((row) => row.date === "2026-11-02").checkIn, "9:26 AM");
  assert.equal(sampleRows.find((row) => row.date === "2026-11-02").checkOut, "6:04 PM");
  assert.ok(sampleRows.every((row) => row.payable === false));
  assert.deepEqual(sampleRows.map((row) => row.date).sort(), Array.from({ length: 16 }, (_, index) => `2026-11-${String(index + 1).padStart(2, "0")}`));

  const payroll = calculateAttendancePayroll({
    employee: { salary: 30000, joined: "2026-09-06" },
    month: "2026-11",
    rows,
  });
  assert.equal(payroll.classifiedUnpaidDays, 0);
});

test("operation backup encoding round-trips exact Firestore timestamp precision", () => {
  const original = {
    status: "absent",
    correction: { previousStatus: "pending", previousRemark: "" },
    updatedAt: new Timestamp(1_800_000_000, 123_456_789),
  };
  const encoded = encodeFirestoreValue(original);
  const restored = decodeFirestoreValue(encoded);

  assert.equal(restored.updatedAt.seconds, original.updatedAt.seconds);
  assert.equal(restored.updatedAt.nanoseconds, original.updatedAt.nanoseconds);
  assert.equal(sameAttendanceData(original, restored), true);
  assert.notEqual(attendanceDataFingerprint(original), attendanceDataFingerprint({ ...original, status: "present" }));
});

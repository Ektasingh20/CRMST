import test from "node:test";
import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import {
  attendanceDayRef,
  attendanceRecordId,
  calculateWorkedMinutes,
  checkInEmployee,
  checkOutEmployee,
  correctNestedAttendance,
  createAutomaticAbsence,
  createAutomaticAbsences,
  getEmployeeAttendanceMonth,
  getAdminAttendanceSummary,
  isActiveEmployee,
  isOfficialAttendanceRecord,
  listAttendanceForDate,
  listAdminAttendance,
  listAdminAttendanceMonth,
  listLegacyAdminAttendance,
  serializeAttendanceData,
} from "../services/attendanceStore.js";
import { indiaDateString, previousDateString } from "../services/attendanceTime.js";

class FakeSnapshot {
  constructor(ref, value) { this.ref = ref; this.id = ref.id; this.value = value; }
  get exists() { return this.value !== undefined; }
  data() { return this.value; }
}

class FakeRef {
  constructor(db, path) { this.db = db; this.path = path; this.id = path.split("/").at(-1); }
  collection(name) { return new FakeCollection(this.db, `${this.path}/${name}`); }
  get() { return Promise.resolve(new FakeSnapshot(this, this.db.values.get(this.path))); }
}

class FakeCollection {
  constructor(db, path) { this.db = db; this.path = path; }
  doc(id) { return new FakeRef(this.db, `${this.path}/${id}`); }
  async get() {
    const prefix = `${this.path}/`;
    return {
      docs: [...this.db.values.entries()]
        .filter(([path]) => path.startsWith(prefix) && path.slice(prefix.length).indexOf("/") === -1)
        .map(([path, value]) => new FakeSnapshot(new FakeRef(this.db, path), value)),
    };
  }
  where() { return this; }
}

class FakeDb {
  constructor() { this.values = new Map(); this.writeCount = 0; this.queue = Promise.resolve(); }
  collection(name) { return new FakeCollection(this, name); }
  doc(path) { return new FakeRef(this, path); }
  bulkWriter() {
    return {
      onWriteError() {},
      create: async (ref, value) => {
        if (this.values.has(ref.path)) throw Object.assign(new Error("already exists"), { code: 6 });
        this.values.set(ref.path, value);
        this.writeCount += 1;
      },
      close: async () => {},
    };
  }
  runTransaction(callback) {
    const operation = this.queue.then(async () => {
      const writes = [];
      const transaction = {
        get: async (ref) => new FakeSnapshot(ref, this.values.get(ref.path)),
        create: (ref, value) => writes.push({ type: "create", ref, value }),
        update: (ref, value) => writes.push({ type: "update", ref, value }),
      };
      const result = await callback(transaction);
      writes.forEach(({ type, ref, value }) => {
        if (type === "create" && this.values.has(ref.path)) throw new Error("already exists");
        this.values.set(ref.path, { ...(this.values.get(ref.path) || {}), ...value });
        this.writeCount += 1;
      });
      return result;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}

const activeUser = {
  id: "crm_01",
  name: "CRM Employee",
  role: "CRM Executive",
  status: "Active",
  firebaseAuthUid: "firebase-uid-1",
};

function reportSnapshot(path, value) {
  const ref = { path, id: path.split("/").at(-1) };
  return { ref, id: ref.id, exists: true, data: () => value };
}

function reportQueryFactory(docs, filters = []) {
  const query = {
    filters,
    where(field, operator, value) { return reportQueryFactory(docs, [...filters, [field, operator, value]]); },
    orderBy() { return this; },
    limit() { return this; },
    startAfter() { return this; },
    count() {
      const selected = this.selected();
      return { get: async () => ({ data: () => ({ count: selected.length }) }) };
    },
    selected() {
      return docs.filter((doc) => filters.every(([field, operator, value]) => {
        const fieldValue = doc.data()?.[field];
        if (operator === "==") return fieldValue === value;
        if (operator === ">=") return fieldValue >= value;
        if (operator === "<=") return fieldValue <= value;
        return false;
      }));
    },
    async get() { return { docs: this.selected() }; },
  };
  return query;
}

function reportDb(nestedDocs, legacyDocs = []) {
  return {
    collectionGroup() { return reportQueryFactory(nestedDocs); },
    collection() { return reportQueryFactory(legacyDocs); },
  };
}

test("nested attendance path and deterministic record ID use employee, month, and date", () => {
  const db = new FakeDb();
  assert.equal(
    attendanceDayRef("crm_01", "2026-11-16", db).path,
    "attendance/crm_01/months/2026-11/attendanceDays/2026-11-16",
  );
  assert.equal(attendanceRecordId("crm_01", "2026-11-16"), "ATT-20261116-crm_01");
});

test("noon attendance reads exact daily documents while the collection-group index builds", async () => {
  const db = new FakeDb();
  const originalCollection = db.collection.bind(db);
  db.values.set(attendanceDayRef("crm_01", "2026-11-16", db).path, {
    employeeId: "crm_01", workDate: "2026-11-16", status: "present",
  });
  db.collection = (name) => {
    const collection = originalCollection(name);
    collection.where = () => ({ get: async () => ({ docs: [] }) });
    return collection;
  };
  db.collectionGroup = () => ({ where: () => ({ get: async () => {
    throw Object.assign(new Error("Index not ready"), { code: 9 });
  } }) });
  let exactReads = 0;
  db.getAll = async (...refs) => {
    exactReads += refs.length;
    return Promise.all(refs.map((ref) => ref.get()));
  };
  const records = await listAttendanceForDate("2026-11-16", db, ["crm_01", "crm_02"]);
  assert.deepEqual(records.map((record) => record.employeeId), ["crm_01"]);
  assert.equal(exactReads, 2);
  assert.equal(db.writeCount, 0);
});

test("attendance timestamps serialize for the existing frontend without losing trusted timestamps", () => {
  const checkInAt = Timestamp.fromDate(new Date("2026-11-16T04:30:00.000Z"));
  const checkOutAt = Timestamp.fromDate(new Date("2026-11-16T05:45:00.000Z"));
  const record = serializeAttendanceData({
    employeeId: "crm_01",
    employeeUid: "firebase-uid-1",
    employeeName: "Employee",
    workDate: "2026-11-16",
    month: "2026-11",
    status: "present",
    checkInAt,
    checkOutAt,
    workedMinutes: 75,
    isTestData: true,
    excludedFromPayroll: true,
    simulatedPunches: true,
    createdAt: checkInAt,
    updatedAt: checkOutAt,
  });
  assert.equal(record.status, "Present");
  assert.equal(record.checkInAt, "2026-11-16T04:30:00.000Z");
  assert.equal(record.checkOutAt, "2026-11-16T05:45:00.000Z");
  assert.equal(record.checkIn, "10:00 AM");
  assert.equal(record.checkOut, "11:15 AM");
  assert.equal(record.workedMinutes, 75);
  assert.equal(record.isTestData, true);
  assert.equal(record.excludedFromPayroll, true);
  assert.equal(record.simulatedPunches, true);
});

test("official attendance reports, pages, legacy rows, and summaries exclude test records", async () => {
  assert.equal(isOfficialAttendanceRecord({ isTestData: true }), false);
  assert.equal(isOfficialAttendanceRecord({ status: "present" }), true);
  const official = reportSnapshot(
    "attendance/crm_01/months/2026-11/attendanceDays/2026-11-16",
    {
      employeeId: "crm_01",
      workDate: "2026-11-16",
      month: "2026-11",
      status: "present",
      attendanceState: "checked_out",
    },
  );
  const test = reportSnapshot(
    "attendance/crm_02/months/2026-11/attendanceDays/2026-11-16",
    {
      employeeId: "crm_02",
      workDate: "2026-11-16",
      month: "2026-11",
      status: "present",
      attendanceState: "checked_out",
      isTestData: true,
    },
  );
  const legacyTest = reportSnapshot("attendance/ATT-20261116-crm_03", {
    employeeId: "crm_03",
    date: "2026-11-16",
    workDate: "2026-11-16",
    month: "2026-11",
    status: "absent",
    isTestData: true,
  });
  const db = reportDb([official, test], [legacyTest]);

  const monthly = await listAdminAttendanceMonth("2026-11", db);
  const page = await listAdminAttendance({ month: "2026-11" }, db);
  const legacy = await listLegacyAdminAttendance({ month: "2026-11" }, db);
  const summary = await getAdminAttendanceSummary("2026-11-16", db);

  assert.deepEqual(monthly.map((record) => record.employeeId), ["crm_01"]);
  assert.deepEqual(page.records.map((record) => record.employeeId), ["crm_01"]);
  assert.deepEqual(legacy, []);
  assert.deepEqual(summary, {
    workDate: "2026-11-16",
    recorded: 1,
    present: 1,
    absent: 0,
    leave: 0,
    holiday: 0,
    checkedIn: 0,
    checkedOut: 1,
  });
});

test("daily summary falls back to one date-scoped read if the test-data index is not deployed", async () => {
  const official = reportSnapshot("attendance/crm_01/months/2026-11/attendanceDays/2026-11-16", {
    status: "present",
    attendanceState: "checked_out",
  });
  const test = reportSnapshot("attendance/crm_02/months/2026-11/attendanceDays/2026-11-16", {
    status: "present",
    attendanceState: "checked_out",
    isTestData: true,
  });
  let dateReads = 0;
  const dateQuery = {
    where(field) {
      assert.equal(field, "isTestData");
      return {
        async get() { throw Object.assign(new Error("index missing"), { code: 9 }); },
      };
    },
    async get() {
      dateReads += 1;
      return { docs: [official, test] };
    },
    count() { throw new Error("Aggregate counts should not run in the fallback."); },
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  let summary;
  try {
    summary = await getAdminAttendanceSummary("2026-11-16", {
      collectionGroup(name) {
        assert.equal(name, "attendanceDays");
        return {
          where(field, operator, value) {
            assert.deepEqual([field, operator, value], ["workDate", "==", "2026-11-16"]);
            return dateQuery;
          },
        };
      },
    });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(dateReads, 1);
  assert.deepEqual(summary, {
    workDate: "2026-11-16",
    recorded: 1,
    present: 1,
    absent: 0,
    leave: 0,
    holiday: 0,
    checkedIn: 0,
    checkedOut: 1,
  });
});

test("monthly reads ignore nested documents whose stored employee identity contradicts their path", async () => {
  const db = new FakeDb();
  const ref = attendanceDayRef("crm_01", "2026-11-16", db);
  db.values.set(ref.path, {
    employeeId: "crm_02",
    workDate: "2026-11-16",
    status: "present",
  });

  const records = await getEmployeeAttendanceMonth(activeUser, "2026-11", db);
  assert.deepEqual(records, []);
});

test("employee month reads omit future dates and avoid reads for future months", async () => {
  const db = new FakeDb();
  const today = indiaDateString();
  const tomorrow = new Date(Date.parse(`${today}T00:00:00.000Z`) + 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  for (const workDate of [today, tomorrow]) {
    const ref = attendanceDayRef(activeUser.id, workDate, db);
    db.values.set(ref.path, {
      employeeId: activeUser.id,
      workDate,
      status: workDate === today ? "present" : "pending",
    });
  }

  const currentMonthRecords = await getEmployeeAttendanceMonth(activeUser, today.slice(0, 7), db);
  assert.deepEqual(currentMonthRecords.map((record) => record.workDate), [today]);

  const monthNumber = Number(today.slice(5, 7));
  const futureMonth = monthNumber === 12
    ? `${Number(today.slice(0, 4)) + 1}-01`
    : `${today.slice(0, 4)}-${String(monthNumber + 1).padStart(2, "0")}`;
  let futureMonthReads = 0;
  const originalCollection = db.collection.bind(db);
  db.collection = (name) => {
    futureMonthReads += 1;
    return originalCollection(name);
  };
  assert.deepEqual(await getEmployeeAttendanceMonth(activeUser, futureMonth, db), []);
  assert.equal(futureMonthReads, 0);
});

test("simultaneous and retried check-in/check-out operations stay idempotent", async () => {
  const db = new FakeDb();
  const checkInTime = Timestamp.fromDate(new Date("2026-11-16T04:30:00.000Z"));
  const [first, second] = await Promise.all([
    checkInEmployee(activeUser, { now: checkInTime, date: "1999-01-01" }, db),
    checkInEmployee(activeUser, { now: checkInTime, date: "1999-01-01" }, db),
  ]);
  assert.deepEqual([first.idempotent, second.idempotent].sort(), [false, true]);
  assert.equal(first.record.date, "2026-11-16");
  assert.equal(db.writeCount, 1);

  const checkOutTime = Timestamp.fromDate(new Date("2026-11-16T05:45:00.000Z"));
  const checkedOut = await checkOutEmployee(activeUser, { now: checkOutTime }, db);
  const retried = await checkOutEmployee(activeUser, { now: checkOutTime }, db);
  assert.equal(checkedOut.idempotent, false);
  assert.equal(retried.idempotent, true);
  assert.equal(checkedOut.record.workedMinutes, 75);
  assert.equal(db.writeCount, 2);
});

test("checkout can safely complete the previous India work date after midnight", async () => {
  const db = new FakeDb();
  const checkInTime = Timestamp.fromDate(new Date("2026-11-16T04:30:00.000Z"));
  await checkInEmployee(activeUser, { now: checkInTime }, db);
  const afterMidnight = Timestamp.fromDate(new Date("2026-11-16T19:00:00.000Z"));
  assert.equal(indiaDateString(afterMidnight.toDate()), "2026-11-17");
  assert.equal(previousDateString("2026-11-17"), "2026-11-16");
  const result = await checkOutEmployee(activeUser, { now: afterMidnight }, db);
  assert.equal(result.record.date, "2026-11-16");
  assert.equal(result.record.workedMinutes, 870);
});

test("inactive employees and failed transactions never report a successful check-in", async () => {
  assert.equal(isActiveEmployee({ ...activeUser, status: "Inactive" }), false);
  await assert.rejects(
    checkInEmployee({ ...activeUser, status: "Inactive" }, { now: Timestamp.fromDate(new Date("2026-11-16T04:30:00.000Z")) }, new FakeDb()),
    /Only active employees/,
  );
  const db = new FakeDb();
  db.runTransaction = async () => { throw new Error("network unavailable"); };
  await assert.rejects(
    checkInEmployee(activeUser, { now: Timestamp.fromDate(new Date("2026-11-16T04:30:00.000Z")) }, db),
    /network unavailable/,
  );
  assert.equal(db.writeCount, 0);
});

test("worked minutes reject inverted or missing timestamps", () => {
  const start = Timestamp.fromMillis(10_000);
  const end = Timestamp.fromMillis(70_000);
  assert.equal(calculateWorkedMinutes(start, end), 1);
  assert.equal(calculateWorkedMinutes(end, start), null);
  assert.equal(calculateWorkedMinutes(null, end), null);
});

test("bulk automatic absence creation scales to 1,000 employees and retries without duplicate writes", async () => {
  const db = new FakeDb();
  const users = Array.from({ length: 1000 }, (_, index) => ({
    ...activeUser,
    id: `crm_${String(index + 1).padStart(4, "0")}`,
    firebaseAuthUid: `uid_${index + 1}`,
  }));
  const timestamp = Timestamp.fromDate(new Date("2026-11-17T06:30:00.000Z"));
  assert.equal(await createAutomaticAbsences(users, "2026-11-16", timestamp, db), 1000);
  assert.equal(await createAutomaticAbsences(users, "2026-11-16", timestamp, db), 0);
  assert.equal(db.writeCount, 1000);
  const absence = db.values.get(attendanceDayRef("crm_0001", "2026-11-16", db).path);
  assert.equal(absence.source, "attendance_five_day_finalization");
  assert.equal(absence.reason, "finalized_absence");
});

test("automatic absence writers reject current and future work dates without writing", async () => {
  const db = new FakeDb();
  const now = Timestamp.fromDate(new Date("2026-11-16T06:30:00.000Z"));
  await assert.rejects(
    createAutomaticAbsence(activeUser, "2026-11-16", now, db),
    (error) => error.code === "future_attendance_forbidden",
  );
  await assert.rejects(
    createAutomaticAbsences([activeUser], "2026-11-17", now, db),
    (error) => error.code === "future_attendance_forbidden",
  );
  assert.equal(db.writeCount, 0);
  assert.equal(db.values.size, 0);
});

test("admin correction preserves the old auto-absence note in history and updates the visible source", async () => {
  const db = new FakeDb();
  const ref = attendanceDayRef("crm_01", "2026-11-16", db);
  db.values.set(ref.path, {
    employeeId: "crm_01",
    workDate: "2026-11-16",
    status: "absent",
    autoMarked: true,
    source: "attendance_five_day_finalization",
    remark: "Automatically finalized after five eligible working days.",
  });

  const corrected = await correctNestedAttendance("ATT-20261116-crm_01", { id: "admin_01", name: "Admin" }, { status: "Present" }, db);
  assert.equal(corrected.status, "Present");
  assert.equal(corrected.source, "admin_correction");
  assert.match(corrected.remark, /Corrected from Absent to Present/);
  assert.equal(corrected.correction.previousRemark, "Automatically finalized after five eligible working days.");
  assert.equal(corrected.correction.previousSource, "attendance_five_day_finalization");
});

test("admin corrections reject future attendance dates without reading or writing a record", async () => {
  const db = new FakeDb();
  const futureDate = new Date(Date.parse(`${indiaDateString()}T00:00:00.000Z`) + 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const recordId = `ATT-${futureDate.replaceAll("-", "")}-crm_01`;

  await assert.rejects(
    correctNestedAttendance(recordId, { id: "admin_01", name: "Admin" }, { status: "Present" }, db),
    (error) => error.code === "future_attendance_forbidden",
  );
  assert.equal(db.writeCount, 0);
  assert.equal(db.values.size, 0);
});

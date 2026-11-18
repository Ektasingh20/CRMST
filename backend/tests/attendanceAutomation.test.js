import test from "node:test";
import assert from "node:assert/strict";
import {
  finalizeCompletedAttendance,
  getCompletedFiveDayBatches,
  indiaDateString,
  isActiveAttendanceEmployee,
  isAttendanceDeadlineReached,
  millisecondsUntilNextAttendanceRun,
  syncEmployeeAttendanceHistory,
} from "../services/attendanceAutomation.js";

class FakeSnapshot {
  constructor(ref, value) { this.ref = ref; this.id = ref.id; this.value = value; }
  get exists() { return this.value !== undefined; }
  data() { return this.value; }
}

class FakeRef {
  constructor(db, path) { this.db = db; this.path = path; this.id = path.split("/").at(-1); }
  get parent() { return new FakeCollection(this.db, this.path.slice(0, this.path.lastIndexOf("/"))); }
  collection(name) { return new FakeCollection(this.db, `${this.path}/${name}`); }
  get() { return Promise.resolve(new FakeSnapshot(this, this.db.values.get(this.path))); }
}

class FakeCollection {
  constructor(db, path) { this.db = db; this.path = path; }
  get parent() {
    const parentPath = this.path.slice(0, this.path.lastIndexOf("/"));
    return parentPath ? new FakeRef(this.db, parentPath) : null;
  }
  doc(id) { return new FakeRef(this.db, `${this.path}/${id}`); }
}

class FakeDb {
  constructor() { this.values = new Map(); this.writeCount = 0; this.queue = Promise.resolve(); }
  collection(name) { return new FakeCollection(this, name); }
  getAll(...refs) { return Promise.all(refs.map((ref) => ref.get())); }
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
        set: (ref, value, options = {}) => writes.push({ ref, value, merge: options.merge }),
      };
      const result = await callback(transaction);
      writes.forEach(({ ref, value, merge }) => {
        this.values.set(ref.path, merge ? { ...(this.values.get(ref.path) || {}), ...value } : value);
        this.writeCount += 1;
      });
      return result;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}

const savedAttendanceFor = (db, dates) => [...db.values.values()]
  .filter((record) => record.workDate && dates.includes(record.workDate))
  .map((record) => ({ employeeId: record.employeeId, date: record.workDate }));

test("finalization runs after the completed day and is scheduled daily at 00:15 IST", () => {
  assert.equal(indiaDateString(new Date("2026-11-16T18:45:00.000Z")), "2026-11-17");
  assert.equal(isAttendanceDeadlineReached("2026-11-16", new Date("2026-11-16T06:30:00.000Z")), true);
  assert.equal(isAttendanceDeadlineReached("2026-11-16", new Date("2026-11-16T06:29:00.000Z")), false);
  assert.equal(isAttendanceDeadlineReached("2026-11-16", new Date("2026-11-16T06:30:00.000Z"), {
    holidays: [{ date: "2026-11-16", paid: true }],
  }), false);
  assert.equal(
    millisecondsUntilNextAttendanceRun(new Date("2026-11-16T18:40:00.000Z")),
    5 * 60 * 1000,
  );
  assert.equal(
    millisecondsUntilNextAttendanceRun(new Date("2026-11-16T18:45:00.000Z")),
    Date.parse("2026-11-17T18:45:00.000Z") - Date.parse("2026-11-16T18:45:00.000Z"),
  );
});

test("five eligible days cross months and exclude configured holidays and weekly offs", () => {
  const batches = getCompletedFiveDayBatches({
    joinedDate: "2026-10-30",
    automationStartDate: "2026-10-30",
    completedThrough: "2026-11-05",
    now: new Date("2026-11-06T06:30:00.000Z"),
    calendar: {
      weeklyHolidays: [0],
      holidays: [{ date: "2026-11-02", label: "Company holiday", paid: true }],
    },
  });

  assert.deepEqual(batches, [{
    dates: ["2026-10-30", "2026-10-31", "2026-11-03", "2026-11-04", "2026-11-05"],
    startDate: "2026-10-30",
    endDate: "2026-11-05",
  }]);
});

test("employee batch counting starts no earlier than joining or automation activation", () => {
  const fromJoining = getCompletedFiveDayBatches({
    joinedDate: "2026-11-16",
    automationStartDate: "2026-11-01",
    completedThrough: "2026-11-21",
    now: new Date("2026-11-22T06:30:00.000Z"),
  });
  const fromActivation = getCompletedFiveDayBatches({
    joinedDate: "2026-11-01",
    automationStartDate: "2026-11-16",
    completedThrough: "2026-11-21",
    now: new Date("2026-11-22T06:30:00.000Z"),
  });

  assert.deepEqual(fromJoining[0].dates, ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]);
  assert.deepEqual(fromActivation[0].dates, ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]);
  assert.equal(fromJoining.flatMap((batch) => batch.dates).some((date) => date < "2026-11-16"), false);
  assert.equal(fromJoining.flatMap((batch) => batch.dates).includes("2026-11-21"), false);

  const historicalBackfill = getCompletedFiveDayBatches({
    joinedDate: "2026-09-06",
    automationStartDate: "2026-11-16",
    completedThrough: "2026-09-30",
    backfillFromJoiningDate: true,
    calendar: { weeklyHolidays: [0] },
    now: new Date("2026-11-16T06:30:00.000Z"),
  });
  assert.equal(historicalBackfill.length, 4);
  assert.equal(historicalBackfill[0].startDate, "2026-09-07");
  assert.equal(historicalBackfill.at(-1).endDate, "2026-09-29");
});

test("five-day batch planning caps caller-supplied completion dates at yesterday in India", () => {
  const batches = getCompletedFiveDayBatches({
    joinedDate: "2026-11-09",
    automationStartDate: "2026-11-09",
    completedThrough: "2026-11-30",
    now: new Date("2026-11-16T06:30:00.000Z"),
    calendar: { weeklyHolidays: [0] },
  });
  const plannedDates = batches.flatMap((batch) => batch.dates);

  assert.deepEqual(plannedDates, ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]);
  assert.equal(plannedDates.some((date) => date >= "2026-11-16"), false);
});

test("automation targets active non-student employees and requires their joining date", () => {
  assert.equal(isActiveAttendanceEmployee({ id: "hr-1", role: "HR", status: "Active", joined: "2026-01-01" }), true);
  assert.equal(isActiveAttendanceEmployee({ id: "student-1", role: "Student", joined: "2026-01-01" }), false);
  assert.equal(isActiveAttendanceEmployee({ id: "missing-date", role: "CRM Executive" }), false);
});

test("finalization preserves Present and approved Leave, marks missing dates, and advances a cursor", async () => {
  const db = new FakeDb();
  const user = { id: "employee-1", name: "Employee", role: "HR", status: "Active", joined: "2026-11-04" };
  const presentDate = "2026-11-04";
  const presentPath = `attendance/${user.id}/months/2026-11/attendanceDays/${presentDate}`;
  db.values.set(presentPath, { employeeId: user.id, workDate: presentDate, status: "present", source: "employee_self_service" });
  const leaves = [{ employeeId: user.id, from: "2026-11-05", to: "2026-11-05", status: "Approved", type: "Earned Leave" }];
  const now = new Date("2026-11-11T18:45:00.000Z");
  const options = {
    db,
    users: [user],
    calendar: { weeklyHolidays: [0], holidays: [] },
    automationStartDate: "2026-11-04",
    listAttendance: async (dates) => savedAttendanceFor(db, dates),
    listLeaves: async () => leaves,
  };

  const result = await finalizeCompletedAttendance(now, options);
  const records = [...db.values.values()].filter((record) => record.employeeId === user.id && record.workDate);
  const cursor = db.values.get(`attendance/${user.id}/automation/state`);

  assert.equal(result.finalizedBatches, 1);
  assert.equal(result.marked, 3);
  assert.equal(records.find((record) => record.workDate === presentDate).status, "present");
  assert.equal(records.find((record) => record.workDate === "2026-11-05"), undefined);
  assert.deepEqual(records.filter((record) => record.autoMarked).map((record) => record.workDate).sort(), ["2026-11-06", "2026-11-07", "2026-11-09"]);
  assert.equal(cursor.finalizedThrough, "2026-11-09");
  assert.equal(records.some((record) => record.workDate < user.joined), false);
  assert.equal(records.some((record) => record.workDate > "2026-11-11"), false);
});

test("scheduler retries do not duplicate records or move a cursor backwards", async () => {
  const db = new FakeDb();
  const user = { id: "employee-2", role: "CRM Executive", status: "Active", joined: "2026-11-02" };
  const options = {
    db,
    users: [user],
    calendar: { weeklyHolidays: [0] },
    automationStartDate: "2026-11-02",
    listAttendance: async (dates) => savedAttendanceFor(db, dates),
    listLeaves: async () => [],
  };
  const now = new Date("2026-11-06T18:45:00.000Z");

  const first = await finalizeCompletedAttendance(now, options);
  const writesAfterFirstRun = db.writeCount;
  const retried = await finalizeCompletedAttendance(now, options);

  assert.equal(first.marked, 5);
  assert.equal(retried.finalizedBatches, 0);
  assert.equal(retried.marked, 0);
  assert.equal(db.writeCount, writesAfterFirstRun);
});

test("no complete five-working-day window is a no-op, not a reason to create extra absences", async () => {
  const db = new FakeDb();
  const user = { id: "employee-3", role: "CRM Executive", status: "Active", joined: "2026-11-02" };
  let attendanceReads = 0;
  let leaveReads = 0;
  const result = await finalizeCompletedAttendance(new Date("2026-11-16T06:30:00.000Z"), {
    db,
    users: [user],
    states: new Map([["employee-3", { finalizedThrough: "2026-11-13" }]]),
    calendar: { weeklyHolidays: [0] },
    automationStartDate: "2026-11-02",
    listAttendance: async () => { attendanceReads += 1; return []; },
    listLeaves: async () => { leaveReads += 1; return []; },
  });

  assert.equal(result.completedThrough, "2026-11-15");
  assert.equal(result.employees, 1);
  assert.equal(result.finalizedBatches, 0);
  assert.equal(result.marked, 0);
  assert.equal(result.skipped, "no_completed_batch");
  assert.equal(attendanceReads, 0);
  assert.equal(leaveReads, 0);
  assert.equal(db.writeCount, 0);
});

test("a full batch handles 1,000 employees with deterministic bounded writes", async () => {
  const db = new FakeDb();
  const users = Array.from({ length: 1000 }, (_, index) => ({
    id: `employee-${index + 1}`,
    role: "CRM Executive",
    status: "Active",
    joined: "2026-11-02",
  }));
  const result = await finalizeCompletedAttendance(new Date("2026-11-06T18:45:00.000Z"), {
    db,
    users,
    calendar: { weeklyHolidays: [0] },
    automationStartDate: "2026-11-02",
    listAttendance: async () => [],
    listLeaves: async () => [],
  });

  assert.equal(result.employees, 1000);
  assert.equal(result.finalizedBatches, 1000);
  assert.equal(result.marked, 5000);
  assert.equal(db.writeCount, 6000);
});

test("historical backfill dry run includes explicitly selected former employees and performs no writes", async () => {
  const db = new FakeDb();
  const formerEmployee = {
    id: "crm_02",
    role: "CRM Executive",
    status: "Active",
    exEmployee: "Yes",
    joined: "2026-09-06",
  };
  const result = await finalizeCompletedAttendance(new Date("2026-11-15T18:45:00.000Z"), {
    db,
    users: [formerEmployee],
    calendar: { weeklyHolidays: [0] },
    automationStartDate: "2026-11-16",
    backfillFromJoiningDate: true,
    backfillEmployeeIds: ["crm_02"],
    dryRun: true,
    listAttendance: async () => [],
    listLeaves: async () => [],
  });

  assert.equal(result.employees, 1);
  assert.equal(result.finalizedBatches, 12);
  assert.equal(result.wouldMark, 60);
  assert.equal(result.employeePlans[0].employeeId, "crm_02");
  assert.equal(db.writeCount, 0);
  assert.equal(db.values.size, 0);
});

test("employee history sync finalizes every completed working day without waiting for a five-day batch", async () => {
  const db = new FakeDb();
  const user = { id: "it_03", name: "Employee", role: "Full Stack Developer", dept: "IT", status: "Active", joined: "2026-11-04" };
  const createdDates = [];
  let advancedThrough = "";
  const result = await syncEmployeeAttendanceHistory(user, new Date("2026-11-11T18:45:00.000Z"), {
    db,
    state: { finalizedThrough: "2026-11-10" },
    calendar: { weeklyHolidays: [0], holidays: [] },
    listAttendance: async () => [{ employeeId: user.id, date: "2026-11-04", status: "Present" }],
    listLeaves: async () => [{ employeeId: user.id, from: "2026-11-05", to: "2026-11-05", status: "Approved", type: "Earned Leave" }],
    createAbsences: async (dates) => { createdDates.push(...dates); return dates.length; },
    advanceCursor: async (date) => { advancedThrough = date; },
  });

  assert.deepEqual(createdDates, ["2026-11-06", "2026-11-07", "2026-11-09", "2026-11-10", "2026-11-11"]);
  assert.equal(result.eligibleDays, 7);
  assert.equal(result.existingRecords, 1);
  assert.equal(result.approvedLeaveDays, 1);
  assert.equal(result.createdAbsences, 5);
  assert.equal(result.completedThrough, "2026-11-11");
  assert.equal(advancedThrough, "2026-11-11");
});

test("employee history sync returns without attendance reads when its cursor is current", async () => {
  const db = new FakeDb();
  const user = { id: "crm_05", role: "CRM Executive", dept: "CRM", status: "Active", joined: "2026-11-04" };
  let reads = 0;
  const result = await syncEmployeeAttendanceHistory(user, new Date("2026-11-11T18:45:00.000Z"), {
    db,
    state: { finalizedThrough: "2026-11-11", historySyncedThrough: "2026-11-11", historySyncJoinedDate: "2026-11-04" },
    listAttendance: async () => { reads += 1; return []; },
    listLeaves: async () => { reads += 1; return []; },
  });

  assert.equal(result.alreadySynced, true);
  assert.equal(result.createdAbsences, 0);
  assert.equal(reads, 0);
  assert.equal(db.writeCount, 0);
});

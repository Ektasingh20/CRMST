import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { listApprovedLeavesBetween } from "../models/Leave.js";
import User from "../models/User.js";
import {
  createAutomaticAbsences,
  isActiveEmployee,
  listAttendanceForDates,
} from "./attendanceStore.js";
import {
  ensureAttendanceAutomationStartDate,
  getAttendanceCalendar,
} from "./attendanceCalendar.js";
import {
  indiaDateString,
  isAttendanceDeadlineReached,
  isSundayInIndia,
  isValidAttendanceDate,
  millisecondsUntilNextAttendanceRun,
} from "./attendanceTime.js";
import {
  attendanceHolidayForDate,
  normalizeAttendanceCalendar,
  normalizeAttendanceDate,
  previousCalendarDate,
} from "../../shared/attendanceClassification.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export {
  indiaDateString,
  isAttendanceDeadlineReached,
  isSundayInIndia,
  millisecondsUntilNextAttendanceRun,
};

function employeeId(user) {
  return String(user?.id || user?._id || "").trim();
}

function employeeJoinedDate(user) {
  return normalizeAttendanceDate(user?.joined || user?.joinedDate);
}

export function isActiveAttendanceEmployee(user) {
  return isActiveEmployee(user) && Boolean(employeeId(user)) && Boolean(employeeJoinedDate(user));
}

export function hasApprovedLeave(id, date, leaves) {
  return leaves.some((leave) => String(leave.employeeId || "") === String(id)
    && String(leave.status || "").toLowerCase() === "approved"
    && String(leave.from || "") <= date
    && String(leave.to || "") >= date);
}

export function getCompletedFiveDayBatches({
  joinedDate,
  finalizedThrough = "",
  completedThrough,
  automationStartDate,
  backfillFromJoiningDate = false,
  calendar = {},
  now = new Date(),
}) {
  const joined = normalizeAttendanceDate(joinedDate);
  const requestedCompleted = normalizeAttendanceDate(completedThrough);
  const latestCompleted = previousCalendarDate(indiaDateString(now));
  const completed = requestedCompleted && latestCompleted && requestedCompleted > latestCompleted
    ? latestCompleted
    : requestedCompleted;
  const enabledFrom = normalizeAttendanceDate(automationStartDate);
  if (!joined || !completed || (!enabledFrom && !backfillFromJoiningDate)) return [];
  const cursor = normalizeAttendanceDate(finalizedThrough);
  let date;
  if (cursor) {
    date = new Date(Date.parse(`${cursor}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10);
    if (date < joined) date = joined;
    if (!backfillFromJoiningDate && date < enabledFrom) date = enabledFrom;
  } else {
    date = backfillFromJoiningDate || joined > enabledFrom ? joined : enabledFrom;
  }
  const configuredCalendar = normalizeAttendanceCalendar(calendar);
  const batches = [];
  let workingDates = [];
  for (let cursorDate = date; cursorDate <= completed; cursorDate = new Date(Date.parse(`${cursorDate}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10)) {
    if (isValidAttendanceDate(cursorDate) && !attendanceHolidayForDate(cursorDate, configuredCalendar)) {
      workingDates.push(cursorDate);
      if (workingDates.length === 5) {
        batches.push({
          dates: workingDates,
          startDate: workingDates[0],
          endDate: workingDates[4],
        });
        workingDates = [];
      }
    }
  }
  return batches;
}

function stateRef(id, db) {
  return db.collection("attendance").doc(id).collection("automation").doc("state");
}

async function getAutomationStates(users, db) {
  const refs = users.map((user) => stateRef(employeeId(user), db));
  const snapshots = [];
  for (let offset = 0; offset < refs.length; offset += 100) {
    snapshots.push(...await db.getAll(...refs.slice(offset, offset + 100)));
  }
  return new Map(snapshots.map((snapshot) => [snapshot.ref.parent.parent.id, snapshot.exists ? snapshot.data() : {}]));
}

async function advanceAutomationCursor(ref, batch, user, timestamp, db) {
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = normalizeAttendanceDate(snapshot.data()?.finalizedThrough);
    if (current && current >= batch.endDate) return;
    transaction.set(ref, {
      employeeId: employeeId(user),
      joinedDate: employeeJoinedDate(user),
      finalizedThrough: batch.endDate,
      updatedAt: timestamp,
    }, { merge: true });
  });
}

export async function finalizeCompletedAttendance(now = new Date(), options = {}) {
  const db = options.db || getFirestore();
  const completedThrough = previousCalendarDate(indiaDateString(now));
  if (!completedThrough) throw new Error("Unable to determine the last completed attendance date.");
  const users = options.users || await (options.getUsers || (() => User.find()))();
  const calendar = options.calendar || await (options.getCalendar || (() => getAttendanceCalendar(db)))();
  const automationStartDate = options.automationStartDate
    || (options.dryRun || options.backfillFromJoiningDate
      ? calendar.automationStartDate || indiaDateString(now)
      : await (options.ensureStartDate || ((date) => ensureAttendanceAutomationStartDate(date, db)))(indiaDateString(now)));
  const backfillEmployeeIds = new Set((options.backfillEmployeeIds || []).map((id) => String(id)));
  const eligibleUsers = users.filter((user) => {
    if (isActiveAttendanceEmployee(user)) return true;
    const role = String(user?.role || "").trim().toLowerCase();
    const department = String(user?.dept || user?.department || "").trim().toLowerCase();
    return backfillEmployeeIds.has(employeeId(user))
      && role !== "student"
      && department !== "student"
      && Boolean(employeeJoinedDate(user));
  });
  const states = options.states || await getAutomationStates(eligibleUsers, db);
  const batchesByEmployee = new Map();
  const dates = new Set();
  eligibleUsers.forEach((user) => {
    const id = employeeId(user);
    const batches = getCompletedFiveDayBatches({
      joinedDate: employeeJoinedDate(user),
      finalizedThrough: states.get(id)?.finalizedThrough || "",
      completedThrough,
      automationStartDate,
      backfillFromJoiningDate: options.backfillFromJoiningDate === true,
      calendar,
      now,
    });
    if (!batches.length) return;
    batchesByEmployee.set(id, { user, batches });
    batches.flatMap((batch) => batch.dates).forEach((date) => dates.add(date));
  });
  if (!dates.size) {
    return {
      completedThrough,
      employees: eligibleUsers.length,
      finalizedBatches: 0,
      marked: 0,
      ...(options.dryRun ? { wouldMark: 0, employeePlans: [] } : {}),
      skipped: "no_completed_batch",
    };
  }

  const orderedDates = [...dates].sort();
  const [attendance, leaves] = await Promise.all([
    (options.listAttendance || ((values, employees) => listAttendanceForDates(values, db, employees)))(
      orderedDates,
      eligibleUsers.map(employeeId),
    ),
    (options.listLeaves || ((start, end) => listApprovedLeavesBetween(start, end, db)))(orderedDates[0], orderedDates[orderedDates.length - 1]),
  ]);
  const recordKeys = new Set(attendance.map((record) => `${record.employeeId}:${record.date}`));
  let marked = 0;
  let finalizedBatches = 0;
  const timestamp = Timestamp.fromDate(now);
  const missingByDate = new Map();
  const cursorAdvances = [];
  const employeePlans = [];
  for (const [id, value] of batchesByEmployee) {
    const ref = stateRef(id, db);
    const plan = {
      employeeId: id,
      batchCount: value.batches.length,
      batchDateCount: value.batches.reduce((count, batch) => count + batch.dates.length, 0),
      existingRecords: 0,
      approvedLeaveDates: 0,
      wouldMark: 0,
      lastBatchEnd: value.batches.at(-1)?.endDate || "",
    };
    for (const batch of value.batches) {
      for (const date of batch.dates) {
        if (recordKeys.has(`${id}:${date}`)) {
          plan.existingRecords += 1;
          continue;
        }
        if (hasApprovedLeave(id, date, leaves)) {
          plan.approvedLeaveDates += 1;
          continue;
        }
        const missing = missingByDate.get(date) || [];
        missing.push(value.user);
        missingByDate.set(date, missing);
        recordKeys.add(`${id}:${date}`);
        plan.wouldMark += 1;
      }
      cursorAdvances.push({ ref, batch, user: value.user });
    }
    employeePlans.push(plan);
  }
  const wouldMark = employeePlans.reduce((total, plan) => total + plan.wouldMark, 0);
  if (options.dryRun) {
    return {
      completedThrough,
      employees: eligibleUsers.length,
      finalizedBatches: cursorAdvances.length,
      marked: 0,
      wouldMark,
      employeePlans,
      skipped: "dry_run",
    };
  }
  for (const [date, missing] of missingByDate) {
    marked += await createAutomaticAbsences(missing, date, timestamp, db);
  }
  for (const { ref, batch, user } of cursorAdvances) {
    await advanceAutomationCursor(ref, batch, user, timestamp, db);
    finalizedBatches += 1;
  }
  return { completedThrough, employees: eligibleUsers.length, finalizedBatches, marked, skipped: "" };
}

export const autoMarkMissingAttendance = finalizeCompletedAttendance;

export function startAttendanceAutoMarkScheduler() {
  let stopped = false;
  let timer;

  const schedule = (delay) => {
    if (!stopped) timer = setTimeout(run, Math.max(1000, delay));
  };
  const run = async () => {
    if (stopped) return;
    const now = new Date();
    try {
      const result = await finalizeCompletedAttendance(now);
      if (result.skipped === "no_completed_batch") {
        console.info(`Attendance finalization completed through ${result.completedThrough}: no complete five-working-day window was due (${result.employees} eligible employees evaluated).`);
      } else {
        console.info(`Attendance finalization completed through ${result.completedThrough}: ${result.marked} absences marked in ${result.finalizedBatches} batches.`);
      }
    } catch (error) {
      console.error(`Attendance finalization failed:`, error);
      schedule(60 * 1000);
      return;
    }
    schedule(millisecondsUntilNextAttendanceRun(new Date()));
  };

  void run();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

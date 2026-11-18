import { FieldPath, Timestamp, getFirestore } from "firebase-admin/firestore";
import {
  formatIndiaClock,
  indiaDateString,
  indiaMonthString,
  isAttendanceDeadlineReached,
  isValidAttendanceDate,
  previousDateString,
} from "./attendanceTime.js";
import {
  attendanceHolidayForDate,
  normalizeAttendanceDate,
} from "../../shared/attendanceClassification.js";
import { getAttendanceCalendar } from "./attendanceCalendar.js";

const ROOT_COLLECTION = "attendance";
const MONTHS_COLLECTION = "months";
const DAYS_COLLECTION = "attendanceDays";
const MAX_REMARK_LENGTH = 500;
const DEFAULT_ADMIN_PAGE_SIZE = 50;
const MAX_ADMIN_PAGE_SIZE = 50;
let warnedMissingTestSummaryIndex = false;

function clean(value) {
  return String(value ?? "").trim();
}

function attendanceError(message, status = 400, code = "attendance_error") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function timestampDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function timestampIso(value) {
  return timestampDate(value)?.toISOString() || null;
}

function statusLabel(value) {
  const status = clean(value).toLowerCase();
  if (status === "present" || status === "checked_in" || status === "checked_out") return "Present";
  if (status === "absent") return "Absent";
  if (status === "leave") return "Leave";
  if (status === "holiday") return "Holiday";
  return clean(value) || "Not Checked In";
}

export function isOfficialAttendanceRecord(data) {
  return data?.isTestData !== true;
}

function validateEmployeeId(value) {
  const employeeId = clean(value);
  if (!employeeId || employeeId.length > 160 || employeeId.includes("/")) {
    throw attendanceError("A valid employee identity is required.", 400, "invalid_employee");
  }
  return employeeId;
}

function userId(user) {
  return validateEmployeeId(user?.id || user?._id);
}

function firebaseUid(user) {
  const uid = clean(user?.firebaseAuthUid);
  return uid || null;
}

function employeeName(user) {
  return clean(user?.name || user?.username) || "Employee";
}

function isInactiveStatus(value) {
  return ["inactive", "disabled", "ex", "former", "terminated"].includes(clean(value).toLowerCase());
}

export function isActiveEmployee(user) {
  const role = clean(user?.role).toLowerCase();
  const department = clean(user?.dept || user?.department).toLowerCase();
  return role !== "student"
    && department !== "student"
    && !isInactiveStatus(user?.status)
    && !isInactiveStatus(user?.employeeStatus)
    && !["yes", "true"].includes(clean(user?.exEmployee).toLowerCase());
}

export function attendanceRecordId(employeeId, workDate) {
  return `ATT-${String(workDate).replaceAll("-", "")}-${validateEmployeeId(employeeId)}`;
}

export function attendanceDayRef(employeeId, workDate, db = getFirestore()) {
  const id = validateEmployeeId(employeeId);
  if (!isValidAttendanceDate(workDate)) throw attendanceError("A valid attendance date is required.");
  const month = workDate.slice(0, 7);
  return db.collection(ROOT_COLLECTION).doc(id)
    .collection(MONTHS_COLLECTION).doc(month)
    .collection(DAYS_COLLECTION).doc(workDate);
}

function legacyAttendanceRef(employeeId, workDate, db = getFirestore()) {
  return db.collection(ROOT_COLLECTION).doc(attendanceRecordId(employeeId, workDate));
}

export function serializeAttendanceData(data, { id = "", path = "" } = {}) {
  const employeeId = clean(data.employeeId);
  const workDate = clean(data.workDate || data.date);
  const rawStatus = clean(data.status).toLowerCase();
  const checkInAt = data.checkInAt || data.createdAtTimestamp
    || (rawStatus === "present" && data.createdAt ? data.createdAt : null);
  const checkOutAt = data.checkOutAt || null;
  const legacyCheckIn = clean(data.checkIn);
  const legacyCheckOut = clean(data.checkOut);
  const status = statusLabel(data.status);
  return {
    id: clean(data.recordId || data.id || id) || attendanceRecordId(employeeId, workDate),
    employeeId,
    employeeUid: clean(data.employeeUid) || null,
    employeeName: clean(data.employeeName) || "Employee",
    workDate,
    date: workDate,
    month: clean(data.month) || workDate.slice(0, 7),
    status,
    attendanceState: clean(data.attendanceState) || (status === "Present" ? (checkOutAt || legacyCheckOut ? "checked_out" : "checked_in") : status.toLowerCase()),
    checkInAt: timestampIso(checkInAt),
    checkOutAt: timestampIso(checkOutAt),
    checkIn: formatIndiaClock(checkInAt) || legacyCheckIn,
    checkOut: formatIndiaClock(checkOutAt) || legacyCheckOut,
    workedMinutes: data.workedMinutes !== null && data.workedMinutes !== undefined && data.workedMinutes !== "" && Number.isFinite(Number(data.workedMinutes))
      ? Number(data.workedMinutes)
      : null,
    remark: clean(data.remark),
    source: clean(data.source),
    reason: clean(data.reason),
    payable: typeof data.payable === "boolean" ? data.payable : null,
    excludedFromPayroll: data.excludedFromPayroll === true,
    autoMarked: data.autoMarked === true,
    isTestData: data.isTestData === true,
    simulatedPunches: data.simulatedPunches === true,
    correction: data.correction && typeof data.correction === "object" ? data.correction : null,
    correctedAt: timestampIso(data.correctedAt) || clean(data.correctedAt) || null,
    correctedBy: clean(data.correctedBy),
    createdAt: timestampIso(data.createdAt) || clean(data.createdAt) || null,
    updatedAt: timestampIso(data.updatedAt) || clean(data.updatedAt) || null,
    storagePath: path || null,
  };
}

function snapshotJson(snapshot) {
  return serializeAttendanceData(snapshot.data(), { id: snapshot.id, path: snapshot.ref.path });
}

function nestedSnapshotJson(snapshot) {
  const data = snapshot.data();
  const pathParts = String(snapshot.ref.path || "").split("/");
  const ownerId = pathParts[1];
  if (!ownerId) return null;
  if (clean(data.employeeId) && clean(data.employeeId) !== ownerId) {
    console.error(`Ignoring attendance identity mismatch at ${snapshot.ref.path}.`);
    return null;
  }
  const pathDate = snapshot.id;
  if (clean(data.workDate || data.date) && clean(data.workDate || data.date) !== pathDate) {
    console.error(`Ignoring attendance date mismatch at ${snapshot.ref.path}.`);
    return null;
  }
  return serializeAttendanceData({ ...data, employeeId: ownerId, workDate: pathDate }, {
    id: snapshot.id,
    path: snapshot.ref.path,
  });
}

function legacySnapshotJson(snapshot) {
  const data = snapshot.data();
  const record = snapshotJson(snapshot);
  const match = /^ATT-\d{8}-(.+)$/.exec(snapshot.id);
  if (match && clean(data.employeeId) && match[1] !== clean(data.employeeId)) {
    console.error(`Ignoring legacy attendance identity mismatch at ${snapshot.ref.path}.`);
    return null;
  }
  return record;
}

function syntheticJson(ref, data) {
  return serializeAttendanceData(data, { id: ref.id, path: ref.path });
}

async function readLegacyEmployeeMonth(employeeId, month, endDate, db = getFirestore()) {
  const start = `${month}-01`;
  if (!endDate || endDate < start) return [];
  try {
    const snapshot = await db.collection(ROOT_COLLECTION)
      .where("employeeId", "==", employeeId)
      .where("date", ">=", start)
      .where("date", "<=", endDate)
      .get();
    return snapshot.docs.filter((doc) => isValidAttendanceDate(doc.data()?.date)).map(legacySnapshotJson).filter(Boolean);
  } catch (error) {
    if (error?.code !== 9 && error?.code !== "failed-precondition") throw error;
    const snapshot = await db.collection(ROOT_COLLECTION).where("employeeId", "==", employeeId).get();
    return snapshot.docs
      .filter((doc) => clean(doc.data()?.date).startsWith(`${month}-`)
        && clean(doc.data()?.date) <= endDate)
      .map(legacySnapshotJson)
      .filter(Boolean);
  }
}

export async function getEmployeeAttendanceMonth(user, month, db = getFirestore()) {
  const employeeId = userId(user);
  if (!/^\d{4}-\d{2}$/.test(clean(month))) throw attendanceError("A valid attendance month is required.");
  const today = indiaDateString();
  if (month > today.slice(0, 7)) return [];
  const endDate = month === today.slice(0, 7) ? today : `${month}-31`;
  const nestedRef = db.collection(ROOT_COLLECTION).doc(employeeId)
    .collection(MONTHS_COLLECTION).doc(month)
    .collection(DAYS_COLLECTION);
  const [nested, legacy] = await Promise.all([
    nestedRef
      .where(FieldPath.documentId(), ">=", `${month}-01`)
      .where(FieldPath.documentId(), "<=", endDate)
      .get(),
    readLegacyEmployeeMonth(employeeId, month, endDate, db),
  ]);
  const byDate = new Map(legacy.map((record) => [record.workDate, record]));
  nested.docs.forEach((doc) => {
    const record = nestedSnapshotJson(doc);
    if (record && record.workDate <= endDate) byDate.set(doc.id, record);
  });
  return [...byDate.values()].sort((left, right) => right.workDate.localeCompare(left.workDate));
}

export async function getEmployeeTodayAttendance(user, now = new Date(), db = getFirestore()) {
  const employeeId = userId(user);
  const workDate = indiaDateString(now);
  const [nested, legacy] = await Promise.all([
    attendanceDayRef(employeeId, workDate, db).get(),
    legacyAttendanceRef(employeeId, workDate, db).get(),
  ]);
  if (nested.exists) return nestedSnapshotJson(nested);
  return legacy.exists ? legacySnapshotJson(legacy) : null;
}

function baseRecord(user, workDate, now) {
  const employeeId = userId(user);
  return {
    recordId: attendanceRecordId(employeeId, workDate),
    employeeId,
    employeeUid: firebaseUid(user),
    employeeName: employeeName(user),
    workDate,
    month: workDate.slice(0, 7),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizedRemark(value) {
  const remark = clean(value);
  if (remark.length > MAX_REMARK_LENGTH) throw attendanceError(`Remark cannot exceed ${MAX_REMARK_LENGTH} characters.`);
  return remark;
}

export async function checkInEmployee(user, { remark = "", now = Timestamp.now() } = {}, db = getFirestore()) {
  if (!isActiveEmployee(user)) throw attendanceError("Only active employees can check in.", 403, "inactive_employee");
  const employeeId = userId(user);
  const nowDate = timestampDate(now) || new Date();
  const workDate = indiaDateString(nowDate);
  const joinedDate = normalizeAttendanceDate(user.joined || user.joinedDate);
  if (joinedDate && workDate < joinedDate) throw attendanceError("Attendance cannot be marked before the joining date.", 409, "pre_join");
  const calendar = await getAttendanceCalendar(db);
  if (attendanceHolidayForDate(workDate, calendar)) throw attendanceError("Attendance cannot be marked on a configured holiday.", 409, "holiday");
  if (isAttendanceDeadlineReached(workDate, nowDate, calendar)) throw attendanceError("Check-in closed at 12:00 PM IST.", 409, "check_in_closed");
  const cleanRemark = normalizedRemark(remark);
  const ref = attendanceDayRef(employeeId, workDate, db);
  const legacy = await legacyAttendanceRef(employeeId, workDate, db).get();
  if (legacy.exists) {
    const existing = snapshotJson(legacy);
    if (existing.status === "Present" && existing.checkIn) return { record: existing, idempotent: true };
    throw attendanceError("Attendance is already marked for today.", 409, "already_marked");
  }

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) {
      const existing = snapshotJson(snapshot);
      if (existing.checkInAt || existing.checkIn) return { record: existing, idempotent: true };
      throw attendanceError("Attendance is already marked for today.", 409, "already_marked");
    }
    const data = {
      ...baseRecord(user, workDate, now),
      status: "present",
      attendanceState: "checked_in",
      checkInAt: now,
      checkOutAt: null,
      workedMinutes: null,
      remark: cleanRemark,
      autoMarked: false,
      source: "employee_self_service",
    };
    transaction.create(ref, data);
    return { record: syntheticJson(ref, data), idempotent: false };
  });
}

export async function markEmployeeAbsent(user, { remark = "", now = Timestamp.now() } = {}, db = getFirestore()) {
  if (!isActiveEmployee(user)) throw attendanceError("Only active employees can mark attendance.", 403, "inactive_employee");
  const employeeId = userId(user);
  const nowDate = timestampDate(now) || new Date();
  const workDate = indiaDateString(nowDate);
  const joinedDate = normalizeAttendanceDate(user.joined || user.joinedDate);
  if (joinedDate && workDate < joinedDate) throw attendanceError("Attendance cannot be marked before the joining date.", 409, "pre_join");
  const calendar = await getAttendanceCalendar(db);
  if (attendanceHolidayForDate(workDate, calendar)) throw attendanceError("Attendance cannot be marked on a configured holiday.", 409, "holiday");
  const ref = attendanceDayRef(employeeId, workDate, db);
  const cleanRemark = normalizedRemark(remark);
  const legacy = await legacyAttendanceRef(employeeId, workDate, db).get();
  if (legacy.exists) return { record: snapshotJson(legacy), idempotent: true };
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) return { record: snapshotJson(snapshot), idempotent: true };
    const data = {
      ...baseRecord(user, workDate, now),
      status: "absent",
      attendanceState: "absent",
      checkInAt: null,
      checkOutAt: null,
      workedMinutes: null,
      remark: cleanRemark,
      autoMarked: false,
      source: "employee_self_service",
    };
    transaction.create(ref, data);
    return { record: syntheticJson(ref, data), idempotent: false };
  });
}

function timestampMillis(value) {
  const date = timestampDate(value);
  return date ? date.getTime() : NaN;
}

export function calculateWorkedMinutes(checkInAt, checkOutAt) {
  const start = timestampMillis(checkInAt);
  const end = timestampMillis(checkOutAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.floor((end - start) / 60_000);
}

export async function checkOutEmployee(user, { now = Timestamp.now() } = {}, db = getFirestore()) {
  if (!isActiveEmployee(user)) throw attendanceError("Only active employees can check out.", 403, "inactive_employee");
  const employeeId = userId(user);
  const nowDate = timestampDate(now) || new Date();
  const today = indiaDateString(nowDate);
  const yesterday = previousDateString(today);
  const refs = [attendanceDayRef(employeeId, today, db), attendanceDayRef(employeeId, yesterday, db)];
  const maxShiftHours = Math.max(1, Math.min(48, Number(process.env.ATTENDANCE_MAX_SHIFT_HOURS) || 24));

  return db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const todaySnapshot = snapshots[0];
    if (todaySnapshot.exists && todaySnapshot.data()?.checkOutAt) {
      return { record: snapshotJson(todaySnapshot), idempotent: true };
    }
    let selected = snapshots.find((snapshot) => snapshot.exists && snapshot.data()?.checkInAt && !snapshot.data()?.checkOutAt);
    if (!selected) throw attendanceError("Check in before checking out.", 409, "not_checked_in");
    const data = selected.data();
    const workedMinutes = calculateWorkedMinutes(data.checkInAt, now);
    if (workedMinutes === null) throw attendanceError("The saved check-in time is invalid.", 409, "invalid_check_in");
    if (workedMinutes > maxShiftHours * 60) {
      throw attendanceError("This check-in is too old for self check-out. Contact an administrator.", 409, "stale_check_in");
    }
    const update = {
      checkOutAt: now,
      workedMinutes,
      attendanceState: "checked_out",
      updatedAt: now,
    };
    transaction.update(selected.ref, update);
    return { record: syntheticJson(selected.ref, { ...data, ...update }), idempotent: false };
  });
}

export async function createAutomaticAbsence(user, workDate, now = Timestamp.now(), db = getFirestore()) {
  assertCompletedAbsenceDate(workDate, now);
  const ref = attendanceDayRef(userId(user), workDate, db);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) return { created: false, record: snapshotJson(snapshot) };
    const data = {
      ...baseRecord(user, workDate, now),
      status: "absent",
      attendanceState: "absent",
      checkInAt: null,
      checkOutAt: null,
      workedMinutes: null,
      remark: "Automatically finalized after five eligible working days.",
      autoMarked: true,
      source: "attendance_five_day_finalization",
      reason: "finalized_absence",
      finalizedAt: now,
    };
    transaction.create(ref, data);
    return { created: true, record: syntheticJson(ref, data) };
  });
}

export async function createAutomaticAbsences(users, workDate, now = Timestamp.now(), db = getFirestore()) {
  if (!users.length) return 0;
  assertCompletedAbsenceDate(workDate, now);
  const writer = db.bulkWriter();
  writer.onWriteError((error) => {
    if (error.code === 6 || error.code === "already-exists") return false;
    return error.failedAttempts < 3;
  });
  const writes = users.map((user) => {
    const ref = attendanceDayRef(userId(user), workDate, db);
    const data = {
      ...baseRecord(user, workDate, now),
      status: "absent",
      attendanceState: "absent",
      checkInAt: null,
      checkOutAt: null,
      workedMinutes: null,
      remark: "Automatically finalized after five eligible working days.",
      autoMarked: true,
      source: "attendance_five_day_finalization",
      reason: "finalized_absence",
      finalizedAt: now,
    };
    return writer.create(ref, data)
      .then(() => ({ created: true }))
      .catch((error) => {
        if (error?.code === 6 || error?.code === "already-exists") return { created: false };
        return { created: false, error };
      });
  });
  await writer.close();
  const results = await Promise.all(writes);
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;
  return results.filter((result) => result.created).length;
}

export async function createSyncedAttendanceAbsences(user, workDates, now = Timestamp.now(), db = getFirestore()) {
  const dates = [...new Set((Array.isArray(workDates) ? workDates : []).map(clean))];
  if (!dates.length) return 0;
  dates.forEach((workDate) => assertCompletedAbsenceDate(workDate, now));
  const writer = db.bulkWriter();
  writer.onWriteError((error) => {
    if (error.code === 6 || error.code === "already-exists") return false;
    return error.failedAttempts < 3;
  });
  const writes = dates.map((workDate) => {
    const ref = attendanceDayRef(userId(user), workDate, db);
    const data = {
      ...baseRecord(user, workDate, now),
      status: "absent",
      attendanceState: "absent",
      checkInAt: null,
      checkOutAt: null,
      workedMinutes: null,
      remark: "Attendance history synchronized from the employee joining date.",
      autoMarked: true,
      source: "employee_history_sync",
      reason: "finalized_absence",
      finalizedAt: now,
    };
    return writer.create(ref, data)
      .then(() => ({ created: true }))
      .catch((error) => {
        if (error?.code === 6 || error?.code === "already-exists") return { created: false };
        return { created: false, error };
      });
  });
  await writer.close();
  const results = await Promise.all(writes);
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;
  return results.filter((result) => result.created).length;
}

function assertCompletedAbsenceDate(workDate, now) {
  const nowDate = timestampDate(now) || new Date();
  const latestCompletedDate = previousDateString(indiaDateString(nowDate));
  if (!isValidAttendanceDate(workDate) || !latestCompletedDate || workDate > latestCompletedDate) {
    throw attendanceError(
      "Automatic absences can only be created for completed attendance dates.",
      409,
      "future_attendance_forbidden",
    );
  }
}

export async function listAttendanceForDates(workDates, db = getFirestore(), fallbackEmployeeIds = []) {
  const dates = [...new Set((Array.isArray(workDates) ? workDates : []).map(clean))];
  if (!dates.length || dates.some((date) => !isValidAttendanceDate(date))) {
    throw attendanceError("Valid attendance dates are required.");
  }
  const chunks = [];
  for (let index = 0; index < dates.length; index += 30) chunks.push(dates.slice(index, index + 30));
  const nestedQueries = () => Promise.all(chunks.map((chunk) => (
    db.collectionGroup(DAYS_COLLECTION).where("workDate", "in", chunk).get()
  )));
  const legacyQueries = () => Promise.all(chunks.map((chunk) => (
    db.collection(ROOT_COLLECTION).where("date", "in", chunk).get()
  )));
  let nestedSnapshots;
  let legacySnapshots;
  try {
    [nestedSnapshots, legacySnapshots] = await Promise.all([nestedQueries(), legacyQueries()]);
  } catch (error) {
    if (![9, "failed-precondition"].includes(error?.code) || !fallbackEmployeeIds.length) throw error;
    // Until the collection-group index is ready, read today's exact documents
    // for eligible employees. Never infer an absence from a failed query.
    legacySnapshots = await legacyQueries();
    const ids = [...new Set(fallbackEmployeeIds.map((id) => clean(id)).filter(Boolean))];
    const documents = [];
    const refs = ids.flatMap((id) => dates.map((date) => attendanceDayRef(id, date, db)));
    for (let index = 0; index < refs.length; index += 100) {
      const currentRefs = refs.slice(index, index + 100);
      documents.push(...await db.getAll(...currentRefs));
    }
    nestedSnapshots = [{ docs: documents.filter((document) => document.exists) }];
  }
  const byKey = new Map();
  legacySnapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
    const record = legacySnapshotJson(doc);
    if (record?.employeeId && record.date) byKey.set(`${record.employeeId}:${record.date}`, record);
  });
  nestedSnapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
    const record = nestedSnapshotJson(doc);
    if (record?.employeeId && record.date) byKey.set(`${record.employeeId}:${record.date}`, record);
  });
  return [...byKey.values()];
}

export async function listAttendanceForDate(workDate, db = getFirestore(), fallbackEmployeeIds = []) {
  if (!isValidAttendanceDate(workDate)) throw attendanceError("A valid attendance date is required.");
  return listAttendanceForDates([workDate], db, fallbackEmployeeIds);
}

export async function listAdminAttendanceMonth(month, db = getFirestore()) {
  const selectedMonth = clean(month);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) throw attendanceError("A valid attendance month is required.");
  const start = `${selectedMonth}-01`;
  const end = `${selectedMonth}-31`;
  const [nested, legacy] = await Promise.all([
    db.collectionGroup(DAYS_COLLECTION).where("month", "==", selectedMonth).get(),
    db.collection(ROOT_COLLECTION).where("date", ">=", start).where("date", "<=", end).get(),
  ]);
  const byKey = new Map();
  legacy.docs.forEach((doc) => {
    if (!isOfficialAttendanceRecord(doc.data()) || !isValidAttendanceDate(doc.data()?.date)) return;
    const record = legacySnapshotJson(doc);
    if (record?.employeeId) byKey.set(`${record.employeeId}:${record.date}`, record);
  });
  nested.docs.forEach((doc) => {
    if (!isOfficialAttendanceRecord(doc.data())) return;
    const record = nestedSnapshotJson(doc);
    if (record?.employeeId && record.date?.startsWith(`${selectedMonth}-`)) {
      byKey.set(`${record.employeeId}:${record.date}`, record);
    }
  });
  return [...byKey.values()].sort((left, right) => left.date.localeCompare(right.date)
    || left.employeeId.localeCompare(right.employeeId));
}

function encodeCursor(path) {
  return Buffer.from(path, "utf8").toString("base64url");
}

function decodeCursor(value) {
  try { return Buffer.from(clean(value), "base64url").toString("utf8"); }
  catch { throw attendanceError("The attendance page cursor is invalid."); }
}

export async function listAdminAttendance({ month = "", date = "", employeeId = "", status = "", pageSize = DEFAULT_ADMIN_PAGE_SIZE, cursor = "" } = {}, db = getFirestore()) {
  const cleanMonth = clean(month);
  const cleanDate = clean(date);
  if (cleanDate && !isValidAttendanceDate(cleanDate)) throw attendanceError("A valid attendance date is required.");
  if (cleanMonth && !/^\d{4}-\d{2}$/.test(cleanMonth)) throw attendanceError("A valid attendance month is required.");
  const limit = Math.max(1, Math.min(MAX_ADMIN_PAGE_SIZE, Number(pageSize) || DEFAULT_ADMIN_PAGE_SIZE));
  let query = db.collectionGroup(DAYS_COLLECTION);
  if (cleanDate) query = query.where("workDate", "==", cleanDate);
  else if (cleanMonth) query = query.where("month", "==", cleanMonth);
  if (clean(employeeId)) query = query.where("employeeId", "==", validateEmployeeId(employeeId));
  if (clean(status)) query = query.where("status", "==", clean(status).toLowerCase());
  query = query.orderBy("workDate", "desc");
  let initialCursor = null;
  if (cursor) {
    const path = decodeCursor(cursor);
    if (!/^attendance\/[^/]+\/months\/\d{4}-\d{2}\/attendanceDays\/\d{4}-\d{2}-\d{2}$/.test(path)) {
      throw attendanceError("The attendance page cursor is invalid.");
    }
    const snapshot = await db.doc(path).get();
    if (!snapshot.exists) throw attendanceError("The attendance page cursor expired.", 409, "cursor_expired");
    initialCursor = snapshot;
  }
  const pageDocs = [];
  let scanAfter = initialCursor;
  let reachedEnd = false;
  while (pageDocs.length <= limit && !reachedEnd) {
    const pageQuery = scanAfter ? query.startAfter(scanAfter) : query;
    const snapshot = await pageQuery.limit(limit + 1).get();
    snapshot.docs.forEach((doc) => {
      scanAfter = doc;
      if (isOfficialAttendanceRecord(doc.data())) pageDocs.push(doc);
    });
    reachedEnd = snapshot.docs.length < limit + 1;
  }
  const hasMore = pageDocs.length > limit;
  const visibleDocs = pageDocs.slice(0, limit);
  return {
    records: visibleDocs.map(snapshotJson),
    nextCursor: hasMore ? encodeCursor(visibleDocs.at(-1).ref.path) : "",
    pageSize: limit,
  };
}

export async function listLegacyAdminAttendance({ month = "", date = "", employeeId = "", status = "", pageSize = DEFAULT_ADMIN_PAGE_SIZE } = {}, db = getFirestore()) {
  const cleanMonth = clean(month);
  const cleanDate = clean(date);
  if (cleanDate && !isValidAttendanceDate(cleanDate)) throw attendanceError("A valid attendance date is required.");
  if (cleanMonth && !/^\d{4}-\d{2}$/.test(cleanMonth)) throw attendanceError("A valid attendance month is required.");
  const limit = Math.max(1, Math.min(MAX_ADMIN_PAGE_SIZE, Number(pageSize) || DEFAULT_ADMIN_PAGE_SIZE));
  const start = cleanDate || (cleanMonth ? `${cleanMonth}-01` : "0000-01-01");
  const end = cleanDate || (cleanMonth ? `${cleanMonth}-31` : "9999-12-31");
  const snapshot = await db.collection(ROOT_COLLECTION)
    .where("date", ">=", start)
    .where("date", "<=", end)
    .orderBy("date", "desc")
    .limit(Math.min(200, limit * 4))
    .get();
  return snapshot.docs
    .filter((doc) => {
      const data = doc.data();
      return isOfficialAttendanceRecord(data)
        && isValidAttendanceDate(data?.date)
        && (!clean(employeeId) || clean(data.employeeId) === clean(employeeId))
        && (!clean(status) || clean(data.status).toLowerCase() === clean(status).toLowerCase());
    })
    .slice(0, limit)
    .map(snapshotJson);
}

export async function getAdminAttendanceSummary(workDate, db = getFirestore()) {
  if (!isValidAttendanceDate(workDate)) throw attendanceError("A valid attendance date is required.");
  const base = db.collectionGroup(DAYS_COLLECTION).where("workDate", "==", workDate);
  let testSnapshot;
  try {
    testSnapshot = await base.where("isTestData", "==", true).get();
  } catch (error) {
    if (error?.code !== 9 && error?.code !== "failed-precondition") throw error;
    if (!warnedMissingTestSummaryIndex) {
      console.warn("Attendance test-summary index unavailable; using one date-scoped read until the index is ready.");
      warnedMissingTestSummaryIndex = true;
    }
    const snapshot = await base.get();
    return summarizeAttendanceRecords(workDate, snapshot.docs.map((doc) => doc.data()).filter(isOfficialAttendanceRecord));
  }
  const [all, present, absent, checkedOut, leave, holiday] = await Promise.all([
    base.count().get(),
    base.where("status", "==", "present").count().get(),
    base.where("status", "==", "absent").count().get(),
    base.where("attendanceState", "==", "checked_out").count().get(),
    base.where("status", "==", "leave").count().get(),
    base.where("status", "==", "holiday").count().get(),
  ]);
  const testRecords = testSnapshot.docs.map((doc) => doc.data());
  const testCount = testRecords.length;
  const testStatusCount = (status) => testRecords
    .filter((record) => clean(record.status).toLowerCase() === status).length;
  const presentCount = Math.max(0, present.data().count - testStatusCount("present"));
  const checkedOutCount = Math.max(0, checkedOut.data().count
    - testRecords.filter((record) => clean(record.attendanceState).toLowerCase() === "checked_out").length);
  return {
    workDate,
    recorded: Math.max(0, all.data().count - testCount),
    present: presentCount,
    absent: Math.max(0, absent.data().count - testStatusCount("absent")),
    leave: Math.max(0, leave.data().count - testStatusCount("leave")),
    holiday: Math.max(0, holiday.data().count - testStatusCount("holiday")),
    checkedIn: Math.max(0, presentCount - checkedOutCount),
    checkedOut: checkedOutCount,
  };
}

function summarizeAttendanceRecords(workDate, records) {
  const count = (status) => records.filter((record) => clean(record.status).toLowerCase() === status).length;
  const presentCount = count("present");
  const checkedOutCount = records.filter((record) => clean(record.attendanceState).toLowerCase() === "checked_out").length;
  return {
    workDate,
    recorded: records.length,
    present: presentCount,
    absent: count("absent"),
    leave: count("leave"),
    holiday: count("holiday"),
    checkedIn: Math.max(0, presentCount - checkedOutCount),
    checkedOut: checkedOutCount,
  };
}

export function attendanceIdentityFromRecordId(recordId) {
  const match = /^ATT-(\d{4})(\d{2})(\d{2})-(.+)$/.exec(clean(recordId));
  if (!match) throw attendanceError("Attendance record not found.", 404, "not_found");
  return { workDate: `${match[1]}-${match[2]}-${match[3]}`, employeeId: validateEmployeeId(match[4]) };
}

export async function correctNestedAttendance(recordId, admin, { status, remark } = {}, db = getFirestore()) {
  const identity = attendanceIdentityFromRecordId(recordId);
  if (identity.workDate > indiaDateString()) {
    throw attendanceError("Future attendance cannot be corrected.", 409, "future_attendance_forbidden");
  }
  const nextStatus = clean(status).toLowerCase();
  if (!["present", "absent"].includes(nextStatus)) throw attendanceError("Choose Present or Absent.");
  const ref = attendanceDayRef(identity.employeeId, identity.workDate, db);
  const now = Timestamp.now();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw attendanceError("Attendance record not found.", 404, "not_found");
    const current = snapshot.data();
    if (!current.autoMarked) throw attendanceError("Only automatically marked attendance can be corrected here.");
    const correctedBy = employeeName(admin);
    const correctedById = userId(admin);
    const correctedRemark = remark !== undefined
      ? normalizedRemark(remark)
      : `Corrected from ${statusLabel(current.status)} to ${statusLabel(nextStatus)} by ${correctedBy}.`;
    const update = {
      status: nextStatus,
      attendanceState: nextStatus === "present" ? (current.checkOutAt ? "checked_out" : "checked_in") : "absent",
      correctedAt: now,
      correctedBy,
      correctedById,
      updatedAt: now,
      source: "admin_correction",
      remark: correctedRemark,
      correction: {
        previousStatus: clean(current.status),
        previousRemark: clean(current.remark),
        previousSource: clean(current.source),
        status: nextStatus,
        correctedAt: now,
        correctedById,
        correctedBy,
      },
    };
    transaction.update(ref, update);
    return syntheticJson(ref, { ...current, ...update });
  });
}

export { DAYS_COLLECTION };

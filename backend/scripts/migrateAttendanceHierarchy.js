import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import User from "../models/User.js";
import { attendanceDayRef, attendanceRecordId, calculateWorkedMinutes } from "../services/attendanceStore.js";
import { indiaDateString } from "../services/attendanceTime.js";

const apply = process.argv.includes("--apply");
const confirmation = process.argv.find((argument) => argument.startsWith("--confirm="))?.slice("--confirm=".length) || "";

function clean(value) {
  return String(value ?? "").trim();
}

function asTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? Timestamp.fromDate(date) : null;
}

function clockTimestamp(workDate, clock) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec(clean(clock));
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = String(match[3] || "").toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  const value = new Date(`${workDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`);
  return Number.isFinite(value.getTime()) ? Timestamp.fromDate(value) : null;
}

function migratedData(data, employeeUid) {
  const employeeId = clean(data.employeeId);
  const workDate = clean(data.date || data.workDate);
  const status = clean(data.status).toLowerCase() || "absent";
  const createdAt = asTimestamp(data.createdAt) || Timestamp.now();
  const updatedAt = asTimestamp(data.updatedAt) || createdAt;
  const checkInAt = asTimestamp(data.checkInAt)
    || (clean(data.checkIn) ? clockTimestamp(workDate, data.checkIn) : null)
    || (status === "present" ? createdAt : null);
  let checkOutAt = asTimestamp(data.checkOutAt) || clockTimestamp(workDate, data.checkOut);
  if (checkOutAt && checkInAt && checkOutAt.toMillis() < checkInAt.toMillis()) {
    checkOutAt = Timestamp.fromMillis(checkOutAt.toMillis() + 24 * 60 * 60 * 1000);
  }
  return {
    recordId: clean(data.id) || attendanceRecordId(employeeId, workDate),
    employeeId,
    employeeUid: clean(data.employeeUid || employeeUid) || null,
    employeeName: clean(data.employeeName) || "Employee",
    workDate,
    month: workDate.slice(0, 7),
    status,
    attendanceState: status === "present" ? (checkOutAt ? "checked_out" : "checked_in") : status,
    checkInAt,
    checkOutAt,
    workedMinutes: checkInAt && checkOutAt ? calculateWorkedMinutes(checkInAt, checkOutAt) : null,
    remark: clean(data.remark),
    autoMarked: data.autoMarked === true,
    createdAt,
    updatedAt,
    source: "legacy_attendance_migration",
    ...(data.correctedAt ? {
      correctedAt: asTimestamp(data.correctedAt),
      correctedBy: clean(data.correctedBy),
      correctedById: clean(data.correctedById),
    } : {}),
  };
}

async function main() {
  if (apply && confirmation !== "KEEP_LEGACY_AND_COPY") {
    throw new Error("Apply mode requires --confirm=KEEP_LEGACY_AND_COPY. The script never deletes legacy records.");
  }
  await connectDatabase();
  const db = getFirestore();
  const [legacySnapshot, users] = await Promise.all([
    db.collection("attendance").get(),
    User.find(),
  ]);
  const uidByEmployee = new Map(users.map((user) => [clean(user.id || user._id), clean(user.firebaseAuthUid)]));
  const today = indiaDateString();
  const validLegacyDocuments = legacySnapshot.docs.filter((document) => {
    const data = document.data();
    return clean(data.employeeId) && /^\d{4}-\d{2}-\d{2}$/.test(clean(data.date || data.workDate));
  });
  const skippedFutureDocuments = validLegacyDocuments.filter((document) => {
    const data = document.data();
    return clean(data.date || data.workDate) > today;
  }).map((document) => ({
    path: document.ref.path,
    employeeId: clean(document.data().employeeId),
    workDate: clean(document.data().date || document.data().workDate),
  }));
  const legacyDocuments = validLegacyDocuments.filter((document) => {
    const data = document.data();
    return clean(data.date || data.workDate) <= today;
  });
  const plan = [];
  let alreadyMigrated = 0;
  for (const document of legacyDocuments) {
    const data = document.data();
    const employeeId = clean(data.employeeId);
    const workDate = clean(data.date || data.workDate);
    const target = attendanceDayRef(employeeId, workDate, db);
    const existing = await target.get();
    if (existing.exists) {
      alreadyMigrated += 1;
      continue;
    }
    plan.push({ target, data: migratedData(data, uidByEmployee.get(employeeId)) });
  }

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    legacyDocuments: legacyDocuments.length,
    wouldCopy: plan.length,
    alreadyMigrated,
    skippedFutureDocuments,
    deletes: 0,
  }, null, 2));

  if (!apply || !plan.length) return;
  for (let offset = 0; offset < plan.length; offset += 400) {
    const batch = db.batch();
    plan.slice(offset, offset + 400).forEach(({ target, data }) => batch.create(target, data));
    await batch.commit();
  }
  console.log(`Copied ${plan.length} legacy attendance documents. Legacy documents were preserved.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

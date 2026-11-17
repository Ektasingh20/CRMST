import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFirestore } from "firebase-admin/firestore";
import User from "../models/User.js";
import { connectDatabase } from "../config/db.js";
import { listApprovedLeavesBetween } from "../models/Leave.js";
import { indiaDateString } from "../services/attendanceTime.js";
import { ATTENDANCE_TEST_SOURCE, buildNovemberRamTestRecords } from "../services/attendanceTestSeed.js";
import {
  attendanceDayRef,
  attendanceRecordId,
} from "../services/attendanceStore.js";
import {
  decodeFirestoreValue,
  encodeFirestoreValue,
  sameAttendanceData,
} from "../services/attendanceTestManifest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestDirectory = path.resolve(__dirname, "..", ".attendance-test-manifests");
const args = process.argv.slice(2);
const prepare = args.includes("--prepare");
const apply = args.includes("--apply");
const confirmed = args.includes("--confirm=SEED_RAM_ATTENDANCE_TEST");
const operationArg = args.find((arg) => arg.startsWith("--operation="));
const operationId = operationArg
  ? operationArg.slice("--operation=".length).trim()
  : `ram-attendance-test-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const EXPECTED_DATES = Array.from({ length: 16 }, (_, index) => `2026-11-${String(index + 1).padStart(2, "0")}`);

function normalized(value) {
  return String(value || "").trim().toLowerCase();
}

function getUserId(user) {
  return String(user?.id || user?._id || "");
}

async function findRam() {
  const users = await User.find({});
  const matches = users.filter((user) => normalized(user.name) === "ram" || normalized(user.username) === "ram");
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one employee named Ram; found ${matches.length}. No writes were made.`);
  }
  const employee = matches[0];
  if (getUserId(employee) !== "crm_02"
    || normalized(employee.dept || employee.department) !== "crm"
    || employee._ref?.path !== "users/crm/members/crm_02") {
    throw new Error("Ram's verified employee mapping no longer matches crm_02. No writes were made.");
  }
  return employee;
}

function isReplaceableAutoAbsence(data) {
  return normalized(data?.status) === "absent"
    && data?.autoMarked === true
    && data?.source === "attendance_five_day_finalization"
    && data?.isTestData !== true
    && !data?.checkInAt
    && !data?.checkOutAt
    && !String(data?.checkIn || "").trim()
    && !String(data?.checkOut || "").trim()
    && !data?.correction
    && !data?.correctedAt
    && !data?.correctedBy
    && !data?.correctedById;
}

function backup(snapshot) {
  return {
    path: snapshot.ref.path,
    exists: snapshot.exists,
    data: snapshot.exists ? encodeFirestoreValue(snapshot.data()) : null,
  };
}

function expectedBackup(manifest, documentPath) {
  const entry = manifest.originalDocuments.find((item) => item.path === documentPath);
  if (!entry) throw new Error(`The backup manifest is missing ${documentPath}.`);
  return entry;
}

function ensureManifestScope(manifest, expectedOperationId) {
  if (manifest.version !== 1
    || manifest.operationId !== expectedOperationId
    || manifest.employeeId !== "crm_02"
    || manifest.month !== "2026-11"
    || manifest.source !== ATTENDANCE_TEST_SOURCE
    || !Array.isArray(manifest.originalDocuments)
    || !Array.isArray(manifest.legacyDocuments)
    || !Array.isArray(manifest.proposedDocuments)) {
    throw new Error("The attendance test backup manifest is invalid or out of scope.");
  }
  const expectedPaths = EXPECTED_DATES.map((date) => `attendance/crm_02/months/2026-11/attendanceDays/${date}`);
  const proposedPaths = manifest.proposedDocuments.map((item) => item.path).sort();
  const originalPaths = manifest.originalDocuments.map((item) => item.path).sort();
  const legacyPaths = manifest.legacyDocuments.map((item) => item.path).sort();
  const expectedLegacyPaths = EXPECTED_DATES.map((date) => `attendance/${attendanceRecordId("crm_02", date)}`);
  if (JSON.stringify(proposedPaths) !== JSON.stringify([...expectedPaths].sort())
    || JSON.stringify(originalPaths) !== JSON.stringify([...expectedPaths].sort())
    || JSON.stringify(legacyPaths) !== JSON.stringify([...expectedLegacyPaths].sort())) {
    throw new Error("The attendance test backup manifest contains unexpected document paths.");
  }
}

async function saveManifest(manifestPath, manifest, createOnly = false) {
  const content = `${JSON.stringify(manifest, null, 2)}\n`;
  if (createOnly) {
    await fs.writeFile(manifestPath, content, { flag: "wx" });
    return;
  }
  const temporaryPath = `${manifestPath}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, content, { flag: "wx" });
    await fs.rename(temporaryPath, manifestPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

function previewRecord(record) {
  return {
    ...record,
    checkInAt: record.checkInAt?.toDate().toISOString() || null,
    checkOutAt: record.checkOutAt?.toDate().toISOString() || null,
    createdAt: record.createdAt.toDate().toISOString(),
    updatedAt: record.updatedAt.toDate().toISOString(),
  };
}

async function prepareOperation({ employee, records, nestedRefs, legacyRefs, db }) {
  const snapshots = await db.getAll(...nestedRefs, ...legacyRefs);
  const nestedSnapshots = snapshots.slice(0, nestedRefs.length);
  const legacySnapshots = snapshots.slice(nestedRefs.length);
  const originalDocuments = nestedSnapshots.map(backup);
  const legacyDocuments = legacySnapshots.map(backup);
  const conflicts = [];

  nestedSnapshots.forEach((snapshot) => {
    if (snapshot.exists && !isReplaceableAutoAbsence(snapshot.data())) {
      conflicts.push({
        path: snapshot.ref.path,
        status: snapshot.data()?.status || "",
        source: snapshot.data()?.source || "",
        reason: "Existing record is not an uncorrected auto-finalized Absent.",
      });
    }
  });
  legacySnapshots.forEach((snapshot) => {
    if (snapshot.exists) {
      conflicts.push({
        path: snapshot.ref.path,
        status: snapshot.data()?.status || "",
        source: snapshot.data()?.source || "",
        reason: "A legacy attendance document exists for this date.",
      });
    }
  });

  const approvedLeaves = await listApprovedLeavesBetween("2026-11-01", "2026-11-16", db);
  const ramLeaves = approvedLeaves.filter((leave) => String(leave.employeeId || "") === "crm_02");
  if (ramLeaves.length) {
    conflicts.push(...ramLeaves.map((leave) => ({
      path: leave._ref?.path || `leave:${leave.id}`,
      status: leave.status,
      source: "",
      reason: "Approved leave overlaps the test attendance range.",
    })));
  }

  const proposedDocuments = records.map(({ date, record }, index) => ({
    path: nestedRefs[index].path,
    data: encodeFirestoreValue(record),
    status: record.status,
    date,
  }));
  const manifest = {
    version: 1,
    operationId,
    employeeId: "crm_02",
    employeeName: String(employee.name || employee.username || "Ram"),
    employeeUid: String(employee.firebaseAuthUid || ""),
    employeePath: employee._ref.path,
    month: "2026-11",
    source: ATTENDANCE_TEST_SOURCE,
    state: "prepared",
    createdAt: new Date().toISOString(),
    originalDocuments,
    legacyDocuments,
    proposedDocuments,
  };

  const existingAbsences = nestedSnapshots.filter((snapshot) => snapshot.exists).length;
  const missingDocuments = nestedSnapshots.length - existingAbsences;
  const summary = records.reduce((counts, { status }) => {
    const label = status[0].toUpperCase() + status.slice(1);
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
  const preview = {
    target: process.env.FIRESTORE_EMULATOR_HOST ? "Firestore emulator" : "configured Firebase Cloud Firestore",
    employeeId: manifest.employeeId,
    employeeName: manifest.employeeName,
    employeePath: manifest.employeePath,
    operationId,
    storage: "attendance/crm_02/months/2026-11/attendanceDays/{YYYY-MM-DD}",
    before: {
      autoFinalizedAbsentDocuments: existingAbsences,
      missingDocuments,
      legacyDocuments: legacySnapshots.filter((snapshot) => snapshot.exists).length,
      approvedLeaveDocuments: ramLeaves.length,
      exactBackupPaths: originalDocuments.filter((item) => item.exists).map((item) => item.path),
    },
    after: {
      statuses: summary,
      totalRecords: records.length,
      payrollOrLeaveBalanceWrites: 0,
    },
    conflicts,
    proposedWrites: records.map(({ date, record }, index) => ({
      path: nestedRefs[index].path,
      date,
      status: record.status,
      isTestData: record.isTestData,
      source: record.source,
      excludedFromPayroll: record.excludedFromPayroll,
      simulatedPunches: record.simulatedPunches,
      checkInAt: previewRecord(record).checkInAt,
      checkOutAt: previewRecord(record).checkOutAt,
      remark: record.remark,
      data: previewRecord(record),
    })),
    manifestPath: path.join(manifestDirectory, `${operationId}.json`),
    applyCommand: `npm run seed:ram-attendance-test -- --apply --confirm=SEED_RAM_ATTENDANCE_TEST --operation=${operationId}`,
    restoreCommand: `npm run restore:ram-attendance-test -- --operation=${operationId}`,
  };
  console.log(JSON.stringify({ mode: "PREPARE — NO FIRESTORE WRITES", ...preview }, null, 2));
  if (conflicts.length) throw new Error("Preflight found conflicts; no backup manifest was saved and no writes were made.");

  ensureManifestScope(manifest, operationId);
  await fs.mkdir(manifestDirectory, { recursive: true });
  await saveManifest(preview.manifestPath, manifest, true);
  console.log(`Exact before-state backup saved to ${preview.manifestPath}. No Firestore records were changed.`);
}

async function applyOperation({ employee, db }) {
  if (!confirmed) throw new Error("Apply mode requires --confirm=SEED_RAM_ATTENDANCE_TEST.");
  if (!operationArg) throw new Error("Apply mode requires the prepared --operation ID.");
  const manifestPath = path.join(manifestDirectory, `${operationId}.json`);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  ensureManifestScope(manifest, operationId);
  if (manifest.state !== "prepared") throw new Error(`Manifest state is ${manifest.state}; only a prepared operation can be applied.`);
  if (employee._ref.path !== manifest.employeePath
    || getUserId(employee) !== manifest.employeeId
    || String(employee.name || employee.username || "Ram") !== manifest.employeeName
    || String(employee.firebaseAuthUid || "") !== manifest.employeeUid) {
    throw new Error("Ram's employee mapping changed after preparation. Re-prepare before applying.");
  }

  const futureDates = EXPECTED_DATES.filter((date) => date > indiaDateString());
  if (futureDates.length) {
    throw new Error(`Refusing to create future attendance dates: ${futureDates.join(", ")}. No writes were made.`);
  }
  const approvedLeaves = await listApprovedLeavesBetween("2026-11-01", "2026-11-16", db);
  if (approvedLeaves.some((leave) => String(leave.employeeId || "") === "crm_02")) {
    throw new Error("Approved leave now overlaps the test range. Re-prepare after review; no writes were made.");
  }

  const nestedRefs = EXPECTED_DATES.map((date) => attendanceDayRef("crm_02", date, db));
  const legacyRefs = EXPECTED_DATES.map((date) => db.collection("attendance").doc(attendanceRecordId("crm_02", date)));
  const refs = [...nestedRefs, ...legacyRefs];
  const originalByPath = new Map([...manifest.originalDocuments, ...manifest.legacyDocuments].map((item) => [item.path, item]));
  const proposedByPath = new Map(manifest.proposedDocuments.map((item) => [item.path, item]));

  await db.runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(...refs);
    snapshots.forEach((snapshot) => {
      const original = originalByPath.get(snapshot.ref.path);
      if (!original) throw new Error(`No prepared backup exists for ${snapshot.ref.path}.`);
      if (snapshot.exists !== original.exists
        || (snapshot.exists && !sameAttendanceData(snapshot.data(), decodeFirestoreValue(original.data)))) {
        throw new Error(`Attendance changed after preparation; refusing to overwrite ${snapshot.ref.path}.`);
      }
      if (snapshot.exists && !isReplaceableAutoAbsence(snapshot.data())) {
        throw new Error(`The existing record is no longer an eligible auto-absence: ${snapshot.ref.path}.`);
      }
      if (snapshot.ref.path.startsWith("attendance/ATT-") && snapshot.exists) {
        throw new Error(`A legacy record appeared after preparation: ${snapshot.ref.path}.`);
      }
    });
    proposedByPath.forEach((document, documentPath) => {
      transaction.set(db.doc(documentPath), decodeFirestoreValue(document.data));
    });
  });

  manifest.state = "applied_unverified";
  manifest.appliedAt = new Date().toISOString();
  await saveManifest(manifestPath, manifest);
  const written = await db.getAll(...nestedRefs);
  const expectedByPath = new Map(manifest.proposedDocuments.map((item) => [item.path, decodeFirestoreValue(item.data)]));
  const invalid = written.filter((snapshot) => !snapshot.exists
    || !sameAttendanceData(snapshot.data(), expectedByPath.get(snapshot.ref.path)));
  if (invalid.length) throw new Error(`Firestore write verification failed for: ${invalid.map((snapshot) => snapshot.ref.path).join(", ")}.`);
  manifest.state = "applied";
  manifest.verifiedAt = new Date().toISOString();
  await saveManifest(manifestPath, manifest);
  console.log(JSON.stringify({
    result: "Synthetic test attendance written and read back from the existing Firestore attendance collection.",
    operationId,
    employeeId: manifest.employeeId,
    writtenCount: written.length,
    statuses: manifest.proposedDocuments.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {}),
    manifestPath,
    restoreCommand: `npm run restore:ram-attendance-test -- --operation=${operationId}`,
  }, null, 2));
}

async function main() {
  if (!/^ram-attendance-test-[a-zA-Z0-9-]+$/.test(operationId)) {
    throw new Error("The operation ID has an invalid format.");
  }
  if (prepare && apply) throw new Error("Choose either --prepare or --apply.");
  if (apply && !operationArg) throw new Error("Apply mode requires --operation=<prepared-operation-id>.");
  await connectDatabase();

  const employee = await findRam();
  const employeeId = getUserId(employee);
  const db = getFirestore();

  if (apply) {
    await applyOperation({ employee, db });
    return;
  }

  const records = buildNovemberRamTestRecords({
    employeeId,
    employeeName: String(employee.name || employee.username || "Ram"),
    employeeUid: employee.firebaseAuthUid,
    seedOperationId: operationId,
  });
  const futureDates = records.filter(({ date }) => date > indiaDateString()).map(({ date }) => date);
  if (futureDates.length) {
    throw new Error(`Refusing to prepare future attendance dates: ${futureDates.join(", ")}. No database changes were made.`);
  }

  const nestedRefs = records.map(({ date }) => attendanceDayRef(employeeId, date, db));
  const legacyRefs = records.map(({ date }) => db.collection("attendance").doc(attendanceRecordId(employeeId, date)));
  if (!prepare) {
    const snapshots = await db.getAll(...nestedRefs, ...legacyRefs);
    console.log(JSON.stringify({
      mode: "READ-ONLY PREVIEW — NO WRITES",
      employeeId,
      operationId,
      currentDocuments: snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => ({
        path: snapshot.ref.path,
        status: snapshot.data()?.status || "",
        source: snapshot.data()?.source || "",
        isTestData: snapshot.data()?.isTestData === true,
      })),
      requestedStatuses: records.map(({ date, status, record }) => ({
        path: attendanceDayRef(employeeId, date, db).path,
        date,
        status,
        isTestData: record.isTestData,
        source: record.source,
        excludedFromPayroll: record.excludedFromPayroll,
        simulatedPunches: record.simulatedPunches,
      })),
      nextCommand: `npm run seed:ram-attendance-test -- --prepare --operation=${operationId}`,
    }, null, 2));
    return;
  }

  await prepareOperation({ employee, records, nestedRefs, legacyRefs, db });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

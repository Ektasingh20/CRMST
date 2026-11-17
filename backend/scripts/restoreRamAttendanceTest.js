import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import { attendanceDayRef } from "../services/attendanceStore.js";
import { ATTENDANCE_TEST_SOURCE } from "../services/attendanceTestSeed.js";
import {
  decodeFirestoreValue,
  sameAttendanceData,
} from "../services/attendanceTestManifest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestDirectory = path.resolve(__dirname, "..", ".attendance-test-manifests");
const args = process.argv.slice(2);
const operationArg = args.find((arg) => arg.startsWith("--operation="));
const operationId = operationArg
  ? operationArg.slice("--operation=".length).trim()
  : String(args.find((arg) => !arg.startsWith("--")) || "").trim();
const apply = args.includes("--apply");
const confirmed = args.includes("--confirm=RESTORE_RAM_ATTENDANCE_TEST");
const dates = Array.from({ length: 16 }, (_, index) => `2026-11-${String(index + 1).padStart(2, "0")}`);

function assertManifest(manifest) {
  const expectedPaths = dates.map((date) => `attendance/crm_02/months/2026-11/attendanceDays/${date}`).sort();
  const actualPaths = Array.isArray(manifest.proposedDocuments)
    ? manifest.proposedDocuments.map((item) => item.path).sort()
    : [];
  const backupPaths = Array.isArray(manifest.originalDocuments)
    ? manifest.originalDocuments.map((item) => item.path).sort()
    : [];
  if (manifest.version !== 1
    || manifest.operationId !== operationId
    || manifest.employeeId !== "crm_02"
    || manifest.month !== "2026-11"
    || manifest.source !== ATTENDANCE_TEST_SOURCE
    || !["prepared", "applied", "applied_unverified", "restored"].includes(manifest.state)
    || JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)
    || JSON.stringify(backupPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error("The attendance restore manifest is invalid or out of scope.");
  }
}

function documentPlan(snapshot, original, proposed) {
  if (snapshot.exists && sameAttendanceData(snapshot.data(), decodeFirestoreValue(proposed.data))) {
    return original.exists ? "restore-backup" : "delete-created-test-record";
  }
  if (snapshot.exists === original.exists
    && (!snapshot.exists || sameAttendanceData(snapshot.data(), decodeFirestoreValue(original.data)))) {
    return "already-restored";
  }
  throw new Error(`Refusing to overwrite a record modified after seeding: ${snapshot.ref.path}`);
}

async function main() {
  if (!/^ram-attendance-test-[a-zA-Z0-9-]+$/.test(operationId)) {
    throw new Error("Provide the prepared attendance test operation ID.");
  }
  if (apply && !confirmed) {
    throw new Error("Restore mode requires --confirm=RESTORE_RAM_ATTENDANCE_TEST.");
  }
  await connectDatabase();

  const manifestPath = path.join(manifestDirectory, `${operationId}.json`);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  assertManifest(manifest);
  const db = getFirestore();
  const refs = dates.map((date) => attendanceDayRef("crm_02", date, db));
  const snapshots = await db.getAll(...refs);
  const originals = new Map(manifest.originalDocuments.map((item) => [item.path, item]));
  const proposed = new Map(manifest.proposedDocuments.map((item) => [item.path, item]));
  const plan = snapshots.map((snapshot) => ({
    path: snapshot.ref.path,
    action: documentPlan(snapshot, originals.get(snapshot.ref.path), proposed.get(snapshot.ref.path)),
  }));
  console.log(JSON.stringify({
    mode: apply ? "RESTORE — FIRESTORE WRITES" : "DRY RUN — NO FIRESTORE WRITES",
    operationId,
    manifestPath,
    plan,
  }, null, 2));
  if (!apply || plan.every((item) => item.action === "already-restored")) return;

  await db.runTransaction(async (transaction) => {
    const currentSnapshots = await transaction.getAll(...refs);
    currentSnapshots.forEach((snapshot) => {
      const original = originals.get(snapshot.ref.path);
      const testRecord = proposed.get(snapshot.ref.path);
      const action = documentPlan(snapshot, original, testRecord);
      if (action === "restore-backup") {
        transaction.set(snapshot.ref, decodeFirestoreValue(original.data));
      } else if (action === "delete-created-test-record") {
        transaction.delete(snapshot.ref);
      }
    });
  });

  const verified = await db.getAll(...refs);
  const invalid = verified.filter((snapshot) => {
    const original = originals.get(snapshot.ref.path);
    return snapshot.exists !== original.exists
      || (snapshot.exists && !sameAttendanceData(snapshot.data(), decodeFirestoreValue(original.data)));
  });
  if (invalid.length) {
    throw new Error(`Restore verification failed for: ${invalid.map((snapshot) => snapshot.ref.path).join(", ")}.`);
  }
  manifest.state = "restored";
  manifest.restoredAt = new Date().toISOString();
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Restored the original Firestore state for operation ${operationId}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

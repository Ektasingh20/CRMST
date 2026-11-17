import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import { ATTENDANCE_TEST_SOURCE } from "../services/attendanceTestSeed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestDirectory = path.resolve(__dirname, "..", ".attendance-test-manifests");
const operationId = String(process.argv[2] || "").trim();
const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm=DELETE_RAM_ATTENDANCE_TEST");

async function main() {
  if (!/^ram-attendance-test-[a-zA-Z0-9-]+$/.test(operationId)) {
    throw new Error("Provide the test seed operation ID printed by the seeder.");
  }
  if (apply && !confirmed) {
    throw new Error("Apply mode requires --confirm=DELETE_RAM_ATTENDANCE_TEST.");
  }

  await connectDatabase();
  const manifestPath = path.join(manifestDirectory, `${operationId}.json`);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.operationId !== operationId
    || manifest.source !== ATTENDANCE_TEST_SOURCE
    || !["planned", "created"].includes(manifest.state)
    || !Array.isArray(manifest.insertedDocumentPaths)
    || !manifest.insertedDocumentPaths.length) {
    throw new Error("The test cleanup manifest is invalid or does not identify a created operation.");
  }

  const prefix = `attendance/${manifest.employeeId}/months/${manifest.month}/attendanceDays/`;
  const paths = manifest.insertedDocumentPaths;
  if (manifest.employeeId !== "crm_02"
    || manifest.month !== "2026-11"
    || paths.length !== 15
    || new Set(paths).size !== paths.length
    || paths.some((documentPath) => !documentPath.startsWith(prefix)
    || documentPath.split("/").length !== 6
    || !/^2026-11-(0[1-9]|1[0-5])$/.test(documentPath.split("/").at(-1)))) {
    throw new Error("The cleanup manifest contains an out-of-scope attendance path.");
  }

  const db = getFirestore();
  const refs = paths.map((documentPath) => db.doc(documentPath));
  const snapshots = await db.getAll(...refs);
  snapshots.forEach((snapshot) => {
    if (!snapshot.exists) return;
    const data = snapshot.data();
    if (data.isTestData !== true
      || data.source !== ATTENDANCE_TEST_SOURCE
      || data.seedOperationId !== operationId
      || String(data.employeeId || "") !== String(manifest.employeeId)) {
      throw new Error(`Refusing to remove a record not created by this test operation: ${snapshot.ref.path}`);
    }
  });

  const existing = snapshots.filter((snapshot) => snapshot.exists);
  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY RUN — NO WRITES",
    operationId,
    deleting: existing.map((snapshot) => snapshot.ref.path),
    missing: snapshots.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.ref.path),
  }, null, 2));
  if (!apply || !existing.length) return;

  const batch = db.batch();
  existing.forEach((snapshot) => batch.delete(snapshot.ref));
  await batch.commit();
  manifest.state = "cleaned";
  manifest.cleanedAt = new Date().toISOString();
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Removed ${existing.length} test attendance records for operation ${operationId}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

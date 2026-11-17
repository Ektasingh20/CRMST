import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { verifyAppCheckIfConfigured } from "../middleware/appCheck.js";

test("Firestore rules deny direct attendance writes and scope employee reads by Firebase UID", async () => {
  const rules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/attendance\/\{employeeId\}/);
  assert.match(rules, /match \/months\/\{month\}\/attendanceDays\/\{workDate\}/);
  assert.match(rules, /resource\.data\.employeeUid == request\.auth\.uid/);
  assert.match(rules, /allow create, update, delete: if false/);
  assert.doesNotMatch(rules, /attendanceDemo|demoDays/);
});

test("attendance collection-group indexes include reporting and low-fanout overrides", async () => {
  const config = JSON.parse(await readFile(new URL("../../firestore.indexes.json", import.meta.url), "utf8"));
  assert.ok(config.indexes.every((index) => index.fields.length >= 2), "Single-field indexes must use fieldOverrides, not composite indexes.");
  const attendanceIndexes = config.indexes.filter((index) => index.collectionGroup === "attendanceDays");
  assert.ok(attendanceIndexes.some((index) => index.fields.some((field) => field.fieldPath === "month")));
  assert.ok(attendanceIndexes.some((index) => index.fields.some((field) => field.fieldPath === "employeeId")));
  assert.ok(attendanceIndexes.some((index) => index.fields.some((field) => field.fieldPath === "status")));
  const workDateOverride = config.fieldOverrides.find((field) => field.collectionGroup === "attendanceDays" && field.fieldPath === "workDate");
  assert.ok(workDateOverride?.indexes.some((index) => index.queryScope === "COLLECTION_GROUP" && index.order === "ASCENDING"));
  assert.ok(workDateOverride?.indexes.some((index) => index.queryScope === "COLLECTION_GROUP" && index.order === "DESCENDING"));
  const usernameOverride = config.fieldOverrides.find((field) => field.collectionGroup === "members" && field.fieldPath === "username");
  assert.ok(usernameOverride?.indexes.some((index) => index.queryScope === "COLLECTION_GROUP" && index.order === "ASCENDING"));
  const disabled = new Set(config.fieldOverrides.filter((field) => field.collectionGroup === "attendanceDays" && field.indexes.length === 0).map((field) => field.fieldPath));
  assert.ok(disabled.has("remark"));
  assert.ok(disabled.has("employeeName"));
  assert.ok(config.indexes.some((index) => index.collectionGroup === "leaves"
    && index.queryScope === "COLLECTION_GROUP"
    && index.fields.map((field) => field.fieldPath).join(",") === "status,from"));
  assert.ok(config.indexes.some((index) => index.collectionGroup === "attendanceDays"
    && index.queryScope === "COLLECTION_GROUP"
    && index.fields.map((field) => field.fieldPath).join(",") === "workDate,isTestData"));
  const leaveStatusOverride = config.fieldOverrides.find((field) => field.collectionGroup === "leaves" && field.fieldPath === "status");
  assert.ok(leaveStatusOverride?.indexes.some((index) => index.queryScope === "COLLECTION_GROUP" && index.order === "ASCENDING"));
  const testDataOverride = config.fieldOverrides.find((field) => field.collectionGroup === "attendanceDays" && field.fieldPath === "isTestData");
  assert.ok(testDataOverride?.indexes.some((index) => index.queryScope === "COLLECTION_GROUP" && index.order === "ASCENDING"));
});

test("nodemon watches backend sources only and ignores frontend and generated output", async () => {
  const config = JSON.parse(await readFile(new URL("../../nodemon.json", import.meta.url), "utf8"));
  const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));

  assert.ok(config.watch.includes("backend/services"));
  assert.ok(config.watch.includes("backend/.env"));
  assert.equal(config.watch.some((entry) => entry.startsWith("frontend")), false);
  assert.ok(config.ignore.includes("frontend/**"));
  assert.ok(config.ignore.includes("frontend/dist/**"));
  assert.ok(config.ignore.includes("**/*.pdf"));
  assert.ok(config.ignore.includes("**/*.log"));
  assert.ok(config.ignore.includes("**/*.tmp"));
  assert.equal(packageJson.scripts["dev:api"], "nodemon --config nodemon.json backend/index.js");
});

test("App Check is optional by default and enforceable without changing attendance authorization", async () => {
  const previous = process.env.REQUIRE_FIREBASE_APP_CHECK;
  const req = { headers: {} };
  let nextCalled = false;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    process.env.REQUIRE_FIREBASE_APP_CHECK = "false";
    await verifyAppCheckIfConfigured(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    process.env.REQUIRE_FIREBASE_APP_CHECK = "true";
    nextCalled = false;
    await verifyAppCheckIfConfigured(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  } finally {
    if (previous === undefined) delete process.env.REQUIRE_FIREBASE_APP_CHECK;
    else process.env.REQUIRE_FIREBASE_APP_CHECK = previous;
  }
});

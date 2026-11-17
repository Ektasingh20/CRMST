import test from "node:test";
import assert from "node:assert/strict";
import { validateCallImportRows } from "./callListImportValidation.js";

test("validation reports every bad Excel line before any upload", () => {
  const result = validateCallImportRows([
    { excelRow: 2, date: "01-08-2026", name: "Valid", contact: "9876543210" },
    { excelRow: 5, date: "31-02-2026", name: "", contact: "123" },
    { excelRow: 8, date: "2026-08-03", name: "Duplicate", contact: "+91 98765 43210" },
  ]);
  assert.deepEqual(result.issues.map(({ row, field }) => [row, field]), [
    [5, "Name"], [5, "Number"], [5, "Date"], [8, "Number"],
  ]);
  assert.equal(result.rows[0].date, "2026-08-01");
  assert.equal(result.rows[2].contact, "9876543210");
});

test("two-column files remain valid and phone numbers are normalized", () => {
  const result = validateCallImportRows([{ name: " Customer ", contact: "+91 91234 56789" }]);
  assert.deepEqual(result.issues, []);
  assert.equal(result.rows[0].name, "Customer");
  assert.equal(result.rows[0].contact, "9123456789");
  assert.equal(Object.hasOwn(result.rows[0], "date"), false);
});

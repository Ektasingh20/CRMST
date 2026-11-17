import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCallListDate } from "./callListDate.js";

test("spreadsheet, day-first, and ISO dates keep the chosen calendar day", () => {
  assert.equal(normalizeCallListDate("01-08-2026"), "2026-08-01");
  assert.equal(normalizeCallListDate("1/8/2026"), "2026-08-01");
  assert.equal(normalizeCallListDate("2026-08-01"), "2026-08-01");
  assert.equal(normalizeCallListDate(46235), "2026-08-01");
});

test("invalid and impossible dates are rejected", () => {
  for (const value of ["", "31-02-2026", "2026-13-01", "08/01/26", "text", 0]) {
    assert.equal(normalizeCallListDate(value), "", String(value));
  }
});

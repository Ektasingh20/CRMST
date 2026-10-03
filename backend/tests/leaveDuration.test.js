import test from "node:test";
import assert from "node:assert/strict";
import { leaveDaysInclusive } from "../utils/leaveDuration.js";

test("leave duration counts both selected dates, including month boundaries", () => {
  assert.equal(leaveDaysInclusive("2026-09-28", "2026-09-28"), 1);
  assert.equal(leaveDaysInclusive("2026-09-28", "2026-10-01"), 4);
});

test("invalid or reversed leave dates are rejected", () => {
  assert.equal(leaveDaysInclusive("2026-02-30", "2026-03-01"), null);
  assert.equal(leaveDaysInclusive("2026-09-29", "2026-09-28"), null);
});

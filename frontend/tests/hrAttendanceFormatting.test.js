import test from "node:test";
import assert from "node:assert/strict";
import { formatAttendanceTime, formatAttendanceDuration } from "../src/final_hr_dashboard/attendanceFormatting.js";

test("HR attendance formats legacy punch timestamps in India time", () => {
  assert.equal(formatAttendanceTime("2026-11-18T04:00:00Z"), "09:30:00");
  assert.equal(formatAttendanceTime("2026-11-18T13:00:00Z"), "18:30:00");
  for (const value of [undefined, null, "", "invalid"]) assert.equal(formatAttendanceTime(value), "00:00:00");
});

test("HR total hours use milliseconds and handle missing or invalid durations", () => {
  assert.equal(formatAttendanceDuration(9 * 3600000), "09:00:00");
  assert.equal(formatAttendanceDuration(3661000), "01:01:01");
  for (const value of [undefined, null, NaN, Infinity, -1000]) assert.equal(formatAttendanceDuration(value), "00:00:00");
});

import {
  attendanceCutoffPassed,
  attendanceHolidayForDate,
} from "../../shared/attendanceClassification.js";

const INDIA_TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

const indiaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: INDIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const indiaClockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: INDIA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isValidAttendanceDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return false;
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date;
}

export function getIndiaDateParts(now = new Date()) {
  const value = now instanceof Date ? now : new Date(now);
  const date = Object.fromEntries(
    indiaDateFormatter.formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map(({ type, value: partValue }) => [type, Number(partValue)]),
  );
  const time = Object.fromEntries(
    indiaClockFormatter.formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map(({ type, value: partValue }) => [type, Number(partValue)]),
  );
  return { ...date, ...time };
}

export function indiaDateString(now = new Date()) {
  const { year, month, day } = getIndiaDateParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function indiaMonthString(now = new Date()) {
  return indiaDateString(now).slice(0, 7);
}

export function previousDateString(date) {
  if (!isValidAttendanceDate(date)) return "";
  return new Date(Date.parse(`${date}T00:00:00.000Z`) - DAY_MS).toISOString().slice(0, 10);
}

export function isWorkingDayInIndia(date, calendar = {}) {
  if (!isValidAttendanceDate(date)) return false;
  return !attendanceHolidayForDate(date, calendar);
}

export function isSundayInIndia(date) {
  if (!isValidAttendanceDate(date)) return false;
  return new Date(`${date}T00:00:00.000Z`).getUTCDay() === 0;
}

export function isAttendanceDeadlineReached(date, now = new Date(), calendar = {}) {
  return isValidAttendanceDate(date) && attendanceCutoffPassed(date, now, calendar);
}

export function millisecondsUntilNextAttendanceRun(now = new Date()) {
  const value = now instanceof Date ? now : new Date(now);
  const parts = getIndiaDateParts(value);
  let target = Date.UTC(parts.year, parts.month - 1, parts.day, -5, -15);
  if (target <= value.getTime()) target = Date.UTC(parts.year, parts.month - 1, parts.day + 1, -5, -15);
  return target - value.getTime();
}

export function formatIndiaClock(value) {
  if (!value) return "";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    timeZone: INDIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export { INDIA_TIME_ZONE };

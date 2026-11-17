import { Timestamp, getFirestore } from "firebase-admin/firestore";
import {
  attendanceHolidayForDate,
  normalizeAttendanceCalendar,
  normalizeAttendanceDate,
} from "../../shared/attendanceClassification.js";

const CALENDAR_PATH = "settings/attendanceCalendar";

function calendarError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "invalid_attendance_calendar";
  return error;
}

export function validateAttendanceCalendar(value = {}) {
  if (value.weeklyHolidays !== undefined
    && (!Array.isArray(value.weeklyHolidays) || value.weeklyHolidays.some((day) => !Number.isInteger(Number(day)) || Number(day) < 0 || Number(day) > 6))) {
    throw calendarError("Weekly holidays must be weekday numbers from 0 (Sunday) to 6 (Saturday).");
  }
  if (value.holidays !== undefined && !Array.isArray(value.holidays)) {
    throw calendarError("Company holidays must be an array of dated entries.");
  }
  (value.holidays || []).forEach((item) => {
    const holiday = typeof item === "string" ? { date: item } : item;
    if (!holiday || typeof holiday !== "object" || !normalizeAttendanceDate(holiday.date)) {
      throw calendarError("Each company holiday needs a valid YYYY-MM-DD date.");
    }
    if (holiday.label !== undefined && String(holiday.label).length > 120) {
      throw calendarError("Company holiday labels cannot exceed 120 characters.");
    }
    if (holiday.paid !== undefined && typeof holiday.paid !== "boolean") {
      throw calendarError("Company holiday paid must be true or false.");
    }
  });
  if (value.weeklyHolidayPaid !== undefined && typeof value.weeklyHolidayPaid !== "boolean") {
    throw calendarError("Weekly holiday paid must be true or false.");
  }
  return normalizeAttendanceCalendar(value);
}

export async function getAttendanceCalendar(db = getFirestore()) {
  const snapshot = await db.doc(CALENDAR_PATH).get();
  const stored = snapshot.exists ? snapshot.data() : {};
  return {
    ...normalizeAttendanceCalendar(stored),
    automationStartDate: normalizeAttendanceDate(stored.automationStartDate),
  };
}

export async function saveAttendanceCalendar(value, db = getFirestore()) {
  const calendar = validateAttendanceCalendar(value);
  await db.doc(CALENDAR_PATH).set({
    ...calendar,
    updatedAt: Timestamp.now(),
  }, { merge: true });
  return getAttendanceCalendar(db);
}

export async function ensureAttendanceAutomationStartDate(value = new Date(), db = getFirestore()) {
  const ref = db.doc(CALENDAR_PATH);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const stored = snapshot.exists ? snapshot.data() : {};
    const current = normalizeAttendanceDate(stored.automationStartDate);
    if (current) return current;
    const now = value instanceof Date ? value : new Date();
    const date = normalizeAttendanceDate(typeof value === "string" ? value : now.toISOString().slice(0, 10));
    if (!date) throw calendarError("Unable to determine the attendance automation start date.");
    transaction.set(ref, {
      automationStartDate: date,
      updatedAt: Timestamp.fromDate(now),
    }, { merge: true });
    return date;
  });
}

export { attendanceHolidayForDate };

import {
  attendanceDateInIndia,
  attendanceDaysInMonth,
  buildAttendanceMonthRows,
  normalizeAttendanceDate,
} from "../../../shared/attendanceClassification.js";

export function getAttendanceReportDateRange(month, today) {
  const daysInMonth = attendanceDaysInMonth(month);
  const currentDate = normalizeAttendanceDate(today) || attendanceDateInIndia();
  if (!daysInMonth || !currentDate) return { start: "", end: "", isFutureMonth: false };

  const start = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const isFutureMonth = month > currentDate.slice(0, 7);
  return {
    start,
    end: isFutureMonth ? "" : month === currentDate.slice(0, 7) ? currentDate : monthEnd,
    isFutureMonth,
  };
}

export function getAttendanceReportMonths(joinedDate, today) {
  const joined = normalizeAttendanceDate(joinedDate);
  const currentDate = normalizeAttendanceDate(today);
  if (!joined || !currentDate || joined > currentDate) return [];

  const months = [];
  let cursor = new Date(`${joined.slice(0, 7)}-01T00:00:00.000Z`);
  const lastMonth = currentDate.slice(0, 7);
  while (cursor.toISOString().slice(0, 7) <= lastMonth) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months.reverse();
}

export function buildAttendanceReportRows(options) {
  const range = getAttendanceReportDateRange(options?.month, options?.today);
  if (!range.start || range.isFutureMonth) return [];
  return buildAttendanceMonthRows(options)
    .filter((row) => row.date >= range.start && row.date <= range.end)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function filterAttendanceReportRows(rows, { status = "All", dateFrom = "", dateTo = "" } = {}) {
  return rows.filter((row) => (status === "All" || row.status === status)
    && (!dateFrom || row.date >= dateFrom)
    && (!dateTo || row.date <= dateTo));
}

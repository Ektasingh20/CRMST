const DAY_MS = 24 * 60 * 60 * 1000;
const indiaHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  hourCycle: "h23",
});

export function normalizeAttendanceDate(value) {
  const date = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? "" : date;
}

export function attendanceDaysInMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return 0;
  const [year, value] = month.split("-").map(Number);
  if (value < 1 || value > 12) return 0;
  return new Date(Date.UTC(year, value, 0)).getUTCDate();
}

export function attendanceDateInIndia(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function attendanceCutoffPassed(date, now = new Date(), calendar = {}) {
  const normalized = normalizeAttendanceDate(date);
  if (!normalized || attendanceDateInIndia(now) !== normalized || attendanceHolidayForDate(normalized, calendar)) return false;
  const hour = Number(indiaHourFormatter.formatToParts(now).find((part) => part.type === "hour")?.value);
  return Number.isFinite(hour) && hour >= 12;
}

export function previousCalendarDate(date) {
  const normalized = normalizeAttendanceDate(date);
  return normalized
    ? new Date(Date.parse(`${normalized}T00:00:00.000Z`) - DAY_MS).toISOString().slice(0, 10)
    : "";
}

export function normalizeAttendanceCalendar(value = {}) {
  const config = value && typeof value === "object" ? value : {};
  const weeklyHolidays = [...new Set((Array.isArray(config.weeklyHolidays) ? config.weeklyHolidays : [0])
    .map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort();
  const holidaysByDate = new Map();
  (Array.isArray(config.holidays) ? config.holidays : []).forEach((item) => {
    const holiday = typeof item === "string" ? { date: item } : item;
    const date = normalizeAttendanceDate(holiday?.date);
    if (!date) return;
    holidaysByDate.set(date, {
      date,
      label: String(holiday.label || "Company holiday").trim().slice(0, 120) || "Company holiday",
      paid: holiday.paid !== false,
    });
  });
  return {
    weeklyHolidays,
    weeklyHolidayPaid: config.weeklyHolidayPaid !== false,
    holidays: [...holidaysByDate.values()].sort((left, right) => left.date.localeCompare(right.date)),
  };
}

export function attendanceHolidayForDate(date, calendar = {}) {
  const normalized = normalizeAttendanceDate(date);
  if (!normalized) return null;
  const config = calendar && typeof calendar === "object" ? calendar : {};
  const holidays = Array.isArray(config.holidays) ? config.holidays : [];
  const companyEntry = holidays.find((entry) => (
    String(typeof entry === "string" ? entry : entry?.date || "") === normalized
  ));
  const companyHoliday = companyEntry && (typeof companyEntry === "string" ? { date: companyEntry } : companyEntry);
  if (companyHoliday) {
    return {
      date: normalized,
      label: String(companyHoliday.label || "Company holiday"),
      paid: companyHoliday.paid !== false,
      kind: "company_holiday",
    };
  }
  const weekday = new Date(`${normalized}T00:00:00.000Z`).getUTCDay();
  const weeklyHolidays = Array.isArray(config.weeklyHolidays) ? config.weeklyHolidays.map(Number) : [0];
  if (weeklyHolidays.includes(weekday)) {
    return {
      date: normalized,
      label: "Weekly holiday",
      paid: config.weeklyHolidayPaid !== false,
      kind: "weekly_holiday",
    };
  }
  return null;
}

function normalizedStatus(record) {
  const status = String(record?.status || "").trim().toLowerCase();
  if (["present", "checked_in", "checked_out"].includes(status)) return "present";
  if (status === "absent") return "absent";
  if (status.includes("leave")) return "leave";
  if (status === "holiday") return "holiday";
  return "";
}

function approvedLeaveForDate(leaves, date, employeeId) {
  return leaves.find((leave) => {
    if (String(leave.status || "").toLowerCase() !== "approved") return false;
    if (employeeId && leave.employeeId && String(leave.employeeId) !== String(employeeId)) return false;
    return String(leave.from || "") <= date && String(leave.to || "") >= date;
  });
}

export function classifyAttendanceDate({ date, joinedDate, today, now = new Date(), record, leaves = [], calendar = {}, employeeId = "" }) {
  const joined = normalizeAttendanceDate(joinedDate);
  const currentDate = normalizeAttendanceDate(today) || attendanceDateInIndia();
  const holiday = attendanceHolidayForDate(date, calendar);
  const base = {
    date,
    id: record?.id || date,
    checkIn: record?.checkIn || "",
    checkOut: record?.checkOut || "",
    remark: record?.remark || "",
    employeeId: String(record?.employeeId || employeeId || ""),
    isTestData: record?.isTestData === true,
    simulatedPunches: record?.simulatedPunches === true,
    workedMinutes: record?.workedMinutes !== null && record?.workedMinutes !== undefined && record?.workedMinutes !== "" && Number.isFinite(Number(record.workedMinutes))
      ? Number(record.workedMinutes)
      : null,
    recorded: Boolean(record),
  };

  if (joined && date < joined) {
    return {
      ...base,
      status: holiday ? "Holiday" : "Absent",
      reason: "pre_join",
      payable: false,
      paidHoliday: false,
    };
  }
  if (record?.isTestData === true) {
    const status = normalizedStatus(record);
    if (status) {
      return {
        ...base,
        status: status === "present" ? "Present" : status === "absent" ? "Absent" : status === "leave" ? "Leave" : "Holiday",
        reason: String(record.reason || record.source || "test_data"),
        payable: false,
        paidHoliday: false,
      };
    }
  }
  if (holiday) {
    return {
      ...base,
      status: "Holiday",
      reason: holiday.kind,
      payable: holiday.paid,
      paidHoliday: holiday.paid,
    };
  }
  if (date > currentDate) {
    return { ...base, status: "Upcoming", reason: "future", payable: false, paidHoliday: false };
  }

  const status = normalizedStatus(record);
  const leave = approvedLeaveForDate(leaves, date, employeeId);
  if (status === "present") {
    return { ...base, status: "Present", reason: "attendance_record", payable: true, paidHoliday: false };
  }
  if (leave || status === "leave") {
    const unpaid = String(leave?.type || "").toLowerCase().includes("unpaid")
      || record?.payable === false;
    return {
      ...base,
      status: "Leave",
      reason: "approved_leave",
      payable: !unpaid,
      paidHoliday: false,
      leaveType: leave?.type || "",
    };
  }
  if (status === "holiday") {
    return { ...base, status: "Holiday", reason: "attendance_record", payable: record?.payable !== false, paidHoliday: record?.payable !== false };
  }
  if (status === "absent") {
    return {
      ...base,
      status: "Absent",
      reason: record?.autoMarked ? "finalized_absence" : "recorded_absence",
      payable: false,
      paidHoliday: false,
    };
  }
  if (date === currentDate && attendanceCutoffPassed(date, now, calendar)) {
    return { ...base, status: "Absent", reason: "cutoff_absence", payable: false, paidHoliday: false };
  }
  return { ...base, status: "Pending", reason: "awaiting_finalization", payable: false, paidHoliday: false };
}

export function buildAttendanceMonthRows({ attendance = [], leaves = [], month, joinedDate, today, now = new Date(), calendar = {}, employeeId = "" }) {
  const count = attendanceDaysInMonth(month);
  if (!count) return [];
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(count).padStart(2, "0")}`;
  const attendanceByDate = new Map();
  attendance.forEach((record) => {
    const date = normalizeAttendanceDate(record.date || record.workDate);
    if (!date || date < monthStart || date > monthEnd) return;
    if (employeeId && record.employeeId && String(record.employeeId) !== String(employeeId)) return;
    attendanceByDate.set(date, record);
  });

  return Array.from({ length: count }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    return classifyAttendanceDate({
      date,
      joinedDate,
      today,
      now,
      record: attendanceByDate.get(date),
      leaves,
      calendar,
      employeeId,
    });
  }).reverse();
}

export function calculateAttendancePayroll({ employee, month, rows = [] }) {
  const salary = Math.max(0, Number(employee?.salary) || 0);
  const daysInMonth = attendanceDaysInMonth(month);
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const joined = normalizeAttendanceDate(employee?.joined || employee?.joiningDate);
  const exitDate = normalizeAttendanceDate(employee?.resignationDate || employee?.left);
  const employedStart = joined && joined > monthStart ? joined : monthStart;
  const employedEnd = exitDate && exitDate < monthEnd ? exitDate : monthEnd;
  const dayNumber = (date) => Date.UTC(...date.split("-").map(Number).map((value, index) => index === 1 ? value - 1 : value)) / DAY_MS;
  const employedDays = daysInMonth && employedStart <= employedEnd
    ? Math.max(0, dayNumber(employedEnd) - dayNumber(employedStart) + 1)
    : 0;
  const dailyJoinExitRate = daysInMonth ? Math.floor(salary / daysInMonth) : 0;
  const joinExitDeduction = dailyJoinExitRate * Math.max(0, daysInMonth - employedDays);
  const payrollRows = rows.filter((row) => row.isTestData !== true);
  const postJoinUnpaidDates = new Set(payrollRows.filter((row) => row.reason !== "pre_join"
    && row.reason !== "future"
    && ["Absent", "Leave", "Holiday"].includes(row.status)
    && row.payable === false).map((row) => row.date));
  const classifiedUnpaidDays = postJoinUnpaidDates.size;
  const manualUnpaidDays = Math.max(0, Number(employee?.unpaidLeaveDays) || 0);
  const unpaidDays = Math.max(classifiedUnpaidDays, manualUnpaidDays);
  const postJoinUnpaidDeduction = Math.round((salary / 30) * unpaidDays * 100) / 100;
  return {
    daysInMonth,
    employedDays,
    payableDays: payrollRows.filter((row) => row.payable).length,
    dailyJoinExitRate,
    joinExitDeduction,
    classifiedUnpaidDays,
    unpaidDays,
    postJoinUnpaidDeduction,
    otherDeductions: joinExitDeduction + postJoinUnpaidDeduction,
    netBasicSalary: Math.max(0, salary - joinExitDeduction - postJoinUnpaidDeduction),
  };
}

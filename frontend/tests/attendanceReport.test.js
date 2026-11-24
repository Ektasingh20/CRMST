import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAttendanceMonthRows,
  calculateAttendancePayroll,
  calculateSalaryReportPay,
} from "../../shared/attendanceClassification.js";
import {
  attendanceReportStatusLabel,
  buildAttendanceReportRows,
  filterAttendanceReportRows,
  getAttendanceReportDateRange,
  getAttendanceReportMonths,
  pendingLeaveRequestForDate,
} from "../src/crm-executive/attendanceReport.js";

test("attendance report months begin with the joining month and include the current month", () => {
  assert.deepEqual(
    getAttendanceReportMonths("2026-09-06", "2026-11-14"),
    ["2026-11", "2026-10", "2026-09"],
  );
  assert.deepEqual(getAttendanceReportMonths("2026-12-01", "2026-11-14"), []);
});

test("report keeps all pre-join dates visible but excludes dates after today", () => {
  const rows = buildAttendanceReportRows({
    month: "2026-02",
    joinedDate: "2026-02-16",
    today: "2026-02-20",
    attendance: [],
    leaves: [],
    calendar: {
      weeklyHolidays: [0],
      weeklyHolidayPaid: true,
      holidays: [{ date: "2026-02-05", label: "Company holiday", paid: true }],
    },
  });
  const byDate = new Map(rows.map((row) => [row.date, row]));

  assert.equal(rows.length, 20);
  assert.equal(byDate.get("2026-02-01").status, "Holiday");
  assert.equal(byDate.get("2026-02-01").reason, "pre_join");
  assert.equal(byDate.get("2026-02-01").payable, false);
  assert.equal(byDate.get("2026-02-05").status, "Holiday");
  assert.equal(byDate.get("2026-02-05").reason, "pre_join");
  assert.equal(byDate.get("2026-02-09").status, "Absent");
  assert.equal(byDate.get("2026-02-09").reason, "pre_join");
  assert.equal(byDate.get("2026-02-09").payable, false);
  assert.equal(byDate.get("2026-02-16").status, "Absent");
  assert.equal(byDate.get("2026-02-20").status, "Pending");
  assert.equal(byDate.has("2026-02-21"), false);
  assert.equal(byDate.has("2026-02-28"), false);
});

test("report date boundaries use the selected month and India calendar date", () => {
  const build = (month) => buildAttendanceReportRows({
    month,
    joinedDate: "2026-01-01",
    today: "2026-11-16",
    now: new Date("2026-11-16T10:36:31.805Z"),
  });
  const november = build("2026-11");
  assert.equal(november.length, 16);
  assert.equal(november[0].date, "2026-11-16");
  assert.equal(november.at(-1).date, "2026-11-01");
  assert.deepEqual(
    november.map((row) => row.date).sort(),
    Array.from({ length: 16 }, (_, index) => `2026-11-${String(index + 1).padStart(2, "0")}`),
  );
  assert.equal(november.some((row) => row.status === "Upcoming"), false);
  assert.equal(november.some((row) => row.date > "2026-11-16"), false);
  assert.equal(build("2026-09").length, 30);
  assert.equal(build("2026-10").length, 31);
  assert.deepEqual(build("2026-12"), []);
  assert.deepEqual(getAttendanceReportDateRange("2026-12", "2026-11-16"), {
    start: "2026-12-01",
    end: "",
    isFutureMonth: true,
  });
});

test("status and date filters only narrow eligible report rows", () => {
  const rows = buildAttendanceReportRows({
    month: "2026-11",
    joinedDate: "2026-09-06",
    today: "2026-11-16",
    attendance: [
      { employeeId: "crm_02", date: "2026-11-02", status: "Present" },
      { employeeId: "crm_02", date: "2026-11-03", status: "Absent" },
    ],
    employeeId: "crm_02",
  });
  const filtered = filterAttendanceReportRows(rows, {
    status: "Present",
    dateFrom: "2026-11-02",
    dateTo: "2026-11-10",
  });
  assert.deepEqual(filtered.map((row) => row.date), ["2026-11-02"]);
  assert.equal(filterAttendanceReportRows(rows, { dateFrom: "2026-11-17" }).length, 0);
});

test("pending attendance is presented as a leave action or an existing application", () => {
  const row = { date: "2026-11-16", status: "Pending" };
  const leaves = [
    { employeeId: "crm_02", from: "2026-11-16", to: "2026-11-17", status: "Pending" },
  ];

  assert.equal(attendanceReportStatusLabel(row, [], "crm_02", "2026-11-16"), "Apply Leave");
  assert.equal(attendanceReportStatusLabel(row, [], "crm_02", "2026-11-17"), "Pending Sync");
  assert.equal(attendanceReportStatusLabel(row, leaves, "crm_02", "2026-11-16"), "Leave Applied");
  assert.equal(attendanceReportStatusLabel({ ...row, status: "Absent" }, leaves, "crm_02"), "Absent");
  assert.equal(pendingLeaveRequestForDate(leaves, "2026-11-16", "another_employee"), null);
});

test("current day remains pending until noon IST while punches, leave, holidays, and future days retain priority", () => {
  const report = (now, attendance = [], leaves = [], calendar = { weeklyHolidays: [0] }) => buildAttendanceReportRows({
    month: "2026-11",
    joinedDate: "2026-09-06",
    employeeId: "crm_02",
    today: "2026-11-16",
    now: new Date(now),
    attendance,
    leaves,
    calendar,
  });
  const beforeCutoff = new Map(report("2026-11-16T06:29:00.000Z").map((row) => [row.date, row]));
  const afterCutoff = new Map(report("2026-11-16T06:30:00.000Z").map((row) => [row.date, row]));
  const withPunch = new Map(report("2026-11-16T07:00:00.000Z", [
    { employeeId: "crm_02", date: "2026-11-16", status: "Present", checkIn: "09:30 AM" },
  ]).map((row) => [row.date, row]));
  const withLeave = new Map(report("2026-11-16T07:00:00.000Z", [], [
    { employeeId: "crm_02", from: "2026-11-16", to: "2026-11-16", status: "Approved", type: "Earned Leave" },
  ]).map((row) => [row.date, row]));
  const withHoliday = new Map(report("2026-11-16T07:00:00.000Z", [], [], {
    weeklyHolidays: [0],
    holidays: [{ date: "2026-11-16", label: "Company holiday", paid: true }],
  }).map((row) => [row.date, row]));

  assert.equal(beforeCutoff.get("2026-11-16").status, "Pending");
  assert.equal(afterCutoff.get("2026-11-16").status, "Absent");
  assert.equal(afterCutoff.get("2026-11-16").reason, "cutoff_absence");
  assert.equal(afterCutoff.get("2026-11-16").recorded, false);
  assert.equal(withPunch.get("2026-11-16").status, "Present");
  assert.equal(withLeave.get("2026-11-16").status, "Leave");
  assert.equal(withHoliday.get("2026-11-16").status, "Holiday");
  assert.equal(afterCutoff.size, 16);
  assert.equal(afterCutoff.has("2026-11-17"), false);
});

test("report respects actual records, paid/unpaid leave, configured holidays, and employee identity", () => {
  const rows = buildAttendanceReportRows({
    month: "2026-02",
    joinedDate: "2026-02-16",
    employeeId: "employee-1",
    today: "2026-02-20",
    attendance: [
      { id: "present", employeeId: "employee-1", date: "2026-02-16", status: "Present", checkIn: "09:00 AM", workedMinutes: 485 },
      { id: "absent", employeeId: "employee-1", date: "2026-02-17", status: "Absent", autoMarked: true },
      { id: "wrong-owner", employeeId: "employee-2", date: "2026-02-18", status: "Present" },
    ],
    leaves: [
      { employeeId: "employee-1", type: "Unpaid Leave", status: "Approved", from: "2026-02-18", to: "2026-02-18" },
      { employeeId: "employee-1", type: "Earned Leave", status: "Approved", from: "2026-02-19", to: "2026-02-19" },
    ],
    calendar: {
      weeklyHolidays: [0],
      weeklyHolidayPaid: true,
      holidays: [{ date: "2026-02-20", label: "Company holiday", paid: false }],
    },
  });
  const byDate = new Map(rows.map((row) => [row.date, row]));

  assert.equal(byDate.get("2026-02-16").status, "Present");
  assert.equal(byDate.get("2026-02-16").workedMinutes, 485);
  assert.equal(byDate.get("2026-02-17").status, "Absent");
  assert.equal(byDate.get("2026-02-17").reason, "finalized_absence");
  assert.equal(byDate.get("2026-02-18").status, "Leave");
  assert.equal(byDate.get("2026-02-18").payable, false);
  assert.equal(byDate.get("2026-02-19").status, "Leave");
  assert.equal(byDate.get("2026-02-19").payable, true);
  assert.equal(byDate.get("2026-02-20").status, "Holiday");
  assert.equal(byDate.get("2026-02-20").payable, false);
  assert.equal(byDate.get("2026-02-18").recorded, false);
});

test("payroll prorates pre-joining dates once and only deducts post-joining unpaid classifications", () => {
  const rows = buildAttendanceMonthRows({
    month: "2026-02",
    joinedDate: "2026-02-16",
    employeeId: "employee-1",
    today: "2026-02-20",
    attendance: [
      { employeeId: "employee-1", date: "2026-02-17", status: "Absent", autoMarked: true },
    ],
    leaves: [
      { employeeId: "employee-1", type: "Unpaid Leave", status: "Approved", from: "2026-02-18", to: "2026-02-18" },
    ],
    calendar: { weeklyHolidays: [0], holidays: [{ date: "2026-02-20", paid: false }] },
  });
  const result = calculateAttendancePayroll({
    employee: { salary: 30000, joined: "2026-02-16" },
    month: "2026-02",
    rows,
  });

  assert.equal(result.dailyJoinExitRate, 1071);
  assert.equal(result.joinExitDeduction, 16065);
  assert.equal(result.paidLeaveDays, 1);
  assert.equal(result.deductedLeaveDays, 3);
  assert.equal(result.holidayDays, 2);
  assert.equal(result.classifiedUnpaidDays, 3);
  assert.equal(result.postJoinUnpaidDeduction, 3000);
  assert.equal(result.otherDeductions, 19065);
  assert.equal(result.netBasicSalary, 10935);
});

test("one paid leave accrues monthly, carries within the year, and is consumed before deduction", () => {
  const currentRows = [
    { date: "2026-03-10", status: "Leave", reason: "approved_leave", leaveType: "Casual Leave" },
    { date: "2026-03-11", status: "Leave", reason: "approved_leave", leaveType: "Sick Leave" },
  ];
  const yearRows = [
    { date: "2026-01-05", status: "Leave", reason: "approved_leave", leaveType: "Earned Leave" },
    ...currentRows,
  ];
  const result = calculateAttendancePayroll({
    employee: { salary: 30000, joined: "2026-01-01" },
    month: "2026-03",
    rows: currentRows,
    yearRows,
  });

  assert.equal(result.accruedPaidLeave, 3);
  assert.equal(result.paidLeaveDays, 2);
  assert.equal(result.deductedLeaveDays, 0);
  assert.equal(result.paidLeaveBalance, 0);
  assert.equal(result.postJoinUnpaidDeduction, 0);
});

test("paid leave resets in January and leave beyond the new balance is deducted", () => {
  const currentRows = [
    { date: "2027-01-10", status: "Leave", reason: "approved_leave", leaveType: "Casual Leave" },
    { date: "2027-01-11", status: "Leave", reason: "approved_leave", leaveType: "Sick Leave" },
    { date: "2027-01-12", status: "Holiday", reason: "company_holiday", payable: false },
  ];
  const result = calculateAttendancePayroll({
    employee: { salary: 30000, joined: "2025-06-01" },
    month: "2027-01",
    rows: currentRows,
    yearRows: [
      { date: "2026-12-20", status: "Leave", reason: "approved_leave", leaveType: "Earned Leave" },
      ...currentRows,
    ],
  });

  assert.equal(result.accruedPaidLeave, 1);
  assert.equal(result.paidLeaveDays, 1);
  assert.equal(result.deductedLeaveDays, 1);
  assert.equal(result.paidLeaveBalance, 0);
  assert.equal(result.holidayDays, 1);
  assert.equal(result.classifiedUnpaidDays, 1);
  assert.equal(result.postJoinUnpaidDeduction, 1000);
});

test("join dates on the first, middle, and last calendar day prorate only non-employment days", () => {
  const cases = [
    { joined: "2026-02-01", deduction: 0 },
    { joined: "2026-02-16", deduction: 16065 },
    { joined: "2026-02-28", deduction: 28917 },
  ];
  cases.forEach(({ joined, deduction }) => {
    const result = calculateAttendancePayroll({
      employee: { salary: 30000, joined },
      month: "2026-02",
      rows: [],
    });
    assert.equal(result.joinExitDeduction, deduction);
  });
});

test("a month before the employee joined deducts the full salary without a rounding remainder", () => {
  const result = calculateAttendancePayroll({
    employee: { salary: 10000, joined: "2026-11-01" },
    month: "2026-10",
    rows: [],
  });

  assert.equal(result.employedDays, 0);
  assert.equal(result.joinExitDeduction, 10000);
  assert.equal(result.netBasicSalary, 0);
});

test("a fully absent past month pays recorded holidays plus one paid absence", () => {
  const rows = buildAttendanceMonthRows({
    month: "2026-10",
    joinedDate: "2026-10-01",
    employeeId: "employee-1",
    today: "2026-11-23",
    attendance: ["04", "11", "18", "25"].map((day) => ({
      employeeId: "employee-1",
      date: `2026-10-${day}`,
      status: "Holiday",
    })),
    calendar: { weeklyHolidays: [0], weeklyHolidayPaid: true },
    recordedHolidaysOnly: true,
  });
  const result = calculateAttendancePayroll({
    employee: { salary: 10000, joined: "2026-10-01" },
    month: "2026-10",
    rows,
    yearRows: rows,
  });

  assert.equal(result.presentDays, 0);
  assert.equal(result.holidayDays, 4);
  assert.equal(result.absentDays, 27);
  assert.equal(result.paidLeaveDays, 1);
  assert.equal(result.deductedLeaveDays, 26);
  assert.equal(result.payableDays, 5);
});

test("payroll pays Sundays, ignores unrecorded extra holidays, and uses the selected month's day count", () => {
  const rows = buildAttendanceMonthRows({
    month: "2026-10",
    joinedDate: "2026-10-01",
    employeeId: "employee-1",
    today: "2026-11-23",
    attendance: [],
    calendar: {
      weeklyHolidays: [0],
      weeklyHolidayPaid: true,
      holidays: [{ date: "2026-10-14", label: "Unrecorded company holiday", paid: true }],
    },
    recordedHolidaysOnly: true,
  });
  const payroll = calculateAttendancePayroll({
    employee: { salary: 10000, joined: "2026-10-01" },
    month: "2026-10",
    rows,
    yearRows: rows,
  });
  const rowsWithBackendHoliday = buildAttendanceMonthRows({
    month: "2026-10",
    joinedDate: "2026-10-01",
    employeeId: "employee-1",
    today: "2026-11-23",
    attendance: [{ employeeId: "employee-1", date: "2026-10-14", status: "Holiday" }],
    calendar: { weeklyHolidays: [0], holidays: [{ date: "2026-10-15", paid: true }] },
    recordedHolidaysOnly: true,
  });
  const payrollWithBackendHoliday = calculateAttendancePayroll({
    employee: { salary: 10000, joined: "2026-10-01" },
    month: "2026-10",
    rows: rowsWithBackendHoliday,
    yearRows: rowsWithBackendHoliday,
  });
  const salary = calculateSalaryReportPay({ baseSalary: 10000, payableDays: 5, daysInMonth: 31 });

  assert.equal(payroll.holidayDays, 4);
  assert.equal(payroll.absentDays, 27);
  assert.equal(payroll.paidLeaveDays, 1);
  assert.equal(payroll.payableDays, 5);
  assert.equal(payrollWithBackendHoliday.holidayDays, 5);
  assert.equal(payrollWithBackendHoliday.payableDays, 6);
  assert.equal(salary.payableBasicSalary, 1612.9);
  assert.equal(salary.basicSalaryDeduction, 8387.1);
});

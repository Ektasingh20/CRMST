const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const activeEmployees = (db) => (db.emps || []).filter((employee) => employee.status === "active");
const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const formatMonth = (month) => {
  const [year, number] = month.split("-").map(Number);
  return new Date(year, number - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
const monthForQuestion = (text, now = new Date()) => {
  const monthIndex = MONTHS.findIndex((month) => new RegExp(`\\b${month}\\b`, "i").test(text));
  const year = text.match(/\b(20\d{2})\b/)?.[1] || String(now.getFullYear());
  return monthIndex < 0
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    : `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
};
const monthLabel = (date) => date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const normalize = (value) => String(value || "").toLowerCase()
  .replace(/['’]s\b/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function employeesMentioned(text, employees) {
  const normalizedText = ` ${normalize(text)} `;
  return employees.map((employee) => {
    const name = normalize(employee.name);
    const exactName = name && normalizedText.includes(` ${name} `);
    const matchingTokens = name.split(" ").filter((part) => part.length > 1 && normalizedText.includes(` ${part} `));
    return { employee, score: exactName ? 100 + name.length : matchingTokens.length ? 10 + matchingTokens.length : 0 };
  }).filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((match, index, matches) => match.score === matches[0].score && (index === 0 || match.employee.id !== matches[0].employee.id))
    .map(({ employee }) => employee);
}

function requestedEmployeeName(text) {
  const patterns = [
    /(?:salary|payroll|pay|profile|details|attendance|leave|task|payment)s?\s+(?:of|for)\s+(.+?)(?:\s+(?:in|during|this month|last month)\b|[?.,]|$)/i,
    /(?:is|was|were|for|did)\s+(.+?)\s+(?:salary|payroll|pay|paid|payment|attendance|leave|tasks?)\b/i,
    /(.+?)['’]s\s+(?:salary|payroll|pay|paid|payment|attendance|leave|tasks?)\b/i,
  ];
  const value = patterns.map((pattern) => text.match(pattern)?.[1]).find(Boolean);
  return value
    ? value.trim().replace(/^(?:(?:what|who|show|tell|find|give|me|is|the|an?|employee)\s+)+/i, "").replace(/['’]s$/i, "")
    : "";
}

function payrollFor(employee, month, db) {
  const saved = (db.payrolls || []).find((payroll) => (
    !payroll.deleted && payroll.month === month && String(payroll.employeeId) === String(employee.id)
  ));
  if (saved) return { payroll: saved, saved: true };

  const amount = (value) => Math.max(0, Number(value) || 0);
  const absences = Object.entries(db.att || {}).filter(([key, status]) => (
    key.startsWith(`${month}-`) && key.endsWith(`|${employee.id}`) && status === "Absent"
  )).length;
  const salary = amount(employee.salary);
  const hra = amount(employee.hrm);
  const allowances = amount(employee.otherAllowance);
  const bonus = amount(employee.bonus);
  const incentive = amount(employee.incentive);
  const pf = amount(employee.pf);
  const tax = amount(employee.taxDeduction);
  const otherDeductions = amount(employee.currentMonthLeaveDeduction)
    + Math.round((salary / 30) * Math.max(absences, amount(employee.unpaidLeaveDays)) * 100) / 100;
  const gross = salary + hra + allowances + bonus + incentive;
  return {
    saved: false,
    payroll: {
      salary, hra, allowances, bonus, incentive, pf, tax, otherDeductions, gross,
      net: Math.max(0, gross - pf - tax - otherDeductions),
    },
  };
}

function answerSalary(text, db, employee) {
  const month = monthForQuestion(text);
  const label = formatMonth(month);
  const employees = employee ? [employee] : activeEmployees(db);
  if (!employees.length) return "There are no active employee profiles in the current HR dashboard data.";

  const records = employees.map((item) => ({ employee: item, ...payrollFor(item, month, db) }));
  if (employee) {
    const [{ payroll, saved }] = records;
    const prefix = `${employee.name}’s ${label} payroll`;
    if (/\b(?:basic|base|monthly)\s+salary\b/i.test(text) || /\bsalary\b/i.test(text) && !/\b(?:net|gross|payroll|take home|take-home)\b/i.test(text)) {
      return `${employee.name}’s basic monthly salary is ${formatMoney(payroll.salary)}. The ${label} net payable is ${formatMoney(payroll.net)}${saved ? " from the saved payroll record" : " estimated from the current profile and attendance data; no saved payroll record exists for this month"}.`;
    }
    return `${prefix}: basic ${formatMoney(payroll.salary)}, gross ${formatMoney(payroll.gross)}, deductions ${formatMoney(payroll.pf + payroll.tax + payroll.otherDeductions)}, and net payable ${formatMoney(payroll.net)}. ${saved ? "This is a saved payroll record." : "This is calculated from the current profile and attendance data; no saved payroll record exists for this month."}`;
  }

  const totals = records.reduce((result, { payroll }) => ({
    gross: result.gross + payroll.gross,
    net: result.net + payroll.net,
    basic: result.basic + payroll.salary,
  }), { gross: 0, net: 0, basic: 0 });
  if (/\b(?:list|show|report|details)\b/i.test(text)) {
    const lines = records.slice(0, 12).map(({ employee: item, payroll }) => (
      `${item.name}: basic ${formatMoney(payroll.salary)}, net payable ${formatMoney(payroll.net)}`
    ));
    return `${label} payroll details: ${lines.join("; ")}${records.length > 12 ? "; and more" : ""}. Net payable total: ${formatMoney(totals.net)}. Saved payroll records are used when available; other amounts are estimates based on current profiles.`;
  }
  return `${label} payroll for ${records.length} active employees: basic salaries total ${formatMoney(totals.basic)}, gross payroll ${formatMoney(totals.gross)}, and net payable ${formatMoney(totals.net)}. These totals include saved payroll records where available and estimates from current profiles otherwise.`;
}

function answerPaymentStatus(text, db, employee) {
  const month = monthForQuestion(text);
  const label = formatMonth(month);
  if (!employee) {
    return `The HR dashboard does not record whether salaries were paid or transferred for ${label}. It can show the payroll amounts with “What is the net payroll for ${label}?”`;
  }
  const saved = (db.payrolls || []).some((payroll) => (
    !payroll.deleted && payroll.month === month && String(payroll.employeeId) === String(employee.id)
  ));
  return `${employee.name}’s ${label} payment status is not recorded in this HR dashboard. ${saved ? "A payroll record is saved, but that does not confirm payment." : "There is no saved payroll record for that month."}`;
}

function answerAttendance(text, db, employee, now) {
  const month = monthForQuestion(text, now);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const records = Object.entries(db.att || {}).filter(([key, status]) => {
    const [date, employeeId] = key.split("|");
    return status && (employee ? String(employee.id) === employeeId : true)
      && (/\btoday\b/i.test(text) ? date === today : date.startsWith(`${month}-`));
  });
  const requestedStatus = ["Present", "Absent", "Leave"].find((status) => new RegExp(`\\b${status}\\b`, "i").test(text));
  const listedRecords = requestedStatus ? records.filter(([, status]) => status === requestedStatus) : records;
  const counts = records.reduce((result, [, status]) => {
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});
  const detail = ["Present", "Absent", "Leave"].map((status) => `${counts[status] || 0} ${status.toLowerCase()}`).join(", ");
  if (employee) {
    return `${employee.name} has ${detail} attendance records ${/\btoday\b/i.test(text) ? "today" : `in ${monthLabel(new Date(`${month}-01T00:00:00`))}`}. These are marked records only.`;
  }
  if (/\b(?:who|which|list|show)\b/i.test(text)) {
    const names = listedRecords.map(([key, status]) => {
      const [, employeeId] = key.split("|");
      const person = (db.emps || []).find((item) => String(item.id) === employeeId);
      return person ? `${person.name} (${status})` : "";
    }).filter(Boolean);
    return names.length
      ? `Attendance ${/\btoday\b/i.test(text) ? "today" : `in ${monthLabel(new Date(`${month}-01T00:00:00`))}`}: ${names.slice(0, 20).join(", ")}${names.length > 20 ? ", and more" : ""}.`
      : `No attendance records are marked ${/\btoday\b/i.test(text) ? "today" : `in ${monthLabel(new Date(`${month}-01T00:00:00`))}`}.`;
  }
  return `${records.length} attendance record${records.length === 1 ? "" : "s"} ${/\btoday\b/i.test(text) ? "today" : `in ${monthLabel(new Date(`${month}-01T00:00:00`))}`}: ${detail}.`;
}

function answerLeaves(text, db, employee) {
  const leaves = (db.leaves || []).filter((leave) => !employee || String(leave.empId) === String(employee.id));
  const statusFilter = ["pending", "approved", "rejected"].find((status) => new RegExp(`\\b${status}\\b`, "i").test(text));
  const filtered = statusFilter ? leaves.filter((leave) => String(leave.status || "").toLowerCase() === statusFilter) : leaves;
  const counts = ["Pending", "Approved", "Rejected"].map((status) => (
    `${leaves.filter((leave) => leave.status === status).length} ${status.toLowerCase()}`
  )).join(", ");
  if (!employee && /\b(?:list|show|history|details)\b/i.test(text) && !/\bhow many|count|number\b/i.test(text)) {
    return filtered.length
      ? `Leave requests: ${filtered.slice(0, 12).map((leave) => {
        const person = (db.emps || []).find((item) => String(item.id) === String(leave.empId));
        return `${person?.name || "Unknown employee"} — ${leave.type || "Leave"} (${leave.status || "status not set"}, ${leave.from || "date not set"} to ${leave.to || "date not set"})`;
      }).join("; ")}${filtered.length > 12 ? "; and more" : ""}.`
      : "There are no matching leave requests in the current dashboard data.";
  }
  if (/\b(?:how many|count|number)\b/i.test(text) || !employee) {
    return `${employee ? `${employee.name} has` : "There are"} ${filtered.length} matching leave request${filtered.length === 1 ? "" : "s"}${statusFilter ? ` with ${statusFilter} status` : ""}. ${employee ? `Overall: ${counts}.` : `Status totals: ${counts}.`}`;
  }
  if (!filtered.length) return `${employee.name} has no matching leave requests in the current dashboard data.`;
  return `${employee.name}’s leave requests: ${filtered.map((leave) => `${leave.type || "Leave"} (${leave.status}, ${leave.from || "date not set"} to ${leave.to || "date not set"})`).join("; ")}.`;
}

function answerTasks(text, db, employee, now) {
  let tasks = db.tasks || [];
  if (employee) tasks = tasks.filter((task) => String(task.assignedTo) === String(employee.id));
  const status = ["pending", "in progress", "done", "completed"].find((value) => new RegExp(`\\b${value}\\b`, "i").test(text));
  if (status) {
    const normalizedStatus = status === "completed" ? "Done" : status.replace(/\b\w/g, (letter) => letter.toUpperCase());
    tasks = tasks.filter((task) => task.status === normalizedStatus);
  }
  if (/\boverdue\b/i.test(text)) {
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    tasks = tasks.filter((task) => task.status !== "Done" && task.due && task.due < today);
  }
  if (employee) {
    return tasks.length
      ? `${employee.name} has ${tasks.length} matching task${tasks.length === 1 ? "" : "s"}: ${tasks.slice(0, 5).map((task) => `${task.title} (${task.status || "Pending"}${task.due ? `, due ${task.due}` : ""})`).join("; ")}${tasks.length > 5 ? "; and more" : ""}.`
      : `${employee.name} has no matching tasks in the current dashboard data.`;
  }
  if (/\b(?:who|which|list|show|overdue)\b/i.test(text)) {
    return tasks.length
      ? `Matching tasks: ${tasks.slice(0, 12).map((task) => {
        const person = (db.emps || []).find((item) => String(item.id) === String(task.assignedTo));
        return `${task.title} — ${person?.name || "Unassigned"} (${task.status || "Pending"}${task.due ? `, due ${task.due}` : ""})`;
      }).join("; ")}${tasks.length > 12 ? "; and more" : ""}.`
      : "There are no matching tasks in the current dashboard data.";
  }
  const counts = ["Pending", "In Progress", "Done"].map((value) => `${tasks.filter((task) => task.status === value).length} ${value.toLowerCase()}`).join(", ");
  return `${tasks.length} matching task${tasks.length === 1 ? "" : "s"} in the dashboard (${counts}).`;
}

function answerEmployee(text, db, employee) {
  const status = employee.status === "active" ? "active" : employee.status === "ex" ? "former" : employee.status || "unknown";
  return `${employee.name} (employee ID ${employee.id}) is ${status}${employee.dept ? ` in ${employee.dept}` : ""}${employee.desig ? `, ${employee.desig}` : ""}${employee.joined ? `; joined ${employee.joined}` : ""}. ${employee.email ? `Email: ${employee.email}. ` : ""}${employee.salary != null ? `Basic monthly salary: ${formatMoney(employee.salary)}.` : "No salary is recorded on the profile."}`;
}

function answerEmployees(text, db) {
  const employees = db.emps || [];
  const active = activeEmployees(db);
  const department = employees.map((employee) => employee.dept).filter(Boolean)
    .find((value) => new RegExp(`\\b${value}\\b`, "i").test(text));
  const chosen = department ? employees.filter((employee) => employee.dept === department) : active;
  const counts = [...new Set(employees.map((employee) => employee.dept).filter(Boolean))]
    .map((value) => `${value}: ${employees.filter((employee) => employee.dept === value).length}`)
    .join(", ");
  if (/\b(?:list|who|which|names)\b/i.test(text)) {
    return chosen.length
      ? `${department ? `${department} department` : "Active employee directory"} (${chosen.length}): ${chosen.slice(0, 20).map((employee) => employee.name).join(", ")}${chosen.length > 20 ? ", and more" : ""}.`
      : `There are no employee profiles in ${department}.`;
  }
  return `${active.length} active employee${active.length === 1 ? "" : "s"} out of ${employees.length} total profiles. Department counts: ${counts || "no department data recorded"}.`;
}

function answerCalendar(text, db) {
  const date = new Date();
  const monthIndex = MONTHS.findIndex((month) => new RegExp(`\\b${month}\\b`, "i").test(text));
  const year = Number(text.match(/\b(20\d{2})\b/)?.[1] || date.getFullYear());
  const targetMonth = monthIndex < 0 ? date.getMonth() : monthIndex;
  const employees = activeEmployees(db);
  const events = [];
  employees.forEach((employee, index) => {
    const birthMonth = (Number(employee.id) - 1) % 12;
    const birthDay = ((Number(employee.id) * 3) % 27) + 1;
    const [, joinedMonth = "1", joinedDay = "1"] = (employee.joined || "").split("-");
    const probationMonth = ((Number(joinedMonth) - 1 + 3) % 12);
    if (birthMonth === targetMonth) events.push(`${employee.name} birthday on ${year}-${String(birthMonth + 1).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`);
    if (Number(joinedMonth) - 1 === targetMonth) events.push(`${employee.name} work anniversary on ${year}-${String(targetMonth + 1).padStart(2, "0")}-${joinedDay.padStart(2, "0")}`);
    if (index % 3 === 0 && probationMonth === targetMonth) events.push(`${employee.name} probation review on ${year}-${String(targetMonth + 1).padStart(2, "0")}-${joinedDay.padStart(2, "0")}`);
  });
  const appraisals = db.hrAppraisals || employees.slice(0, 2).map((employee, index) => {
    const appraisalDate = new Date();
    appraisalDate.setDate(appraisalDate.getDate() + 7 + index * 5);
    return { employeeId: employee.id, date: appraisalDate.toISOString().slice(0, 10), note: "Quarterly performance conversation" };
  });
  appraisals.filter((appraisal) => {
    const eventDate = new Date(`${appraisal.date}T00:00:00`);
    return eventDate.getFullYear() === year && eventDate.getMonth() === targetMonth;
  }).forEach((appraisal) => {
    const employee = employees.find((item) => String(item.id) === String(appraisal.employeeId));
    events.push(`${employee?.name || "Former employee"} appraisal on ${appraisal.date}${appraisal.note ? ` (${appraisal.note})` : ""}`);
  });
  const name = employeesMentioned(text, employees)[0];
  const matching = name ? events.filter((event) => event.toLowerCase().includes(name.name.toLowerCase())) : events;
  return matching.length
    ? `${monthLabel(new Date(year, targetMonth, 1))} HR calendar: ${matching.slice(0, 12).join("; ")}${matching.length > 12 ? "; and more" : ""}. Birthday and probation dates are illustrative demo dates.`
    : `There are no matching HR calendar events for ${name ? `${name.name} in ` : ""}${monthLabel(new Date(year, targetMonth, 1))}. Birthday and probation dates are illustrative demo dates.`;
}

export function answerHrQuestion(question, db, now = new Date()) {
  const text = String(question || "").trim();
  const normalized = text.toLowerCase();
  const employees = db.emps || [];
  let matches = employeesMentioned(text, employees);
  const salaryIntent = /\bsalary|payroll|payable|take[- ]?home|gross pay|net pay|earnings|compensation\b/i.test(text);
  const paymentStatusIntent = /\b(?:was|were|is|are|has|have|did|paid|payment|disburs(?:ed|ement)?|transferred)\b/i.test(text)
    && /\b(?:paid|payment|disburs|transferred)\b/i.test(text);
  const attendanceIntent = /\battendance|present|absent|marked\b/i.test(text);
  const leaveIntent = /\bleave|time off|holiday\b/i.test(text);
  const taskIntent = /\btask|tasks|overdue\b/i.test(text);
  const calendarIntent = /\bbirthday|anniversary|probation|appraisal|calendar|schedule\b/i.test(text);
  const employeeIntent = /\bemployee|employees|headcount|people|team|department|profile|directory\b/i.test(text);

  if (/\b(?:policy|legal|medical|diagnos(?:is|e)|treatment)\b/i.test(text)) {
    return "I can report what is recorded in the HR dashboard, but I can’t provide legal, medical, or company-policy advice.";
  }
  if (!matches.length && (salaryIntent || paymentStatusIntent)) {
    const requestedName = requestedEmployeeName(text);
    if (requestedName) {
      return `I couldn’t find an employee named “${requestedName}” in the current HR dashboard data. Check the spelling or use Employee Management to confirm the profile.`;
    }
  }
  if (matches.length > 1) {
    return `I found multiple employees matching that name: ${matches.map((employee) => `${employee.name} (ID ${employee.id})`).join(", ")}. Please ask using the employee’s full name or ID.`;
  }
  const employee = matches[0];
  if (paymentStatusIntent) return answerPaymentStatus(text, db, employee);
  if (salaryIntent) return answerSalary(text, db, employee);
  if (attendanceIntent) return answerAttendance(text, db, employee, now);
  if (leaveIntent) return answerLeaves(text, db, employee);
  if (taskIntent) return answerTasks(text, db, employee, now);
  if (calendarIntent) return answerCalendar(text, db);
  if (employee) return answerEmployee(text, db, employee);
  if (employeeIntent) return answerEmployees(text, db);
  if (/\b(company|organization|organisation|branch)\b/i.test(normalized)) {
    return `${db.me?.company || "The HR dashboard"}${db.me?.branch ? ` is configured for the ${db.me.branch} branch` : ""}.`;
  }
  return "I can answer questions using the HR dashboard’s current employee profiles, salary and payroll records, attendance, leave requests, tasks, and HR calendar. For example: “What is Priya’s salary in October?”, “Which tasks are overdue?”, or “How many leave requests are pending?”";
}

import test from "node:test";
import assert from "node:assert/strict";
import { answerHrQuestion } from "./hrAssistantModel.js";

const now = new Date("2026-10-22T12:00:00");
const db = {
  emps: [
    { id: 1, name: "Ekta Singh", dept: "HR", desig: "HR Manager", status: "active", salary: 50000, joined: "2024-01-10", email: "ekta@example.test" },
    { id: 2, name: "Priya Sharma", dept: "Sales", status: "active", salary: 30000 },
    { id: 3, name: "Ekta Meena", dept: "IT", status: "active", salary: 42000 },
    { id: 4, name: "Former Employee", dept: "IT", status: "ex", salary: 25000 },
  ],
  att: {
    "2026-10-01|1": "Present",
    "2026-10-02|1": "Absent",
    "2026-10-03|2": "Present",
  },
  leaves: [
    { id: 1, empId: 1, type: "Casual", from: "2026-10-20", to: "2026-10-21", status: "Pending" },
    { id: 2, empId: 2, type: "Sick", from: "2026-10-10", to: "2026-10-10", status: "Approved" },
  ],
  tasks: [
    { id: 1, assignedTo: 1, title: "Review payroll", due: "2026-10-21", status: "Pending" },
    { id: 2, assignedTo: 2, title: "Call client", due: "2026-10-24", status: "In Progress" },
  ],
  payrolls: [
    { id: 1, employeeId: 1, employeeName: "Ekta Singh", month: "2026-10", salary: 50000, hra: 5000, allowances: 1000, bonus: 0, incentive: 0, pf: 2000, tax: 1000, otherDeductions: 500, gross: 56000, net: 52500 },
  ],
  me: { company: "System Technologies", branch: "Ajmer" },
};

test("answers a named employee's month-specific saved salary and payroll", () => {
  const answer = answerHrQuestion("What is Ekta Singh's salary in October?", db, now);
  assert.match(answer, /Ekta Singh’s basic monthly salary is ₹50,000/);
  assert.match(answer, /October 2026 net payable is ₹52,500/);
  assert.match(answer, /saved payroll record/);
});

test("resolves a first name when it identifies exactly one employee", () => {
  const uniqueNameDb = { ...db, emps: db.emps.filter((employee) => employee.name !== "Ekta Meena") };
  const answer = answerHrQuestion("What is Ekta's salary in October?", uniqueNameDb, now);
  assert.match(answer, /Ekta Singh’s basic monthly salary is ₹50,000/);
});

test("reports ambiguous employee names and unknown requested employees explicitly", () => {
  assert.match(answerHrQuestion("What is Ekta's salary in October?", db, now), /multiple employees matching/);
  assert.match(answerHrQuestion("What is Alex's salary in October?", db, now), /couldn’t find an employee named “Alex”/);
});

test("calculates payroll from profile and month attendance when no saved record exists", () => {
  const answer = answerHrQuestion("What is Priya Sharma's salary in October?", db, now);
  assert.match(answer, /basic monthly salary is ₹30,000/);
  assert.match(answer, /estimated from the current profile and attendance data/);
});

test("does not treat a saved payroll record as proof that salary was paid", () => {
  assert.match(answerHrQuestion("Was Ekta Singh paid in October?", db, now), /does not confirm payment/);
  assert.match(answerHrQuestion("Was Alex paid in October?", db, now), /couldn’t find an employee named “Alex”/);
});

test("answers attendance, leave, tasks, employee directory, and department questions from dashboard data", () => {
  assert.match(answerHrQuestion("Show Ekta Singh's attendance in October", db, now), /1 present, 1 absent, 0 leave/);
  assert.match(answerHrQuestion("How many leave requests are pending?", db, now), /1 matching leave request/);
  assert.match(answerHrQuestion("Which tasks are overdue?", db, now), /Review payroll — Ekta Singh/);
  assert.match(answerHrQuestion("How many employees are active?", db, now), /3 active employees out of 4 total profiles/);
  assert.match(answerHrQuestion("List employees in IT", db, now), /IT department \(2\): Ekta Meena, Former Employee/);
});

test("lists dashboard records for show and who questions", () => {
  assert.match(answerHrQuestion("Who is present in October?", db, now), /Ekta Singh \(Present\), Priya Sharma \(Present\)/);
  assert.match(answerHrQuestion("Show leave requests", db, now), /Ekta Singh — Casual \(Pending/);
  assert.match(answerHrQuestion("Show salary report for October", db, now), /Ekta Singh: basic ₹50,000/);
});

test("states clearly when a named employee has no matching requests", () => {
  assert.match(answerHrQuestion("Show Ekta Singh's leave requests", db, now), /Casual \(Pending/);
  assert.match(answerHrQuestion("Show Ekta Singh's tasks", { ...db, tasks: [] }, now), /no matching tasks/);
});

test("does not offer company-policy advice", () => {
  assert.match(answerHrQuestion("What is the best leave policy?", db, now), /can’t provide legal, medical, or company-policy advice/);
});

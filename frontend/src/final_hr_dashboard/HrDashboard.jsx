import { useState, useEffect } from "react";
import "./hrDashboard.css";
import "./hrDashboardForm.css";
import HrPlanner from "./HrPlanner";
import HrPeopleModules from "./HrPeopleModules";
import { usePageLoading, getPageTitle } from "./hrPageLoading";
import { compressImageFile } from "../../imageUpload.js";
import PasswordResetLink from "../PasswordResetLink.jsx";
import {
  LayoutGrid, Users, CalendarCheck, ListChecks, Upload, Settings, LogOut, ChevronRight, ChevronDown,
  Search, Bell, Calendar, UserPlus, Plus, CalendarClock, Check, UserX, CreditCard, FileText, Wallet,
  ClipboardList, UserCog, ClipboardCheck, Briefcase, Menu, X, BellRing, UserCheck, Printer, Eye, EyeOff, Pencil, Trash2, UserCircle, Download,
  Filter, RotateCcw, FileSpreadsheet, Phone, LockKeyhole, Moon, Sun, CalendarDays, Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ================= helpers & seed data ================= */
const P = (s) => { const [a, b, c] = s.split("-"); return new Date(+a, b - 1, +c); };
const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY = iso();
const MONTH = TODAY.slice(0, 7);
const DEPTS = ["Sales", "IT", "HR", "Marketing"];
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const range = (a, b) => { const r = []; for (let d = P(a); d <= P(b) && r.length < 62; d.setDate(d.getDate() + 1)) r.push(iso(d)); return r; };
const act = (d) => d.emps.filter((e) => e.status === "active");
const nm = (d, id) => d.emps.find((e) => e.id === +id)?.name || "Unknown";
const KEY = "hr_dashboard_v2";

const FN = ["Rahul", "Priya", "Amit", "Neha", "Vikram", "Anita", "Rohit", "Kavya", "Suresh", "Pooja", "Manish", "Ritu", "Deepak", "Sneha", "Arjun", "Meena"];
const LN = ["Joshi", "Meena", "Sharma", "Verma", "Gupta", "Singh", "Jain"];
const TT = ["Follow up with new leads", "Update CRM records", "Prepare monthly report", "Client onboarding call", "Fix dashboard bug", "Team training session", "Verify documents", "Plan campaign calendar", "Review attendance sheet"];

const seed = () => {
  const emps = Array.from({ length: 32 }, (_, i) => {
    const dept = i < 2 ? "HR" : i < 22 ? "Sales" : i < 31 ? "IT" : "Marketing";
    const name = i ? `${FN[i % 16]} ${LN[i % 7]}` : "HR Admin";
    return {
      id: i + 1, name, dept, status: "active",
      desig: i === 0 ? "Hiring Manager" : { Sales: "Sales Executive", IT: "Developer", HR: "HR Executive", Marketing: "Marketer" }[dept],
      email: `${name.toLowerCase().replace(/ /g, ".")}${i}@systemtech.in`,
      phone: `98${String(29000000 + i * 7919).slice(0, 8)}`,
      salary: 20000 + ((i * 1700) % 26000),
      joined: iso(new Date(2023, i % 12, 1 + (i % 27))),
    };
  });
  const att = {};
  emps.forEach((e) => {
    if (e.id <= 9) att[`${TODAY}|${e.id}`] = "Present";
    for (let k = 1; k <= 6; k++) { const d = new Date(); d.setDate(d.getDate() - k); att[`${iso(d)}|${e.id}`] = (e.id + k) % 7 === 0 ? "Absent" : "Present"; }
  });
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return iso(x); };
  const leaves = [
    { id: 1, empId: 5, type: "Sick", from: d(1), to: d(2), reason: "Fever", status: "Pending" },
    { id: 2, empId: 8, type: "Casual", from: d(3), to: d(3), reason: "Family function", status: "Pending" },
    { id: 3, empId: 12, type: "Earned", from: d(-9), to: d(-7), reason: "Trip", status: "Approved" },
    { id: 4, empId: 3, type: "Casual", from: d(-15), to: d(-15), reason: "Personal", status: "Rejected" },
  ];
  const tasks = Array.from({ length: 17 }, (_, i) => ({
    id: i + 1, title: TT[i % TT.length], assignedTo: (i % 31) + 2 > 32 ? 1 : (i * 3) % 32 + 1, assignedBy: i % 4 === 0 ? 2 : 1,
    due: d((i % 9) - 2), priority: ["Low", "Medium", "High"][i % 3], status: ["Pending", "In Progress", "Done"][i % 3],
  }));
  tasks[0].assignedTo = 1; tasks[1].assignedTo = 1; tasks[1].assignedBy = 2;
  return { emps, att, leaves, tasks, paid: {}, log: [], me: { name: "HR", role: "Administrator", branch: "Ajmer", crm: "38", company: "System Technologies" } };
};
const load = () => { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch { /* ignore */ } return seed(); };

const decide = (id, status, approvedBy = "") => (d) => {
  const l = d.leaves.find((x) => x.id === id); const att = { ...d.att };
  if (status === "Approved") range(l.from, l.to).forEach((day) => { att[`${day}|${l.empId}`] = "Leave"; });
  return {
    leaves: d.leaves.map((x) => (x.id === id
      ? {
        ...x,
        status,
        approvedBy: status === "Pending" ? "" : approvedBy,
        approvedAt: status === "Pending" ? "" : new Date().toISOString(),
      }
      : x)),
    att,
  };
};

/* ================= small UI pieces ================= */
const F = ({ l, children, className = "" }) => <label className={`hr-f ${className}`.trim()}><span>{l}</span>{children}</label>;
const tone = (s) => ({ Present: "ok", Approved: "ok", Done: "ok", Paid: "ok", Pending: "warn", "In Progress": "warn", Leave: "warn", Rejected: "bad", Absent: "bad", High: "bad", Medium: "warn", Low: "ok" }[s] || "");
const Badge = ({ s }) => <span className={`hr-b ${tone(s)}`}>{s}</span>;
const Empty = ({ t }) => <p className="hr-empty">{t}</p>;
const Table = ({ cols, rows, empty = "Nothing here yet." }) => rows.length ? (
  <div className="hr-tw"><table className="hr-t"><thead><tr>{cols.map((c) => <th key={c[0]}>{c[0]}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={r.id ?? i}>{cols.map((c) => <td key={c[0]}>{c[1](r, i)}</td>)}</tr>)}</tbody></table></div>
) : <Empty t={empty} />;
const Card = ({ title, children, right }) => (
  <section className="hr-card hr-box">{(title || right) && <div className="hr-bh"><h3>{title}</h3>{right}</div>}{children}</section>
);
const Modal = ({ onClose, children }) => <div className="hr-modal" onClick={onClose}><div className="hr-card hr-box" onClick={(e) => e.stopPropagation()}>{children}</div></div>;
const Seg = ({ value, opts, onChange }) => (
  <div className="hr-seg">{opts.map((o) => <button key={o} className={value === o ? "on" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>
);

/* ================= Dashboard ================= */
function Dash({ c: { db, upd, go } }) {
  const A = act(db);
  const st = A.map((e) => db.att[`${TODAY}|${e.id}`]);
  const attendance = ["Present", "Absent", "Leave"].map((status) => [status, st.filter((value) => value === status).length]);
  const marked = attendance.reduce((sum, [, count]) => sum + count, 0);
  const pendingLeaves = db.leaves.filter((leave) => leave.status === "Pending");
  const openTasks = db.tasks.filter((task) => task.status !== "Done");
  const overdueTasks = openTasks.filter((task) => task.due < TODAY);
  const taskStatuses = ["Pending", "In Progress", "Done"].map((status) => [status, db.tasks.filter((task) => task.status === status).length]);
  const departments = [...new Set(A.map((employee) => employee.dept))].sort((a, b) => a.localeCompare(b));
  const monthlyPayroll = A.reduce((total, employee) => total + (Number(employee.salary) || 0), 0);
  const stats = [
    ["Active employees", A.length, `Across ${departments.length} departments`, Users, "Employee Profiles"],
    ["Present today", attendance[0][1], `${marked} of ${A.length} attendance marked`, CalendarCheck, "All Attendance Report"],
    ["Pending leave", pendingLeaves.length, `${db.leaves.filter((leave) => leave.status === "Approved").length} approved · ${db.leaves.filter((leave) => leave.status === "Rejected").length} declined`, CalendarClock, "View All Leave Request"],
    ["Open tasks", openTasks.length, overdueTasks.length ? `${overdueTasks.length} overdue` : "None overdue", ListChecks, "All Task"],
    ["Monthly payroll", inr(monthlyPayroll), `Average ${inr(A.length ? Math.round(monthlyPayroll / A.length) : 0)} per employee`, Wallet, "Salary Report"],
  ];
  return (
    <div className="hr-dashboard">
      <div className="hr-dashboard-welcome">
        <div><p className="hr-dashboard-eyebrow">HR OVERVIEW · {db.me.branch}</p><h2>Welcome back, {db.me.name}</h2><p>Your workforce and today’s priorities at a glance.</p></div>
        <button className="hr-dashboard-link" onClick={() => go("Create Profile")}><UserPlus size={16} /> Add employee</button>
      </div>
      <div className="hr-dashboard-stats">{stats.map(([label, value, note, Icon, page]) => (
        <button className="hr-card hr-dashboard-stat" key={label} onClick={() => go(page)}>
          <span className="hr-dashboard-stat-icon"><Icon size={18} /></span>
          <span className="hr-dashboard-stat-copy"><small>{label}</small><strong>{value}</strong><em>{note}</em></span>
          <ChevronRight className="hr-dashboard-stat-arrow" size={16} />
        </button>
      ))}</div>
      <div className="hr-dashboard-panels">
        <section className="hr-card hr-dashboard-panel">
          <div className="hr-dashboard-panel-heading"><div><h3>Today’s attendance</h3><p>{marked} of {A.length} employees marked</p></div><button className="hr-dashboard-text-link" onClick={() => go("All Attendance Report")}>View report <ChevronRight size={14} /></button></div>
          <div className="hr-dashboard-breakdowns">{attendance.map(([status, count]) => (
            <div className="hr-dashboard-breakdown" key={status}>
              <div><span>{status}</span><strong>{count}</strong></div>
              <div className="hr-dashboard-track"><i className={`status-${status.toLowerCase()}`} style={{ width: `${A.length ? (count / A.length) * 100 : 0}%` }} /></div>
            </div>
          ))}</div>
          <p className="hr-dashboard-footnote">{Math.max(0, A.length - marked)} not marked yet</p>
        </section>
        <section className="hr-card hr-dashboard-panel">
          <div className="hr-dashboard-panel-heading"><div><h3>Task progress</h3><p>{db.tasks.length} assigned in total</p></div><button className="hr-dashboard-text-link" onClick={() => go("All Task")}>View tasks <ChevronRight size={14} /></button></div>
          <div className="hr-dashboard-task-summary">{taskStatuses.map(([status, count]) => (
            <div className="hr-dashboard-task-count" key={status}><strong>{count}</strong><span className={`hr-dashboard-task-dot task-${status.toLowerCase().replace(" ", "-")}`} />{status}</div>
          ))}</div>
          <p className="hr-dashboard-footnote">{overdueTasks.length ? `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"} need attention` : "No overdue tasks"}</p>
        </section>
        <section className="hr-card hr-dashboard-panel">
          <div className="hr-dashboard-panel-heading"><div><h3>Employees by department</h3><p>{A.length} active team members</p></div><button className="hr-dashboard-text-link" onClick={() => go("Employee Profiles")}>View profiles <ChevronRight size={14} /></button></div>
          <div className="hr-dashboard-departments">{departments.map((department) => {
            const count = A.filter((employee) => employee.dept === department).length;
            return <button key={department} onClick={() => go("Employee Profiles")}><span>{department}</span><strong>{count}</strong></button>;
          })}</div>
        </section>
        <section className="hr-card hr-dashboard-panel hr-dashboard-leaves">
          <div className="hr-dashboard-panel-heading"><div><h3>Leave requests</h3><p>{pendingLeaves.length ? `${pendingLeaves.length} awaiting review` : "You’re all caught up"}</p></div><button className="hr-dashboard-text-link" onClick={() => go("View All Leave Request")}>View all <ChevronRight size={14} /></button></div>
          {pendingLeaves.length ? pendingLeaves.slice(0, 3).map((leave) => (
            <div className="hr-dashboard-leave" key={leave.id}>
              <div><strong>{nm(db, leave.empId)}</strong><span>{leave.type} · {leave.from} to {leave.to}</span></div>
              <div className="hr-dashboard-leave-actions">
                <button aria-label={`Approve leave for ${nm(db, leave.empId)}`} onClick={() => upd(decide(leave.id, "Approved"), `Approved leave for ${nm(db, leave.empId)}`)}><Check size={14} /></button>
                <button aria-label={`Reject leave for ${nm(db, leave.empId)}`} onClick={() => upd(decide(leave.id, "Rejected"), `Rejected leave for ${nm(db, leave.empId)}`)}><X size={14} /></button>
              </div>
            </div>
          )) : <Empty t="No pending leave requests." />}
          {pendingLeaves.length > 3 && <p className="hr-dashboard-footnote">And {pendingLeaves.length - 3} more requests</p>}
        </section>
      </div>
      {db.log.length > 0 && <section className="hr-card hr-dashboard-activity"><div><h3>Recent activity</h3><button className="hr-dashboard-text-link" onClick={() => go("Settings")}>View settings <ChevronRight size={14} /></button></div>
        {db.log.slice(0, 3).map((item, index) => <p key={`${item.t}-${index}`}><span>{item.m}</span><time>{item.t}</time></p>)}
      </section>}
    </div>
  );
}

/* ================= Employee management ================= */
const blank = { name: "", email: "", phone: "", dept: "Sales", desig: "", salary: 20000, joined: TODAY };
const PROFILE_DEPARTMENTS = ["HR", "Operations", "Sales", "IT", "Marketing"];
const PROFILE_DOCUMENTS = [
  ["aadhaarDocument", "Aadhaar Card"],
  ["panDocument", "PAN Card"],
  ["bankDocument", "Bank Passbook / Cheque"],
  ["resumeDocument", "Resume / CV"],
  ["offerDocument", "Offer Letter"],
  ["appointmentDocument", "Appointment Letter"],
  ["otherDocument", "Other Documents"],
];
const PROFILE_SECTIONS = [
  {
    title: "1. Personal & Contact Information",
    icon: Users,
    fields: [
      ["id", "Employee ID", "readonly"],
      ["name", "Full Name", "text", true],
      ["dob", "Date of Birth", "date"],
      ["gender", "Gender", "select", false, ["", "Female", "Male", "Non-binary", "Prefer not to say"]],
      ["personalEmail", "Personal Email", "email"],
      ["email", "Work / Official Email", "email", true],
      ["phone", "Contact Number", "phone", true],
      ["emergencyContact", "Emergency Contact", "phone"],
      ["maritalStatus", "Marital Status", "select", false, ["", "Single", "Married", "Divorced", "Widowed"]],
      ["education", "Education", "text"],
    ],
  },
  {
    title: "2. Employment & Organizational Details",
    icon: Briefcase,
    fields: [
      ["dept", "Department", "select", true, PROFILE_DEPARTMENTS],
      ["desig", "Designation / Position", "text", true],
      ["employmentType", "Employment Type", "select", false, ["", "Full-time", "Part-time", "Contract", "Intern"]],
      ["employeeStatus", "Employee Status", "select", false, ["Active", "On Leave", "Probation", "Inactive"]],
      ["manager", "Reporting Manager", "text"],
      ["workLocation", "Work Location", "text"],
      ["probationPeriod", "Probation Period", "text"],
      ["noticePeriod", "Notice Period", "text"],
      ["joined", "Date of Joining", "date", true],
      ["resignationDate", "Resignation Date", "date"],
      ["exEmployee", "Ex-Employee", "select", false, ["No", "Yes"]],
      ["state", "State", "text"],
      ["branch", "Branch", "text"],
      ["branchCode", "Branch Code", "text"],
    ],
  },
  {
    title: "3. Identity & KYC Details",
    icon: CreditCard,
    fields: [
      ["panNumber", "PAN Card Number (10 characters)", "pan"],
      ["aadhaarNumber", "Aadhaar Card Number (12 digits)", "aadhaar"],
    ],
  },
  {
    title: "4. Bank Account Details",
    icon: Wallet,
    fields: [
      ["bankName", "Bank Name", "text"],
      ["accountNumber", "Account Number", "text"],
      ["ifscCode", "IFSC Code", "ifsc"],
      ["bankBranch", "Bank Branch", "text"],
      ["accountHolder", "Account Holder Name", "text"],
    ],
  },
  {
    title: "5. Salary & Compensation Details",
    icon: Wallet,
    fields: [
      ["previewMonth", "Salary Month", "select", false, ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]],
      ["previewYear", "Salary Year", "select", false, Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - 2 + i))],
      ["leaveDaysThisMonth", "Leave Days This Month", "number"],
      ["unpaidLeaveDays", "Unpaid Leave Days (First Day Paid)", "number"],
      ["salary", "Basic Salary (₹)", "money"],
      ["oneDayBasicSalary", "One-Day Basic Salary (whole rupees)", "calculated"],
      ["grossSalary", "Gross Salary (₹)", "calculated"],
      ["unpaidLeaveCalculation", "Unpaid Leave Calculation", "calculated"],
      ["currentMonthLeaveDeduction", "Current Month Leave Deduction", "calculated"],
      ["joiningExitDateDeduction", "Joining / Exit Date Deduction", "calculated"],
      ["netSalary", "Net Take-Home Salary (₹)", "calculated"],
    ],
  },
  {
    title: "6. Address & Profile Photo",
    icon: UserCircle,
    fields: [
      ["address", "Full Address", "textarea"],
      ["photo", "Profile Photo", "photo"],
    ],
  },
];
const PROFILE_DEFAULTS = {
  dob: "", gender: "", personalEmail: "", emergencyContact: "", maritalStatus: "", education: "",
  employmentType: "", employeeStatus: "Active", manager: "", workLocation: "", probationPeriod: "",
  noticePeriod: "", resignationDate: "", exEmployee: "No", state: "", branch: "Ajmer", branchCode: "CORP0001",
  panNumber: "", aadhaarNumber: "", bankName: "", accountNumber: "", ifscCode: "", bankBranch: "",
  accountHolder: "", previewMonth: new Date().toLocaleString("en-US", { month: "long" }),
  previewYear: String(new Date().getFullYear()), leaveDaysThisMonth: "0", unpaidLeaveDays: "0",
  currentMonthLeaveDeduction: "0", address: "", photo: "",
};
const PROFILE_NUMBER_FIELDS = [
  "salary", "leaveDaysThisMonth", "unpaidLeaveDays",
];
const employeeProfile = (employee) => ({ ...PROFILE_DEFAULTS, ...employee, documents: employee.documents || {} });
const profileTotals = (employee) => {
  const amount = (key) => Math.max(0, Number(employee[key]) || 0);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthIndex = months.indexOf(employee.previewMonth);
  const month = monthIndex >= 0 ? monthIndex : new Date().getMonth();
  const year = Number(employee.previewYear) || new Date().getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const oneDayBasicSalary = Math.floor(amount("salary") / daysInMonth);
  const unpaid = oneDayBasicSalary * amount("unpaidLeaveDays");
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const employedStart = employee.joined && employee.joined > monthStart ? employee.joined : monthStart;
  const employedEnd = employee.resignationDate && employee.resignationDate < monthEnd ? employee.resignationDate : monthEnd;
  const dayNumber = (date) => {
    const [dateYear, dateMonth, dateDay] = date.split("-").map(Number);
    return Date.UTC(dateYear, dateMonth - 1, dateDay) / 86400000;
  };
  const employedDays = employedStart <= employedEnd
    ? dayNumber(employedEnd) - dayNumber(employedStart) + 1
    : 0;
  const joiningExitDateDeduction = oneDayBasicSalary * (daysInMonth - employedDays);
  const currentMonthLeaveDeduction = unpaid + joiningExitDateDeduction;
  const gross = amount("salary");
  return {
    oneDayBasicSalary,
    grossSalary: gross,
    unpaidLeaveCalculation: unpaid,
    currentMonthLeaveDeduction,
    joiningExitDateDeduction,
    netSalary: Math.max(0, gross - currentMonthLeaveDeduction),
  };
};
const readUploadedFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read this file."));
  reader.onerror = () => reject(new Error("Unable to read this file."));
  reader.readAsDataURL(file);
});

function ProfileSection({ section, employee, editing, onChange, onFile, fileErrors = {} }) {
  const totals = profileTotals(employee);
  const calculatedText = (key, value) => {
    if (key === "oneDayBasicSalary") return String(value);
    if (key === "unpaidLeaveCalculation") {
      return `${totals.oneDayBasicSalary} × ${Number(employee.unpaidLeaveDays) || 0} days = ${Number(value).toFixed(2)}`;
    }
    return inr(value);
  };
  return (
    <section className="hr-employee-section">
      <h3><section.icon size={16} /> {section.title}</h3>
      <div className="hr-employee-fields">
        {section.fields.map(([key, label, kind, required, options]) => {
          const value = totals[key] ?? employee[key] ?? "";
          const isRequired = editing && !!required;
          const props = {
            value: value ?? "",
            onChange: (event) => onChange(key, event.target.value),
            required: isRequired,
          };
          let control;
          if (kind === "select") {
            control = <select {...props}>{options.map((option) => <option key={option || "empty"} value={option}>{option || "Select an option"}</option>)}</select>;
          } else if (kind === "textarea") {
            control = editing
              ? <textarea {...props} rows={3} />
              : <span className="hr-employee-value">{value || "—"}</span>;
          } else if (kind === "photo") {
            control = editing ? (
              <div className="hr-profile-photo-editor">
                {employee.photo
                  ? <img className="hr-profile-photo-large" src={employee.photo} alt={`${employee.name} profile`} />
                  : <div className="hr-profile-photo-large hr-profile-placeholder"><UserCircle size={36} /></div>}
                <input type="file" accept="image/*" required={isRequired} aria-label="Upload profile photo" onChange={(event) => onFile(event, key, true)} />
                {fileErrors[key] && <small className="hr-form-error" role="alert">{fileErrors[key]}</small>}
              </div>
            ) : employee.photo
              ? <img className="hr-profile-photo-large" src={employee.photo} alt={`${employee.name} profile`} />
              : <span className="hr-employee-value">No profile photo uploaded</span>;
          } else if (kind === "readonly" || kind === "calculated") {
            control = editing
              ? <input {...props} value={calculatedText(key, value)} readOnly />
              : <span className="hr-employee-value">{kind === "calculated" ? calculatedText(key, value) : value || "—"}</span>;
          } else if (editing) {
            const inputType = kind === "date" ? "date" : kind === "email" ? "email" : kind === "phone" ? "tel" : kind === "number" || kind === "money" ? "number" : "text";
            const pattern = kind === "phone" ? "[0-9]{10}" : kind === "pan" ? "[A-Za-z]{5}[0-9]{4}[A-Za-z]" : kind === "aadhaar" ? "[0-9]{12}" : kind === "ifsc" ? "[A-Za-z]{4}0[A-Za-z0-9]{6}" : key === "accountNumber" ? "[0-9]{1,16}" : undefined;
            control = <input
              {...props}
              type={inputType}
              inputMode={kind === "phone" || kind === "aadhaar" || key === "accountNumber" ? "numeric" : undefined}
              pattern={pattern}
              maxLength={kind === "phone" ? 10 : kind === "pan" ? 10 : kind === "aadhaar" ? 12 : key === "accountNumber" ? 16 : undefined}
              min={kind === "number" || kind === "money" ? 0 : undefined}
              step={kind === "money" ? "0.01" : kind === "number" ? "1" : undefined}
              placeholder={kind === "pan" ? "ABCDE1234F" : kind === "aadhaar" ? "12-digit Aadhaar number" : kind === "ifsc" ? "ABCD0123456" : key === "accountNumber" ? "Up to 16 digits" : undefined}
              title={kind === "phone" ? "Enter a 10-digit phone number." : kind === "pan" ? "Enter a valid 10-character PAN." : kind === "aadhaar" ? "Enter a 12-digit Aadhaar number." : kind === "ifsc" ? "Enter a valid IFSC code." : key === "accountNumber" ? "Enter an account number of up to 16 digits." : undefined}
              readOnly={kind === "calculated"}
            />;
          } else {
            control = <span className="hr-employee-value">{(kind === "money" ? inr(value) : value) || "—"}</span>;
          }
          return <F key={key} className={kind === "textarea" || (kind === "photo" && employee.photo) ? "hr-employee-wide" : ""} l={<>{label}{isRequired ? " *" : ""}</>}>{control}</F>;
        })}
      </div>
    </section>
  );
}

function EmployeeProfileEditor({ employee, onBack, onSave }) {
  const [form, setForm] = useState(() => employeeProfile(employee));
  const [fileErrors, setFileErrors] = useState({});
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const upload = async (event, key, isPhoto = false) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isPhoto && !file.type.startsWith("image/")) {
      setFileErrors((current) => ({ ...current, [key]: "Choose an image file." }));
      event.target.value = "";
      return;
    }
    if (!isPhoto && file.size > 512 * 1024) {
      setFileErrors((current) => ({ ...current, [key]: "Choose a document smaller than 512 KB." }));
      event.target.value = "";
      return;
    }
    event.target.value = "";
    try {
      const processed = isPhoto ? await compressImageFile(file) : file;
      const data = await readUploadedFile(processed);
      if (isPhoto) {
        change(key, data);
      } else {
        setForm((current) => ({ ...current, documents: { ...current.documents, [key]: { name: file.name, type: file.type, data } } }));
      }
      setFileErrors((current) => ({ ...current, [key]: "" }));
    } catch (error) {
      setFileErrors((current) => ({ ...current, [key]: error instanceof Error ? error.message : "Unable to process this file." }));
    }
  };
  const save = (event) => {
    event.preventDefault();
    if (Object.values(fileErrors).some(Boolean)) return;
    const next = { ...form };
    PROFILE_NUMBER_FIELDS.forEach((key) => { next[key] = Math.max(0, Number(next[key]) || 0); });
    next.salary = Number(next.salary) || 0;
    onSave({
      ...next,
      ...profileTotals(next),
      currentMonthLeaveDeduction: next.currentMonthLeaveDeduction,
    });
  };

  return (
    <div className="hr-employee-editor">
      <div className="hr-employee-editor-heading">
        <h2><Pencil size={19} /> Edit Employee Profile</h2>
        <button className="hr-ghost sm" type="button" onClick={onBack}><ChevronRight size={14} className="hr-back-icon" /> Back to Profiles</button>
      </div>
      <form onSubmit={save}>
        {PROFILE_SECTIONS.map((section) => (
          <ProfileSection key={section.title} section={section} employee={form} editing onChange={change} onFile={upload} fileErrors={fileErrors} />
        ))}
        <section className="hr-employee-section">
          <h3><FileText size={16} /> 7. Official Documents & Attachments</h3>
          <div className="hr-document-editor-grid">
            {PROFILE_DOCUMENTS.map(([key, label]) => (
              <F key={key} l={label}>
                <input type="file" aria-label={`Upload ${label}`} onChange={(event) => upload(event, key)} />
                {form.documents?.[key] && <small className="hr-uploaded-file">{form.documents[key].name} · Ready to save</small>}
                {fileErrors[key] && <small className="hr-form-error" role="alert">{fileErrors[key]}</small>}
              </F>
            ))}
          </div>
        </section>
        {Object.values(fileErrors).some(Boolean) && <p className="hr-form-error" role="alert">Resolve the file upload errors before saving.</p>}
        <div className="hr-employee-editor-actions">
          <button className="hr-ghost" type="button" onClick={onBack}>Back to Profiles</button>
          <button className="hr-btn" type="submit"><Check size={16} /> Update Employee Profile</button>
        </div>
      </form>
    </div>
  );
}

function EmployeeDetailsModal({ employee, onClose }) {
  const [preview, setPreview] = useState(null);
  const details = employeeProfile(employee);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <div className="hr-modal" role="presentation" onClick={onClose}>
      <section className="hr-card hr-employee-detail-modal" role="dialog" aria-modal="true" aria-labelledby="hr-employee-detail-title" onClick={(event) => event.stopPropagation()}>
        <header className="hr-employee-detail-heading">
          <h2 id="hr-employee-detail-title"><Users size={17} /> Employee Details</h2>
          <button type="button" aria-label="Close employee details" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="hr-employee-detail-content">
          <div className="hr-employee-detail-profile">
            {details.photo ? <img className="hr-profile-photo-large" src={details.photo} alt={`${details.name} profile`} /> : <div className="hr-profile-photo-large hr-profile-placeholder"><UserCircle size={38} /></div>}
            <div><h3>{details.name}</h3><p>{details.desig || "Employee"} | {details.dept}</p></div>
          </div>
          {PROFILE_SECTIONS.map((section) => (
            <ProfileSection key={section.title} section={section} employee={details} editing={false} />
          ))}
          <section className="hr-employee-section">
            <h3><FileText size={16} /> 7. Official Documents & Attachments</h3>
            <div className="hr-document-list">
              {PROFILE_DOCUMENTS.map(([key, label]) => {
                const document = details.documents?.[key];
                return <div className="hr-document-row" key={key}>
                  <strong>{label}</strong>
                  {document?.data
                    ? <button className="hr-document-view" type="button" onClick={() => setPreview(preview?.key === key ? null : { ...document, key, label })}>
                      <Eye size={13} /> {preview?.key === key ? "Close preview" : "View Document"}
                    </button>
                    : <span className="hr-document-missing">Not Uploaded</span>}
                </div>;
              })}
            </div>
            {preview && <div className="hr-document-preview">
              <div className="hr-document-preview-heading"><strong>{preview.label}: {preview.name}</strong><button type="button" onClick={() => setPreview(null)} aria-label="Close document preview"><X size={16} /></button></div>
              {preview.type?.startsWith("image/")
                ? <img src={preview.data} alt={preview.name} />
                : preview.type === "application/pdf"
                  ? <iframe title={preview.name} src={preview.data} />
                  : <p>This file type can be downloaded but not previewed here.</p>}
              <a className="hr-ghost sm" href={preview.data} download={preview.name}><Download size={14} /> Download document</a>
            </div>}
          </section>
        </div>
        <footer className="hr-employee-detail-footer"><button className="hr-ghost" type="button" onClick={onClose}>Close</button></footer>
      </section>
    </div>
  );
}

function EmpForm({ init = blank, onSave, label }) {
  const [f, setF] = useState(init);
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="hr-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...f, salary: +f.salary }); }}>
      <F l="Full name"><input required value={f.name} onChange={s("name")} /></F>
      <F l="Email"><input required type="email" value={f.email} onChange={s("email")} /></F>
      <F l="Phone"><input required pattern="[0-9]{10}" title="10 digit number" value={f.phone} onChange={s("phone")} /></F>
      <F l="Department"><select value={f.dept} onChange={s("dept")}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></F>
      <F l="Designation"><input required value={f.desig} onChange={s("desig")} /></F>
      <F l="Monthly salary (₹)"><input required type="number" min="0" value={f.salary} onChange={s("salary")} /></F>
      <F l="Joining date"><input required type="date" value={f.joined} onChange={s("joined")} /></F>
      <div className="hr-full"><button className="hr-btn" type="submit">{label}</button></div>
    </form>
  );
}
function CreateProfile({ c: { db, upd, go } }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    emergencyContact: "",
    maritalStatus: "",
    education: "",
    dept: "",
    desig: "",
    joined: "",
    photo: "",
    username: "",
    password: "",
    state: "",
    branch: "Ajmer",
    branchCode: "CORP0001",
    address: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [errors, setErrors] = useState({});
  const requiredFields = {
    name: "Enter the employee's full name.",
    email: "Enter an email address.",
    phone: "Enter a 10-digit contact number.",
    emergencyContact: "Enter a 10-digit emergency contact number.",
    dept: "Select a department.",
    desig: "Enter the employee's position.",
    joined: "Select a date of joining.",
    username: "Enter a username.",
    password: "Enter a password.",
    state: "Enter a state.",
    branch: "Enter a branch.",
    branchCode: "Enter a branch code.",
    address: "Enter the employee's address.",
  };
  const getFieldError = (key, value) => {
    if (requiredFields[key] && !value.trim()) return requiredFields[key];
    if (key === "email" && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return "Enter a valid email address.";
    }
    if (key === "phone" && value.trim() && !/^\d{10}$/.test(value.trim())) {
      return "Contact number must contain exactly 10 digits.";
    }
    if (key === "emergencyContact" && value.trim() && !/^\d{10}$/.test(value.trim())) {
      return "Emergency contact must contain exactly 10 digits.";
    }
    if (key === "password" && value.length > 0 && value.length < 6) {
      return "Password must be at least 6 characters.";
    }
    return "";
  };
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateField = (key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const message = getFieldError(key, value);
      return message ? { ...current, [key]: message } : Object.fromEntries(
        Object.entries(current).filter(([field]) => field !== key),
      );
    });
  };
  const validate = () => {
    const nextErrors = {};
    Object.keys(requiredFields).forEach((key) => {
      const message = getFieldError(key, form[key]);
      if (message) nextErrors[key] = message;
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const fieldError = (key) => errors[key] && (
    <small className="hr-form-error" id={`hr-profile-${key}-error`}>{errors[key]}</small>
  );
  const selectPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file.");
      event.target.value = "";
      return;
    }
    try {
      const compressedFile = await compressImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          setPhotoError("Unable to preview this image. Please choose another file.");
          return;
        }
        setForm((current) => ({ ...current, photo: reader.result }));
        setPhotoError("");
      };
      reader.onerror = () => setPhotoError("Unable to read this image. Please choose another file.");
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Unable to process this image. Please choose another file.");
    }
  };

  return (
    <Card title="Create employee profile">
      <form className="hr-form hr-profile-form" noValidate onSubmit={(event) => {
        event.preventDefault();
        if (!validate()) return;
        const profile = { ...form };
        [...Object.keys(requiredFields), "maritalStatus", "education"].forEach((key) => {
          profile[key] = profile[key].trim();
        });
        delete profile.password;
        upd((d) => ({
          emps: [...d.emps, {
            ...profile,
            salary: 20000,
            id: Math.max(0, ...d.emps.map((employee) => employee.id)) + 1,
            status: "active",
          }],
        }), `Created profile for ${form.name}`);
        go("Employee Profiles");
      }}>
        {Object.keys(errors).length > 0 && <p className="hr-form-error hr-profile-validation-summary" role="alert">Please correct the highlighted fields before creating the profile.</p>}
        <F l="Full Name *"><input required autoComplete="name" placeholder="Enter full name" value={form.name} onChange={updateField("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "hr-profile-name-error" : undefined} />{fieldError("name")}</F>
        <F l="Email *"><input required type="email" autoComplete="email" placeholder="example@email.com" value={form.email} onChange={updateField("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "hr-profile-email-error" : undefined} />{fieldError("email")}</F>
        <F l="Contact Number *"><input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} title="Enter a 10-digit phone number." autoComplete="tel" placeholder="Enter 10-digit phone number" value={form.phone} onChange={updateField("phone")} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "hr-profile-phone-error" : undefined} />{fieldError("phone")}</F>
        <F l="Emergency Contact *"><input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} title="Enter a 10-digit phone number." placeholder="Enter 10-digit emergency number" value={form.emergencyContact} onChange={updateField("emergencyContact")} aria-invalid={!!errors.emergencyContact} aria-describedby={errors.emergencyContact ? "hr-profile-emergencyContact-error" : undefined} />{fieldError("emergencyContact")}</F>
        <F l="Marital Status"><select value={form.maritalStatus} onChange={set("maritalStatus")}><option value="">Select status (Optional)</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select></F>
        <F l="Education"><input placeholder="e.g. B.Tech, MBA, MCA (Optional)" value={form.education} onChange={set("education")} /></F>
        <F l="Department *"><select required value={form.dept} onChange={updateField("dept")} aria-invalid={!!errors.dept} aria-describedby={errors.dept ? "hr-profile-dept-error" : undefined}><option value="">Select department</option>{DEPTS.map((department) => <option key={department}>{department}</option>)}</select>{fieldError("dept")}</F>
        <F l="Position *"><input required placeholder="e.g. Manager, Executive" value={form.desig} onChange={updateField("desig")} aria-invalid={!!errors.desig} aria-describedby={errors.desig ? "hr-profile-desig-error" : undefined} />{fieldError("desig")}</F>
        <F l="Date of Joining *"><input required type="date" value={form.joined} onChange={updateField("joined")} aria-invalid={!!errors.joined} aria-describedby={errors.joined ? "hr-profile-joined-error" : undefined} />{fieldError("joined")}</F>
        <F l="Profile Photo">
          <div className="hr-photo-control">
            <input type="file" accept="image/*" onChange={selectPhoto} aria-label="Choose profile photo" />
            {form.photo && <img className="hr-photo-preview" src={form.photo} alt="Selected profile preview" />}
          </div>
          {photoError && <small className="hr-form-error" role="alert">{photoError}</small>}
        </F>
        <F l="Username *"><input required autoComplete="username" placeholder="Enter new username" value={form.username} onChange={updateField("username")} aria-invalid={!!errors.username} aria-describedby={errors.username ? "hr-profile-username-error" : undefined} />{fieldError("username")}</F>
        <F l="Password *">
          <div className="hr-password-control">
            <input required type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} aria-describedby={errors.password ? "hr-profile-password-error" : "hr-password-hint"} placeholder="Enter new password (min 6 characters)" value={form.password} onChange={updateField("password")} aria-invalid={!!errors.password} />
            <button className="hr-password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password ? fieldError("password") : <small id="hr-password-hint">Minimum 6 characters required.</small>}
        </F>
        <div className="hr-profile-triple">
          <F l="State *"><input required autoComplete="address-level1" placeholder="Enter state" value={form.state} onChange={updateField("state")} aria-invalid={!!errors.state} aria-describedby={errors.state ? "hr-profile-state-error" : undefined} />{fieldError("state")}</F>
          <F l="Branch *"><input required value={form.branch} onChange={updateField("branch")} aria-invalid={!!errors.branch} aria-describedby={errors.branch ? "hr-profile-branch-error" : undefined} />{fieldError("branch")}</F>
          <F l="Branch Code *"><input required value={form.branchCode} onChange={updateField("branchCode")} aria-invalid={!!errors.branchCode} aria-describedby={errors.branchCode ? "hr-profile-branchCode-error" : undefined} />{fieldError("branchCode")}</F>
        </div>
        <F l="Address *"><textarea required autoComplete="street-address" placeholder="Enter complete address" value={form.address} onChange={updateField("address")} aria-invalid={!!errors.address} aria-describedby={errors.address ? "hr-profile-address-error" : undefined} />{fieldError("address")}</F>
        <div className="hr-full hr-form-actions"><button className="hr-btn" type="submit">Create profile</button></div>
      </form>
    </Card>
  );
}
function EmpList({ c: { db, upd, go }, cards, setId }) {
  const [q, setQ] = useState(""); const [dept, setDept] = useState("All"); const [edit, setEdit] = useState(null); const [view, setView] = useState(null);
  const departments = ["HR", "Operations", "Sales", "IT"];
  const search = q.trim().toLowerCase();
  const rows = act(db).filter((e) => (dept === "All" || e.dept === dept)
    && `${e.name} ${e.id} ${e.email} ${e.dept} ${e.desig} ${e.phone}`.toLowerCase().includes(search));
  const groups = dept === "All"
    ? [...departments, ...new Set(rows.map((e) => e.dept).filter((name) => !departments.includes(name)))].map((name) => [name, rows.filter((e) => e.dept === name)]).filter(([, employees]) => employees.length)
    : [[dept, rows]];
  const remove = (employee) => {
    if (employee.id === 1) return;
    if (window.confirm(`Delete ${employee.name}'s profile? This cannot be undone.`)) {
      upd((d) => ({ emps: d.emps.filter((x) => x.id !== employee.id) }), `Deleted profile for ${employee.name}`);
    }
  };
  const acts = (e) => cards ? (
    <div className="hr-profile-actions">
      <button className="hr-employee-action view" onClick={() => setView(e)}><Eye size={14} /> View</button>
      <button className="hr-employee-action edit" onClick={() => setEdit(e)}><Pencil size={14} /> Edit</button>
      <button className="hr-employee-action delete" disabled={e.id === 1} onClick={() => remove(e)}><Trash2 size={14} /> Delete</button>
    </div>
  ) : (
    <div className="hr-mini">
      <button onClick={() => setEdit(e)}>Edit</button>
      <button onClick={() => { setId(e.id); go("ID Card"); }}>ID card</button>
      <button className="bad" disabled={e.id === 1} onClick={() => window.confirm(`Move ${e.name} to ex-employees?`) && upd((d) => ({ emps: d.emps.map((x) => (x.id === e.id ? { ...x, status: "ex", left: TODAY } : x)) }), `${e.name} moved to ex-employees`)}>Remove</button>
    </div>
  );
  if (cards && edit) {
    return <EmployeeProfileEditor
      employee={edit}
      onBack={() => setEdit(null)}
      onSave={(profile) => {
        upd((d) => ({ emps: d.emps.map((x) => (x.id === edit.id ? {
          ...x,
          ...profile,
          status: profile.exEmployee === "Yes" ? "ex" : "active",
          ...(profile.exEmployee === "Yes" ? { left: profile.resignationDate || TODAY } : {}),
        } : x)) }), `Updated ${profile.name}`);
        setEdit(null);
      }}
    />;
  }
  return (<>
    {cards ? <>
      <div className="hr-profile-toolbar">
        <div className="hr-department-tabs" role="group" aria-label="Filter employees by department">
          {["All", ...departments].map((name) => <button key={name} type="button" className={`hr-department-tab${dept === name ? " is-active" : ""}`} aria-pressed={dept === name} onClick={() => setDept(name)}>{name}</button>)}
        </div>
        <label className="hr-profile-search"><Search size={16} /><input type="search" placeholder="Search Employee..." aria-label="Search employees" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <span className="hr-count">{rows.length} {rows.length === 1 ? "employee" : "employees"}</span>
      </div>
      {rows.length ? groups.map(([name, employees]) => (
        <section className="hr-department-section" key={name} aria-labelledby={`hr-department-${name}`}>
          <h2 className="hr-department-heading" id={`hr-department-${name}`}>{name}</h2>
          <div className="hr-profile-cards">{employees.map((e) => (
            <article className="hr-card hr-profile-card" key={e.id}>
              {e.photo ? <img className="hr-profile-avatar" src={e.photo} alt={`${e.name} profile`} /> : <div className="hr-profile-avatar hr-profile-placeholder" aria-hidden="true"><UserCircle size={38} /></div>}
              <strong className="hr-profile-name">{e.name}</strong>
              <span className="hr-profile-id">ID: {e.id}</span>
              <span className="hr-profile-department">Department: {e.dept}</span>
              {acts(e)}
            </article>
          ))}</div>
        </section>
      )) : <Empty t="No employees match your search." />}
    </> : <>
      <div className="hr-tools">
        <label className="hr-sbox"><Search size={16} /><input placeholder="Search name, email, phone..." value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <select value={dept} onChange={(e) => setDept(e.target.value)}>{["All", ...DEPTS].map((d) => <option key={d}>{d}</option>)}</select>
        <span className="hr-count">{rows.length} employees</span>
      </div>
      {rows.length ? <Card><Table rows={rows} cols={[
        ["ID", (e) => `ST-${String(e.id).padStart(4, "0")}`], ["Name", (e) => <b>{e.name}</b>], ["Department", (e) => e.dept], ["Designation", (e) => e.desig],
        ["Phone", (e) => e.phone], ["Salary", (e) => inr(e.salary)], ["Joined", (e) => e.joined], ["", acts]]} /></Card> : <Empty t="No employees match your search." />}
    </>}
    {edit && !cards && <Modal onClose={() => setEdit(null)}><h3>Edit {edit.name}</h3>
      <EmpForm init={edit} label="Save changes" onSave={(f) => { upd((d) => ({ emps: d.emps.map((x) => (x.id === edit.id ? { ...x, ...f } : x)) }), `Updated ${f.name}`); setEdit(null); }} /></Modal>}
    {view && <EmployeeDetailsModal employee={view} onClose={() => setView(null)} />}
  </>);
}
function ExEmployees({ c: { db, upd } }) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);
  const departments = ["HR", "Operations", "Sales", "IT"];
  const search = q.trim().toLowerCase();
  const rows = db.emps.filter((e) => e.status === "ex"
    && (dept === "All" || e.dept === dept)
    && `${e.name} ${e.id} ${e.email} ${e.dept} ${e.desig} ${e.phone} ${e.left || ""}`.toLowerCase().includes(search));
  const groups = dept === "All"
    ? [...departments, ...new Set(rows.map((e) => e.dept).filter((name) => !departments.includes(name)))].map((name) => [name, rows.filter((e) => e.dept === name)]).filter(([, employees]) => employees.length)
    : [[dept, rows]];
  const restore = (employee) => upd((d) => ({
    emps: d.emps.map((e) => (e.id === employee.id ? { ...e, status: "active", exEmployee: "No", employeeStatus: "Active" } : e)),
  }), `Restored ${employee.name}`);
  const remove = (employee) => {
    if (window.confirm(`Permanently delete ${employee.name}'s profile? This cannot be undone.`)) {
      upd((d) => ({ emps: d.emps.filter((e) => e.id !== employee.id) }), `Deleted ${employee.name}`);
    }
  };

  if (edit) {
    return <EmployeeProfileEditor
      employee={edit.exEmployee === "Yes" ? edit : { ...edit, exEmployee: "Yes" }}
      onBack={() => setEdit(null)}
      onSave={(profile) => {
        upd((d) => ({ emps: d.emps.map((e) => (e.id === edit.id ? {
          ...e,
          ...profile,
          status: profile.exEmployee === "Yes" ? "ex" : "active",
          ...(profile.exEmployee === "Yes" ? { left: profile.resignationDate || e.left || TODAY } : {}),
        } : e)) }), `Updated ${profile.name}`);
        setEdit(null);
      }}
    />;
  }

  return (<>
    <div className="hr-profile-toolbar">
      <div className="hr-department-tabs" role="group" aria-label="Filter ex-employees by department">
        {["All", ...departments].map((name) => <button key={name} type="button" className={`hr-department-tab${dept === name ? " is-active" : ""}`} aria-pressed={dept === name} onClick={() => setDept(name)}>{name}</button>)}
      </div>
      <label className="hr-profile-search"><Search size={16} /><input type="search" placeholder="Search Ex-Employee..." aria-label="Search ex-employees" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <span className="hr-count">{rows.length} {rows.length === 1 ? "ex-employee" : "ex-employees"}</span>
    </div>
    {rows.length ? groups.map(([name, employees]) => (
      <section className="hr-department-section" key={name} aria-labelledby={`hr-ex-department-${name}`}>
        <h2 className="hr-department-heading" id={`hr-ex-department-${name}`}>{name}</h2>
        <div className="hr-profile-cards">{employees.map((e) => (
          <article className="hr-card hr-profile-card" key={e.id}>
            {e.photo ? <img className="hr-profile-avatar" src={e.photo} alt={`${e.name} profile`} /> : <div className="hr-profile-avatar hr-profile-placeholder" aria-hidden="true"><UserCircle size={38} /></div>}
            <strong className="hr-profile-name">{e.name}</strong>
            <span className="hr-profile-id">ID: {e.id}</span>
            <span className="hr-profile-department">Department: {e.dept}</span>
            <span className="hr-profile-id">Last day: {e.left || e.resignationDate || "Not recorded"}</span>
            <div className="hr-profile-actions">
              <button className="hr-employee-action view" onClick={() => setView(e)}><Eye size={14} /> View</button>
              <button className="hr-employee-action edit" onClick={() => setEdit(e)}><Pencil size={14} /> Edit</button>
              <button className="hr-employee-action restore" onClick={() => restore(e)}><UserCheck size={14} /> Restore</button>
              <button className="hr-employee-action delete" onClick={() => remove(e)}><Trash2 size={14} /> Delete</button>
            </div>
          </article>
        ))}</div>
      </section>
    )) : <Empty t="No ex-employees match your search. Employees moved from Employee Profiles will appear here." />}
    {view && <EmployeeDetailsModal employee={view} onClose={() => setView(null)} />}
  </>);
}
function AllEmployees({ c: { db } }) {
  const [q, setQ] = useState("");
  const [view, setView] = useState(null);
  const search = q.trim().toLowerCase();
  const rows = db.emps.filter((employee) => (
    `${employee.id} ${employee.name} ${employee.username || ""} ${employee.email} ${employee.phone} ${employee.dept} ${employee.status}`.toLowerCase().includes(search)
  ));

  return (<>
    <Card title="Users Record" right={<span className="hr-count">{rows.length} {rows.length === 1 ? "employee" : "employees"}</span>}>
      <div className="hr-tools">
        <label className="hr-sbox"><Search size={16} /><input type="search" placeholder="Search employees..." aria-label="Search all employees" value={q} onChange={(event) => setQ(event.target.value)} /></label>
      </div>
      <Table rows={rows} empty="No employees match your search." cols={[
        ["S.N", (_employee, index) => index + 1],
        ["Name", (employee) => <>{employee.name} <span className={`hr-b ${employee.status === "ex" ? "warn" : "ok"}`}>{employee.status === "ex" ? "Ex" : "Current"}</span></>],
        ["Username", (employee) => employee.username || "—"],
        ["Email", (employee) => employee.email || "—"],
        ["Contact", (employee) => employee.phone || "—"],
        ["Department", (employee) => employee.dept || "—"],
        ["Actions", (employee) => <button className="hr-employee-action view" type="button" onClick={() => setView(employee)}><Eye size={14} /> View</button>],
      ]} />
    </Card>
    {view && <EmployeeDetailsModal employee={view} onClose={() => setView(null)} />}
  </>);
}
function SalaryReport({ c: { db } }) {
  const initialFilters = { month: MONTH, department: "All", query: "" };
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const filteredRows = act(db).filter((employee) => (
    (appliedFilters.department === "All" || employee.dept === appliedFilters.department)
    && `${employee.id} ${employee.name} ${employee.dept} ${employee.desig} ${employee.bankName || ""} ${employee.accountNumber || ""} ${employee.ifscCode || ""}`.toLowerCase().includes(appliedFilters.query.trim().toLowerCase())
  ));
  const reportMonth = appliedFilters.month || MONTH;
  const [year, month] = reportMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthPrefix = `${reportMonth}-`;
  const holidays = Array.from({ length: daysInMonth }, (_, index) => new Date(year, month - 1, index + 1))
    .filter((date) => date.getDay() === 0).length;
  const rows = filteredRows.map((employee) => {
    const attendance = Object.entries(db.att).filter(([key]) => key.startsWith(monthPrefix) && key.endsWith(`|${employee.id}`)).map(([, status]) => status);
    const present = attendance.filter((status) => status === "Present").length;
    const leaveDays = attendance.filter((status) => status === "Leave").length;
    const absences = attendance.filter((status) => status === "Absent").length;
    const unpaidLeaveDays = Math.max(0, Number(employee.unpaidLeaveDays) || 0, absences);
    const payableDays = Math.max(0, daysInMonth - unpaidLeaveDays);
    const baseSalary = Math.max(0, Number(employee.salary) || 0);
    const hrm = Math.max(0, Number(employee.hrm) || 0);
    const otherAllowance = Math.max(0, Number(employee.otherAllowance) || 0);
    const bonus = Math.max(0, Number(employee.bonus) || 0);
    const incentive = Math.max(0, Number(employee.incentive) || 0);
    const gross = baseSalary + hrm + otherAllowance + bonus + incentive;
    const leaveDeduction = Math.round((baseSalary / 30) * unpaidLeaveDays * 100) / 100
      + Math.max(0, Number(employee.currentMonthLeaveDeduction) || 0);
    const pf = Math.max(0, Number(employee.pf) || 0);
    const tax = Math.max(0, Number(employee.taxDeduction) || 0);
    const deductions = pf + tax + leaveDeduction;
    return {
      ...employee,
      present,
      leaveDays,
      holidayDays: holidays,
      payableDays,
      daysInMonth,
      baseSalary,
      hrm,
      otherAllowance,
      bonus,
      incentive,
      gross,
      pf,
      tax,
      deductions,
      net: Math.max(0, gross - deductions),
    };
  });
  const totalNet = rows.reduce((total, row) => total + row.net, 0);
  const totalGross = rows.reduce((total, row) => total + row.gross, 0);
  const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const exportRows = rows.map((row, index) => ({
    "S.N": index + 1,
    "Employee ID": row.id,
    Name: row.name,
    Bank: row.bankName || "—",
    "A/C No": row.accountNumber || "—",
    IFSC: row.ifscCode || "—",
    "Basic Salary": row.baseSalary,
    Present: row.present,
    Leave: row.leaveDays,
    Holiday: row.holidayDays,
    Payable: `${row.payableDays} / ${row.daysInMonth}`,
    Bonus: row.bonus,
    Incentive: row.incentive,
    Allowances: row.hrm + row.otherAllowance,
    Deductions: row.deductions,
    "Net Payable": row.net,
  }));
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), "Salary Report");
    XLSX.writeFile(workbook, `salary-report-${reportMonth}.xlsx`);
  };
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    pdf.setFontSize(16);
    pdf.text(`Salary Report · ${reportMonth}`, 32, 32);
    pdf.setFontSize(9);
    pdf.text(`${rows.length} employee records · Gross ${money(totalGross)} · Net payable ${money(totalNet)}`, 32, 48);
    autoTable(pdf, {
      startY: 60,
      head: [["S.N", "Emp ID", "Name", "Bank", "A/C No", "IFSC", "Basic", "Present", "Leave", "Holiday", "Payable", "Bonus", "Incentive", "Allowances", "Deductions", "Net Payable"]],
      body: exportRows.map((row) => Object.values(row)),
      styles: { fontSize: 7, cellPadding: 4 },
      headStyles: { fillColor: [141, 94, 56] },
      margin: { left: 32, right: 32 },
    });
    pdf.save(`salary-report-${reportMonth}.pdf`);
  };
  const reset = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  return (
    <div className="hr-salary-report">
      <section className="hr-card hr-box hr-salary-filter-panel">
        <div className="hr-salary-filter-grid">
          <label className="hr-f"><span>Month</span><input type="month" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))} /></label>
          <label className="hr-f"><span>Department</span><select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>{["All", ...DEPTS].map((department) => <option key={department}>{department}</option>)}</select></label>
          <label className="hr-f hr-salary-search"><span>Search employees</span><div className="hr-sbox"><Search size={16} /><input type="search" placeholder="Name, ID, bank..." value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} /></div></label>
        </div>
        <div className="hr-salary-filter-actions">
          <div><button type="button" className="hr-ghost" onClick={() => setAppliedFilters({ ...filters })}><Filter size={15} /> Apply filters</button><button type="button" className="hr-ghost" onClick={reset}><RotateCcw size={15} /> Reset</button></div>
          <div><button type="button" className="hr-ghost" onClick={exportExcel}><FileSpreadsheet size={15} /> Export to Excel</button><button type="button" className="hr-ghost" onClick={exportPdf}><FileText size={15} /> Export to PDF</button></div>
        </div>
      </section>
      <Card title="Salary report" right={<span className="hr-count">{rows.length} employees · {reportMonth}</span>}>
        {rows.length ? <div className="hr-tw hr-salary-table-wrap" tabIndex={0} role="region" aria-label="Salary report table, scroll to see all columns and employees"><table className="hr-t hr-salary-table">
          <thead><tr>{["S.N", "Emp ID", "Name", "Bank", "A/C No", "IFSC", "Basic salary", "Present", "Leave", "Holiday", "Payable", "Bonus", "Incentive", "Allowances", "Deductions", "Net payable"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.id}>
            <td>{index + 1}</td><td>{row.id}</td><td className="hr-salary-name">{row.name}</td>
            <td>{row.bankName || "—"}</td><td>{row.accountNumber || "—"}</td><td>{row.ifscCode || "—"}</td>
            <td>{money(row.baseSalary)}</td><td className="hr-salary-present">{row.present} days</td>
            <td className="hr-salary-leave">{row.leaveDays} days</td><td className="hr-salary-holiday">{row.holidayDays} days</td>
            <td>{row.payableDays} / {row.daysInMonth}</td><td>{money(row.bonus)}</td><td>{money(row.incentive)}</td>
            <td>{money(row.hrm + row.otherAllowance)}</td><td>{money(row.deductions)}</td><td className="hr-salary-net">{money(row.net)}</td>
          </tr>)}</tbody>
        </table></div> : <Empty t="No employees match these salary report filters." />}
        {rows.length > 0 && <div className="hr-salary-total"><span>Totals for {rows.length} employees</span><strong>Gross {money(totalGross)}</strong><strong>Net payable {money(totalNet)}</strong></div>}
      </Card>
    </div>
  );
}
function IDCard({ c: { db, upd } }) {
  const me = db.me || { company: "System Technologies", branch: "Ajmer" };
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const search = query.trim().toLowerCase();
  const employees = db.emps.filter((employee) => (
    !(db.deletedIdCardIds || []).includes(employee.id)
    && `${employee.id} ${employee.name} ${employee.phone} ${employee.dept} ${employee.desig} ${employee.joined}`.toLowerCase().includes(search)
  ));
  const download = (employee) => {
    const pdf = new jsPDF({ unit: "pt", format: [360, 600] });
    const width = 360;
    pdf.setFillColor(250, 248, 245);
    pdf.roundedRect(12, 12, 336, 576, 18, 18, "F");
    pdf.setFillColor(20, 22, 24);
    pdf.roundedRect(12, 12, 336, 132, 18, 18, "F");
    pdf.rect(12, 120, 336, 24, "F");
    pdf.setFillColor(141, 94, 56);
    pdf.rect(12, 140, 336, 5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(String(me.company || "System Technologies").toUpperCase(), width / 2, 52, { align: "center", maxWidth: 290 });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("EMPLOYEE IDENTIFICATION CARD", width / 2, 72, { align: "center" });
    if (employee.photo?.startsWith("data:image/png") || employee.photo?.startsWith("data:image/jpeg")) {
      const imageFormat = employee.photo.startsWith("data:image/png") ? "PNG" : "JPEG";
      pdf.addImage(employee.photo, imageFormat, 125, 160, 110, 110, undefined, "FAST");
    } else {
      pdf.setFillColor(238, 232, 225);
      pdf.circle(width / 2, 215, 55, "F");
      pdf.setTextColor(100, 80, 64);
      pdf.setFontSize(28);
      pdf.text(employee.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), width / 2, 224, { align: "center" });
    }
    pdf.setTextColor(31, 26, 23);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.text(employee.name, width / 2, 300, { align: "center", maxWidth: 300 });
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 93, 85);
    pdf.setFontSize(11);
    pdf.text(employee.desig || "Employee", width / 2, 322, { align: "center", maxWidth: 300 });
    pdf.setFontSize(10);
    const details = [
      ["EMPLOYEE ID", `ST-${String(employee.id).padStart(4, "0")}`],
      ["CONTACT", employee.phone || "—"],
      ["DEPARTMENT", employee.dept || "—"],
      ["BRANCH", employee.branch || me.branch || "—"],
      ["DATE OF JOINING", employee.joined || "—"],
    ];
    details.forEach(([label, value], index) => {
      const y = 370 + index * 36;
      pdf.setDrawColor(220, 212, 202);
      pdf.line(42, y - 15, 318, y - 15);
      pdf.setTextColor(103, 93, 85);
      pdf.text(label, 46, y);
      pdf.setTextColor(31, 26, 23);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(value), 314, y, { align: "right", maxWidth: 170 });
      pdf.setFont("helvetica", "normal");
    });
    pdf.setFillColor(100, 62, 35);
    pdf.roundedRect(105, 555, 150, 22, 11, 11, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.text(String(me.company || "System Technologies"), width / 2, 570, { align: "center", maxWidth: 140 });
    pdf.save(`employee-id-${employee.id}.pdf`);
  };
  const remove = (employee) => {
    if (window.confirm(`Delete only ${employee.name}'s ID card? Their employee profile and records will be kept.`)) {
      upd((data) => ({ deletedIdCardIds: [...new Set([...(data.deletedIdCardIds || []), employee.id])] }), `Deleted ${employee.name}'s ID card`);
      if (selected?.id === employee.id) setSelected(null);
    }
  };

  return (<>
    <Card title="ID Card List" right={<span className="hr-count">{employees.length} employees</span>}>
      <div className="hr-tools hr-id-card-toolbar">
        <label className="hr-sbox"><Search size={16} /><input type="search" placeholder="Search name, ID, department..." aria-label="Search ID cards" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      <Table rows={employees} empty="No ID cards match your search." cols={[
        ["Emp ID", (employee) => `ST-${String(employee.id).padStart(4, "0")}`],
        ["Name", (employee) => <span className="hr-id-list-name">{employee.name}<span className={`hr-b ${employee.status === "ex" ? "warn" : "ok"}`}>{employee.status === "ex" ? "Ex" : "Current"}</span></span>],
        ["Contact", (employee) => employee.phone || "—"],
        ["Department", (employee) => employee.dept || "—"],
        ["Position", (employee) => employee.desig || "—"],
        ["Date of joining", (employee) => employee.joined || "—"],
        ["Action", (employee) => <div className="hr-id-card-actions">
          <button className="hr-employee-action view" type="button" aria-label={`View ID card for ${employee.name}`} onClick={() => setSelected(employee)}><Eye size={15} /> View</button>
          <button className="hr-employee-action delete" type="button" aria-label={`Delete ID card for ${employee.name}`} onClick={() => remove(employee)}><Trash2 size={15} /> Delete ID</button>
        </div>],
      ]} />
    </Card>
    {selected && <div className="hr-modal hr-id-card-modal" role="presentation" onClick={() => setSelected(null)}>
      <section className="hr-card hr-id-card-dialog" role="dialog" aria-modal="true" aria-labelledby="hr-id-card-title" onClick={(event) => event.stopPropagation()}>
        <header className="hr-employee-detail-heading">
          <h2 id="hr-id-card-title"><CreditCard size={17} /> Employee ID Card</h2>
          <button type="button" aria-label="Close ID card preview" onClick={() => setSelected(null)}><X size={18} /></button>
        </header>
        <div className="hr-id-card-dialog-content">
          <article className="hr-id-card-preview">
            <div className="hr-id-card-brand"><div className="hr-id-card-logo">S/T</div><strong>{me.company || "System Technologies"}</strong><small>EMPLOYEE IDENTIFICATION</small></div>
            {selected.photo
              ? <img className="hr-id-card-photo" src={selected.photo} alt={`${selected.name} profile`} />
              : <div className="hr-id-card-photo hr-id-card-placeholder"><UserCircle size={54} /></div>}
            <h3>{selected.name}</h3>
            <span className="hr-id-card-designation">{selected.desig || "Employee"}</span>
            <dl>
              <dt>Employee ID</dt><dd>ST-{String(selected.id).padStart(4, "0")}</dd>
              <dt>Mobile</dt><dd>{selected.phone || "—"}</dd>
              <dt>Department</dt><dd>{selected.dept || "—"}</dd>
              <dt>Branch</dt><dd>{selected.branch || me.branch || "—"}</dd>
              <dt>Date of joining</dt><dd>{selected.joined || "—"}</dd>
            </dl>
            <footer>{me.company || "System Technologies"} · {me.branch || "Corporate Office"}</footer>
          </article>
        </div>
        <footer className="hr-id-card-dialog-actions">
          <button className="hr-ghost" type="button" onClick={() => setSelected(null)}>Close</button>
          <button className="hr-btn" type="button" onClick={() => download(selected)}><Download size={16} /> Download ID Card</button>
        </footer>
      </section>
    </div>}
  </>);
}
function Payroll({ c: { db, upd } }) {
  const [filters, setFilters] = useState({ query: "", month: MONTH });
  const [appliedFilters, setAppliedFilters] = useState({ query: "", month: MONTH });
  const [editor, setEditor] = useState(null);
  const [slip, setSlip] = useState(null);
  const selectedMonth = appliedFilters.month || MONTH;
  const activeEmployees = act(db);
  const savedPayrolls = db.payrolls || [];
  const amount = (value) => Math.max(0, Number(value) || 0);
  const calculatePayroll = (employee, month) => {
    const absences = Object.entries(db.att || {}).filter(([key, status]) => key.startsWith(`${month}-`) && key.endsWith(`|${employee.id}`) && status === "Absent").length;
    const salary = amount(employee.salary);
    const hra = amount(employee.hrm);
    const allowances = amount(employee.otherAllowance);
    const bonus = amount(employee.bonus);
    const incentive = amount(employee.incentive);
    const pf = amount(employee.pf);
    const tax = amount(employee.taxDeduction);
    const otherDeductions = amount(employee.currentMonthLeaveDeduction) + Math.round((salary / 30) * Math.max(absences, amount(employee.unpaidLeaveDays)) * 100) / 100;
    const gross = salary + hra + allowances + bonus + incentive;
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.dept,
      designation: employee.desig,
      month,
      salary,
      hra,
      allowances,
      bonus,
      incentive,
      pf,
      tax,
      otherDeductions,
      gross,
      net: Math.max(0, gross - pf - tax - otherDeductions),
    };
  };
  const monthPayrolls = savedPayrolls.filter((payroll) => payroll.month === selectedMonth);
  const existingEmployeeIds = new Set(monthPayrolls.map((payroll) => String(payroll.employeeId)));
  const draftPayrolls = activeEmployees
    .filter((employee) => !existingEmployeeIds.has(String(employee.id)))
    .map((employee) => ({ ...calculatePayroll(employee, selectedMonth), id: `draft-${employee.id}-${selectedMonth}`, isDraft: true }));
  const rows = [...monthPayrolls.filter((payroll) => !payroll.deleted), ...draftPayrolls]
    .filter((payroll) => `${payroll.employeeName} ${payroll.employeeId} ${payroll.department} ${payroll.month}`.toLowerCase().includes(appliedFilters.query.trim().toLowerCase()))
    .sort((a, b) => String(a.employeeName).localeCompare(String(b.employeeName)));
  const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const monthName = (value) => {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) return "Select month";
    return new Date(year, month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
  };
  const openAdd = () => {
    const employee = activeEmployees[0];
    if (!employee) return;
    setEditor({ mode: "add", form: calculatePayroll(employee, filters.month || MONTH) });
  };
  const openEdit = (payroll) => {
    const employee = activeEmployees.find((item) => String(item.id) === String(payroll.employeeId));
    setEditor({ mode: "edit", form: { ...(employee ? calculatePayroll(employee, payroll.month) : {}), ...payroll } });
  };
  const updateEditor = (key, value) => setEditor((current) => ({ ...current, form: { ...current.form, [key]: value } }));
  const setEmployee = (employeeId) => {
    const employee = activeEmployees.find((item) => String(item.id) === String(employeeId));
    if (employee) setEditor((current) => ({ ...current, form: { ...calculatePayroll(employee, current.form.month), employeeId: employee.id } }));
  };
  const submitPayroll = (event) => {
    event.preventDefault();
    const form = editor.form;
    const salary = amount(form.salary);
    const hra = amount(form.hra);
    const allowances = amount(form.allowances);
    const bonus = amount(form.bonus);
    const incentive = amount(form.incentive);
    const pf = amount(form.pf);
    const tax = amount(form.tax);
    const otherDeductions = amount(form.otherDeductions);
    const gross = salary + hra + allowances + bonus + incentive;
    const net = Math.max(0, gross - pf - tax - otherDeductions);
    const employee = activeEmployees.find((item) => String(item.id) === String(form.employeeId));
    const record = {
      ...form,
      employeeId: employee?.id || form.employeeId,
      employeeName: employee?.name || form.employeeName,
      department: employee?.dept || form.department,
      designation: employee?.desig || form.designation,
      salary, hra, allowances, bonus, incentive, pf, tax, otherDeductions, gross, net,
      updatedAt: new Date().toISOString(),
    };
    upd((data) => {
      const payrolls = data.payrolls || [];
      const original = editor.mode === "edit" && !form.isDraft
        ? payrolls.find((item) => item.id === form.id)
        : null;
      const matching = payrolls.find((item) => String(item.employeeId) === String(record.employeeId) && item.month === record.month);
      const id = original?.id ?? matching?.id ?? Math.max(0, ...payrolls.map((item) => Number(item.id) || 0)) + 1;
      const nextPayrolls = payrolls.filter((item) => (
        item.id !== original?.id
        && !(String(item.employeeId) === String(record.employeeId) && item.month === record.month)
      ));
      return { payrolls: [...nextPayrolls, { ...record, id, deleted: false }] };
    }, `${editor.mode === "edit" ? "Updated" : "Saved"} payroll for ${record.employeeName}`);
    setEditor(null);
  };
  const removePayroll = (payroll) => {
    if (!window.confirm(`Delete the ${monthName(payroll.month)} payroll for ${payroll.employeeName}?`)) return;
    upd((data) => {
      const payrolls = data.payrolls || [];
      if (payroll.isDraft) {
        const id = Math.max(0, ...payrolls.map((item) => Number(item.id) || 0)) + 1;
        return { payrolls: [...payrolls, { ...payroll, id, deleted: true }] };
      }
      return { payrolls: payrolls.map((item) => (item.id === payroll.id ? { ...item, deleted: true } : item)) };
    }, `Deleted payroll for ${payroll.employeeName}`);
  };
  const downloadSlip = (payroll) => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 44;
    const contentWidth = pageWidth - margin * 2;
    const employee = db.emps.find((item) => String(item.id) === String(payroll.employeeId));
    const pdfMoney = (value) => `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const joiningDate = employee?.joined
      ? (() => {
        const [year, month, day] = employee.joined.split("-").map(Number);
        return year && month && day
          ? new Date(year, month - 1, day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : employee.joined;
      })()
      : "—";
    const center = pageWidth / 2;
    const logoSize = 58;
    pdf.setFillColor(0, 0, 0);
    pdf.rect(center - logoSize / 2, 24, logoSize, logoSize, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.text("S/T", center, 62, { align: "center" });
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.text(String(db.me?.company || "System Technologies"), center, 99, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Corporate Office", center, 117, { align: "center" });
    pdf.text(String(db.me?.address || `${db.me?.branch || "Ajmer"}, Rajasthan`), center, 132, { align: "center", maxWidth: contentWidth });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(`Salary Payslip - ${monthName(payroll.month)}`, center, 160, { align: "center" });
    pdf.setTextColor(0, 0, 0);
    autoTable(pdf, {
      startY: 181,
      head: [],
      body: [
        ["Employee ID :", `ST-${String(payroll.employeeId).padStart(4, "0")}`],
        ["Employee Name :", payroll.employeeName || "—"],
        ["Department :", payroll.department || "—"],
        ["Designation :", payroll.designation || employee?.desig || "—"],
        ["Date of Joining :", joiningDate],
      ],
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6, textColor: [0, 0, 0], lineColor: [70, 70, 70], lineWidth: 0.45 },
      tableWidth: contentWidth,
      columnStyles: { 0: { cellWidth: 210 }, 1: { cellWidth: contentWidth - 210 } },
    });
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 16,
      head: [["Earnings", "Amount", "Deductions", "Amount"]],
      body: [
        ["Basic Salary", pdfMoney(payroll.salary), "PF", pdfMoney(payroll.pf)],
        ["HRA", pdfMoney(payroll.hra), "Tax", pdfMoney(payroll.tax)],
        ["Allowances", pdfMoney(payroll.allowances), "Other Deductions", pdfMoney(payroll.otherDeductions)],
        ["Bonus", pdfMoney(payroll.bonus), "", ""],
        ["Incentive", pdfMoney(payroll.incentive), "", ""],
      ],
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: 6, textColor: [0, 0, 0], lineColor: [70, 70, 70], lineWidth: 0.45 },
      tableWidth: contentWidth,
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 125, halign: "right" },
        2: { cellWidth: 140 },
        3: { cellWidth: contentWidth - 395, halign: "right" },
      },
    });
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY,
      head: [["Gross Salary", "Net Salary"]],
      body: [[pdfMoney(payroll.gross), pdfMoney(payroll.net)]],
      theme: "grid",
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
      styles: { font: "helvetica", fontSize: 10, cellPadding: 7, textColor: [0, 0, 0], lineColor: [70, 70, 70], lineWidth: 0.45, halign: "center" },
      columnStyles: { 0: { cellWidth: contentWidth / 2 }, 1: { cellWidth: contentWidth / 2 } },
    });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const signatureY = pdf.lastAutoTable.finalY + 42;
    if (signatureY > pageHeight - margin) pdf.addPage();
    pdf.text("Authorized Signature", pageWidth - margin, signatureY > pageHeight - margin ? pageHeight - margin : signatureY, { align: "right" });
    pdf.save(`payroll-slip-${payroll.employeeId}-${payroll.month}.pdf`);
  };
  const totals = rows.reduce((result, payroll) => ({ gross: result.gross + payroll.gross, net: result.net + payroll.net }), { gross: 0, net: 0 });

  return (<>
    <Card title="Payroll Management" right={<span className="hr-count">{rows.length} payroll records · {monthName(appliedFilters.month)}</span>}>
      <div className="hr-tools hr-payroll-toolbar">
        <label className="hr-sbox"><Search size={16} /><input type="search" placeholder="Search Employee..." aria-label="Search payroll records" value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} /></label>
        <label className="hr-f hr-payroll-month"><span>Filter by month</span><input type="month" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))} /></label>
        <button className="hr-btn" type="button" onClick={() => setAppliedFilters({ ...filters })}><Search size={15} /> Search</button>
      </div>
      <div className="hr-payroll-summary"><span>Gross payroll <strong>{formatMoney(totals.gross)}</strong></span><span>Net salary payable <strong>{formatMoney(totals.net)}</strong></span></div>
      <div className="hr-payroll-add-row"><button className="hr-btn" type="button" disabled={!activeEmployees.length} onClick={openAdd}><Plus size={16} /> Add Payroll</button></div>
      <Table rows={rows} empty="No payroll records match your search." cols={[
        ["ID", (payroll) => `ST-${String(payroll.employeeId).padStart(4, "0")}`],
        ["Employee Name", (payroll) => <b>{payroll.employeeName}</b>],
        ["Month", (payroll) => monthName(payroll.month)],
        ["Gross Salary (₹)", (payroll) => formatMoney(payroll.gross)],
        ["Net Salary (₹)", (payroll) => <strong className="hr-payroll-net">{formatMoney(payroll.net)}</strong>],
        ["Actions", (payroll) => <div className="hr-payroll-actions">
          <button className="hr-payroll-action edit" type="button" onClick={() => openEdit(payroll)}><Pencil size={14} /> Edit</button>
          <button className="hr-payroll-action delete" type="button" onClick={() => removePayroll(payroll)}><Trash2 size={14} /> Delete</button>
          <button className="hr-payroll-action view" type="button" onClick={() => setSlip(payroll)}><FileText size={14} /> View Slip</button>
        </div>],
      ]} />
    </Card>
    {editor && <div className="hr-modal hr-payroll-modal" role="presentation" onClick={() => setEditor(null)}>
      <section className="hr-card hr-payroll-dialog" role="dialog" aria-modal="true" aria-labelledby="hr-payroll-form-title" onClick={(event) => event.stopPropagation()}>
        <header className="hr-employee-detail-heading"><h2 id="hr-payroll-form-title">{editor.mode === "edit" ? "Edit Payroll" : "Add Payroll"}</h2><button type="button" aria-label="Close payroll form" onClick={() => setEditor(null)}><X size={18} /></button></header>
        <form className="hr-payroll-form" onSubmit={submitPayroll}>
          <label className="hr-f"><span>Employee</span><select required disabled={editor.mode === "edit" && !editor.form.isDraft} value={editor.form.employeeId} onChange={(event) => setEmployee(event.target.value)}>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · ST-{String(employee.id).padStart(4, "0")}</option>)}</select></label>
          <label className="hr-f"><span>Month</span><input required type="month" value={editor.form.month} onChange={(event) => updateEditor("month", event.target.value)} /></label>
          <label className="hr-f"><span>Basic Salary (₹)</span><input required type="number" min="0" step="0.01" value={editor.form.salary} onChange={(event) => updateEditor("salary", event.target.value)} /></label>
          <label className="hr-f"><span>HRA (₹)</span><input type="number" min="0" step="0.01" value={editor.form.hra} onChange={(event) => updateEditor("hra", event.target.value)} /></label>
          <label className="hr-f"><span>Allowances (₹)</span><input type="number" min="0" step="0.01" value={editor.form.allowances} onChange={(event) => updateEditor("allowances", event.target.value)} /></label>
          <label className="hr-f"><span>Bonus (₹)</span><input type="number" min="0" step="0.01" value={editor.form.bonus} onChange={(event) => updateEditor("bonus", event.target.value)} /></label>
          <label className="hr-f"><span>Incentive (₹)</span><input type="number" min="0" step="0.01" value={editor.form.incentive} onChange={(event) => updateEditor("incentive", event.target.value)} /></label>
          <label className="hr-f"><span>PF (₹)</span><input type="number" min="0" step="0.01" value={editor.form.pf} onChange={(event) => updateEditor("pf", event.target.value)} /></label>
          <label className="hr-f"><span>Tax (₹)</span><input type="number" min="0" step="0.01" value={editor.form.tax} onChange={(event) => updateEditor("tax", event.target.value)} /></label>
          <label className="hr-f"><span>Other Deductions (₹)</span><input type="number" min="0" step="0.01" value={editor.form.otherDeductions} onChange={(event) => updateEditor("otherDeductions", event.target.value)} /></label>
          <p className="hr-payroll-form-total">Gross: <strong>{formatMoney(amount(editor.form.salary) + amount(editor.form.hra) + amount(editor.form.allowances) + amount(editor.form.bonus) + amount(editor.form.incentive))}</strong><span>Net is calculated after deductions.</span></p>
          <footer className="hr-payroll-dialog-actions"><button className="hr-ghost" type="button" onClick={() => setEditor(null)}>Cancel</button><button className="hr-btn" type="submit">Save Payroll</button></footer>
        </form>
      </section>
    </div>}
    {slip && <div className="hr-modal hr-payroll-modal" role="presentation" onClick={() => setSlip(null)}>
      <section className="hr-card hr-payroll-dialog hr-payslip-dialog" role="dialog" aria-modal="true" aria-labelledby="hr-payslip-title" onClick={(event) => event.stopPropagation()}>
        <header className="hr-employee-detail-heading"><h2 id="hr-payslip-title"><FileText size={17} /> Payroll Slip</h2><button type="button" aria-label="Close payroll slip" onClick={() => setSlip(null)}><X size={18} /></button></header>
        <div className="hr-payslip-content">
          <div className="hr-payslip-brand"><div className="hr-id-card-logo">S/T</div><strong>{db.me?.company || "System Technologies"}</strong><span>A leading IT solution company</span></div>
          <h3>Payroll Slip</h3>
          <section className="hr-payslip-employee"><p><strong>Employee Name:</strong> {slip.employeeName}</p><p><strong>Employee ID:</strong> ST-{String(slip.employeeId).padStart(4, "0")}</p><p><strong>Month:</strong> {monthName(slip.month)}</p></section>
          <h4>Salary Breakdown</h4><section className="hr-payslip-breakdown">
            <p><span>Basic Salary (₹)</span><strong>{formatMoney(slip.salary)}</strong></p><p><span>HRA (₹)</span><strong>{formatMoney(slip.hra)}</strong></p><p><span>Allowances (₹)</span><strong>{formatMoney(slip.allowances)}</strong></p><p><span>Bonus (₹)</span><strong>{formatMoney(slip.bonus)}</strong></p><p><span>Incentive (₹)</span><strong>{formatMoney(slip.incentive)}</strong></p>
          </section>
          <h4>Deductions</h4><section className="hr-payslip-breakdown">
            <p><span>PF (₹)</span><strong>{formatMoney(slip.pf)}</strong></p><p><span>Tax (₹)</span><strong>{formatMoney(slip.tax)}</strong></p><p><span>Other Deductions (₹)</span><strong>{formatMoney(slip.otherDeductions)}</strong></p>
          </section>
          <h4>Total</h4><section className="hr-payslip-breakdown hr-payslip-total"><p><span>Gross Salary (₹)</span><strong>{formatMoney(slip.gross)}</strong></p><p><span>Net Salary (₹)</span><strong>{formatMoney(slip.net)}</strong></p></section>
        </div>
        <footer className="hr-payroll-dialog-actions"><button className="hr-ghost" type="button" onClick={() => setSlip(null)}>Back</button><button className="hr-btn" type="button" onClick={() => downloadSlip(slip)}><Download size={15} /> Download PDF</button></footer>
      </section>
    </div>}
  </>);
}

/* ================= Attendance ================= */
function MarkAttendance({ c: { db, upd } }) {
  const key = `${TODAY}|1`;
  const cur = db.att[key] || "";
  const savedDetails = db.attendanceDetails?.[key] || {};
  const [status, setStatus] = useState(cur);
  const [remark, setRemark] = useState(savedDetails.remark || "");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!savedDetails.checkedInAt || savedDetails.checkedOutAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [savedDetails.checkedInAt, savedDetails.checkedOutAt]);
  const checkedInAt = savedDetails.checkedInAt
    ? new Date(savedDetails.checkedInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "";
  const checkedOutAt = savedDetails.checkedOutAt
    ? new Date(savedDetails.checkedOutAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "";
  const workingMilliseconds = savedDetails.workingMilliseconds
    ?? (savedDetails.checkedInAt ? Math.max(0, (savedDetails.checkedOutAt ? Date.parse(savedDetails.checkedOutAt) : now) - Date.parse(savedDetails.checkedInAt)) : 0);
  const workingHours = `${Math.floor(workingMilliseconds / 3600000)}h ${Math.floor((workingMilliseconds % 3600000) / 60000)}m`;
  const toggleAttendance = (event) => {
    event.preventDefault();
    if (!status) {
      setError(`Select an attendance status before checking ${savedDetails.checkedInAt ? "out" : "in"}.`);
      return;
    }
    if (savedDetails.checkedOutAt) return;
    const timestamp = new Date().toISOString();
    if (!savedDetails.checkedInAt) {
      upd((data) => ({
        att: { ...data.att, [key]: status },
        attendanceDetails: {
          ...(data.attendanceDetails || {}),
          [key]: { ...(data.attendanceDetails?.[key] || {}), remark: remark.trim(), checkedInAt: timestamp },
        },
      }), `Checked in with ${status.toLowerCase()} status`);
    } else {
      const duration = Math.max(0, Date.parse(timestamp) - Date.parse(savedDetails.checkedInAt));
      upd((data) => ({
        att: { ...data.att, [key]: status },
        attendanceDetails: {
          ...(data.attendanceDetails || {}),
          [key]: { ...(data.attendanceDetails?.[key] || {}), remark: remark.trim(), checkedOutAt: timestamp, workingMilliseconds: duration },
        },
      }), `Checked out after ${workingHours} of work`);
    }
    setError("");
  };
  const resetToday = () => {
    if (!window.confirm("Reset today's attendance, check-in/out times, and remark so you can test again?")) return;
    upd((data) => {
      const att = { ...(data.att || {}) };
      const attendanceDetails = { ...(data.attendanceDetails || {}) };
      delete att[key];
      delete attendanceDetails[key];
      return { att, attendanceDetails };
    }, "Reset today's attendance for testing");
    setStatus("");
    setRemark("");
    setError("");
  };

  return (
    <Card title="Mark Attendance">
      <form className="hr-mark-attendance-form" onSubmit={toggleAttendance}>
        <label className="hr-f">
          <span>Employee Name</span>
          <input value={db.me?.name || "HR"} readOnly />
        </label>
        <label className="hr-f">
          <span>Select Status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setError(""); }}>
            <option value="">Select Status</option>
            {["Present", "Absent", "Leave"].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="hr-f">
          <span>Remark</span>
          <input type="text" maxLength={240} placeholder="Remark (optional)" value={remark} onChange={(event) => setRemark(event.target.value)} />
        </label>
        <div className="hr-mark-attendance-submit">
          <span>Attendance</span>
          <button className={`hr-mark-attendance-action${savedDetails.checkedInAt ? " is-checked-in" : ""}`} type="submit" disabled={!!savedDetails.checkedOutAt}>
            <Check size={16} /> {savedDetails.checkedOutAt ? "Checked Out" : savedDetails.checkedInAt ? "Check Out" : "Check In"}
          </button>
        </div>
      </form>
      {error && <p className="hr-form-error hr-mark-attendance-error" role="alert">{error}</p>}
      <div className="hr-mark-attendance-status" aria-live="polite">
        <span>Today · {new Date(`${TODAY}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        {cur && <span>Status: <Badge s={cur} /></span>}
        {checkedInAt && <span>Checked in at {checkedInAt}</span>}
        {checkedOutAt && <span>Checked out at {checkedOutAt}</span>}
        {savedDetails.checkedInAt && <span>Working hours: {workingHours}</span>}
        {savedDetails.remark && <span>Remark: {savedDetails.remark}</span>}
        {savedDetails.checkedOutAt && <button type="button" className="hr-mark-attendance-reset" onClick={resetToday}><RotateCcw size={13} /> Reset for testing</button>}
      </div>
    </Card>
  );
}
function AttendanceReport({ c: { db } }) {
  const initialFilters = { day: "", date: "", month: MONTH, status: "" };
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthDays = appliedFilters.month
    ? range(`${appliedFilters.month}-01`, iso(new Date(+appliedFilters.month.slice(0, 4), +appliedFilters.month.slice(5), 0)))
      .filter((date) => date <= TODAY)
    : range(`${TODAY.slice(0, 7)}-01`, TODAY);
  const reportDays = appliedFilters.date
    ? [appliedFilters.date].filter((date) => date <= TODAY)
    : monthDays;
  const rows = reportDays
    .map((date) => {
      const key = `${date}|1`;
      const details = db.attendanceDetails?.[key] || {};
      const status = db.att?.[key] || "";
      const duration = details.workingMilliseconds
        ?? (details.checkedInAt && details.checkedOutAt
          ? Math.max(0, Date.parse(details.checkedOutAt) - Date.parse(details.checkedInAt))
          : 0);
      const totalSeconds = Math.floor(Math.max(0, duration) / 1000);
      const formatTime = (value) => {
        if (!value) return "00:00:00";
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime())
          ? "00:00:00"
          : parsed.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      };
      return {
        id: key,
        empId: db.me?.crm || "1",
        name: db.me?.name || "HR",
        department: "HR",
        branch: db.me?.branch || "—",
        date,
        day: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" }),
        checkIn: formatTime(details.checkedInAt),
        checkOut: formatTime(details.checkedOutAt),
        totalHours: [Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), totalSeconds % 60]
          .map((part) => String(part).padStart(2, "0"))
          .join(":"),
        remarks: details.remark || "—",
        status: status || "Not marked",
      };
    })
    .filter((row) => (!appliedFilters.day || row.day === appliedFilters.day)
      && (!appliedFilters.status || row.status === appliedFilters.status));
  const updateFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const applyFilters = (event) => {
    event.preventDefault();
    if (filters.date && filters.month && filters.date.slice(0, 7) !== filters.month) {
      setError("Choose a date within the selected month, or clear the date to view the full month.");
      return;
    }
    setError("");
    setAppliedFilters({ ...filters });
  };
  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setError("");
  };
  const exportRows = rows.map((row, index) => ({
    "S.N": index + 1,
    "EMP ID": row.empId,
    "EMP Name": row.name,
    Department: row.department,
    Branch: row.branch,
    Date: row.date.split("-").reverse().join("-"),
    Day: row.day,
    "Check-in Time": row.checkIn,
    "Check-out Time": row.checkOut,
    "Total Hours": row.totalHours,
    Remarks: row.remarks,
    Status: row.status,
  }));
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), "Attendance Report");
    XLSX.writeFile(workbook, `my-attendance-report-${iso()}.xlsx`);
  };
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    pdf.setFontSize(18);
    pdf.text("Attendance Report", 36, 36);
    autoTable(pdf, {
      startY: 52,
      head: [Object.keys(exportRows[0] || {
        "S.N": "", "EMP ID": "", "EMP Name": "", Department: "", Branch: "", Date: "",
        Day: "", "Check-in Time": "", "Check-out Time": "", "Total Hours": "", Remarks: "", Status: "",
      })],
      body: exportRows.map((row) => Object.values(row)),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [141, 94, 56] },
      theme: "grid",
    });
    pdf.save(`my-attendance-report-${iso()}.pdf`);
  };

  return (
    <section className="hr-attendance-report">
      <h2 className="hr-attendance-report-title"><CalendarCheck size={22} /> Attendance Report</h2>
      <form className="hr-attendance-report-filters" onSubmit={applyFilters}>
        <F l="Select Day">
          <select value={filters.day} onChange={updateFilter("day")}>
            <option value="">Select Day</option>
            {daysOfWeek.map((day) => <option key={day}>{day}</option>)}
          </select>
        </F>
        <F l="Date"><input type="date" max={TODAY} value={filters.date} onChange={updateFilter("date")} /></F>
        <F l="Month"><input type="month" value={filters.month} onChange={updateFilter("month")} /></F>
        <F l="Select Status">
          <select value={filters.status} onChange={updateFilter("status")}>
            <option value="">Select Status</option>
            {["Present", "Absent", "Leave", "Not marked"].map((status) => <option key={status}>{status}</option>)}
          </select>
        </F>
        <div className="hr-attendance-report-actions">
          <button className="hr-btn" type="submit"><Filter size={15} /> Apply</button>
          <button className="hr-ghost" type="button" onClick={resetFilters}><RotateCcw size={15} /> Reset</button>
        </div>
        {error && <p className="hr-form-error hr-attendance-report-error" role="alert">{error}</p>}
      </form>
      <div className="hr-all-attendance-results-toolbar">
      <div className="hr-attendance-report-summary" aria-live="polite">
        <span>{rows.length} attendance record{rows.length === 1 ? "" : "s"}</span>
        <span>Present {rows.filter((row) => row.status === "Present").length}</span>
        <span>Absent {rows.filter((row) => row.status === "Absent").length}</span>
        <span>Leave {rows.filter((row) => row.status === "Leave").length}</span>
      </div>
      <div className="hr-all-attendance-exports" role="group" aria-label="Export attendance report">
        <button className="hr-attendance-export excel" type="button" onClick={exportExcel} disabled={!rows.length}><FileSpreadsheet size={15} /> Excel</button>
        <button className="hr-attendance-export pdf" type="button" onClick={exportPdf} disabled={!rows.length}><FileText size={15} /> PDF</button>
      </div>
      </div>
      <Card>
        <Table rows={rows} empty="No attendance records match these filters." cols={[
          ["S.N", (_row, index) => index + 1],
          ["EMP ID", (row) => row.empId],
          ["EMP Name", (row) => <b>{row.name}</b>],
          ["Department", (row) => row.department],
          ["Branch", (row) => row.branch],
          ["Date", (row) => row.date.split("-").reverse().join("-")],
          ["Day", (row) => row.day],
          ["Check-in Time", (row) => row.checkIn],
          ["Check-out Time", (row) => row.checkOut],
          ["Total Hours", (row) => row.totalHours],
          ["Remarks", (row) => row.remarks],
          ["Status", (row) => row.status === "Not marked" ? row.status : <Badge s={row.status} />],
        ]} />
      </Card>
    </section>
  );
}
function AllAttendance({ c: { db } }) {
  const initialFilters = {
    empId: "", name: "", department: "", branch: "", day: "",
    dateFrom: "", dateTo: "", month: MONTH, year: "", status: "",
  };
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  const employees = db.emps || [];
  const departments = [...new Set(employees.map((employee) => employee.dept).filter(Boolean))].sort();
  const branches = [...new Set(employees.map((employee) => employee.branch || db.me?.branch || "—"))].sort();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const formatDate = (date) => date.split("-").reverse().join("-");
  const formatTime = (value) => {
    if (!value) return "00:00:00";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "00:00:00"
      : date.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  const formatDuration = (milliseconds) => {
    const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
    return [Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), totalSeconds % 60]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  };
  const allRows = Object.entries(db.att || {}).flatMap(([key, status]) => {
    const [date, employeeId] = key.split("|");
    if (!status || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const employee = employees.find((item) => String(item.id) === employeeId);
    if (!employee) return [];
    const details = db.attendanceDetails?.[key] || {};
    const duration = details.workingMilliseconds
      ?? (details.checkedInAt && details.checkedOutAt
        ? Math.max(0, Date.parse(details.checkedOutAt) - Date.parse(details.checkedInAt))
        : 0);
    return [{
      id: key,
      empId: employee.id,
      name: employee.name,
      department: employee.dept || "—",
      branch: employee.branch || db.me?.branch || "—",
      date,
      day: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" }),
      checkIn: formatTime(details.checkedInAt),
      checkOut: formatTime(details.checkedOutAt),
      totalHours: formatDuration(duration),
      remarks: details.remark || "—",
      status,
    }];
  }).sort((a, b) => b.date.localeCompare(a.date) || String(a.name).localeCompare(String(b.name)));
  const rows = allRows.filter((row) => {
    const rowMonth = row.date.slice(0, 7);
    return (!appliedFilters.empId || String(row.empId) === appliedFilters.empId)
      && (!appliedFilters.name || row.name === appliedFilters.name)
      && (!appliedFilters.department || row.department === appliedFilters.department)
      && (!appliedFilters.branch || row.branch === appliedFilters.branch)
      && (!appliedFilters.day || row.day === appliedFilters.day)
      && (!appliedFilters.dateFrom || row.date >= appliedFilters.dateFrom)
      && (!appliedFilters.dateTo || row.date <= appliedFilters.dateTo)
      && (!appliedFilters.month || rowMonth === appliedFilters.month)
      && (!appliedFilters.year || row.date.slice(0, 4) === appliedFilters.year)
      && (!appliedFilters.status || row.status === appliedFilters.status);
  });
  const updateFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const applyFilters = (event) => {
    event.preventDefault();
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      setError("Start date must be on or before end date.");
      return;
    }
    setError("");
    setAppliedFilters({ ...filters });
  };
  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setError("");
  };
  const exportRows = rows.map((row, index) => ({
    "S.N": index + 1,
    "EMP ID": row.empId,
    "EMP Name": row.name,
    Department: row.department,
    Branch: row.branch,
    Date: formatDate(row.date),
    Day: row.day,
    "Check-in Time": row.checkIn,
    "Check-out Time": row.checkOut,
    "Total Hours": row.totalHours,
    Remarks: row.remarks,
    Status: row.status,
  }));
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), "Attendance Report");
    XLSX.writeFile(workbook, `attendance-report-${iso()}.xlsx`);
  };
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    pdf.setFontSize(18);
    pdf.text("All Attendance Report", 36, 36);
    autoTable(pdf, {
      startY: 52,
      head: [Object.keys(exportRows[0] || {
        "S.N": "", "EMP ID": "", "EMP Name": "", Department: "", Branch: "", Date: "",
        Day: "", "Check-in Time": "", "Check-out Time": "", "Total Hours": "", Remarks: "", Status: "",
      })],
      body: exportRows.map((row) => Object.values(row)),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [141, 94, 56] },
      theme: "grid",
    });
    pdf.save(`attendance-report-${iso()}.pdf`);
  };
  const countStatus = (status) => rows.filter((row) => row.status === status).length;
  const years = [...new Set(allRows.map((row) => row.date.slice(0, 4)))].sort().reverse();

  return (
    <section className="hr-all-attendance">
      <h2 className="hr-all-attendance-title"><CalendarCheck size={22} /> Attendance Report</h2>
      <form className="hr-all-attendance-filters" onSubmit={applyFilters}>
        <F l="Select EMP ID"><select value={filters.empId} onChange={updateFilter("empId")}><option value="">Select EMP ID</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.id}</option>)}</select></F>
        <F l="Select EMP Name"><select value={filters.name} onChange={updateFilter("name")}><option value="">Select EMP Name</option>{employees.map((employee) => <option key={employee.id} value={employee.name}>{employee.name}</option>)}</select></F>
        <F l="Select Department"><select value={filters.department} onChange={updateFilter("department")}><option value="">Select Department</option>{departments.map((department) => <option key={department}>{department}</option>)}</select></F>
        <F l="Select Branch"><select value={filters.branch} onChange={updateFilter("branch")}><option value="">Select Branch</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></F>
        <F l="Select Day"><select value={filters.day} onChange={updateFilter("day")}><option value="">Select Day</option>{days.map((day) => <option key={day}>{day}</option>)}</select></F>
        <F l="From Date"><input type="date" value={filters.dateFrom} onChange={updateFilter("dateFrom")} /></F>
        <F l="To Date"><input type="date" value={filters.dateTo} onChange={updateFilter("dateTo")} /></F>
        <F l="Select Month"><input type="month" value={filters.month} onChange={updateFilter("month")} /></F>
        <F l="Select Year"><select value={filters.year} onChange={updateFilter("year")}><option value="">Select Year</option>{years.map((year) => <option key={year}>{year}</option>)}</select></F>
        <F l="Select Status"><select value={filters.status} onChange={updateFilter("status")}><option value="">Select Status</option>{["Present", "Absent", "Leave"].map((status) => <option key={status}>{status}</option>)}</select></F>
        <div className="hr-all-attendance-actions">
          <button className="hr-btn" type="submit"><Filter size={15} /> Apply</button>
          <button className="hr-ghost" type="button" onClick={resetFilters}><RotateCcw size={15} /> Reset</button>
        </div>
        {error && <p className="hr-form-error hr-all-attendance-error" role="alert">{error}</p>}
      </form>
      <div className="hr-all-attendance-results-toolbar">
      <div className="hr-all-attendance-summary" aria-live="polite">
        <span>{rows.length} attendance record{rows.length === 1 ? "" : "s"}</span>
        <span>Present {countStatus("Present")}</span>
        <span>Absent {countStatus("Absent")}</span>
        <span>Leave {countStatus("Leave")}</span>
      </div>
      <div className="hr-all-attendance-exports" role="group" aria-label="Export attendance report">
        <button className="hr-attendance-export excel" type="button" onClick={exportExcel} disabled={!rows.length}><FileSpreadsheet size={15} /> Excel</button>
        <button className="hr-attendance-export pdf" type="button" onClick={exportPdf} disabled={!rows.length}><FileText size={15} /> PDF</button>
      </div>
      </div>
      <Card>
        <Table rows={rows} empty="No attendance records match these filters." cols={[
          ["S.N", (_row, index) => index + 1],
          ["EMP ID", (row) => row.empId],
          ["EMP Name", (row) => <b>{row.name}</b>],
          ["Department", (row) => row.department],
          ["Branch", (row) => row.branch],
          ["Date", (row) => formatDate(row.date)],
          ["Day", (row) => row.day],
          ["Check-in Time", (row) => row.checkIn],
          ["Check-out Time", (row) => row.checkOut],
          ["Total Hours", (row) => row.totalHours],
          ["Remarks", (row) => row.remarks],
          ["Status", (row) => <Badge s={row.status} />],
        ]} />
      </Card>
    </section>
  );
}
function MarkAll({ c: { db, upd } }) {
  const [date, setDate] = useState(TODAY);
  const [appliedDate, setAppliedDate] = useState(TODAY);
  const [dept, setDept] = useState("All");
  const [error, setError] = useState("");
  const [draftRows, setDraftRows] = useState({});
  const [dirtyKeys, setDirtyKeys] = useState(() => new Set());
  const list = act(db).filter((employee) => dept === "All" || employee.dept === dept)
    .slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const keyFor = (employeeId) => `${appliedDate}|${employeeId}`;
  const rowFor = (employeeId) => {
    const key = keyFor(employeeId);
    return draftRows[key] || {
      status: db.att[key] || "",
      details: db.attendanceDetails?.[key] || {},
    };
  };
  const getTimeValue = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? ""
      : `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
  };
  const formatDuration = (details) => {
    const duration = details.workingMilliseconds
      ?? (details.checkedInAt && details.checkedOutAt
        ? Math.max(0, Date.parse(details.checkedOutAt) - Date.parse(details.checkedInAt))
        : 0);
    const seconds = Math.floor(duration / 1000);
    return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  };
  const setRowValue = (employeeId, field, value) => {
    const key = keyFor(employeeId);
    setDraftRows((current) => {
      const row = current[key] || {
        status: db.att[key] || "",
        details: db.attendanceDetails?.[key] || {},
      };
      const next = { ...row, details: { ...row.details } };
      if (field === "status") {
        next.status = value;
      } else if (field === "remark") {
        next.details.remark = value;
      } else if (field === "checkIn" || field === "checkOut") {
        const property = field === "checkIn" ? "checkedInAt" : "checkedOutAt";
        if (value) next.details[property] = new Date(`${appliedDate}T${value}:00`).toISOString();
        else delete next.details[property];
        if (next.details.checkedInAt && next.details.checkedOutAt) {
          next.details.workingMilliseconds = Math.max(0, Date.parse(next.details.checkedOutAt) - Date.parse(next.details.checkedInAt));
        } else {
          delete next.details.workingMilliseconds;
        }
      }
      return { ...current, [key]: next };
    });
    setDirtyKeys((current) => new Set(current).add(key));
  };
  const saveAttendance = () => {
    if (!dirtyKeys.size) return;
    const savedKeys = new Set(dirtyKeys);
    upd((data) => {
      const att = { ...(data.att || {}) };
      const attendanceDetails = { ...(data.attendanceDetails || {}) };
      savedKeys.forEach((key) => {
        const row = draftRows[key];
        if (!row) return;
        if (row.status) att[key] = row.status;
        else delete att[key];
        if (Object.keys(row.details).length) attendanceDetails[key] = row.details;
        else delete attendanceDetails[key];
      });
      return { att, attendanceDetails };
    }, `Saved attendance for ${savedKeys.size} employees`);
    setDraftRows((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !savedKeys.has(key))));
    setDirtyKeys((current) => new Set([...current].filter((key) => !savedKeys.has(key))));
  };
  const applyDate = (event) => {
    event.preventDefault();
    if (!date || date > TODAY) {
      setError("Choose a valid date that is not in the future.");
      return;
    }
    setError("");
    setAppliedDate(date);
  };
  const day = new Date(`${appliedDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
  const presentCount = list.filter((employee) => rowFor(employee.id).status === "Present").length;
  const absentCount = list.filter((employee) => rowFor(employee.id).status === "Absent").length;
  const leaveCount = list.filter((employee) => rowFor(employee.id).status === "Leave").length;

  return (
    <section className="hr-mark-all">
      <h2 className="hr-mark-all-title"><CalendarCheck size={22} /> Mark Attendance (All Employees)</h2>
      <form className="hr-mark-all-toolbar" onSubmit={applyDate}>
        <F l="Attendance date"><input type="date" max={TODAY} value={date} onChange={(event) => setDate(event.target.value)} /></F>
        <F l="Department">
          <select value={dept} onChange={(event) => setDept(event.target.value)}>
            {["All", ...DEPTS].map((department) => <option key={department}>{department}</option>)}
          </select>
        </F>
        <button className="hr-btn" type="submit"><Filter size={15} /> Filter</button>
      </form>
      {error && <p className="hr-form-error hr-mark-all-error" role="alert">{error}</p>}
      <div className="hr-mark-all-summary" aria-live="polite">
        <span>{list.length} employees</span>
        <span>Present {presentCount}</span>
        <span>Absent {absentCount}</span>
        <span>Leave {leaveCount}</span>
        <span>Not marked {list.length - presentCount - absentCount - leaveCount}</span>
      </div>
      <Card>
        <div className="hr-tw hr-mark-all-table-wrap">
          <table className="hr-t hr-mark-all-table">
            <thead><tr>
              {["Employee Name", "Department", "Branch", "Date", "Day", "Check-In", "Check-Out", "Total Hours (HH:MM)", "Status", "Remark"].map((heading) => <th key={heading}>{heading}</th>)}
            </tr></thead>
            <tbody>{list.map((employee) => {
              const key = keyFor(employee.id);
              const { details, status } = rowFor(employee.id);
              return (
                <tr key={employee.id}>
                  <td><b>{employee.name}</b></td>
                  <td>{employee.dept || "—"}</td>
                  <td>{employee.branch || db.me?.branch || "—"}</td>
                  <td>{appliedDate.split("-").reverse().join("-")}</td>
                  <td>{day}</td>
                  <td><input aria-label={`${employee.name} check-in time`} type="time" value={getTimeValue(details.checkedInAt)} onChange={(event) => setRowValue(employee.id, "checkIn", event.target.value)} /></td>
                  <td><input aria-label={`${employee.name} check-out time`} type="time" value={getTimeValue(details.checkedOutAt)} onChange={(event) => setRowValue(employee.id, "checkOut", event.target.value)} /></td>
                  <td>{formatDuration(details)}</td>
                  <td>
                    <select aria-label={`${employee.name} attendance status`} className={`hr-mark-all-status${status ? ` is-${status.toLowerCase()}` : ""}`} value={status} onChange={(event) => setRowValue(employee.id, "status", event.target.value)}>
                      <option value="">Select</option>
                      {["Present", "Absent", "Leave"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </td>
                  <td><input aria-label={`${employee.name} attendance remark`} type="text" maxLength={240} value={details.remark || ""} onChange={(event) => setRowValue(employee.id, "remark", event.target.value)} /></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!list.length && <Empty t="No active employees match this department." />}
        </div>
        <button className="hr-mark-all-save" type="button" onClick={saveAttendance} disabled={!dirtyKeys.size}>
          <Check size={16} /> Save Attendance
        </button>
      </Card>
    </section>
  );
}
function LeaveRequest({ c: { db, upd } }) {
  const [f, setF] = useState({ type: "Casual", from: TODAY, to: TODAY, reason: "" });
  const [error, setError] = useState("");
  const setField = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }));
  const mine = db.leaves.filter((leave) => leave.empId === 1).slice().reverse();
  const formatTimestamp = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).replace(",", "");
  };
  const submitRequest = (event) => {
    event.preventDefault();
    if (f.to < f.from) {
      setError("End date must be on or after the start date.");
      return;
    }
    setError("");
    upd((data) => ({
      leaves: [...data.leaves, {
        ...f,
        id: Date.now(),
        empId: 1,
        status: "Pending",
        appliedAt: new Date().toISOString(),
      }],
    }), "Leave request submitted");
    setF({ type: "Casual", from: TODAY, to: TODAY, reason: "" });
  };
  return (
    <section className="hr-leave-request">
      <Card>
        <h2 className="hr-leave-request-title">Leave Request</h2>
        <form className="hr-leave-request-form" onSubmit={submitRequest}>
          <F l="Leave Type">
            <select value={f.type} onChange={setField("type")}>
              {["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave"].map((type) => <option key={type}>{type}</option>)}
            </select>
          </F>
          <F l="Start Date:"><input type="date" required value={f.from} onChange={setField("from")} /></F>
          <F l="End Date:"><input type="date" min={f.from} required value={f.to} onChange={setField("to")} /></F>
          <F l="Reason:"><textarea required rows={1} value={f.reason} onChange={setField("reason")} /></F>
          <div className="hr-leave-request-submit"><button className="hr-btn" type="submit"><CalendarClock size={15} /> Apply Leave</button></div>
          {error && <p className="hr-form-error hr-leave-request-error" role="alert">{error}</p>}
        </form>
      </Card>
      <Card>
        <div className="hr-tw hr-leave-request-table-wrap">
          <table className="hr-t hr-leave-request-table">
            <thead><tr>{["S.N", "Name", "Leave Type", "Start Date", "End Date", "Reason", "Status", "Applied At", "Approved By", "Approved At", ""].map((heading, index) => <th key={`${heading}-${index}`}>{heading}</th>)}</tr></thead>
            <tbody>{mine.map((leave, index) => (
              <tr key={leave.id}>
                <td>{index + 1}</td>
                <td>{db.me?.name || "HR"}</td>
                <td>{leave.type}</td>
                <td>{leave.from}</td>
                <td>{leave.to}</td>
                <td>{leave.reason || "—"}</td>
                <td><Badge s={leave.status} /></td>
                <td>{formatTimestamp(leave.appliedAt)}</td>
                <td>{leave.approvedBy || "—"}</td>
                <td>{formatTimestamp(leave.approvedAt)}</td>
                <td>{leave.status === "Pending" && <button className="hr-ghost sm" onClick={() => upd((data) => ({ leaves: data.leaves.filter((item) => item.id !== leave.id) }), "Leave request cancelled")}>Cancel</button>}</td>
              </tr>
            ))}</tbody>
          </table>
          {!mine.length && <Empty t="You haven't applied for any leave." />}
        </div>
      </Card>
    </section>
  );
}
function AllLeaves({ c: { db, upd } }) {
  const [filter, setFilter] = useState("All");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [nextStatus, setNextStatus] = useState("Pending");
  const [email, setEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [error, setError] = useState("");
  const rows = (db.leaves || [])
    .filter((leave) => filter === "All" || leave.status === filter)
    .slice()
    .sort((a, b) => {
      const timeA = Date.parse(a.appliedAt || "") || 0;
      const timeB = Date.parse(b.appliedAt || "") || 0;
      return timeB - timeA || (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  const employeeFor = (leave) => db.emps.find((employee) => String(employee.id) === String(leave.empId));
  const formatTimestamp = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };
  const openUpdate = (leave) => {
    const employee = employeeFor(leave);
    setSelectedLeave(leave);
    setNextStatus(leave.status || "Pending");
    setEmail(employee?.email || "");
    setSendEmail(false);
    setError("");
  };
  const closeUpdate = () => {
    setSelectedLeave(null);
    setError("");
  };
  const saveUpdate = (event) => {
    event.preventDefault();
    if (sendEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid employee email address.");
      return;
    }
    const employeeName = nm(db, selectedLeave.empId);
    upd(decide(selectedLeave.id, nextStatus, db.me?.name || "HR"), `Updated leave status for ${employeeName} to ${nextStatus}`);
    closeUpdate();
  };
  const exportRows = rows.map((leave, index) => {
    const employee = employeeFor(leave);
    return {
      "S.N": index + 1,
      "EMP ID": employee?.id ?? leave.empId,
      "EMP Name": employee?.name || nm(db, leave.empId),
      "Leave Type": leave.type,
      "Start Date": leave.from,
      "End Date": leave.to,
      Reason: leave.reason || "—",
      Status: leave.status || "Pending",
      "Applied At": formatTimestamp(leave.appliedAt),
      "Approved By": leave.approvedBy || "—",
      "Approved At": formatTimestamp(leave.approvedAt),
    };
  });
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), "Leave Requests");
    XLSX.writeFile(workbook, `leave-requests-${iso()}.xlsx`);
  };
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
    pdf.setFontSize(18);
    pdf.text("All Leave History", 36, 36);
    autoTable(pdf, {
      startY: 52,
      head: [Object.keys(exportRows[0] || {
        "S.N": "", "EMP ID": "", "EMP Name": "", "Leave Type": "", "Start Date": "",
        "End Date": "", Reason: "", Status: "", "Applied At": "", "Approved By": "", "Approved At": "",
      })],
      body: exportRows.map((row) => Object.values(row)),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [141, 94, 56] },
      theme: "grid",
    });
    pdf.save(`leave-requests-${iso()}.pdf`);
  };

  return (
    <section className="hr-all-leaves">
      <h2 className="hr-all-leaves-page-title">View All Leave Request</h2>
      <Card>
        <div className="hr-all-leaves-toolbar">
          <div className="hr-all-leaves-export">
            <button className="hr-ghost" type="button" onClick={exportExcel} disabled={!rows.length}><FileSpreadsheet size={15} /> Export Excel</button>
            <button className="hr-ghost" type="button" onClick={exportPdf} disabled={!rows.length}><FileText size={15} /> Export PDF</button>
          </div>
          <Seg value={filter} opts={["All", "Pending", "Approved", "Rejected"]} onChange={setFilter} />
        </div>
        <h3 className="hr-all-leaves-heading"><ClipboardList size={21} /> All Leave History</h3>
        <div className="hr-tw">
          <table className="hr-t hr-all-leaves-table">
            <thead><tr>{["S.N", "EMP ID", "EMP Name", "Leave Type", "Start Date", "End Date", "Reason", "Status", "Applied At", "Approved By", "Approved At", "Action"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{rows.map((leave, index) => {
              const employee = employeeFor(leave);
              return (
                <tr key={leave.id}>
                  <td>{index + 1}</td>
                  <td>{employee?.id ?? leave.empId}</td>
                  <td><b>{employee?.name || nm(db, leave.empId)}</b></td>
                  <td>{leave.type}</td>
                  <td>{leave.from}</td>
                  <td>{leave.to}</td>
                  <td className="hr-all-leaves-reason">{leave.reason || "—"}</td>
                  <td><Badge s={leave.status || "Pending"} /></td>
                  <td>{formatTimestamp(leave.appliedAt)}</td>
                  <td>{leave.approvedBy || "—"}</td>
                  <td>{formatTimestamp(leave.approvedAt)}</td>
                  <td><button className="hr-all-leaves-update" type="button" onClick={() => openUpdate(leave)}><Pencil size={13} /> Update</button></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!rows.length && <Empty t="No leave requests in this view." />}
        </div>
      </Card>

      {selectedLeave && (
        <div className="hr-modal hr-leave-update-modal" onClick={closeUpdate}>
          <section className="hr-card hr-leave-update-dialog" role="dialog" aria-modal="true" aria-labelledby="hr-leave-update-title" onClick={(event) => event.stopPropagation()}>
            <header className="hr-leave-update-heading">
              <h2 id="hr-leave-update-title"><Pencil size={18} /> Update Leave Status</h2>
              <button type="button" aria-label="Close update dialog" onClick={closeUpdate}><X size={20} /></button>
            </header>
            <form className="hr-leave-update-form" onSubmit={saveUpdate}>
              <div className="hr-leave-update-employee">
                <span>Employee:</span>
                <strong>{nm(db, selectedLeave.empId)}</strong>
                <span>Employee ID:</span>
                <strong>{employeeFor(selectedLeave)?.id ?? selectedLeave.empId}</strong>
              </div>
              <F l="Select Status">
                <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                  {["Pending", "Approved", "Rejected"].map((status) => <option key={status}>{status}</option>)}
                </select>
              </F>
              <F l="Employee Email (For Notification)">
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="employee@example.com" />
              </F>
              <label className="hr-leave-update-toggle">
                <input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} />
                <span>Send Email Notification</span>
              </label>
              <p className="hr-leave-update-note"><BellRing size={14} /> Email delivery isn’t available in this frontend-only dashboard. Saving updates the leave status locally only.</p>
              {error && <p className="hr-form-error" role="alert">{error}</p>}
              <footer className="hr-leave-update-actions">
                <button className="hr-ghost" type="button" onClick={closeUpdate}>Close</button>
                <button className="hr-btn" type="submit"><Check size={15} /> Save changes</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

/* ================= Tasks ================= */
function TaskTable({ c: { db, upd }, rows, del, empty }) {
  const set = (id, status) => upd((d) => ({ tasks: d.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }), "Task status updated");
  return <Card><Table rows={rows} empty={empty} cols={[
    ["Task", (t) => <b>{t.title}</b>], ["Assigned to", (t) => nm(db, t.assignedTo)], ["Assigned by", (t) => nm(db, t.assignedBy)],
    ["Due", (t) => <span className={t.status !== "Done" && t.due < TODAY ? "hr-late" : ""}>{t.due}</span>], ["Priority", (t) => <Badge s={t.priority} />],
    ["Status", (t) => <select className="hr-sel" value={t.status} onChange={(e) => set(t.id, e.target.value)}>{["Pending", "In Progress", "Done"].map((s) => <option key={s}>{s}</option>)}</select>],
    ["", (t) => del && <button className="hr-ghost sm" onClick={() => window.confirm("Delete this task?") && upd((d) => ({ tasks: d.tasks.filter((x) => x.id !== t.id) }), "Task deleted")}>Delete</button>]]} /></Card>;
}
function AssignTasks({ c }) {
  const { db, upd, go } = c;
  const activeEmployees = act(db);
  const crmExecutives = activeEmployees.filter((employee) => {
    const role = String(employee.role || employee.position || "").toLowerCase();
    return role.includes("crm") && role.includes("executive");
  });
  const salesEmployees = activeEmployees.filter((employee) => String(employee.dept || "").toLowerCase() === "sales");
  const assignees = crmExecutives.length ? crmExecutives : salesEmployees;
  const initialAssignee = assignees[0]?.id || "";
  const [f, setF] = useState({ title: "", assignedTo: initialAssignee, status: "", reminder: "", description: "" });
  const [error, setError] = useState("");
  const s = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }));
  const availableAssignees = assignees.length ? assignees : activeEmployees;
  return (
    <section className="hr-assign-task-page">
      <Card>
        <div className="hr-assign-task-card">
          <h2>Assign Task to CRM Executive</h2>
          <form className="hr-assign-task-form" onSubmit={(event) => {
            event.preventDefault();
            if (!f.assignedTo) {
              setError("Select an employee to assign this task.");
              return;
            }
            const selectedEmployee = availableAssignees.find((employee) => employee.id === Number(f.assignedTo));
            if (!selectedEmployee) {
              setError("The selected employee is no longer available.");
              return;
            }
            upd((data) => ({
              tasks: [...data.tasks, {
                id: Date.now(),
                title: f.title.trim(),
                description: f.description.trim(),
                assignedTo: Number(f.assignedTo),
                assignedBy: 1,
                due: "",
                priority: "Medium",
                status: f.status,
                reminder: f.reminder,
              }],
            }), `Task assigned to ${selectedEmployee.name}`);
            setError("");
            setF({ title: "", assignedTo: initialAssignee, status: "", reminder: "", description: "" });
            go("Assigned Tasks");
          }}>
            <F l="Task Name">
              <input required maxLength={120} placeholder="Enter task name" value={f.title} onChange={s("title")} />
            </F>
            <F l="Select CRM Executives">
              <select required value={f.assignedTo} onChange={s("assignedTo")}>
                <option value="">Select CRM Executives</option>
                {availableAssignees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </F>
            <F l="Status">
              <select required value={f.status} onChange={s("status")}>
                <option value="">Select Status</option>
                {["Pending", "In Progress", "Done"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </F>
            <F l="Select Reminder Type">
              <select value={f.reminder} onChange={s("reminder")}>
                <option value="">Select Reminder Type</option>
                {["None", "Daily", "Weekly", "Before due date"].map((reminder) => <option key={reminder}>{reminder}</option>)}
              </select>
            </F>
            <F l="Description (Optional)">
              <textarea rows={3} maxLength={1000} placeholder="Provide details (optional)" value={f.description} onChange={s("description")} />
            </F>
            {error && <p className="hr-form-error hr-assign-task-error" role="alert">{error}</p>}
            <button className="hr-assign-task-submit" type="submit">Assign Task</button>
          </form>
        </div>
      </Card>
    </section>
  );
}
function AssignedTasks({ c: { db, upd } }) {
  const rows = (db.tasks || []).filter((task) => task.assignedBy === 1);
  const statusLabel = (status) => status === "Done" ? "Completed" : status || "Pending";
  const statusClass = (status) => {
    const normalized = statusLabel(status).toLowerCase().replace(/\s+/g, "-");
    return normalized === "completed" ? "completed" : normalized === "in-progress" ? "in-progress" : "pending";
  };
  const deleteTask = (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    upd((data) => ({ tasks: data.tasks.filter((item) => item.id !== task.id) }), "Task deleted");
  };
  return (
    <section className="hr-assigned-tasks-page">
      <Card>
        <div className="hr-assigned-tasks-card">
          <h2>Tasks Assigned to Employees</h2>
          <div className="hr-tw">
            <table className="hr-t hr-assigned-tasks-table">
              <thead><tr>{["Task Name", "Description", "Assigned To", "Status", "Actions"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
              <tbody>{rows.map((task) => {
                const assignee = db.emps.find((employee) => String(employee.id) === String(task.assignedTo));
                return (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.description || "—"}</td>
                    <td>{assignee?.name || "Unassigned"}</td>
                    <td><span className={`hr-assigned-task-status ${statusClass(task.status)}`}>{statusLabel(task.status)}</span></td>
                    <td><button className="hr-assigned-task-delete" type="button" onClick={() => deleteTask(task)}><Trash2 size={14} /> Delete</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
            {!rows.length && <Empty t="You haven't assigned any tasks yet." />}
          </div>
        </div>
      </Card>
    </section>
  );
}
const MyTask = ({ c }) => <TaskTable c={c} rows={c.db.tasks.filter((t) => t.assignedTo === 1)} empty="No tasks assigned to you." />;
function AllTask({ c }) {
  const { db, upd } = c;
  const [executiveId, setExecutiveId] = useState("");
  const allRows = db.tasks || [];
  const executiveIds = [...new Set(allRows.map((task) => String(task.assignedBy ?? "")).filter(Boolean))];
  const rows = allRows.filter((task) => !executiveId || String(task.assignedBy) === executiveId);
  const statusLabel = (status) => status === "Done" ? "Completed" : status || "Pending";
  const statusClass = (status) => {
    const normalized = statusLabel(status).toLowerCase().replace(/\s+/g, "-");
    return normalized === "completed" ? "completed" : normalized === "in-progress" ? "in-progress" : "pending";
  };
  const exportRows = rows.map((task) => {
    const assignee = db.emps.find((employee) => String(employee.id) === String(task.assignedTo));
    return [
      task.title || "—",
      task.description || "—",
      nm(db, task.assignedBy),
      assignee?.name || "Unassigned",
      statusLabel(task.status),
    ];
  });
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    pdf.setFontSize(18);
    pdf.text("Tasks Assigned to Employees", 36, 36);
    autoTable(pdf, {
      startY: 54,
      head: [["Task Name", "Description", "Assigned Executive Name", "Assigned To", "Status"]],
      body: exportRows,
      styles: { fontSize: 9, cellPadding: 7 },
      headStyles: { fillColor: [141, 94, 56] },
      theme: "grid",
    });
    pdf.save(`all-tasks-${iso()}.pdf`);
  };
  const deleteTask = (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    upd((data) => ({ tasks: data.tasks.filter((item) => item.id !== task.id) }), "Task deleted");
  };

  return (
    <section className="hr-all-tasks-page">
      <h2 className="hr-all-tasks-title">Tasks Assigned to Employees</h2>
      <div className="hr-all-tasks-toolbar">
        <F l="Select Executive">
          <select value={executiveId} onChange={(event) => setExecutiveId(event.target.value)}>
            <option value="">-- Select Executive --</option>
            {executiveIds.map((id) => <option key={id} value={id}>{nm(db, id)}</option>)}
          </select>
        </F>
        <button className="hr-all-tasks-export" type="button" onClick={exportPdf} disabled={!rows.length}><FileText size={15} /> Export PDF</button>
      </div>
      <Card>
        <div className="hr-tw">
          <table className="hr-t hr-all-tasks-table">
            <thead><tr>{["Task Name", "Description", "Assigned Executive Name", "Assigned To", "Status", "Actions"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{rows.map((task) => {
              const assignee = db.emps.find((employee) => String(employee.id) === String(task.assignedTo));
              return (
                <tr key={task.id}>
                  <td>{task.title || "—"}</td>
                  <td>{task.description || "—"}</td>
                  <td>{nm(db, task.assignedBy)}</td>
                  <td>{assignee?.name || "Unassigned"}</td>
                  <td><span className={`hr-assigned-task-status ${statusClass(task.status)}`}>{statusLabel(task.status)}</span></td>
                  <td><button className="hr-all-tasks-delete" type="button" onClick={() => deleteTask(task)}><Trash2 size={14} /> Delete</button></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!rows.length && <Empty t={executiveId ? "No tasks assigned by this executive." : "No tasks have been assigned yet."} />}
        </div>
      </Card>
    </section>
  );
}

/* ================= Upload / Settings ================= */
const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const CRM_FIELD_ALIASES = {
  date: ["date", "calldate", "createddate"],
  name: ["name", "customername", "leadname", "businessname", "clientname"],
  contact: ["contact", "phone", "phonenumber", "mobile", "mobilenumber"],
  callStatus: ["callstatus", "status"],
  visitType: ["visittype", "visit"],
  loanStatus: ["loanstatus"],
  remarks: ["remarks", "remark", "notes", "comment"],
};
const getCRMField = (row, field) => {
  const aliases = CRM_FIELD_ALIASES[field];
  const key = Object.keys(row).find((header) => aliases.includes(normalizeHeader(header)));
  return key ? String(row[key] ?? "").trim() : "";
};
const parseCRMDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return iso(value);
  const text = String(value || "").trim();
  if (!text) return TODAY;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? TODAY : iso(parsed);
};
function UploadCRM({ c: { db, upd } }) {
  const [employeeId, setEmployeeId] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const activeEmployees = act(db);
  const records = db.crmRecords || [];
  const employeeName = (id) => db.emps.find((employee) => String(employee.id) === String(id))?.name || "Unassigned";
  const visibleRecords = records.filter((record) => (!dateFilter || record.date === dateFilter)
    && (!employeeFilter || String(record.employeeId) === employeeFilter));
  const visibleIds = visibleRecords.map((record) => record.id);
  const visibleSelectedIds = selected.filter((id) => visibleIds.includes(id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const csvTemplate = `data:text/csv;charset=utf-8,${encodeURIComponent("Date,Name,Contact,Call Status,Visit Type,Loan Status,Remarks\n2026-10-15,Sample Customer,9876543210,Pending,Phone,Not Interested,Follow up next week\n")}`;
  const readFile = async (event) => {
    const file = event.target.files?.[0];
    setError("");
    setPreviewRows([]);
    setFileName(file?.name || "");
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The selected file does not contain a worksheet.");
      const inputRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      if (!inputRows.length) throw new Error("The selected file has no data rows.");
      const parsedRows = inputRows.map((row) => ({
        date: parseCRMDate(getCRMField(row, "date")),
        name: getCRMField(row, "name"),
        contact: getCRMField(row, "contact"),
        callStatus: getCRMField(row, "callStatus") || "Pending",
        visitType: getCRMField(row, "visitType"),
        loanStatus: getCRMField(row, "loanStatus"),
        remarks: getCRMField(row, "remarks"),
      })).filter((row) => row.name || row.contact);
      if (!parsedRows.length) {
        throw new Error("No valid records found. Include at least a Name or Contact column with data.");
      }
      setPreviewRows(parsedRows);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Unable to read the selected file.");
    }
  };
  const uploadRecords = (event) => {
    event.preventDefault();
    if (!previewRows.length) {
      setError("Choose a CSV or Excel file containing valid call-list records.");
      return;
    }
    if (!employeeId) {
      setError("Select an employee to assign these records to.");
      return;
    }
    const assignedEmployee = activeEmployees.find((employee) => String(employee.id) === employeeId);
    if (!assignedEmployee) {
      setError("The selected employee is no longer active.");
      return;
    }
    upd((data) => {
      const existing = data.crmRecords || [];
      const firstId = existing.reduce((max, record) => Math.max(max, Number(record.id) || 0), 0) + 1;
      return {
        crmRecords: [...existing, ...previewRows.map((row, index) => ({
          ...row,
          id: firstId + index,
          employeeId: assignedEmployee.id,
          uploadedAt: new Date().toISOString(),
        }))],
      };
    }, `Uploaded ${previewRows.length} CRM records for ${assignedEmployee.name}`);
    setPreviewRows([]);
    setSelected([]);
    setFileName("");
    setEmployeeId("");
    setError("");
    event.currentTarget.reset();
  };
  const toggleRecord = (id) => setSelected((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);
  const toggleVisible = () => setSelected((current) => allVisibleSelected
    ? current.filter((id) => !visibleIds.includes(id))
    : [...new Set([...current, ...visibleIds])]);
  const deleteSelected = () => {
    if (!visibleSelectedIds.length) return;
    if (!window.confirm(`Delete ${visibleSelectedIds.length} selected CRM record${visibleSelectedIds.length === 1 ? "" : "s"}?`)) return;
    const selectedIds = new Set(visibleSelectedIds);
    upd((data) => ({ crmRecords: (data.crmRecords || []).filter((record) => !selectedIds.has(record.id)) }), `Deleted ${visibleSelectedIds.length} CRM records`);
    setSelected((current) => current.filter((id) => !selectedIds.has(id)));
  };
  const deleteRecord = (record) => {
    if (!window.confirm(`Delete the CRM record for "${record.name || record.contact}"?`)) return;
    upd((data) => ({ crmRecords: (data.crmRecords || []).filter((item) => item.id !== record.id) }), "CRM record deleted");
    setSelected((current) => current.filter((id) => id !== record.id));
  };
  return (
    <section className="hr-crm-upload-page">
      <h2>Upload CRM Data</h2>
      <Card>
        <div className="hr-crm-panel-heading"><Upload size={16} /> Upload New Call List</div>
        <form className="hr-crm-upload-form" onSubmit={uploadRecords}>
          <F l="Assign to Employee">
            <select required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">Select Employee</option>
              {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </F>
          <F l="Upload Call List (CSV/XLSX)">
            <input required type="file" accept=".csv,.xlsx,.xls" onChange={readFile} />
          </F>
          <button className="hr-crm-upload-submit" type="submit"><Upload size={14} /> Upload</button>
          <a className="hr-crm-template" href={csvTemplate} download="crm-call-list-template.csv">Download CSV template</a>
        </form>
        {fileName && <p className="hr-crm-file-name">Selected file: {fileName}{previewRows.length ? ` · ${previewRows.length} records ready` : ""}</p>}
        {error && <p className="hr-form-error hr-crm-error" role="alert">{error}</p>}
        {previewRows.length > 0 && (
          <div className="hr-crm-preview">
            <strong>Preview ({previewRows.length} records)</strong>
            <Table rows={previewRows.slice(0, 5)} cols={[
              ["Date", (row) => row.date], ["Name", (row) => row.name || "—"], ["Contact", (row) => row.contact || "—"],
              ["Call Status", (row) => row.callStatus], ["Remarks", (row) => row.remarks || "—"],
            ]} />
          </div>
        )}
      </Card>

      <Card>
        <div className="hr-crm-panel-heading"><ClipboardList size={16} /> Call List Records Directory</div>
        <div className="hr-crm-directory-tools">
          <F l="Filter by Date"><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></F>
          <F l="Filter by CRM Employee">
            <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
              <option value="">All CRM Employees</option>
              {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </F>
          <button className="hr-crm-filter-reset" type="button" onClick={() => { setDateFilter(""); setEmployeeFilter(""); }}>Reset Filters</button>
        </div>
        <div className="hr-crm-selection-bar">
          <span>{visibleSelectedIds.length} selected</span>
          <button className="hr-crm-delete-selected" type="button" onClick={deleteSelected} disabled={!visibleSelectedIds.length}><Trash2 size={14} /> Delete Selected</button>
        </div>
        <div className="hr-tw">
          <table className="hr-t hr-crm-records-table">
            <thead><tr>
              <th><input type="checkbox" aria-label="Select all visible records" checked={allVisibleSelected} onChange={toggleVisible} /></th>
              {["S.NO.", "DATE", "NAME", "CONTACT", "CALL STATUS", "VISIT TYPE", "LOAN STATUS", "REMARKS", "CRM EMPLOYEE", "ACTION"].map((heading) => <th key={heading}>{heading}</th>)}
            </tr></thead>
            <tbody>{visibleRecords.map((record, index) => (
              <tr key={record.id}>
                <td><input type="checkbox" aria-label={`Select ${record.name || record.contact}`} checked={selected.includes(record.id)} onChange={() => toggleRecord(record.id)} /></td>
                <td>{index + 1}</td>
                <td>{record.date}</td>
                <td>{record.name || "—"}</td>
                <td>{record.contact || "—"}</td>
                <td>{record.callStatus || "—"}</td>
                <td>{record.visitType || "—"}</td>
                <td>{record.loanStatus || "—"}</td>
                <td>{record.remarks || "—"}</td>
                <td><span className="hr-crm-employee-pill">{employeeName(record.employeeId)}</span></td>
                <td><button className="hr-crm-delete-one" type="button" aria-label={`Delete ${record.name || record.contact}`} onClick={() => deleteRecord(record)}><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
          {!visibleRecords.length && <Empty t="No call-list records match these filters." />}
        </div>
      </Card>
    </section>
  );
}
function SettingsPage({ c: { db, upd, setDb, darkMode, toggleDarkMode, user } }) {
  const [form, setForm] = useState(() => ({
    ...db.me,
    dob: db.me.dob || "",
    gender: db.me.gender || "",
    personalEmail: db.me.personalEmail || "",
    email: db.me.email || "",
    phone: db.me.phone || "",
    maritalStatus: db.me.maritalStatus || "",
    education: db.me.education || "",
    address: db.me.address || "",
    emergencyName: db.me.emergencyName || "",
    emergencyRelationship: db.me.emergencyRelationship || "",
    emergencyPhone: db.me.emergencyPhone || "",
    panNumber: db.me.panNumber || "",
    aadhaarNumber: db.me.aadhaarNumber || "",
    bankName: db.me.bankName || "",
    accountHolder: db.me.accountHolder || "",
    accountNumber: db.me.accountNumber || "",
    ifscCode: db.me.ifscCode || "",
    bankBranch: db.me.bankBranch || "",
    photo: db.me.photo || "",
    documents: db.me.documents || {},
  }));
  const [fileErrors, setFileErrors] = useState({});
  const [photoPreview, setPhotoPreview] = useState(false);
  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const uploadFile = async (event, key, isPhoto = false) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (isPhoto && !file.type.startsWith("image/")) {
      setFileErrors((current) => ({ ...current, [key]: "Choose an image file." }));
      return;
    }
    if (isPhoto && file.size > 5 * 1024 * 1024) {
      setFileErrors((current) => ({ ...current, [key]: "Choose an image smaller than 5 MB." }));
      return;
    }
    if (!isPhoto && file.size > 512 * 1024) {
      setFileErrors((current) => ({ ...current, [key]: "Choose a document smaller than 512 KB." }));
      return;
    }
    try {
      const processed = isPhoto ? await compressImageFile(file) : file;
      if (processed.size > 512 * 1024) {
        setFileErrors((current) => ({ ...current, [key]: "File must be smaller than 512 KB after compression." }));
        return;
      }
      const data = await readUploadedFile(processed);
      if (isPhoto) {
        setForm((current) => ({ ...current, photo: data }));
      } else {
        setForm((current) => ({
          ...current,
          documents: { ...current.documents, [key]: { name: file.name, type: file.type, data } },
        }));
      }
      setFileErrors((current) => ({ ...current, [key]: "" }));
    } catch (error) {
      setFileErrors((current) => ({ ...current, [key]: error instanceof Error ? error.message : "Unable to process this file." }));
    }
  };
  const saveSettings = (event) => {
    event.preventDefault();
    if (Object.values(fileErrors).some(Boolean)) return;
    upd((data) => ({ me: { ...data.me, ...form, settingsSaved: true } }), "Account settings saved");
  };
  const documentLabels = [
    ["aadhaarDocument", "Aadhaar Card", CreditCard],
    ["panDocument", "PAN Card", CreditCard],
    ["bankDocument", "Bank Passbook / Cheque", Wallet],
    ["resumeDocument", "Resume / CV", FileText],
    ["offerDocument", "Offer Letter", FileText],
    ["appointmentDocument", "Appointment Letter", FileText],
    ["otherDocument", "Other Documents", FileText],
  ];
  return (
    <section className="hr-settings-page">
      <div className="hr-settings-page-heading">
        <h2><UserCircle size={25} /> Account Settings</h2>
        <button className="hr-ghost hr-settings-theme-toggle" type="button" onClick={toggleDarkMode}>{darkMode ? <><Sun size={15} /> Switch to Light Mode</> : <><Moon size={15} /> Toggle Dark Mode</>}</button>
      </div>
      <div className="hr-settings-layout">
        <form className="hr-settings-form" onSubmit={saveSettings}>
          <section className="hr-settings-section">
            <h3><Users size={16} /> 1. Personal Details</h3>
            <div className="hr-settings-section-content">
              <div className="hr-settings-photo">
                {form.photo
                  ? <img src={form.photo} alt="HR profile" />
                  : <div className="hr-settings-photo-placeholder"><UserCircle size={42} /></div>}
                <div className="hr-settings-photo-input">
                  <F l="Profile Picture"><input type="file" accept="image/*" onChange={(event) => uploadFile(event, "photo", true)} /></F>
                  <small>JPG, PNG, GIF, WEBP up to 5 MB</small>
                  {form.photo && <button className="hr-settings-view-photo" type="button" onClick={() => setPhotoPreview(true)}><Eye size={14} /> View Current Photo</button>}
                  {fileErrors.photo && <small className="hr-form-error">{fileErrors.photo}</small>}
                </div>
              </div>
              <div className="hr-settings-fields">
                <F l="Full Name *"><input required value={form.name || ""} onChange={setField("name")} /></F>
                <F l="Date of Birth"><input type="date" value={form.dob} onChange={setField("dob")} /></F>
                <F l="Gender"><select value={form.gender} onChange={setField("gender")}><option value="">Select Gender</option>{["Female", "Male", "Non-binary", "Prefer not to say"].map((value) => <option key={value}>{value}</option>)}</select></F>
                <F l="Personal Email"><input type="email" value={form.personalEmail} onChange={setField("personalEmail")} placeholder="e.g. name@gmail.com" /></F>
                <F l="Work / Official Email"><input type="email" value={form.email} onChange={setField("email")} /></F>
                <F l="Personal Mobile Number (10 Digits)"><input inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.phone} onChange={setField("phone")} /></F>
                <F l="Marital Status"><select value={form.maritalStatus} onChange={setField("maritalStatus")}><option value="">Select Status</option>{["Single", "Married", "Divorced", "Widowed"].map((value) => <option key={value}>{value}</option>)}</select></F>
                <F l="Education / Qualification"><input value={form.education} onChange={setField("education")} /></F>
                <F className="hr-settings-wide" l="Residential Address"><textarea rows={3} value={form.address} onChange={setField("address")} /></F>
              </div>
            </div>
          </section>

          <section className="hr-settings-section">
            <h3><Phone size={16} /> 2. Emergency Contact</h3>
            <div className="hr-settings-section-content hr-settings-fields">
              <F l="Emergency Contact Name"><input value={form.emergencyName} onChange={setField("emergencyName")} placeholder="e.g. Father/Spouse Name" /></F>
              <F l="Relationship"><input value={form.emergencyRelationship} onChange={setField("emergencyRelationship")} placeholder="e.g. Father, Mother, Spouse, Sibling" /></F>
              <F l="Emergency Contact Number (10 Digits)"><input inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.emergencyPhone} onChange={setField("emergencyPhone")} /></F>
            </div>
          </section>

          <section className="hr-settings-section">
            <h3><CreditCard size={16} /> 3. Identity &amp; KYC Details (PAN &amp; Aadhaar)</h3>
            <div className="hr-settings-section-content hr-settings-fields">
              <F l="PAN Card Number (10 Characters)"><input placeholder="ABCDE1234F" pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" maxLength={10} value={form.panNumber} onChange={setField("panNumber")} /></F>
              <F l="Aadhaar Card Number (12 Digits)"><input inputMode="numeric" pattern="[0-9]{12}" maxLength={12} placeholder="12-digit Aadhaar Number" value={form.aadhaarNumber} onChange={setField("aadhaarNumber")} /></F>
            </div>
          </section>

          <section className="hr-settings-section">
            <h3><Wallet size={16} /> 4. Bank Details</h3>
            <div className="hr-settings-section-content hr-settings-fields">
              <F l="Bank Name"><input value={form.bankName} onChange={setField("bankName")} /></F>
              <F l="Account Holder Name"><input value={form.accountHolder} onChange={setField("accountHolder")} /></F>
              <F l="Account Number"><input inputMode="numeric" value={form.accountNumber} onChange={setField("accountNumber")} /></F>
              <F l="IFSC Code"><input value={form.ifscCode} onChange={setField("ifscCode")} /></F>
              <F l="Bank Branch"><input value={form.bankBranch} onChange={setField("bankBranch")} /></F>
            </div>
          </section>

          <section className="hr-settings-section">
            <h3><Upload size={16} /> 5. Document Attachments &amp; Uploads</h3>
            <div className="hr-settings-section-content hr-settings-documents">
              {documentLabels.map(([key, label, Icon]) => {
                const document = form.documents[key];
                return (
                  <div className="hr-settings-document" key={key}>
                    <strong><Icon size={14} /> {label}</strong>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" aria-label={`Upload ${label}`} onChange={(event) => uploadFile(event, key)} />
                    {fileErrors[key] && <small className="hr-form-error">{fileErrors[key]}</small>}
                    {document?.data
                      ? <a className="hr-settings-document-link" href={document.data} target="_blank" rel="noreferrer"><Eye size={13} /> View {document.name}</a>
                      : <span className="hr-settings-document-missing">Not Uploaded</span>}
                  </div>
                );
              })}
            </div>
          </section>
          <button className="hr-btn hr-settings-save" type="submit"><Check size={15} /> Save Profile &amp; KYC Changes</button>
        </form>

        <aside className="hr-settings-password">
          <h3><LockKeyhole size={16} /> Change Password</h3>
          <div className="hr-settings-password-content">
            <PasswordResetLink userId={user?._id || user?.id} email={user?.email || form.email} />
          </div>
        </aside>
      </div>
      {photoPreview && form.photo && <div className="hr-modal hr-settings-photo-modal" onClick={() => setPhotoPreview(false)}><div className="hr-card" role="dialog" aria-modal="true" aria-label="Current profile photo" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Close photo preview" onClick={() => setPhotoPreview(false)}><X size={18} /></button><img src={form.photo} alt="Current HR profile" /></div></div>}
      <Card title="Demo data"><p className="hr-note">HR dashboard information is saved in this browser only.</p>
        <button className="hr-ghost" onClick={() => window.confirm("Reset all HR dashboard data?") && setDb(seed())}>Reset sample data</button></Card>
    </section>
  );
}

/* ================= App shell ================= */
const NAV = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Employee Management", icon: Users, kids: [["Create Profile", UserPlus], ["Employee Profiles", Users], ["Ex Employee Profiles", UserX], ["View All Employee", CreditCard], ["Salary Report", FileText], ["ID Card", CreditCard], ["Payroll System", Wallet]] },
  { label: "Attendance Management", icon: CalendarCheck, kids: [["Mark Attendance", Check], ["Attendance Report", FileText], ["All Attendance Report", Users], ["Mark Attendance All", UserCheck], ["Leave Request", CalendarClock], ["View All Leave Request", Briefcase]] },
  { label: "Task Reports", icon: ListChecks, kids: [["Assigned Tasks", ClipboardList], ["My Task", UserCog], ["All Task", ClipboardCheck]] },
  { label: "Upload CRM Data", icon: Upload },
  { label: "Employee Workspace", icon: CalendarClock },
  { label: "HR Calendar", icon: CalendarDays },
  { label: "HR AI Assistant", icon: Sparkles },
  { label: "Settings", icon: Settings },
];

export default function HrDashboard({ user, onLogout } = {}) {
  const [db, setDb] = useState(load);
  const [page, setPage] = useState("Dashboard");
  const [open, setOpen] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [out, setOut] = useState(false);
  const [toast, setToast] = useState("");
  const [idSel, setIdSel] = useState(1);
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("hr_dashboard_dark_mode") === "true";
    } catch (error) {
      console.warn("Unable to read the HR dashboard theme preference.", error);
      return false;
    }
  });
  const loading = usePageLoading(page);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } }, [db]);
  useEffect(() => {
    try {
      localStorage.setItem("hr_dashboard_dark_mode", String(darkMode));
    } catch (error) {
      console.warn("Unable to save the HR dashboard theme preference.", error);
    }
  }, [darkMode]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  const upd = (fn, msg) => {
    setDb((d) => ({ ...d, ...fn(d), log: msg ? [{ t: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), m: msg }, ...d.log].slice(0, 8) : d.log }));
    if (msg) setToast(msg);
  };
  const go = (target) => { const p = ["Assign Tasks", "HR Planner"].includes(target) ? "Employee Workspace" : target; setPage(p); setDrawer(false); const g = NAV.find((n) => n.kids?.some((k) => k[0] === p)); if (g) setOpen(g.label); };
  const profile = user ? {
    ...db.me,
    name: db.me.settingsSaved ? db.me.name : user.name || user.username || db.me.name || "HR",
    role: user.position || user.role || "HR",
    branch: user.branch || db.me.branch,
    crm: String(user.crmId || user.id || user._id || db.me.crm),
  } : db.me;
  const c = {
    db: { ...db, me: profile },
    user,
    upd,
    go,
    setDb,
    darkMode,
    toggleDarkMode: () => setDarkMode((current) => !current),
  };
  const pend = db.leaves.filter((l) => l.status === "Pending").length;

  const PAGES = {
    Dashboard: <Dash c={c} />, "Create Profile": <CreateProfile c={c} />,
    "Employee Profiles": <EmpList c={c} cards setId={setIdSel} />, "View All Employee": <AllEmployees c={c} />,
    "Ex Employee Profiles": <ExEmployees c={c} />, "Salary Report": <SalaryReport c={c} />, "ID Card": <IDCard c={c} id={idSel} setId={setIdSel} />, "Payroll System": <Payroll c={c} />,
    "Mark Attendance": <MarkAttendance c={c} />, "Attendance Report": <AttendanceReport c={c} />, "All Attendance Report": <AllAttendance c={c} />,
    "Mark Attendance All": <MarkAll c={c} />, "Leave Request": <LeaveRequest c={c} />, "View All Leave Request": <AllLeaves c={c} />,
    "Assigned Tasks": <AssignedTasks c={c} />, "My Task": <MyTask c={c} />, "All Task": <AllTask c={c} />,
    "Upload CRM Data": <UploadCRM c={c} />, Settings: <SettingsPage c={c} />,
    "Employee Workspace": <HrPlanner key={`${profile.company}:${profile.crm}`} employees={db.emps} profile={profile} tasks={db.tasks} updateTasks={(tasks) => upd(() => ({ tasks }))} />,
    "HR Calendar": <HrPeopleModules page="HR Calendar" c={c} />,
    "HR AI Assistant": <HrPeopleModules page="HR AI Assistant" c={c} />,
  };

  if (out) return (
    <div className="hr-shell hr-center">
      <div className="hr-card hr-box hr-login"><div className="hr-logo">S/T</div><h2>You're signed out</h2><p className="hr-note">Your data is saved in this browser.</p>
        <button className="hr-btn" onClick={() => { setOut(false); setPage("Dashboard"); }}>Sign in as {profile.name}</button></div>
    </div>);

  const q = query.trim().toLowerCase();
  const nav = q ? NAV.filter((n) => n.label.toLowerCase().includes(q) || n.kids?.some((k) => k[0].toLowerCase().includes(q))) : NAV;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={`hr-shell${darkMode ? " hr-dark-mode" : ""}`}>
      <aside className={`hr-side ${drawer ? "is-open" : ""}`}>
        <div className="hr-brand"><div className="hr-logo">S/T</div><div><strong>{profile.company.toUpperCase()}</strong><span>{profile.branch} HR Panel</span></div></div>
        <div className="hr-profile"><div className="hr-avatar">{profile.photo ? <img src={profile.photo} alt="" /> : profile.name.slice(0, 2).toUpperCase()}</div><strong>{profile.name}</strong><span>{profile.role}</span></div>
        <label className="hr-search"><Search size={16} /><input placeholder="Search modules..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <nav>{nav.map((it) => {
          const I = it.icon; const ex = it.kids && (open === it.label || !!q);
          const on = page === it.label || it.kids?.some((k) => k[0] === page);
          return (<div key={it.label}>
            <button className={`hr-nav ${on ? "is-active" : ""}`} onClick={() => (it.kids ? setOpen(open === it.label ? "" : it.label) : go(it.label))}>
              <I size={18} /><span>{it.label}</span>{it.kids && (ex ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
            </button>
            {ex && <div className="hr-sub">{it.kids.map(([l, KI]) => (
              <button key={l} className={`hr-subitem ${page === l ? "is-active" : ""}`} onClick={() => go(l)}><KI size={15} /> {l}</button>))}</div>}
          </div>);
        })}</nav>
        <button className="hr-nav hr-logout" onClick={() => onLogout ? onLogout() : setOut(true)}><LogOut size={18} /><span>Logout</span></button>
      </aside>

      <main className="hr-main">
        <header className="hr-top">
          <button className="hr-pill hr-burger" onClick={() => setDrawer(!drawer)} aria-label="Toggle menu">{drawer ? <X size={18} /> : <Menu size={18} />}</button>
          <div className="hr-title"><small>{profile.company}</small><h1>{getPageTitle(page)}</h1></div>
          <div className="hr-actions">
            <span className="hr-pill hr-date"><Calendar size={16} /> {today}</span>
            <button className="hr-pill" onClick={() => go("View All Leave Request")}><Bell size={16} /> Alerts{pend > 0 && <em className="hr-dot">{pend}</em>}</button>
            <button className="hr-btn" onClick={() => go("Create Profile")}><UserPlus size={16} /> Add employee</button>
            <button className="hr-btn" onClick={() => go("Assign Tasks")}><Plus size={16} /> Assign task</button>
          </div>
        </header>
        <div className="hr-scroll">
          {loading ? <div className="hr-loading" aria-busy="true" aria-label="Loading"><i /><i /><i /></div> : PAGES[page]}
        </div>
      </main>
      {toast && <div className="hr-toast" role="status">{toast}</div>}
    </div>
  );
}

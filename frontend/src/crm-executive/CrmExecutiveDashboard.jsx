import React, { useEffect, useMemo, useRef, useState } from "react";
import "./crmExecutive.css";
import "./crmExecutiveForm.css";

/* =========================================================================
   CRM EXECUTIVE DASHBOARD
   Frontend-only prototype for System Technologies (IT Services / Training /
   Internship / STIP). Reuses the exact Admin Dashboard visual theme
   (crmExecutive.css is a scoped copy of the Admin theme tokens/components).
   All data is mock + localStorage — no backend/API calls.
   ========================================================================= */

/* ---------------------------- small utilities --------------------------- */

let __idSeq = 0;
const genId = (prefix) => `${prefix}_${Date.now().toString(36)}_${__idSeq++}`;

const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayISO = () => toISO(new Date());
const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISO(d);
};
const formatDisplayDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};
const monthKeyOf = (iso) => (iso || "").slice(0, 7);
const clsx = (...parts) => parts.filter(Boolean).join(" ");

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (err) {
      /* ignore malformed storage */
    }
    return typeof initialValue === "function" ? initialValue() : initialValue;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      /* storage full / unavailable - ignore in this frontend-only prototype */
    }
  }, [key, state]);
  return [state, setState];
}

/* --------------------------------- icons -------------------------------- */

const Icon = ({ children, size = 18, className = "" }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const IconDashboard = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="9" rx="2" />
    <rect x="14" y="3" width="7" height="5" rx="2" />
    <rect x="14" y="12" width="7" height="9" rx="2" />
    <rect x="3" y="16" width="7" height="5" rx="2" />
  </Icon>
);
const IconPhone = (p) => (
  <Icon {...p}>
    <path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v4a2 2 0 0 1-2 2C9.5 21 3 14.5 3 6a2 2 0 0 1 2-2Z" />
  </Icon>
);
const IconWhatsapp = (p) => (
  <Icon {...p}>
    <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-3.9A8 8 0 1 1 20 11.5Z" />
    <path d="M9.2 8.8c.2 2.7 2 4.7 4.8 5.1" />
    <path d="m9.4 8.8 1.2 1.8-.9 1" />
    <path d="m14 13.9 1.5-.9 1.7 1.1" />
  </Icon>
);
const IconUsers = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M15.5 13.2A5 5 0 0 1 21 20" />
  </Icon>
);
const IconChart = (p) => (
  <Icon {...p}>
    <path d="M4 20V10" />
    <path d="M11 20V4" />
    <path d="M18 20v-7" />
    <path d="M3 20h18" />
  </Icon>
);
const IconSummary = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3.2 2" />
  </Icon>
);
const IconTasks = (p) => (
  <Icon {...p}>
    <path d="M9 6h11" />
    <path d="M9 12h11" />
    <path d="M9 18h11" />
    <path d="m4 6 1 1 2-2" />
    <path d="m4 12 1 1 2-2" />
    <path d="m4 18 1 1 2-2" />
  </Icon>
);
const IconAttendance = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M3 9h18" />
    <path d="M8 2v4M16 2v4" />
    <path d="m8 14 2.3 2.3L16 11" />
  </Icon>
);
const IconReport = (p) => (
  <Icon {...p}>
    <path d="M6 2h9l3 3v17H6Z" />
    <path d="M15 2v3h3" />
    <path d="M9 12h6M9 16h6M9 8h3" />
  </Icon>
);
const IconLeave = (p) => (
  <Icon {...p}>
    <path d="M4 21V9l8-6 8 6v12" />
    <path d="M9 21v-6h6v6" />
  </Icon>
);
const IconSettings = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19.6a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3.4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.5a1.7 1.7 0 0 0 1-1.55V3.4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.1a1.7 1.7 0 0 0 1.55 1H20.6a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
  </Icon>
);
const IconLogout = (p) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Icon>
);
const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-3.6-3.6" />
  </Icon>
);
const IconBell = (p) => (
  <Icon {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
);
const IconMenu = (p) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);
const IconClose = (p) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
const IconPlus = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
const IconEdit = (p) => (
  <Icon {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);
const IconTrash = (p) => (
  <Icon {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
);
const IconSnooze = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 1.5" />
    <path d="M9 2h6" />
  </Icon>
);
const IconResume = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m10 9 5 3-5 3Z" />
  </Icon>
);
const IconEye = (p) => (
  <Icon {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
const IconDownload = (p) => (
  <Icon {...p}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 21h16" />
  </Icon>
);
const IconCheck = (p) => (
  <Icon {...p}>
    <path d="m5 12 5 5 9-9" />
  </Icon>
);
const IconEyeOff = (p) => (
  <Icon {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2.2 2.2 0 0 0 3.1 3.1" />
    <path d="M6.5 6.9C4.3 8.3 2.7 10.3 2 12c0 0 3.5 7 10 7 1.7 0 3.2-.4 4.5-1.1" />
    <path d="M17.7 16.1C19.5 14.6 21 12 21 12s-3.5-7-10-7c-.7 0-1.4.07-2 .2" />
  </Icon>
);

/* --------------------------------- data ---------------------------------- */

const PROGRAMS = [
  "IT Services",
  "Web Development",
  "Software Development",
  "Digital Marketing",
  "IT Training",
  "Professional Training",
  "Internship",
  "STIP Program",
  "Placement Assistance",
  "Corporate Training",
  "Other",
];

const PROGRAM_CATEGORY = {
  "IT Services": "Services",
  "Web Development": "Services",
  "Software Development": "Services",
  "Digital Marketing": "Services",
  "Placement Assistance": "Services",
  "Corporate Training": "Services",
  Other: "Services",
  "IT Training": "Training",
  "Professional Training": "Training",
  Internship: "Internship",
  "STIP Program": "STIP",
};

const TRAINING_CALL_LIST_PROGRAMS = [
  "Front End Development Foundation",
  "Back End Development",
  "Full Stack Development",
  "Video Editing",
  "AutoCAD (2D & 3D)",
  "Wordpress Web Design",
  "Android App Development",
  "VFX & ANIMATION",
  "Graphics & Visual Designing",
  "Adobe Photoshop",
  "CorelDraw",
  "Digital marketing",
  "Adobe Illustrator",
  "3D INTERIOR EXTERIOR DESIGN",
];

const SERVICE_CALL_LIST_SERVICES = [
  "Website Development",
  "Android & iOS App Development",
  "Graphic Designing",
  "Branding & Brand Promotion",
  "Digital Marketing",
  "VFX & Animation",
  "CRM Solutions",
  "Cloud Solutions",
  "Marketing Tools & Automation",
  "Content Creation & Copywriting",
  "UI/UX Design",
  "Social Media Management",
  "E-commerce Development & Management",
  "Performance Marketing",
  "Influencer Marketing",
  "Photography & Videography",
  "Public Relations (PR)",
  "Bulk Marketing (Highlighted Service)",
];

function getCallListCategory(program) {
  if (SERVICE_CALL_LIST_SERVICES.includes(program)) return "Services";
  if (TRAINING_CALL_LIST_PROGRAMS.includes(program)) return "Training";
  return PROGRAM_CATEGORY[program];
}

const CALL_STATUS_OPTIONS = ["Choose", "Pending", "Follow Up", "Completed"];
const INTERACTION_TYPES = ["Call", "WhatsApp", "Email", "Walk-in", "Reference"];
const INTEREST_STATUS_OPTIONS = ["Hot", "Warm", "Cold", "Not Interested", "Converted"];
const CALL_LIST_INTEREST_STATUS_OPTIONS = ["Choose", "Interested", "Not Interested"];
const LEAD_SOURCES = ["Website", "Reference", "Walk-in", "Social Media", "Cold Call", "Advertisement"];
const LEAD_STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
const TASK_STATUSES = ["To Do", "In Progress", "Done"];
const TASK_PRIORITIES = ["Low", "Medium", "High"];
const ATTENDANCE_STATUSES = ["Present", "Absent", "Half Day", "Work From Home", "On Leave"];
const LEAVE_TYPES = ["Sick Leave", "Casual Leave", "Earned Leave", "Unpaid Leave"];
const TEAM_MEMBERS = ["Ekta", "Rahul Sharma", "Priya Nair", "Aman Gupta", "Sonia Verma"];

function interestBadgeClass(v) {
  switch (v) {
    case "Hot":
      return "danger";
    case "Warm":
      return "warning";
    case "Converted":
      return "success";
    case "Not Interested":
      return "neutral";
    default:
      return "info";
  }
}
function callStatusBadgeClass(v) {
  switch (v) {
    case "Connected":
      return "success";
    case "Busy":
    case "Switched Off":
      return "warning";
    case "Not Connected":
    case "Invalid Number":
      return "danger";
    default:
      return "neutral";
  }
}
function stageBadgeClass(v) {
  switch (v) {
    case "Won":
      return "success";
    case "Lost":
      return "danger";
    case "Proposal":
    case "Qualified":
      return "info";
    case "Contacted":
      return "warning";
    default:
      return "neutral";
  }
}
function priorityBadgeClass(v) {
  if (v === "High") return "danger";
  if (v === "Medium") return "warning";
  return "info";
}
function leaveStatusBadgeClass(v) {
  if (v === "Approved") return "success";
  if (v === "Rejected") return "danger";
  return "warning";
}

function seedContacts() {
  const base = [
    ["Rohit Malhotra", "9820011223", "IT Services", "Connected", "Hot", -1],
    ["Sneha Kulkarni", "9930022334", "Web Development", "Connected", "Warm", -1],
    ["Aditya Rane", "9821133445", "IT Training", "Not Connected", "Cold", -2],
    ["Priyanka Joshi", "9765544556", "Internship", "Connected", "Converted", -2],
    ["Karan Mehta", "9820099887", "STIP Program", "Busy", "Warm", -3],
    ["Neha Deshmukh", "9930088776", "Software Development", "Connected", "Hot", -3],
    ["Vikram Singh", "9821177665", "Digital Marketing", "Switched Off", "Cold", -4],
    ["Ananya Iyer", "9765566778", "Professional Training", "Connected", "Warm", -4],
    ["Farhan Sheikh", "9820055443", "Corporate Training", "Not Called", "Warm", -5],
    ["Ritu Chawla", "9930033221", "Placement Assistance", "Connected", "Converted", -5],
    ["Devansh Rao", "9821122556", "IT Services", "Invalid Number", "Cold", -6],
    ["Meera Pillai", "9765511998", "Web Development", "Connected", "Hot", -7],
    ["Suresh Bhat", "9820066112", "Internship", "Not Called", "Not Interested", -8],
    ["Ishaan Kapoor", "9930099001", "STIP Program", "Connected", "Warm", -9],
  ];
  return base.map(([name, contact, program, callStatus, interestStatus, offset], idx) => ({
    id: genId("contact"),
    date: addDays(todayISO(), offset),
    name,
    contact,
    callStatus,
    interactionType: INTERACTION_TYPES[idx % INTERACTION_TYPES.length],
    interestStatus,
    program,
    remark:
      idx % 3 === 0
        ? "Interested, follow up next week"
        : idx % 3 === 1
        ? "Requested brochure via email"
        : "",
    active: idx !== 8,
    snoozeUntil: idx === 5 ? addDays(todayISO(), 2) : idx === 12 ? addDays(todayISO(), -1) : null,
  }));
}

function seedLeads() {
  const base = [
    ["Arjun Nanda", "9811223344", "Web Development", "Website", "Qualified", 45000, "Ekta"],
    ["Divya Kher", "9822334455", "Software Development", "Reference", "Proposal", 120000, "Rahul Sharma"],
    ["Zoya Ansari", "9833445566", "IT Training", "Social Media", "New", 15000, "Priya Nair"],
    ["Kabir Sethi", "9844556677", "STIP Program", "Walk-in", "Contacted", 8000, "Ekta"],
    ["Lavanya Rau", "9855667788", "Corporate Training", "Cold Call", "Won", 95000, "Aman Gupta"],
    ["Yash Trivedi", "9866778899", "Internship", "Advertisement", "Lost", 6000, "Sonia Verma"],
    ["Riya Kapadia", "9877889900", "IT Services", "Website", "Qualified", 65000, "Ekta"],
    ["Nikhil Oberoi", "9888990011", "Digital Marketing", "Reference", "New", 32000, "Rahul Sharma"],
    ["Tara Bhatia", "9899001122", "Placement Assistance", "Walk-in", "Won", 20000, "Priya Nair"],
    ["Omkar Ghosh", "9800112233", "Professional Training", "Social Media", "Contacted", 18000, "Ekta"],
  ];
  return base.map(([name, contact, program, source, stage, value, assignedTo], idx) => ({
    id: genId("lead"),
    name,
    contact,
    program,
    source,
    stage,
    value,
    assignedTo,
    createdDate: addDays(todayISO(), -(idx + 2)),
    lastActivity: addDays(todayISO(), -idx),
  }));
}

function seedTasks() {
  const base = [
    ["Follow up with Riya Kapadia", "Confirm the IT Services quotation call", "Ekta", "High", "To Do", 1],
    ["Prepare STIP batch schedule", "Draft the September STIP program batch timetable", "Priya Nair", "Medium", "In Progress", 2],
    ["Send brochure to Zoya Ansari", "Email IT Training brochure + fee structure", "Rahul Sharma", "Low", "To Do", 0],
    ["Update CRM contact list", "Clean duplicate contacts from last week's calls", "Ekta", "Medium", "In Progress", 3],
    ["Corporate training proposal - Lavanya", "Finalize signed proposal document", "Aman Gupta", "High", "Done", -1],
    ["Internship offer letters", "Prepare offer letters for shortlisted interns", "Sonia Verma", "Medium", "To Do", 4],
    ["Weekly sales report", "Compile weekly call + conversion report", "Ekta", "High", "In Progress", 1],
    ["Placement drive follow-up", "Confirm employer partner for placement drive", "Ekta", "Low", "Done", -2],
  ];
  return base.map(([title, description, assignee, priority, status, offset]) => ({
    id: genId("task"),
    title,
    description,
    assignee,
    priority,
    status,
    dueDate: addDays(todayISO(), offset),
  }));
}

function seedAttendance() {
  const rows = [];
  for (let i = 1; i <= 12; i++) {
    const date = addDays(todayISO(), -i);
    const dow = new Date(`${date}T00:00:00`).getDay();
    if (dow === 0) continue; // skip Sundays
    let status = "Present";
    if (i === 4) status = "Half Day";
    if (i === 7) status = "On Leave";
    if (i === 10) status = "Work From Home";
    rows.push({
      id: genId("att"),
      date,
      status,
      checkIn: status === "On Leave" ? "-" : status === "Half Day" ? "10:00 AM" : "09:30 AM",
      checkOut: status === "On Leave" ? "-" : status === "Half Day" ? "02:00 PM" : "06:30 PM",
    });
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function seedLeaveRequests() {
  return [
    {
      id: genId("leave"),
      type: "Casual Leave",
      from: addDays(todayISO(), 6),
      to: addDays(todayISO(), 6),
      reason: "Personal work",
      status: "Pending",
      appliedOn: addDays(todayISO(), -1),
    },
    {
      id: genId("leave"),
      type: "Sick Leave",
      from: addDays(todayISO(), -9),
      to: addDays(todayISO(), -8),
      reason: "Fever and cold",
      status: "Approved",
      appliedOn: addDays(todayISO(), -10),
    },
    {
      id: genId("leave"),
      type: "Earned Leave",
      from: addDays(todayISO(), -20),
      to: addDays(todayISO(), -18),
      reason: "Family function",
      status: "Rejected",
      appliedOn: addDays(todayISO(), -22),
    },
  ];
}

const DEFAULT_PROFILE = {
  name: "Ekta",
  role: "CRM Executive",
  email: "ekta@systemtechnologies.in",
  phone: "9820000000",
  avatarUrl: "",
};

const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  smsAlerts: false,
  dailySummaryEmail: true,
  followUpReminders: true,
};

/* ------------------------------ shared bits ------------------------------ */

function Toast({ toast }) {
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}

function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => () => timerRef.current && window.clearTimeout(timerRef.current), []);
  return [toast, showToast];
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-surface" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={clsx("modal-shell", wide && "wide")}>
        <div className="modal-head">
          <strong>{title}</strong>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <IconClose size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, tone, label, value, hint }) {
  return (
    <div className="stat-card">
      <div className={clsx("stat-icon", tone)}>{icon}</div>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, text }) {
  return (
    <tr>
      <td colSpan={colSpan} className="panel-empty">
        {text}
      </td>
    </tr>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="pagination-row">
      <button className="icon-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={clsx("ghost-button compact", p === page && "active")}
          style={{ minHeight: 34, padding: "0 12px" }}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button className="icon-button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        ›
      </button>
    </div>
  );
}

function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")]
    .concat(rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================== DASHBOARD TAB ============================ */

function DashboardTab({ contacts, leads, tasks, leaveRequests, onNavigate }) {
  const totalContacts = contacts.length;
  const callsToday = contacts.filter((c) => c.date === todayISO()).length;
  const converted = contacts.filter((c) => c.interestStatus === "Converted").length;
  const conversionRate = totalContacts ? Math.round((converted / totalContacts) * 100) : 0;
  const pendingFollowUps = contacts.filter(
    (c) => c.active && (c.snoozeUntil ? c.snoozeUntil <= todayISO() : c.callStatus === "Not Called")
  );
  const openTasks = tasks.filter((t) => t.status !== "Done").length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === "Pending").length;

  const callStatusBreakdown = CALL_STATUS_OPTIONS.map((status) => ({
    status,
    count: contacts.filter((c) => c.callStatus === status).length,
  })).filter((r) => r.count > 0);
  const maxBreakdown = Math.max(1, ...callStatusBreakdown.map((r) => r.count));

  const recentActivity = [...contacts]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6)
    .map((c) => ({
      id: c.id,
      tone:
        c.interestStatus === "Converted" ? "success" : c.callStatus === "Not Connected" ? "danger" : c.callStatus === "Busy" ? "warning" : "info",
      title: `${c.name} — ${c.callStatus}`,
      meta: `${c.program} · ${c.interactionType}`,
      time: formatDisplayDate(c.date),
    }));

  const quickActions = [
    { label: "Add Contact", tab: "servicecalllist", icon: <IconPhone size={20} /> },
    { label: "Add Lead", tab: "leads", icon: <IconUsers size={20} /> },
    { label: "New Task", tab: "tasks", icon: <IconTasks size={20} /> },
    { label: "Mark Attendance", tab: "markattendance", icon: <IconAttendance size={20} /> },
    { label: "Sales Report", tab: "salesreports", icon: <IconChart size={20} /> },
  ];

  return (
    <div>
      <div className="stats-grid">
        <StatCard icon={<IconPhone size={20} />} tone="rose" value={totalContacts} label="Total Contacts" hint={`${callsToday} logged today`} />
        <StatCard icon={<IconUsers size={20} />} tone="blue" value={leads.length} label="Active Leads" hint={`${leads.filter((l) => l.stage === "Won").length} won`} />
        <StatCard icon={<IconSummary size={20} />} tone="green" value={`${conversionRate}%`} label="Conversion Rate" hint={`${converted} converted`} />
        <StatCard icon={<IconTasks size={20} />} tone="amber" value={openTasks} label="Open Tasks" hint={`${pendingLeaves} leave requests pending`} />
      </div>

      <div className="dashboard-grid">
        <div className="hero-card dashboard-hero">
          <div className="hero-card-top">
            <div>
              <p className="eyebrow">Overview</p>
              <h2 style={{ fontSize: "1.5rem" }}>Welcome back, keep the pipeline moving</h2>
            </div>
            <span className="hero-tag">
              <IconBell size={14} /> {pendingFollowUps.length} follow-ups due
            </span>
          </div>
          <p className="hero-copy">
            Track daily contacts across IT Services, Training, Internship and STIP programs, manage your leads pipeline, and
            keep your call performance on target.
          </p>
          <div className="signal-stack">
            {callStatusBreakdown.map((row) => (
              <div className="signal-card" key={row.status}>
                <div className={clsx("signal-icon", callStatusBadgeClass(row.status) === "success" ? "green" : callStatusBadgeClass(row.status) === "danger" ? "rose" : callStatusBadgeClass(row.status) === "warning" ? "amber" : "blue")}>
                  <IconPhone size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <strong>{row.status}</strong>
                  <p>{row.count} contacts</p>
                </div>
                <div className="mini-bar" style={{ width: 90, margin: 0 }}>
                  <i style={{ width: `${(row.count / maxBreakdown) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Pending Follow-ups</h3>
            <span className="badge warning">{pendingFollowUps.length}</span>
          </div>
          <div className="follow-up-list">
            {pendingFollowUps.length === 0 && <p className="panel-empty">No pending follow-ups. Great job!</p>}
            {pendingFollowUps.slice(0, 6).map((c) => (
              <div className="follow-up-item" key={c.id}>
                <span className="dot" />
                <div>
                  <strong style={{ display: "block" }}>{c.name}</strong>
                  <span style={{ color: "var(--text-soft)", fontSize: "0.84rem" }}>
                    {c.program} · {c.contact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Recent Activity</h3>
          </div>
          <div className="activity-list">
            {recentActivity.map((a) => (
              <div className={clsx("activity-item", a.tone)} key={a.id}>
                <span className="log-dot" style={{ marginTop: 6 }} />
                <div className="activity-body">
                  <strong>{a.title}</strong>
                  <span>{a.meta}</span>
                </div>
                <span className="activity-time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <p className="eyebrow">Quick actions</p>
        <div className="quick-actions-grid">
          {quickActions.map((qa) => (
            <button key={qa.tab} className="quick-action" onClick={() => onNavigate(qa.tab)}>
              {qa.icon}
              {qa.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================== CALL LIST TAB ============================= */

const CONTACT_PAGE_SIZE = 8;

function emptyContactForm() {
  return {
    id: null,
    date: todayISO(),
    name: "",
    contact: "",
    program: PROGRAMS[0],
    callStatus: "Choose",
    interactionType: "Call",
    interestStatus: "Choose",
    remark: "",
    active: true,
  };
}

function ContactFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.contact.trim() || !/^\d{7,15}$/.test(form.contact.trim())) nextErrors.contact = "Enter a valid phone number";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(form);
  };

  return (
    <Modal title={initial.id ? "Edit Contact" : "Add Contact"} onClose={onClose}>
      <div className="form-grid">
        <div className="field">
          <span>Full Name</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rohit Malhotra" />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <span>Contact Number</span>
          <input value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="e.g. 9820011223" />
          {errors.contact && <span className="field-error">{errors.contact}</span>}
        </div>
        <div className="field">
          <span>Date</span>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="field">
          <span>Program / Service</span>
          <select value={form.program} onChange={(e) => set("program", e.target.value)}>
            {PROGRAMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Call Status</span>
          <select value={form.callStatus} onChange={(e) => set("callStatus", e.target.value)}>
            {CALL_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Interaction Type</span>
          <select value={form.interactionType} onChange={(e) => set("interactionType", e.target.value)}>
            {INTERACTION_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Interest Status</span>
          <select value={form.interestStatus} onChange={(e) => set("interestStatus", e.target.value)}>
            {INTEREST_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Active</span>
          <select value={form.active ? "yes" : "no"} onChange={(e) => set("active", e.target.value === "yes")}>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </select>
        </div>
        <div className="field span-full">
          <span>Remark</span>
          <textarea value={form.remark} onChange={(e) => set("remark", e.target.value)} placeholder="Notes about this contact..." />
        </div>
      </div>
      <div className="form-actions">
        <button className="ghost-button" onClick={onClose}>
          Cancel
        </button>
        <button className="primary-button" onClick={() => onSave(form)}>
          <IconCheck size={16} /> Save Contact
        </button>
      </div>
    </Modal>
  );
}

function CallListTab({ contacts, setContacts, showToast, category, title, addLabel, currentUser }) {
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("All");
  const [callStatusFilter, setCallStatusFilter] = useState("All");
  const [interestFilter, setInterestFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [modalState, setModalState] = useState(null); // null | form object

  const filtered = useMemo(() => {
    let rows = contacts.filter((c) => {
      const matchesCategory = !category || getCallListCategory(c.program) === category;
      const matchesSearch =
        !search.trim() ||
        c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        c.contact.includes(search.trim());
      const matchesProgram = programFilter === "All" || c.program === programFilter;
      const matchesCallStatus = callStatusFilter === "All" || c.callStatus === callStatusFilter;
      const matchesInterest = interestFilter === "All" || c.interestStatus === interestFilter;
      const matchesDate = !dateFilter || c.date === dateFilter;
      return matchesCategory && matchesSearch && matchesProgram && matchesCallStatus && matchesInterest && matchesDate;
    });
    rows = rows.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "date") {
        av = a.date;
        bv = b.date;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [contacts, category, search, programFilter, callStatusFilter, interestFilter, dateFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CONTACT_PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * CONTACT_PAGE_SIZE, page * CONTACT_PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const updateContact = (id, patch) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleCall = (c) => {
    showToast(`Calling ${c.name} (${c.contact})…`);
    window.location.href = `tel:${c.contact}`;
  };
  const handleWhatsapp = (c) => {
    showToast(`Opening WhatsApp chat with ${c.name}…`);
    window.open(`https://wa.me/91${c.contact}`, "_blank", "noopener,noreferrer");
  };
  const handleSnooze = (c) => {
    const days = window.prompt(`Snooze follow-up for ${c.name} for how many days?`, "1");
    if (days === null) return;
    const n = Math.max(1, parseInt(days, 10) || 1);
    updateContact(c.id, { snoozeUntil: addDays(todayISO(), n) });
    showToast(`Snoozed until ${formatDisplayDate(addDays(todayISO(), n))}`);
  };
  const handleResume = (c) => {
    updateContact(c.id, { snoozeUntil: null });
    showToast(`${c.name} moved back to active follow-ups`);
  };
  const handleDelete = (c) => {
    if (window.confirm(`Delete contact "${c.name}"? This cannot be undone.`)) {
      setContacts((prev) => prev.filter((x) => x.id !== c.id));
      showToast("Contact deleted");
    }
  };
  const handleSaveModal = (form) => {
    if (form.id) {
      updateContact(form.id, form);
      showToast("Contact updated");
    } else {
      setContacts((prev) => [{ ...form, id: genId("contact"), snoozeUntil: null }, ...prev]);
      showToast("Contact added");
    }
    setModalState(null);
  };

  const resetFilters = () => {
    setSearch("");
    setProgramFilter("All");
    setCallStatusFilter("All");
    setInterestFilter("All");
    setDateFilter("");
    setSortKey("date");
    setSortDir("desc");
    setPage(1);
  };

  const isSnoozed = (c) => c.snoozeUntil && c.snoozeUntil > todayISO();

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
        <button className="primary-button" onClick={() => setModalState(emptyContactForm())}>
          <IconPlus size={16} /> {addLabel}
        </button>
      </div>

      <div className="module-toolbar">
        <div className="toolbar-search">
          <IconSearch size={16} />
          <input
            placeholder="Search by name or contact number"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="toolbar-filters">
          <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
            <option value="All">All {category === "Services" ? "Services" : category === "Training" ? "Training Programs" : "Programs"}</option>
            {(category === "Services" ? SERVICE_CALL_LIST_SERVICES : category === "Training" ? TRAINING_CALL_LIST_PROGRAMS : [...SERVICE_CALL_LIST_SERVICES, ...TRAINING_CALL_LIST_PROGRAMS]).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={callStatusFilter} onChange={(e) => setCallStatusFilter(e.target.value)}>
            <option value="All">All Call Status</option>
            {CALL_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={interestFilter} onChange={(e) => setInterestFilter(e.target.value)}>
            <option value="All">All Interest</option>
            {CALL_LIST_INTEREST_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <button type="button" className="ghost-button compact" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("date")}>
                Date {sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("name")}>
                Name {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th>Contact</th>
              <th>Call / WhatsApp</th>
              <th>CRM Executive Name</th>
              <th>Call Status</th>
              <th>Interest Status</th>
              <th>{category === "Services" ? "Service" : "Program"}</th>
              <th>Remark</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && <EmptyRow colSpan={11} text={`No ${category.toLowerCase()} contacts match the selected filters.`} />}
            {pageRows.map((c, idx) => (
              <tr key={c.id} style={{ opacity: c.active ? 1 : 0.55 }}>
                <td>{(page - 1) * CONTACT_PAGE_SIZE + idx + 1}</td>
                <td>{formatDisplayDate(c.date)}</td>
                <td>
                  <div className="person-cell">
                    <span className="avatar soft">{c.name.charAt(0)}</span>
                    <div>
                      <strong style={{ display: "block" }}>{c.name}</strong>
                      {isSnoozed(c) && <span className="badge warning" style={{ height: 20, fontSize: "0.7rem" }}>Snoozed till {formatDisplayDate(c.snoozeUntil)}</span>}
                    </div>
                  </div>
                </td>
                <td>{c.contact}</td>
                <td>
                  <div className="row-actions">
                    <button className="row-icon-btn call" title="Call" onClick={() => handleCall(c)}>
                      <IconPhone size={16} />
                    </button>
                    <button className="row-icon-btn whatsapp" title="WhatsApp" onClick={() => handleWhatsapp(c)}>
                      <IconWhatsapp size={16} />
                    </button>
                  </div>
                </td>
                <td>{c.crmExecutiveName || c.createdByName || c.createdBy || currentUser?.name || "-"}</td>
                <td>
                  <select
                    className="inline-select"
                    value={CALL_STATUS_OPTIONS.includes(c.callStatus) ? c.callStatus : "Choose"}
                    onChange={(e) => updateContact(c.id, { callStatus: e.target.value })}
                  >
                    {CALL_STATUS_OPTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="inline-select"
                    value={CALL_LIST_INTEREST_STATUS_OPTIONS.includes(c.interestStatus) ? c.interestStatus : "Choose"}
                    onChange={(e) => updateContact(c.id, { interestStatus: e.target.value })}
                  >
                    {CALL_LIST_INTEREST_STATUS_OPTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="inline-select call-list-program-select"
                    value={c.program || ""}
                    onChange={(e) => updateContact(c.id, { program: e.target.value })}
                    aria-label={category === "Services" ? "Service" : "Program"}
                  >
                    <option value="">
                      {category === "Services" ? "Select Service" : "Select Program"}
                    </option>
                    {!((category === "Services" ? SERVICE_CALL_LIST_SERVICES : TRAINING_CALL_LIST_PROGRAMS).includes(c.program)) && c.program ? (
                      <option value={c.program}>{c.program}</option>
                    ) : null}
                    {(category === "Services" ? SERVICE_CALL_LIST_SERVICES : TRAINING_CALL_LIST_PROGRAMS).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="remark-cell">
                    <input
                      value={c.remark}
                      placeholder="Add remark"
                      onChange={(e) => updateContact(c.id, { remark: e.target.value })}
                    />
                  </div>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="row-icon-btn edit" title="Edit" onClick={() => setModalState(c)}>
                      <IconEdit size={16} />
                    </button>
                    {isSnoozed(c) ? (
                      <button className="row-icon-btn snooze" title="Resume" onClick={() => handleResume(c)}>
                        <IconResume size={16} />
                      </button>
                    ) : (
                      <button className="row-icon-btn snooze" title="Snooze" onClick={() => handleSnooze(c)}>
                        <IconSnooze size={16} />
                      </button>
                    )}
                    <button className="row-icon-btn delete" title="Delete" onClick={() => handleDelete(c)}>
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {modalState && (
        <ContactFormModal initial={modalState} onClose={() => setModalState(null)} onSave={handleSaveModal} />
      )}
    </div>
  );
}

/* ================================ LEADS TAB =============================== */

function emptyLeadForm() {
  return {
    id: null,
    name: "",
    contact: "",
    program: PROGRAMS[0],
    source: LEAD_SOURCES[0],
    stage: "New",
    value: "",
    assignedTo: TEAM_MEMBERS[0],
  };
}

function AddLeadTab({ setLeads, showToast, currentUser }) {
  const enteredBy = currentUser
    ? `${currentUser.name || currentUser.username || "User"} (${currentUser.position || currentUser.role || "User"})`
    : "";
  const interestOptions = (type) => type === "Training" ? TRAINING_CALL_LIST_PROGRAMS : type === "Service" ? SERVICE_CALL_LIST_SERVICES : ["Internship"];
  const [form, setForm] = useState({
    name: "", phone: "", email: "", alternatePhone: "", city: "Ajmer", company: "",
    type: "Training", interest: TRAINING_CALL_LIST_PROGRAMS[0], value: "", status: "Pending", leadSource: "Website",
    assignedTo: TEAM_MEMBERS[0], assignedDate: todayISO(), notes: "",
  });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return showToast("Full name is required");
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) return showToast("Enter a valid 10-digit mobile number");
    if (!form.city.trim()) return showToast("City is required");
    if (!form.interest) return showToast("Interest is required");

    setLeads((previous) => [{
      id: genId("lead"), name: form.name.trim(), contact: form.phone.trim(), program: form.interest,
      source: form.leadSource, stage: form.status === "Interested" ? "Qualified" : form.status === "Not Interested" ? "Lost" : "New",
      value: Number(form.value || 0), assignedTo: form.assignedTo, enteredBy,
      ...form, createdDate: todayISO(), lastActivity: todayISO(),
    }, ...previous]);
    setForm({ ...form, name: "", phone: "", email: "", alternatePhone: "", company: "", interest: TRAINING_CALL_LIST_PROGRAMS[0], value: "", notes: "" });
    showToast("Lead added");
  };

  return (
    <div className="panel add-lead-panel">
      <form className="form-grid" onSubmit={handleSave}>
        <p className="form-section-title">Contact Information</p>
        <div className="field"><span>Full name *</span><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter the lead's full name here" /></div>
        <div className="field"><span>Phone *</span><input value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter the lead's phone number here" maxLength={10} /></div>
        <div className="field"><span>Email</span><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Enter the lead's email here" /></div>
        <div className="field"><span>Alternate Phone</span><input value={form.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter an alternate phone number here" /></div>
        <div className="field"><span>City *</span><input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Enter the city here" /></div>
        <div className="field"><span>Company / Organization</span><input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Enter the company or organization here" /></div>

        <p className="form-section-title">Lead Information</p>
        <div className="field"><span>Lead Type *</span><select value={form.type} onChange={(e) => { const type = e.target.value; setForm((current) => ({ ...current, type, interest: interestOptions(type)[0] })); }}><option>Training</option><option>Service</option><option>Internship</option></select></div>
        <div className="field"><span>Interest *</span><select value={form.interest} onChange={(e) => set("interest", e.target.value)}>{interestOptions(form.type).map((program) => <option key={program}>{program}</option>)}</select></div>
        <div className="field"><span>Value</span><input type="number" min="0" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="Enter the estimated value here" /></div>
        <div className="field"><span>Lead Source *</span><select value={form.leadSource} onChange={(e) => set("leadSource", e.target.value)}>{["Website", "Referral", "Facebook", "Instagram", "Google", "Walk-in", "Phone Call", "Other"].map((source) => <option key={source}>{source}</option>)}</select></div>
        <div className="field"><span>Status *</span><select value={form.status} onChange={(e) => set("status", e.target.value)}><option>Pending</option><option>Interested</option><option>Not Interested</option></select></div>

        <p className="form-section-title">Assignment</p>
        <div className="field"><span>Entered By *</span><input value={enteredBy} readOnly /></div>
        <div className="field"><span>Assigned To *</span><select value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>{TEAM_MEMBERS.map((member) => <option key={member}>{member}</option>)}</select></div>
        <div className="field"><span>Assigned Date</span><input type="date" value={form.assignedDate} onChange={(e) => set("assignedDate", e.target.value)} /></div>

        <p className="form-section-title">Additional Information</p>
        <div className="field span-full"><span>Lead Notes / Remarks</span><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Enter lead notes or requirements here" rows={4} /></div>
        <div className="form-actions span-full"><button className="primary-button" type="submit"><IconCheck size={16} /> Save lead</button></div>
      </form>
    </div>
  );
}

function AssignedLeadsTab({ leads, currentUser }) {
  const currentUserId = String(currentUser?.id || currentUser?._id || "").trim();
  const assignedLeads = leads.filter((lead) => String(lead.assignedTo || "").trim() === currentUserId);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Assigned Leads</h3>
          <p className="panel-subtitle">Leads assigned to {currentUser?.name || currentUser?.username || "you"}</p>
        </div>
        <span className="badge info">{assignedLeads.length}</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Interest</th>
              <th>Status</th>
              <th>Value (₹)</th>
              <th>Entered By</th>
              <th>Assigned Date</th>
            </tr>
          </thead>
          <tbody>
            {!assignedLeads.length && <EmptyRow colSpan={8} text="No leads have been assigned to you yet." />}
            {assignedLeads.map((lead, index) => (
              <tr key={lead.id || lead._id || `${lead.name}-${index}`}>
                <td>{index + 1}</td>
                <td><strong>{lead.name || "-"}</strong></td>
                <td>{lead.phone || lead.contact || "-"}</td>
                <td>{lead.interest || lead.program || "-"}</td>
                <td><span className="badge info">{lead.status || lead.stage || "Pending"}</span></td>
                <td>₹{Number(lead.value || 0).toLocaleString("en-IN")}</td>
                <td>{lead.enteredBy || lead.crmExecutive || "-"}</td>
                <td>{formatDisplayDate(lead.assignedDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={initial.id ? "Edit Lead" : "Add Lead"} onClose={onClose}>
      <div className="form-grid">
        <div className="field">
          <span>Full Name</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="field">
          <span>Contact Number</span>
          <input value={form.contact || ""} onChange={(e) => set("contact", e.target.value)} />
        </div>
        <div className="field">
          <span>Program / Service</span>
          <select value={form.program || ""} onChange={(e) => set("program", e.target.value)}>
            {[...new Set([...PROGRAMS, ...SERVICE_CALL_LIST_SERVICES, ...TRAINING_CALL_LIST_PROGRAMS])].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Interest Type</span>
          <select value={form.interestType || "Interested"} onChange={(e) => set("interestType", e.target.value)}>
            <option>Interested</option>
            <option>Not Interested</option>
          </select>
        </div>
        <div className="field">
          <span>Status</span>
          <select value={form.status || "Pending"} onChange={(e) => set("status", e.target.value)}>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
        <div className="field span-full">
          <span>Remark</span>
          <textarea value={form.remark || ""} onChange={(e) => set("remark", e.target.value)} />
        </div>
      </div>
      <div className="form-actions">
        <button className="ghost-button" onClick={onClose}>
          Cancel
        </button>
        <button className="primary-button" onClick={() => onSave(form)}>
          <IconCheck size={16} /> Save Lead
        </button>
      </div>
    </Modal>
  );
}

function LeadsTab({ leads, setLeads, showToast }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [programFilter, setProgramFilter] = useState("All");
  const [modalState, setModalState] = useState(null);

  const emptyLead = {
    id: null,
    createdDate: todayISO(),
    program: PROGRAMS[0],
    name: "",
    contact: "",
    interestType: "Interested",
    remark: "",
    status: "Pending",
  };

  const filtered = leads.filter((l) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || (l.name || "").toLowerCase().includes(query) || (l.contact || "").includes(query);
    const matchesStatus = statusFilter === "All" || (l.status || "Pending") === statusFilter;
    const matchesProgram = programFilter === "All" || l.program === programFilter;
    return matchesSearch && matchesStatus && matchesProgram;
  });

  const updateLead = (id, patch) => setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const handleDelete = (l) => {
    if (window.confirm(`Delete lead "${l.name}"?`)) {
      setLeads((prev) => prev.filter((x) => x.id !== l.id));
      showToast("Lead deleted");
    }
  };
  const handleSaveModal = (form) => {
    if (form.id) {
      updateLead(form.id, form);
      showToast("Lead updated");
    } else {
      setLeads((prev) => [{ ...form, id: genId("lead") }, ...prev]);
      showToast("Lead added");
    }
    setModalState(null);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Leads</h3>
        <button className="primary-button" onClick={() => setModalState(emptyLead)}>
          <IconPlus size={16} /> Add Lead
        </button>
      </div>

      <div className="module-toolbar">
        <div className="toolbar-search">
          <IconSearch size={16} />
          <input placeholder="Search leads by name or contact" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-filters">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
          <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
            <option value="All">All Services / Programs</option>
            {[...new Set([...PROGRAMS, ...SERVICE_CALL_LIST_SERVICES, ...TRAINING_CALL_LIST_PROGRAMS])].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>S. No.</th>
              <th>Lead Create Date</th>
              <th>Service / Program</th>
              <th>Name</th>
              <th>Interest Type</th>
              <th>Remark</th>
              <th>Status</th>
              <th>Edit</th>
              <th>Call Now</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <EmptyRow colSpan={9} text="No leads match the selected filters." />}
            {filtered.map((l, idx) => (
              <tr key={l.id}>
                <td>{idx + 1}</td>
                <td>{formatDisplayDate(l.createdDate)}</td>
                <td>{l.program || "-"}</td>
                <td><strong>{l.name || "-"}</strong></td>
                <td>{l.interestType || l.interest || "Interested"}</td>
                <td>
                  <div className="remark-cell">
                    <input
                      value={l.remark || l.notes || ""}
                      placeholder="Add remark"
                      onChange={(e) => updateLead(l.id, { remark: e.target.value })}
                    />
                  </div>
                </td>
                <td>
                  <select className="inline-select" value={l.status || "Pending"} onChange={(e) => updateLead(l.id, { status: e.target.value })}>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                  </select>
                </td>
                <td>
                  <button className="row-icon-btn edit" title="Edit" onClick={() => setModalState(l)}><IconEdit size={16} /></button>
                </td>
                <td><button className="row-icon-btn call" title="Call now" onClick={() => { window.location.href = `tel:${l.contact || ""}`; }}><IconPhone size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalState && <LeadFormModal initial={modalState} onClose={() => setModalState(null)} onSave={handleSaveModal} />}
    </div>
  );
}

/* ============================ SALES REPORTS TAB ============================ */

function SalesReportsTab({ contacts, showToast }) {
  const [program, setProgram] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredContacts = contacts.filter((c) => {
    const matchesProgram = program === "All" || c.program === program;
    const matchesFrom = !dateFrom || c.date >= dateFrom;
    const matchesTo = !dateTo || c.date <= dateTo;
    return matchesProgram && matchesFrom && matchesTo;
  });

  const categories = ["Services", "Training", "Internship", "STIP"];
  const categorySummary = categories.map((category) => {
    const rows = filteredContacts.filter((contact) => getCallListCategory(contact.program) === category);
    const converted = rows.filter((contact) => ["Converted", "Approved"].includes(contact.interestStatus)).length;
    return { category, total: rows.length, converted, rate: rows.length ? Math.round((converted / rows.length) * 100) : 0 };
  });

  const reportRows = PROGRAMS.map((p) => {
    const total = filteredContacts.filter((c) => c.program === p).length;
    const converted = filteredContacts.filter((c) => c.program === p && c.interestStatus === "Converted").length;
    return {
      Program: p,
      "Total Contacts": total,
      Converted: converted,
      "Conversion Rate": total ? `${Math.round((converted / total) * 100)}%` : "0%",
    };
  }).filter((r) => r["Total Contacts"] > 0);

  const handleExport = () => {
    if (!reportRows.length) {
      showToast("Nothing to export for the selected filters");
      return;
    }
    downloadCSV(`sales-report-${todayISO()}.csv`, reportRows);
    showToast("Report exported as CSV");
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Sales Reports</h3>
        <button className="ghost-button" onClick={handleExport}>
          <IconDownload size={16} /> Export CSV
        </button>
      </div>

      <div className="module-toolbar">
        <div className="toolbar-filters">
          <select value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="All">All Programs</option>
            {PROGRAMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <div className="date-chip">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span>–</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="stats-grid compact four-up">
        {categorySummary.map((summary) => (
          <StatCard
            key={summary.category}
            icon={<IconSummary size={18} />}
            tone="blue"
            value={summary.total}
            label={`${summary.category} Contacts`}
            hint={`${summary.converted} converted · ${summary.rate}% rate`}
          />
        ))}
      </div>

      <div className="table-wrap" style={{ padding: "0 20px 20px" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Program</th>
              <th>Total Contacts</th>
              <th>Converted</th>
              <th>Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.length === 0 && <EmptyRow colSpan={4} text="No data for the selected filters." />}
            {reportRows.map((r) => (
              <tr key={r.Program}>
                <td>{r.Program}</td>
                <td>{r["Total Contacts"]}</td>
                <td>{r.Converted}</td>
                <td>{r["Conversion Rate"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================ TASKS TAB ================================ */

function emptyTaskForm() {
  return {
    id: null,
    title: "",
    description: "",
    assignee: TEAM_MEMBERS[0],
    priority: "Medium",
    status: "To Do",
    dueDate: todayISO(),
  };
}

function TaskFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Title is required";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(form);
  };

  return (
    <Modal title={initial.id ? "Edit Task" : "New Task"} onClose={onClose}>
      <div className="form-grid">
        <div className="field span-full">
          <span>Title</span>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} />
          {errors.title && <span className="field-error">{errors.title}</span>}
        </div>
        <div className="field span-full">
          <span>Description</span>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="field">
          <span>Assignee</span>
          <select value={form.assignee} onChange={(e) => set("assignee", e.target.value)}>
            {TEAM_MEMBERS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Priority</span>
          <select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Status</span>
          <select value={form.status} onChange={(e) => set("status", e.target.value)}>
            {TASK_STATUSES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span>Due Date</span>
          <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </div>
      </div>
      <div className="form-actions">
        <button className="ghost-button" onClick={onClose}>
          Cancel
        </button>
        <button className="primary-button" onClick={handleSave}>
          <IconCheck size={16} /> Save Task
        </button>
      </div>
    </Modal>
  );
}

function TasksTab({ tasks, setTasks, showToast }) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [modalState, setModalState] = useState(null);

  const filtered = tasks.filter((t) => {
    const matchesSearch = !search.trim() || t.title.toLowerCase().includes(search.trim().toLowerCase());
    const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === "All" || t.assignee === assigneeFilter;
    return matchesSearch && matchesPriority && matchesAssignee;
  });

  const updateTask = (id, patch) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const handleDelete = (t) => {
    if (window.confirm(`Delete task "${t.title}"?`)) {
      setTasks((prev) => prev.filter((x) => x.id !== t.id));
      showToast("Task deleted");
    }
  };
  const handleSaveModal = (form) => {
    if (form.id) {
      updateTask(form.id, form);
      showToast("Task updated");
    } else {
      setTasks((prev) => [{ ...form, id: genId("task") }, ...prev]);
      showToast("Task created");
    }
    setModalState(null);
  };
  const advanceStatus = (t) => {
    const idx = TASK_STATUSES.indexOf(t.status);
    if (idx < TASK_STATUSES.length - 1) updateTask(t.id, { status: TASK_STATUSES[idx + 1] });
  };
  const regressStatus = (t) => {
    const idx = TASK_STATUSES.indexOf(t.status);
    if (idx > 0) updateTask(t.id, { status: TASK_STATUSES[idx - 1] });
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Tasks</h3>
        <button className="primary-button" onClick={() => setModalState(emptyTaskForm())}>
          <IconPlus size={16} /> New Task
        </button>
      </div>

      <div className="module-toolbar">
        <div className="toolbar-search">
          <IconSearch size={16} />
          <input placeholder="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-filters">
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="All">All Priorities</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="All">All Assignees</option>
            {TEAM_MEMBERS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="kanban-grid">
        {TASK_STATUSES.map((status) => (
          <div className="kanban-col" key={status}>
            <div className="kanban-col-head">
              <span>{status}</span>
              <span className="nav-pill" style={{ background: "var(--brand)", boxShadow: "none" }}>
                {filtered.filter((t) => t.status === status).length}
              </span>
            </div>
            {filtered
              .filter((t) => t.status === status)
              .map((t) => (
                <div className="task-card" key={t.id}>
                  <div className="task-card-meta">
                    <span className={clsx("badge", priorityBadgeClass(t.priority))}>{t.priority}</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>{formatDisplayDate(t.dueDate)}</span>
                  </div>
                  <strong>{t.title}</strong>
                  <p>{t.description}</p>
                  <div className="task-card-meta">
                    <span className="avatar soft" style={{ width: 26, height: 26, fontSize: "0.7rem" }}>
                      {t.assignee.charAt(0)}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-soft)" }}>{t.assignee}</span>
                  </div>
                  <div className="task-card-actions">
                    {status !== "To Do" && (
                      <button className="row-icon-btn" title="Move back" onClick={() => regressStatus(t)}>
                        ‹
                      </button>
                    )}
                    {status !== "Done" && (
                      <button className="row-icon-btn" title="Advance" onClick={() => advanceStatus(t)}>
                        ›
                      </button>
                    )}
                    <button className="row-icon-btn edit" title="Edit" onClick={() => setModalState(t)}>
                      <IconEdit size={15} />
                    </button>
                    <button className="row-icon-btn delete" title="Delete" onClick={() => handleDelete(t)}>
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
              ))}
            {filtered.filter((t) => t.status === status).length === 0 && (
              <p className="panel-empty" style={{ padding: "10px 0" }}>
                No tasks
              </p>
            )}
          </div>
        ))}
      </div>

      {modalState && <TaskFormModal initial={modalState} onClose={() => setModalState(null)} onSave={handleSaveModal} />}
    </div>
  );
}

/* ============================ MARK ATTENDANCE TAB =========================== */

function MarkAttendanceTab({ attendance, setAttendance, showToast }) {
  const today = todayISO();
  const todaysRecord = attendance.find((a) => a.date === today);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const checkIn = todaysRecord?.checkIn && todaysRecord.checkIn !== "-" ? todaysRecord.checkIn : "";
  const checkOut = todaysRecord?.checkOut && todaysRecord.checkOut !== "-" ? todaysRecord.checkOut : "";
  const formatTime = (date) => date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const monthRows = attendance.filter((a) => monthKeyOf(a.date) === currentMonthKey());
  const counts = ATTENDANCE_STATUSES.reduce((acc, s) => {
    acc[s] = monthRows.filter((r) => r.status === s).length;
    return acc;
  }, {});

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleCheckIn = () => {
    if (checkIn) return;
    const time = formatTime(new Date());
    setAttendance((prev) => {
      const exists = prev.some((record) => record.date === today);
      if (exists) return prev.map((record) => (record.date === today ? { ...record, status: "Present", checkIn: time, checkOut: "" } : record));
      return [{ id: genId("att"), date: today, status: "Present", checkIn: time, checkOut: "" }, ...prev];
    });
    showToast("Checked in successfully");
  };

  const handleCheckOut = () => {
    if (!checkIn || checkOut) return;
    setAttendance((prev) => {
      return prev.map((a) => (a.date === today ? { ...a, checkOut: formatTime(new Date()) } : a));
    });
    showToast("Checked out successfully");
  };

  return (
    <div>
      <div className="stats-grid compact three-up">
        <StatCard icon={<IconCheck size={20} />} tone="green" value={counts.Present || 0} label="Present Days" hint="This month" />
        <StatCard icon={<IconLeave size={20} />} tone="amber" value={counts["On Leave"] || 0} label="Leave Days" hint="This month" />
        <StatCard icon={<IconAttendance size={20} />} tone="blue" value={counts["Work From Home"] || 0} label="WFH Days" hint="This month" />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Today's Check In / Check Out — {formatDisplayDate(today)}</h3>
        </div>
        <div style={{ padding: 20 }}>
          <div className="check-clock-panel">
            <div>
              <span className="check-clock-label">Current time</span>
              <strong className="check-clock-time">{formatTime(currentTime)}</strong>
            </div>
            <div className="check-clock-status">
              <span className={clsx("attendance-state-dot", checkIn && !checkOut && "active")} />
              <span>{checkOut ? "Day completed" : checkIn ? "Currently checked in" : "Not checked in"}</span>
            </div>
          </div>
          <div className="form-actions">
            <button
              className={clsx("attendance-action-button", checkIn && !checkOut && "checkout", checkOut && "completed")}
              onClick={checkOut ? undefined : checkIn ? handleCheckOut : handleCheckIn}
              disabled={Boolean(checkOut)}
              title={checkOut ? "Attendance completed" : checkIn ? "Check out" : "Check in"}
            >
              {checkOut ? <IconCheck size={24} /> : checkIn ? <IconLogout size={24} /> : <IconCheck size={24} />}
              <span>{checkOut ? "Completed" : checkIn ? "Check Out" : "Check In"}</span>
            </button>
          </div>
          <div className="check-times">
            <span>Check in: <strong>{checkIn || "Not recorded"}</strong></span>
            <span>Check out: <strong>{checkOut || "Not recorded"}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================== ATTENDANCE REPORT TAB ========================== */

function AttendanceReportTab({ attendance, showToast }) {
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());

  const monthOptions = useMemo(() => {
    const set = new Set(attendance.map((a) => monthKeyOf(a.date)));
    set.add(currentMonthKey());
    return Array.from(set).sort().reverse();
  }, [attendance]);

  const rows = attendance.filter((a) => monthKeyOf(a.date) === monthFilter).sort((a, b) => (a.date < b.date ? 1 : -1));

  const handleExport = () => {
    if (!rows.length) {
      showToast("No records for the selected month");
      return;
    }
    downloadCSV(`attendance-${monthFilter}.csv`, rows.map((r) => ({ Date: formatDisplayDate(r.date), Status: r.status, "Check In": r.checkIn, "Check Out": r.checkOut })));
    showToast("Attendance report exported");
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Attendance Report</h3>
        <button className="ghost-button" onClick={handleExport}>
          <IconDownload size={16} /> Export CSV
        </button>
      </div>
      <div className="module-toolbar">
        <div className="toolbar-filters">
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Check In</th>
              <th>Check Out</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={4} text="No attendance records for this month." />}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDisplayDate(r.date)}</td>
                <td>
                  <span
                    className={clsx(
                      "badge",
                      r.status === "Present"
                        ? "success"
                        : r.status === "Absent"
                        ? "danger"
                        : r.status === "On Leave"
                        ? "warning"
                        : "info"
                    )}
                  >
                    {r.status}
                  </span>
                </td>
                <td>{r.checkIn}</td>
                <td>{r.checkOut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================= LEAVE REQUEST TAB ============================ */

function LeaveRequestTab({ leaveRequests, setLeaveRequests, showToast }) {
  const [form, setForm] = useState({ type: LEAVE_TYPES[0], from: todayISO(), to: todayISO(), reason: "" });
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    const nextErrors = {};
    if (!form.from) nextErrors.from = "Start date is required";
    if (!form.to) nextErrors.to = "End date is required";
    if (form.from && form.to && form.to < form.from) nextErrors.to = "End date must be after start date";
    if (!form.reason.trim()) nextErrors.reason = "Please add a reason";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setLeaveRequests((prev) => [
      { id: genId("leave"), ...form, status: "Pending", appliedOn: todayISO() },
      ...prev,
    ]);
    setForm({ type: LEAVE_TYPES[0], from: todayISO(), to: todayISO(), reason: "" });
    setErrors({});
    showToast("Leave request submitted");
  };

  const handleCancel = (l) => {
    if (window.confirm("Cancel this leave request?")) {
      setLeaveRequests((prev) => prev.filter((x) => x.id !== l.id));
      showToast("Leave request cancelled");
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3>Apply for Leave</h3>
        </div>
        <div style={{ padding: 20 }}>
          <div className="form-grid">
            <div className="field">
              <span>Leave Type</span>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {LEAVE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div />
            <div className="field">
              <span>From</span>
              <input type="date" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} />
              {errors.from && <span className="field-error">{errors.from}</span>}
            </div>
            <div className="field">
              <span>To</span>
              <input type="date" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} />
              {errors.to && <span className="field-error">{errors.to}</span>}
            </div>
            <div className="field span-full">
              <span>Reason</span>
              <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              {errors.reason && <span className="field-error">{errors.reason}</span>}
            </div>
          </div>
          <div className="form-actions">
            <button className="primary-button" onClick={handleSubmit}>
              <IconCheck size={16} /> Submit Request
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <h3>My Leave Requests</h3>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th>Applied On</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.length === 0 && <EmptyRow colSpan={7} text="No leave requests yet." />}
              {leaveRequests.map((l) => (
                <tr key={l.id}>
                  <td>{l.type}</td>
                  <td>{formatDisplayDate(l.from)}</td>
                  <td>{formatDisplayDate(l.to)}</td>
                  <td>{l.reason}</td>
                  <td>{formatDisplayDate(l.appliedOn)}</td>
                  <td>
                    <span className={clsx("badge", leaveStatusBadgeClass(l.status))}>{l.status}</span>
                  </td>
                  <td>
                    {l.status === "Pending" ? (
                      <button className="row-icon-btn delete" title="Cancel" onClick={() => handleCancel(l)}>
                        <IconTrash size={16} />
                      </button>
                    ) : (
                      <span style={{ color: "var(--text-faint)", fontSize: "0.82rem" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================ SETTINGS TAB ============================== */

function SettingsTab({ profile, setProfile, preferences, setPreferences, showToast }) {
  const [profileForm, setProfileForm] = useState(profile);
  const [prefForm, setPrefForm] = useState(preferences);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [message, setMessage] = useState(null);
  const [pwErrors, setPwErrors] = useState({});

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProfileForm((f) => ({ ...f, avatarUrl: url }));
  };

  const handleSaveProfile = () => {
    setProfile(profileForm);
    setMessage({ type: "success", text: "Profile updated successfully" });
    showToast("Profile saved");
  };

  const handleSavePreferences = () => {
    setPreferences(prefForm);
    showToast("Preferences saved");
  };

  const handleChangePassword = () => {
    const nextErrors = {};
    if (!passwordForm.current) nextErrors.current = "Enter your current password";
    if (!passwordForm.next || passwordForm.next.length < 6) nextErrors.next = "New password must be at least 6 characters";
    if (passwordForm.next !== passwordForm.confirm) nextErrors.confirm = "Passwords do not match";
    setPwErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPasswordForm({ current: "", next: "", confirm: "" });
    showToast("Password updated");
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Profile</h3>
        </div>
        <div className="settings-identity">
          <div className="avatar-preview">
            {profileForm.avatarUrl ? (
              <img src={profileForm.avatarUrl} alt="avatar" />
            ) : (
              <div className="avatar large">{(profileForm.name || "?").charAt(0)}</div>
            )}
          </div>
          <div>
            <strong>{profileForm.name}</strong>
            <span>{profileForm.role}</span>
          </div>
        </div>
        <div className="avatar-upload">
          <label className="avatar-upload-label">
            Change photo
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </label>
        </div>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field">
            <span>Full Name</span>
            <input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <span>Role</span>
            <input value={profileForm.role} onChange={(e) => setProfileForm((f) => ({ ...f, role: e.target.value }))} />
          </div>
          <div className="field">
            <span>Email</span>
            <input type="email" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="field">
            <span>Phone</span>
            <input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        {message && <div className={clsx("settings-message", message.type)} style={{ marginTop: 14 }}>{message.text}</div>}
        <div className="form-actions">
          <button className="primary-button" onClick={handleSaveProfile}>
            <IconCheck size={16} /> Save Profile
          </button>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Notification Preferences</h3>
          </div>
          {[
            { key: "emailNotifications", label: "Email Notifications", hint: "Get emailed when a lead status changes" },
            { key: "smsAlerts", label: "SMS Alerts", hint: "Receive SMS for urgent follow-ups" },
            { key: "dailySummaryEmail", label: "Daily Summary Email", hint: "A daily digest of calls and tasks" },
            { key: "followUpReminders", label: "Follow-up Reminders", hint: "Reminders for snoozed contacts" },
          ].map((row) => (
            <label className="check-row" key={row.key}>
              <input
                type="checkbox"
                checked={!!prefForm[row.key]}
                onChange={(e) => setPrefForm((f) => ({ ...f, [row.key]: e.target.checked }))}
              />
              <div className="check-row-copy">
                <strong>{row.label}</strong>
                <span>{row.hint}</span>
              </div>
            </label>
          ))}
          <div className="form-actions">
            <button className="primary-button" onClick={handleSavePreferences}>
              <IconCheck size={16} /> Save Preferences
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Change Password</h3>
          </div>
          <div className="settings-form">
            {["current", "next", "confirm"].map((key) => (
              <div className="field" key={key}>
                <span>{key === "current" ? "Current Password" : key === "next" ? "New Password" : "Confirm New Password"}</span>
                <div className="password-input-wrap">
                  <input
                    type={showPw[key] ? "text" : "password"}
                    value={passwordForm[key]}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPw((f) => ({ ...f, [key]: !f[key] }))}
                  >
                    {showPw[key] ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
                {pwErrors[key] && <span className="field-error">{pwErrors[key]}</span>}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="primary-button" onClick={handleChangePassword}>
              <IconCheck size={16} /> Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================== SIDEBAR ================================= */

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ key: "dashboard", label: "Dashboard", icon: IconDashboard }],
  },
  {
    label: "Sales Ops",
    items: [
      { key: "servicecalllist", label: "Service Call List", icon: IconPhone },
      { key: "trainingcalllist", label: "Training Call List", icon: IconPhone },
      { key: "leads", label: "Leads", icon: IconUsers },
      { key: "assignedleads", label: "Assigned Leads", icon: IconUsers },
      { key: "salesreports", label: "Sales Report", icon: IconChart },
    ],
  },
  {
    label: "Work",
    items: [{ key: "tasks", label: "Tasks", icon: IconTasks }],
  },
  {
    label: "Attendance",
    items: [
      { key: "markattendance", label: "Mark Attendance", icon: IconAttendance },
      { key: "attendancereport", label: "Attendance Report", icon: IconReport },
      { key: "leaverequest", label: "Leave Request", icon: IconLeave },
    ],
  },
  {
    label: "Account",
    items: [{ key: "settings", label: "Settings", icon: IconSettings }],
  },
];

const TAB_TITLES = {
  dashboard: ["Dashboard", "Overview of your CRM performance"],
  servicecalllist: ["Service Call List", "Daily contacts for IT services"],
  trainingcalllist: ["Training Call List", "Daily contacts for training programs"],
  leads: ["Leads", "Follow-up contacts converted to leads"],
  assignedleads: ["Assigned Leads", "Leads assigned to you"],
  salesreports: ["Sales Report", "Simple sales performance overview"],
  tasks: ["Tasks", "Create, assign and track work"],
  salessummary: ["Sales Summary", "Services, Training, Internship & STIP performance"],
  settings: ["Settings", "Profile, preferences and security"],
  markattendance: ["Mark Attendance", "Log today's attendance"],
  attendancereport: ["Attendance Report", "Monthly attendance history"],
  leaverequest: ["Leave Request", "Apply for and track leave"],
};

function Sidebar({ activeTab, onNavigate, collapsed, onToggleCollapse, mobileOpen, onCloseMobile, profile, badges, onLogout }) {
  const [navSearch, setNavSearch] = useState("");
  const flatItems = NAV_GROUPS.flatMap((g) => g.items);
  const filteredKeys = navSearch.trim()
    ? new Set(flatItems.filter((i) => i.label.toLowerCase().includes(navSearch.trim().toLowerCase())).map((i) => i.key))
    : null;

  return (
    <>
      <aside className={clsx("sidebar", collapsed && "collapsed", mobileOpen && "mobile-open")}>
        <div className="brand">
          <div className="logo-badge">
            <span>S</span>
            <span>T</span>
          </div>
          <div className="brand-copy">
            <strong>System Technologies</strong>
            <span>CRM Executive</span>
          </div>
          <button className="icon-button mobile-only" style={{ marginLeft: "auto" }} onClick={onCloseMobile}>
            <IconClose size={16} />
          </button>
        </div>

        <div className="sidebar-profile">
          {profile.avatarUrl ? (
            <img className="sidebar-profile-image" src={profile.avatarUrl} alt="" />
          ) : (
            <div className="avatar sidebar-profile-avatar">{(profile.name || "?").charAt(0)}</div>
          )}
          <span className="sidebar-profile-name">{profile.name}</span>
        </div>

        <div className="sidebar-search">
          <IconSearch size={16} />
          <input placeholder="Search menu" value={navSearch} onChange={(e) => setNavSearch(e.target.value)} />
        </div>

        <nav className="nav">
          {NAV_GROUPS.map((group) => {
            const items = filteredKeys ? group.items.filter((i) => filteredKeys.has(i.key)) : group.items;
            if (!items.length) return null;
            return (
              <div className="nav-group" key={group.label}>
                <p>{group.label}</p>
                {items.map((item) => {
                  const ItemIcon = item.icon;
                  const badge = badges[item.key];
                  return (
                    <button
                      key={item.key}
                      className={clsx("nav-item", activeTab === item.key && "active")}
                      onClick={() => onNavigate(item.key)}
                    >
                      <span className="nav-item-left">
                        <ItemIcon size={18} />
                        <span>{item.label}</span>
                      </span>
                      {!!badge && <span className="nav-pill">{badge}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={onLogout}>
            <span className="nav-item-left">
              <IconLogout size={18} />
              <span>Logout</span>
            </span>
          </button>
        </div>
      </aside>
      <div className={clsx("mobile-scrim", mobileOpen && "show")} onClick={onCloseMobile} />
    </>
  );
}

/* ================================ MAIN EXPORT ================================ */

export default function CrmExecutiveDashboard({ initialTab = "dashboard", onLogout, currentUser, leads: externalLeads = [] }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, showToast] = useToast();

  const [contacts, setContacts] = useLocalStorageState("crmExec.contacts", seedContacts);
  const [leads, setLeads] = useLocalStorageState("crmExec.leads", seedLeads);
  const [tasks, setTasks] = useLocalStorageState("crmExec.tasks", seedTasks);
  const [attendance, setAttendance] = useLocalStorageState("crmExec.attendance", seedAttendance);
  const [leaveRequests, setLeaveRequests] = useLocalStorageState("crmExec.leaveRequests", seedLeaveRequests);
  const [profile, setProfile] = useLocalStorageState("crmExec.profile", () => ({
    ...DEFAULT_PROFILE,
    ...(currentUser || {}),
  }));
  const [preferences, setPreferences] = useLocalStorageState("crmExec.preferences", DEFAULT_PREFERENCES);

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to log out?")) return;
    if (typeof onLogout === "function") {
      onLogout();
    } else {
      showToast("Logged out");
    }
  };

  const badges = {
    servicecalllist:
      contacts.filter((c) => getCallListCategory(c.program) === "Services" && c.active && (c.snoozeUntil ? c.snoozeUntil <= todayISO() : c.callStatus === "Not Called")).length || null,
    trainingcalllist:
      contacts.filter((c) => getCallListCategory(c.program) === "Training" && c.active && (c.snoozeUntil ? c.snoozeUntil <= todayISO() : c.callStatus === "Not Called")).length || null,
    leads: leads.length || null,
    tasks: tasks.filter((t) => t.status !== "Done").length || null,
    leaverequest: leaveRequests.filter((l) => l.status === "Pending").length || null,
  };

  const [title, subtitle] = TAB_TITLES[activeTab] || ["", ""];

  return (
    <div className="crm-root">
      <div className="crm-shell">
        <Sidebar
          activeTab={activeTab}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          profile={profile}
          badges={badges}
          onLogout={handleLogout}
        />

        <div className="workspace">
          <div className="topbar">
            <div className="topbar-left">
              <button className="icon-button mobile-only" onClick={() => setMobileOpen(true)}>
                <IconMenu size={18} />
              </button>
              <button className="icon-button desktop-only" onClick={() => setCollapsed((c) => !c)}>
                <IconMenu size={18} />
              </button>
              <div>
                <h1>{title}</h1>
                <p className="topbar-subtitle">{subtitle}</p>
              </div>
            </div>
            <div className="topbar-right">
              <button className="icon-button" title="Notifications">
                <IconBell size={18} />
              </button>
              <div className="user-chip">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    style={{ width: 38, height: 38, borderRadius: 14, objectFit: "cover" }}
                  />
                ) : (
                  <div className="avatar">{(profile.name || "?").charAt(0)}</div>
                )}
                <div>
                  <strong style={{ display: "block", fontSize: "0.88rem" }}>{profile.name}</strong>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-soft)" }}>{profile.role}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="content">
            {activeTab === "dashboard" && (
              <DashboardTab
                contacts={contacts}
                leads={leads}
                tasks={tasks}
                leaveRequests={leaveRequests}
                onNavigate={handleNavigate}
              />
            )}
            {activeTab === "servicecalllist" && (
              <CallListTab
                contacts={contacts}
                setContacts={setContacts}
                showToast={showToast}
                category="Services"
                title="Daily Service Contacts / Call List"
                addLabel="Add Service Contact"
                currentUser={currentUser}
              />
            )}
            {activeTab === "trainingcalllist" && (
              <CallListTab
                contacts={contacts}
                setContacts={setContacts}
                showToast={showToast}
                category="Training"
                title="Daily Training Contacts / Call List"
                addLabel="Add Training Contact"
                currentUser={currentUser}
              />
            )}
            {activeTab === "leads" && <LeadsTab leads={leads} setLeads={setLeads} showToast={showToast} />}
            {activeTab === "assignedleads" && <AssignedLeadsTab leads={externalLeads} currentUser={currentUser} />}
            {activeTab === "salesreports" && <SalesReportsTab contacts={contacts} showToast={showToast} />}
            {activeTab === "tasks" && <TasksTab tasks={tasks} setTasks={setTasks} showToast={showToast} />}
            {activeTab === "settings" && (
              <SettingsTab
                profile={profile}
                setProfile={setProfile}
                preferences={preferences}
                setPreferences={setPreferences}
                showToast={showToast}
              />
            )}
            {activeTab === "markattendance" && (
              <MarkAttendanceTab attendance={attendance} setAttendance={setAttendance} showToast={showToast} />
            )}
            {activeTab === "attendancereport" && (
              <AttendanceReportTab attendance={attendance} showToast={showToast} />
            )}
            {activeTab === "leaverequest" && (
              <LeaveRequestTab leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} showToast={showToast} />
            )}
          </div>
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

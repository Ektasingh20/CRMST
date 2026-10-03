import CallLeadsPanel from "../../CallLeadsPanel.jsx";
import WhatsAppModal from "../../WhatsAppModal.jsx";
import { useMessageTemplates } from "../../useMessageTemplates.js";
import { resolveLeadTemplate, templateSelectionPatch } from "../../whatsAppMessage.js";
import RemarkField from "../../RemarkField.jsx";
import { callLeadForm } from "../../callLeads.js";
import { createTask as createTaskApi, fetchTasks, updateTask as updateTaskApi, fetchAttendance, createAttendance, updateAttendance, fetchLeaves, createLeave, updateMyProfile, changePassword, fetchAppNotifications, markAppNotificationRead } from "../../backendApi.js";
import { TRAINING_CALL_LIST_PROGRAMS, SERVICE_CALL_LIST_SERVICES, CALL_STATUS_OPTIONS, CALL_LIST_INTEREST_STATUS_OPTIONS, normalizeCallStatus, normalizeInterestStatus, normalizeCallProgram, matchesCallListFilters } from "../../callListConfig.js";
import { isCrmPageLoading } from "./crmPageLoading.js";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./crmExecutive.css";
import "./crmExecutiveForm.css";

/* =========================================================================
   CRM EXECUTIVE DASHBOARD
   CRM Executive dashboard for System Technologies. Page data is loaded from
   the backend; crmExecutive.css shares the Admin Dashboard visual theme.
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
  // Backend updates use a full ISO timestamp; date inputs use YYYY-MM-DD.
  // Format both without appending a second time component.
  const dateValue = String(iso).slice(0, 10);
  const d = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};
const monthKeyOf = (iso) => (iso || "").slice(0, 7);
const clsx = (...parts) => parts.filter(Boolean).join(" ");

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
const IconFillEnquiry = (p) => (
  <Icon {...p}>
    <path d="M5 3h9l5 5v13H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M14 3v6h6" />
    <path d="m9 17 7.5-7.5a2.1 2.1 0 0 1 3 3L12 20l-4 1 1-4Z" />
    <path d="M7 8h4M7 12h4" />
  </Icon>
);
const IconView = (p) => (
  <Icon {...p}>
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.5" />
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



function getCallListCategory(program) {
  if (SERVICE_CALL_LIST_SERVICES.includes(program)) return "Services";
  if (TRAINING_CALL_LIST_PROGRAMS.includes(program)) return "Training";
  return PROGRAM_CATEGORY[program];
}

const INTERACTION_TYPES = ["Call", "WhatsApp", "Email", "Walk-in", "Reference"];
const INTEREST_STATUS_OPTIONS = CALL_LIST_INTEREST_STATUS_OPTIONS;
const CRM_EXEC_LEADS_STORAGE_KEY = "crmExec.adminLeads";
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

/* ------------------------------ shared bits ------------------------------ */

function Toast({ toast }) {
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}

function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const showToast = useCallback((msg) => {
    setToast(msg);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
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

function Pagination({ page, totalPages, totalItems, pageSize, onChange }) {
  const firstItem = totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(page * pageSize, totalItems);
  return (
    <div className="pagination-row call-list-pagination">
      <span>Showing {firstItem}-{lastItem} of {totalItems}</span>
      <div className="call-list-pagination-actions">
        <button type="button" className="ghost-button compact" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" className="ghost-button compact" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
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

function leaveDays(from, to) {
  const parse = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() : null;
  };
  const start = parse(from);
  const end = parse(to);
  return start !== null && end !== null && end >= start ? Math.round((end - start) / 86400000) + 1 : null;
}

function exportReportPdf({ title, filename, head, body, landscape = false }) {
  const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
  pdf.setFontSize(16);
  pdf.text(title, 14, 17);
  pdf.setFontSize(9);
  pdf.setTextColor(110);
  pdf.text(`${body.length} record${body.length === 1 ? "" : "s"} · Generated ${formatDisplayDate(todayISO())}`, 14, 24);
  autoTable(pdf, {
    startY: 30,
    head: [head],
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [127, 78, 43] },
  });
  pdf.save(filename);
}

/* ============================== DASHBOARD TAB ============================ */

function isContactToWork(contact, today) {
  return contact.active !== false
    && !contact.leadCreated && contact.callLeadStatus !== "Approved"
    && (!contact.snoozeUntil || contact.snoozeUntil <= today)
    && ["Pending", "Follow Up"].includes(normalizeCallStatus(contact.callStatus));
}

function DashboardTab({ contacts, leads, tasks, leaveRequests, onNavigate }) {
  const today = todayISO();
  const totalContacts = contacts.length;
  const callsToday = contacts.filter((contact) => String(contact.lastWorkedAt || "").slice(0, 10) === today).length;
  const leadIds = new Set(leads.map((lead) => String(lead.id || lead._id || "")).filter(Boolean));
  const leadPhones = new Set(leads.map((lead) => String(lead.phone || lead.contact || "").replace(/\D/g, "").slice(-10)).filter(Boolean));
  const converted = contacts.filter((contact) => {
    const phone = String(contact.contact || "").replace(/\D/g, "").slice(-10);
    return contact.leadCreated || contact.callLeadStatus === "Approved"
      || (contact.createdLeadId && leadIds.has(String(contact.createdLeadId)))
      || (phone && leadPhones.has(phone));
  }).length;
  const conversionRate = totalContacts ? Math.round((converted / totalContacts) * 100) : 0;
  const pendingCalls = contacts.filter((contact) => isContactToWork(contact, today));
  const openTasks = tasks.filter((t) => !["Done", "Completed"].includes(t.status)).length;
  const toDoTasks = tasks.filter((task) => task.status === "To Do").length;
  const inProgressTasks = tasks.filter((task) => task.status === "In Progress").length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === "Pending").length;
  const approvedLeads = leads.filter((lead) => lead.callLeadStatus === "Approved" || Boolean(lead.sourceCallPath)).length;

  const callStatusBreakdown = CALL_STATUS_OPTIONS.map((status) => ({
    status,
    count: contacts.filter((c) => c.callStatus === status).length,
  })).filter((r) => r.count > 0);
  const maxBreakdown = Math.max(1, ...callStatusBreakdown.map((r) => r.count));

  const recentActivity = contacts.filter((contact) => contact.lastWorkedAt || contact.createdLeadDate)
    .sort((a, b) => String(b.lastWorkedAt || b.createdLeadDate).localeCompare(String(a.lastWorkedAt || a.createdLeadDate)))
    .slice(0, 6)
    .map((contact) => ({
      id: contact.id,
      tone: contact.leadCreated || contact.callLeadStatus === "Approved" ? "success" : "info",
      title: `${contact.name || "Contact"} — ${contact.leadCreated || contact.callLeadStatus === "Approved" ? "Lead approved" : normalizeCallStatus(contact.callStatus)}`,
      meta: [contact.program, contact.whatsappClicked ? "WhatsApp" : contact.callClicked ? "Call" : "Status update"].filter(Boolean).join(" · "),
      time: formatDisplayDate(contact.lastWorkedAt || contact.createdLeadDate),
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
        <StatCard icon={<IconPhone size={20} />} tone="rose" value={totalContacts} label="Assigned Contacts" hint={`${callsToday} worked today`} />
        <StatCard icon={<IconUsers size={20} />} tone="blue" value={leads.length} label="Leads Created" hint={`${approvedLeads} approved from calls`} />
        <StatCard icon={<IconSummary size={20} />} tone="green" value={`${conversionRate}%`} label="Conversion Rate" hint={`${converted} converted`} />
        <StatCard icon={<IconTasks size={20} />} tone="amber" value={openTasks} label="Open Tasks" hint={`${toDoTasks} to do · ${inProgressTasks} in progress`} />
      </div>

      <div className="dashboard-grid">
        <div className="hero-card dashboard-hero">
          <div className="hero-card-top">
            <div>
              <p className="eyebrow">Overview</p>
              <h2 style={{ fontSize: "1.5rem" }}>Welcome back, keep the pipeline moving</h2>
            </div>
            <span className="hero-tag">
              <IconBell size={14} /> {pendingCalls.length} contacts to work
            </span>
          </div>
          <p className="hero-copy">
            {totalContacts} assigned contacts · {contacts.filter((contact) => normalizeCallStatus(contact.callStatus) === "Completed").length} completed calls · {leads.length} leads created · {pendingLeaves} pending leave requests.
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
            <h3>Calls to Work</h3>
            <span className="badge warning">{pendingCalls.length}</span>
          </div>
          <div className="follow-up-list">
            {pendingCalls.length === 0 && <p className="panel-empty">No pending calls or follow-ups.</p>}
            {pendingCalls.slice(0, 6).map((c) => (
              <div className="follow-up-item" key={c.id}>
                <span className="dot" />
                <div>
                  <strong style={{ display: "block" }}>{c.name}</strong>
                  <span style={{ color: "var(--text-soft)", fontSize: "0.84rem" }}>
                    {[c.program, c.contact, normalizeCallStatus(c.callStatus)].filter(Boolean).join(" · ")}
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
            {recentActivity.length === 0 && <p className="panel-empty">No call activity recorded yet.</p>}
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

const CONTACT_PAGE_SIZE = 15;

function emptyContactForm() {
  return {
    id: null,
    date: todayISO(),
    name: "",
    contact: "",
    program: PROGRAMS[0],
    callStatus: "Pending",
    interactionType: "",
    interestStatus: "Not Interested",
    remark: "",
    active: true,
  };
}

function ContactFormModal({ initial, onClose, onSave, category, templates, templatesLoading, templatesError, saving = false, readOnly = false }) {
  const leadType = category === "Training" ? "training" : "service";
  const [form, setForm] = useState({
    ...initial,
    // A contact date is assigned by the system. Existing contacts retain their
    // original date; every new contact is always saved with today's date.
    date: initial.id ? (initial.date || todayISO()) : todayISO(),
    name: String(initial.name || ""),
    contact: String(initial.contact || ""),
    program: normalizeCallProgram(initial.program),
    programId: initial.programId || "",
    serviceId: initial.serviceId || "",
    callStatus: normalizeCallStatus(initial.callStatus),
    interactionType: INTERACTION_TYPES.includes(initial.interactionType) ? initial.interactionType : "",
    interestStatus: normalizeInterestStatus(initial.interestStatus),
    remark: String(initial.remark || ""),
    callListCategory: category,
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => {
      if (!current[k]) return current;
      const next = { ...current };
      delete next[k];
      return next;
    });
  };

  const handleSave = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required";
    else if (!/^[a-zA-Z][a-zA-Z .'-]*$/.test(form.name.trim())) nextErrors.name = "Use letters, spaces, apostrophes, or hyphens only";
    if (!/^[6-9]\d{9}$/.test(form.contact.trim())) nextErrors.contact = "Enter a valid Indian mobile number";
    if (!resolveLeadTemplate(form, leadType, templates)
      && !(initial.id && form.program && form.program === initial.program)) nextErrors.program = `Select a ${category === "Training" ? "training" : "service"}`;
    if (!CALL_STATUS_OPTIONS.includes(form.callStatus)) nextErrors.callStatus = "Select a call status";
    if (!INTERACTION_TYPES.includes(form.interactionType)) nextErrors.interactionType = "Select an interaction type";
    if (!INTEREST_STATUS_OPTIONS.includes(form.interestStatus)) nextErrors.interestStatus = "Select an interest status";
    if (!form.remark.trim()) nextErrors.remark = "Remark is required";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave({ ...form, date: initial.id ? form.date : todayISO(), active: initial.active !== false });
  };

  return (
    <Modal title={readOnly ? "View Contact" : initial.id ? "Edit Contact" : "Add Contact"} onClose={onClose}>
      <fieldset className="crm-enquiry-fieldset" disabled={readOnly}>
      <div className="form-grid">
        <div className="field">
          <span>Full Name *</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rohit Malhotra" maxLength={80} required aria-required="true" aria-invalid={Boolean(errors.name)} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <span>Contact Number *</span>
          <div className="india-phone-input">
            <span className="india-phone-prefix" aria-label="India country code plus 91">
              <span className="india-flag" aria-hidden="true" />
              <span>+91</span>
            </span>
            <input
              type="tel"
              inputMode="numeric"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.contact)}
              value={form.contact}
              onChange={(e) => set("contact", e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
              readOnly={Boolean(initial.id)}
              title={initial.id ? "Contact number cannot be changed after creation" : undefined}
              aria-label="Indian mobile number, starting with 6, 7, 8, or 9"
            />
          </div>
          {errors.contact && <span className="field-error">{errors.contact}</span>}
        </div>
        <div className="field">
          <span>Date</span>
          <input value={formatDisplayDate(form.date)} readOnly aria-label="Date set automatically to today" />
        </div>
        <div className="field">
          <span>{category === "Training" ? "Training" : "Service"}</span>
          <select value={resolveLeadTemplate(form, leadType, templates)?.id || (form.program ? `legacy:${form.program}` : "")} disabled={templatesLoading || Boolean(templatesError)} onChange={(e) => {
            const selected = templates.find((template) => template.id === e.target.value);
            setForm((current) => ({ ...current, ...templateSelectionPatch(leadType, selected) }));
            setErrors((current) => ({ ...current, program: undefined }));
          }}>
            <option value="">{templatesLoading ? "Loading options..." : templatesError ? "Could not load options" : category === "Training" ? "Select Training" : "Select Service"}</option>
            {form.program && !resolveLeadTemplate(form, leadType, templates) && <option value={`legacy:${form.program}`}>{form.program} (previous selection)</option>}
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.title}</option>
            ))}
          </select>
          {templatesError && <span className="field-error" role="alert">Could not load message templates: {templatesError}</span>}
          {errors.program && <span className="field-error">{errors.program}</span>}
        </div>
        <div className="field">
          <span>Call Status</span>
          <select value={form.callStatus} onChange={(e) => set("callStatus", e.target.value)}>
            {CALL_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          {errors.callStatus && <span className="field-error">{errors.callStatus}</span>}
        </div>
        <div className="field">
          <span>Interaction Type</span>
          <select value={form.interactionType} onChange={(e) => set("interactionType", e.target.value)}>
            <option value="">Select Interaction</option>
            {INTERACTION_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          {errors.interactionType && <span className="field-error">{errors.interactionType}</span>}
        </div>
        <div className="field">
          <span>Interest Status</span>
          <select value={normalizeInterestStatus(form.interestStatus)} onChange={(e) => set("interestStatus", e.target.value)}>
            {INTEREST_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          {errors.interestStatus && <span className="field-error">{errors.interestStatus}</span>}
        </div>
        <div className="field span-full">
          <span>Remark</span>
          <textarea value={form.remark} onChange={(e) => set("remark", e.target.value)} placeholder="Notes about this contact..." maxLength={500} />
          {errors.remark && <span className="field-error">{errors.remark}</span>}
        </div>
      </div>
      </fieldset>
      <div className="form-actions">
        <button className="ghost-button" onClick={onClose}>
          Cancel
        </button>
        {!readOnly && (
          <button className="primary-button" onClick={handleSave} disabled={saving || !form.name.trim() || !form.contact.trim()}>
            <IconCheck size={16} /> {saving ? "Saving..." : "Save Contact"}
          </button>
        )}
      </div>
    </Modal>
  );
}

function CallListTab({ contacts, setContacts, showToast, category, title, addLabel, currentUser, onContactChange, onPersistContact, onCreateContact }) {
  const leadType = category === "Training" ? "training" : "service";
  const { templates, loading: templatesLoading, error: templatesError } = useMessageTemplates(leadType);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("All");
  const [callStatusFilter, setCallStatusFilter] = useState("All");
  const [interestFilter, setInterestFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [modalState, setModalState] = useState(null); // null | form object
  const [savingContact, setSavingContact] = useState(false);
  const [whatsAppLead, setWhatsAppLead] = useState(null);
  const tableRef = useRef(null);
  // The API sets this only when status, interest, or remark is changed. This
  // keeps the original date for every other kind of edit.
  const contactDate = (contact) => contact.lastWorkedAt || contact.date || contact.createdAt || contact.createdLeadDate || "";
  // Date sorting uses the exact activity date shown in the table.
  const sortableDate = (contact) => {
    const value = String(contactDate(contact)).slice(0, 10);
    const timestamp = new Date(`${value}T00:00:00`).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const filtered = useMemo(() => {
    let rows = contacts.filter((c) => {
      const matchesCategory = !category || (c.callListCategory || getCallListCategory(c.program)) === category;
      return matchesCategory && matchesCallListFilters(c, {
        search, program: programFilter, callStatus: callStatusFilter, interest: interestFilter,
      }) && (!fromDate || String(contactDate(c)).slice(0, 10) >= fromDate)
        && (!toDate || String(contactDate(c)).slice(0, 10) <= toDate);
    });
    rows = rows.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "date") {
        av = sortableDate(a);
        bv = sortableDate(b);
      }
      if (sortKey === "name") {
        return String(av || "").localeCompare(String(bv || ""), undefined, { sensitivity: "base", numeric: true }) * (sortDir === "asc" ? 1 : -1);
      }
      return (Number(av) - Number(bv)) * (sortDir === "asc" ? 1 : -1);
    });
    return rows;
  }, [contacts, category, search, programFilter, callStatusFilter, interestFilter, fromDate, toDate, sortKey, sortDir]);

  useEffect(() => { setPage(1); }, [category, search, programFilter, callStatusFilter, interestFilter, fromDate, toDate]);

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

  const updateContact = (id, patch, persist = true) => {
    const existing = contacts.find((contact) => contact.id === id);
    const activityFields = ["callStatus", "interestStatus", "remark", "callClicked", "whatsappClicked"];
    const activityRecorded = activityFields.some((key) => Object.prototype.hasOwnProperty.call(patch, key));
    const unchanged = Object.entries(patch).every(([key, value]) => String(existing?.[key] ?? "") === String(value ?? ""));
    if (!existing || (unchanged && !activityRecorded)) return;
    if (patch.callStatus === "Completed" && !normalizeCallProgram(existing?.program)) {
      showToast(`Please select a ${category === "Training" ? "training" : "service"} before marking this contact Completed.`);
      return;
    }
    setContacts((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const updated = { ...c, ...patch, ...(activityRecorded ? { lastWorkedAt: new Date().toISOString() } : {}) };
      onContactChange?.(updated);
      return updated;
    }));
    if (persist && existing?.sourceRecord) Promise.resolve(onPersistContact?.(existing, { ...patch, ...(activityRecorded ? { activityRecorded: true } : {}) })).catch(() => showToast("Could not save this update"));
  };

  const handleCall = (c) => {
    updateContact(c.id, { callClicked: true });
    showToast(`Calling ${c.name} (${c.contact})…`);
    window.location.href = `tel:${c.contact}`;
  };
  const handleWhatsapp = (c) => {
    setWhatsAppLead(c);
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
      onContactChange?.({ ...c, deleted: true });
      showToast("Contact deleted");
    }
  };
  const handleSaveModal = async (form) => {
    if (form.id) {
      updateContact(form.id, form);
      showToast("Contact updated");
    } else {
      if (savingContact) return;
      setSavingContact(true);
      try {
        const created = await onCreateContact?.(category === "Training" ? "training" : "services", form);
        if (!created) throw new Error("Could not save this contact to the backend.");
        onContactChange?.(normalizeSourceContact(created));
        showToast("Contact added");
      } catch (error) {
        showToast(error.message || "Could not add contact");
        return;
      } finally {
        setSavingContact(false);
      }
    }
    setModalState(null);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setProgramFilter("All");
    setCallStatusFilter("All");
    setInterestFilter("All");
    setFromDate("");
    setToDate("");
    setSortKey("date");
    setSortDir("desc");
    setPage(1);
  };

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const isSnoozed = (c) => c.snoozeUntil && c.snoozeUntil > todayISO();
  // A completed call is final: it can be viewed, but its CRM details cannot
  // be changed. Interest status does not affect this lock.
  const isConvertedToLead = (c) => c.callStatus === "Completed";
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16); pdf.text(`${title} Report`, 14, 14);
    pdf.setFontSize(9); pdf.setTextColor(100); pdf.text(`${filtered.length} filtered contact(s)`, 14, 20);
    autoTable(pdf, {
      startY: 25,
      head: [["S. No.", "Date", "Name", "Contact", "Call Status", "Interest", category === "Services" ? "Service" : "Training", "Remark"]],
      body: filtered.map((c, index) => [index + 1, formatDisplayDate(contactDate(c)), c.name || "-", c.contact || "-", normalizeCallStatus(c.callStatus), normalizeInterestStatus(c.interestStatus), normalizeCallProgram(c.program) || "-", c.remark || "-"]),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [127, 78, 43] },
    });
    pdf.save(`${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${todayISO()}.pdf`);
  };

  return (
    <div className="panel call-list-panel">
      <div className="panel-head">
        <h3>{title}</h3>
        <div className="row-actions"><button className="primary-button" onClick={exportPdf} disabled={!filtered.length}><IconDownload size={16} /> Export PDF ({filtered.length})</button><button className="primary-button" onClick={() => setModalState({ ...emptyContactForm(), program: "", callListCategory: category })}><IconPlus size={16} /> {addLabel}</button></div>
      </div>

      {templatesError && <p className="field-error" role="alert">Could not load message templates: {templatesError}</p>}

      <div className="module-toolbar">
        <div className="toolbar-search">
          <IconSearch size={16} />
          <input
            placeholder="Search by name or contact number"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSearch(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput.trim());
                setPage(1);
              }
            }}
          />
          <button type="button" className="toolbar-search-action" onClick={handleSearch}>
            Search
          </button>
        </div>
        <div className="toolbar-filters">
          <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
            <option value="All">{category === "Services" ? "All Services" : "All Training"}</option>
            <option value="">Unspecified</option>
            {[...new Set([...templates.map((template) => template.title), ...contacts.filter((contact) => (contact.callListCategory || getCallListCategory(contact.program)) === category).map((contact) => normalizeCallProgram(contact.program)).filter(Boolean)])].map((p) => (
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
        </div>
        <div className="call-list-date-row">
          <span>Lead activity date</span>
          <label className="table-date-filter"><span>From</span><input aria-label="From date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
          <label className="table-date-filter"><span>To</span><input aria-label="To date" type="date" min={fromDate} value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
          <button type="button" className="ghost-button compact" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      <div className="table-wrap" ref={tableRef}>
        <table className="table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th className="sortable-table-header" title="Sort by date" aria-sort={sortKey === "date" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} onClick={() => toggleSort("date")}>
                Date {sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="sortable-table-header" title="Sort names alphabetically" aria-sort={sortKey === "name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} onClick={() => toggleSort("name")}>
                Name {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th>Contact</th>
              <th>Call / WhatsApp</th>
              <th>Call Status</th>
              <th>Interest Status</th>
              <th>{category === "Services" ? "Service" : "Training"}</th>
              <th>Remark</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && <EmptyRow colSpan={10} text={`No ${category.toLowerCase()} contacts match the selected filters.`} />}
            {pageRows.map((c, idx) => {
              const locked = isConvertedToLead(c);
              return <tr key={c.id} className={locked ? "call-list-locked" : ""}>
                <td>{(page - 1) * CONTACT_PAGE_SIZE + idx + 1}</td>
                <td>{formatDisplayDate(contactDate(c))}</td>
                <td>
                  <div className="person-cell">
                    <div>
                      <strong style={{ display: "block" }}>{c.name}</strong>
                      {isSnoozed(c) && <span className="badge warning" style={{ height: 20, fontSize: "0.7rem" }}>Snoozed till {formatDisplayDate(c.snoozeUntil)}</span>}
                    </div>
                  </div>
                </td>
                <td>{c.contact}</td>
                <td>
                  <div className="row-actions">
                    <button className="row-icon-btn call" title={locked ? "Completed contact is view-only" : "Call"} disabled={locked} onClick={() => handleCall(c)}>
                      <IconPhone size={16} />
                    </button>
                    <button className="row-icon-btn whatsapp" title={locked ? "Completed contact is view-only" : "WhatsApp"} disabled={locked} onClick={() => handleWhatsapp(c)}>
                      <IconWhatsapp size={16} />
                    </button>
                  </div>
                </td>
                <td>
                  <select
                    className="inline-select"
                    value={normalizeCallStatus(c.callStatus)}
                    disabled={locked}
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
                    value={normalizeInterestStatus(c.interestStatus)}
                    disabled={locked}
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
                    value={resolveLeadTemplate(c, leadType, templates)?.id || (normalizeCallProgram(c.program) ? `legacy:${normalizeCallProgram(c.program)}` : "")}
                    disabled={locked || templatesLoading || Boolean(templatesError)}
                    onChange={(e) => {
                      const selected = templates.find((template) => template.id === e.target.value);
                      updateContact(c.id, { ...templateSelectionPatch(leadType, selected), callListCategory: category });
                    }}
                    aria-label={category === "Services" ? "Service" : "Training"}
                  >
                    <option value="">
                      {templatesLoading ? "Loading options..." : templatesError ? "Could not load options" : category === "Services" ? "Select Service" : "Select Training"}
                    </option>
                    {normalizeCallProgram(c.program) && !resolveLeadTemplate(c, leadType, templates) ? (
                      <option value={`legacy:${normalizeCallProgram(c.program)}`}>{normalizeCallProgram(c.program)} (previous selection)</option>
                    ) : null}
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                  </select>
                </td>
                <td>
                    <div className="remark-cell">
                    <RemarkField readOnly={locked} value={c.remark || ""} onChange={(value) => updateContact(c.id, { remark: value }, false)} onCommit={(value) => updateContact(c.id, { remark: value })} label={`Remark for ${c.name || "contact"}`} />
                  </div>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="row-icon-btn edit" title={isConvertedToLead(c) ? "View" : "Edit"} onClick={() => setModalState(c)}>
                      {isConvertedToLead(c) ? <IconView size={16} /> : <IconEdit size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={CONTACT_PAGE_SIZE} onChange={(nextPage) => {
        setPage(nextPage);
        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }} />

      {modalState && (
        <ContactFormModal category={category}
          initial={modalState}
          templates={templates}
          templatesLoading={templatesLoading}
          templatesError={templatesError}
          saving={savingContact}
          readOnly={isConvertedToLead(modalState)}
          onClose={() => setModalState(null)}
          onSave={handleSaveModal}
        />
      )}
      {whatsAppLead && <WhatsAppModal lead={whatsAppLead} leadType={leadType} currentUser={currentUser} onClose={() => setWhatsAppLead(null)} onSelectTemplate={(template) => updateContact(whatsAppLead.id, templateSelectionPatch(leadType, template))} onSent={() => updateContact(whatsAppLead.id, { whatsappClicked: true })} />}
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

function AssignedLeadsTab({ leads, callLeadRows, currentUser }) {
  const currentUserKeys = [currentUser?.id, currentUser?._id, currentUser?.username, currentUser?.name]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
  const currentUserId = String(currentUser?.id || currentUser?._id || "").trim();
  const assignedLeads = leads.filter((lead) => [lead.assignedTo, lead.assignedToName]
    .filter(Boolean)
    .some((value) => currentUserKeys.includes(String(value).trim().toLowerCase())));

  return (
    <div className="assigned-leads-page">
      <div className="panel-head" hidden>
        <div>
          <h3>Assigned Leads</h3>
          <p className="panel-subtitle">Leads assigned to {currentUser?.name || currentUser?.username || "you"}</p>
        </div>
        <span className="badge info">{assignedLeads.length}</span>
      </div>
      <div className="table-wrap" hidden>
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
      <CallLeadsPanel
        rows={callLeadRows}
        currentUser={currentUser}
        assignedTo={currentUserId}
        showAssignee={false}
        showActions={false}
        canEditCallData={false}
        title={`Assigned Call Leads (${callLeadRows.filter((row) => isLeadContact(row) && String(row.callLeadAssignedTo || "") === currentUserId).length})`}
        subtitle="Qualifying service and training call-list contacts assigned to you"
      />
    </div>
  );
}

function LeadFormModal({ initial, onClose, onSave, currentUser, users = [], saving = false, readOnly = false, hideAssignment = false, draftSaved = false, saveLabel = "Save lead" }) {
  const initialType = initial.type || (getCallListCategory(initial.program) === "Services" ? "Service" : getCallListCategory(initial.program) === "Internship" ? "Internship" : "Training");
  const interestOptions = (type) => type === "Service"
    ? SERVICE_CALL_LIST_SERVICES
    : type === "Internship"
    ? ["Front End (React.js)", "Back End (Node.js)", "Full Stack"]
    : TRAINING_CALL_LIST_PROGRAMS;
  const [form, setForm] = useState(() => ({
    ...initial,
    name: initial.name || "",
    phone: initial.phone || initial.contact || "",
    email: initial.email || "",
    alternatePhone: initial.alternatePhone || "",
    city: initial.city || "",
    company: initial.company || "",
    type: initialType,
    interest: initial.interest || initial.program || "",
    value: initial.value ?? "",
    status: initial.status || "Select Status",
    leadSource: initial.leadSource || initial.source || "Website",
    enteredBy: initial.enteredBy || String(currentUser?.id || currentUser?._id || currentUser?.username || ""),
    assignedTo: initial.assignedTo || "",
    assignedDate: initial.assignedDate || "",
    notes: initial.notes || initial.remark || "",
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const availableInterests = [...new Set([...interestOptions(form.type), form.interest].filter(Boolean))];
  const handleSave = () => {
    if (!form.name.trim() || !/^[6-9]\d{9}$/.test(form.phone.trim()) || !form.city.trim() || !form.interest) return;
    onSave({
      ...initial,
      ...form,
      contact: form.phone.trim(),
      phone: form.phone.trim(),
      program: form.interest,
      remark: form.notes,
      source: form.leadSource,
      createdDate: initial.createdDate || todayISO(),
    });
  };

  return (
    <Modal title={readOnly ? "View lead" : draftSaved ? "Edit saved lead form" : "Add new lead"} onClose={onClose} wide>
      <fieldset className="crm-enquiry-fieldset" disabled={readOnly}>
      <div className="form-grid add-lead-form crm-enquiry-form">
        <p className="form-section-title">Contact Information</p>
        <div className="field">
          <span>Full name *</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter the lead's full name here" />
        </div>
        <div className="field">
          <span>Phone *</span>
          <input value={form.phone} maxLength={10} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter the lead's phone number here" />
        </div>
        <div className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Enter the lead's email here" />
        </div>
        <div className="field">
          <span>Alternate Phone</span>
          <input value={form.alternatePhone} maxLength={10} onChange={(e) => set("alternatePhone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter an alternate phone number here" />
        </div>
        <div className="field">
          <span>City *</span>
          <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Enter the city here" />
        </div>
        <div className="field">
          <span>Company / Organization</span>
          <input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Enter the company or organization here" />
        </div>

        <p className="form-section-title">Lead Information</p>
        <div className="field">
          <span>Lead Type *</span>
          <select value={form.type} onChange={(e) => { const type = e.target.value; setForm((current) => ({ ...current, type, interest: interestOptions(type)[0] })); }}>
            <option>Training</option>
            <option>Service</option>
            <option>Internship</option>
          </select>
        </div>
        <div className="field">
          <span>Interest *</span>
          <select value={form.interest} onChange={(e) => set("interest", e.target.value)}>
            <option value="">Select interest</option>
            {availableInterests.map((interest) => <option key={interest}>{interest}</option>)}
          </select>
        </div>
        <div className="field">
          <span>Value</span>
          <input type="number" min="0" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="Enter the estimated value here" />
        </div>
        <div className="field">
          <span>Lead Source *</span>
          <select value={form.leadSource} onChange={(e) => set("leadSource", e.target.value)}>
            {["Website", "Referral", "Facebook", "Instagram", "Google", "Walk-in", "Phone Call", "Other"].map((source) => <option key={source}>{source}</option>)}
          </select>
        </div>
        <div className="field">
          <span>Status *</span>
          <select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option>Pending</option>
            <option>Interested</option>
            <option>Not Interested</option>
            {form.status && !["Pending", "Interested", "Not Interested"].includes(form.status) ? <option>{form.status}</option> : null}
          </select>
        </div>

        {hideAssignment ? <>
          <p className="form-section-title">Created By</p>
          <div className="field">
            <span>Entered By</span>
            <input value={form.enteredBy} readOnly />
          </div>
        </> : <>
          <p className="form-section-title">Assignment</p>
          <div className="field">
            <span>Entered By *</span>
            <input value={form.enteredBy} readOnly />
          </div>
          <div className="field">
            <span>Assigned To *</span>
            <select value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
              <option value="">Select Assignee</option>
              {users.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}
            </select>
          </div>
          <div className="field">
            <span>Assigned Date</span>
            <input type="date" value={form.assignedDate} onChange={(e) => set("assignedDate", e.target.value)} />
          </div>
        </>}

        <p className="form-section-title">Additional Information</p>
        <div className="field span-full">
          <span>Lead Notes / Remarks</span>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Enter lead notes or requirements here" rows={4} />
        </div>
      </div>
      </fieldset>
      <div className="form-actions">
        <button className="ghost-button" onClick={onClose}>
          Cancel
        </button>
        {!readOnly && (
          <button className="primary-button" disabled={saving} onClick={handleSave}>
            <IconCheck size={16} /> {saveLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}

function LeadsTab({ rows, users, currentUser, onSave, onApprove, onDelete, onCreateLead, showToast }) {
  const [initial, setInitial] = useState(null);
  const [saving, setSaving] = useState(false);
  const create = async (form) => {
    if (saving) return;
    setSaving(true);
    try {
      if (initial.record) {
        await onSave(initial.record, { leadDraft: form });
      } else {
        await onCreateLead(form);
      }
      setInitial(null);
      showToast(initial.record ? "Lead form saved. The form is now locked; approve the lead when ready." : "Lead uploaded successfully.");
    } catch (error) { showToast(error.message || "Could not create lead"); }
    finally { setSaving(false); }
  };
  return <>
    <CallLeadsPanel rows={rows} users={users} currentUser={currentUser} onSave={onSave} onApprove={onApprove} onDelete={onDelete} onAdd={(row) => setInitial({ record: row, form: { ...callLeadForm(row), ...row.leadDraft } })} onUploadLead={() => setInitial({ record: null, form: callLeadForm({ listType: "services" }) })} showAssignee={false} lockCreatedLead />
    {initial && <LeadFormModal initial={initial.form} users={users} currentUser={currentUser} saving={saving} onClose={() => setInitial(null)} onSave={create} hideAssignment draftSaved={Boolean(initial.record?.leadDraft)} saveLabel={initial.record ? "Save lead form" : "Save lead"} />}
  </>;
}

function ApprovedLeadsTab({ leads, sourceContacts, currentUser }) {
  const creatorIds = new Set([
    currentUser?.id,
    currentUser?._id,
    currentUser?.username,
    currentUser?.name,
  ].filter(Boolean).map(String));
  const rows = (leads || [])
    .filter((lead) => [lead.enteredBy, lead.enteredByName, lead.createdBy, lead.createdByName, lead.crmExecutiveId].some((value) => creatorIds.has(String(value || "")))
      && (lead.sourceCallPath || sourceContacts.some((contact) => contact.callLeadStatus === "Approved" && String(contact.createdLeadId || "") === String(lead.id || lead._id))))
    .map((lead) => {
      const contact = sourceContacts.find((item) => String(item.createdLeadId || "") === String(lead.id || lead._id)) || {};
      return {
        id: String(lead.id || lead._id),
        listType: String(lead.listType || lead.type || "").toLowerCase() === "training" ? "training" : "services",
        date: String(lead.createdDate || lead.createdAt || lead.assignedDate || todayISO()).slice(0, 10),
        name: lead.name || "",
        contact: lead.phone || lead.contact || "",
        program: lead.interest || lead.program || "",
        callStatus: contact.callStatus || "Completed",
        interestStatus: contact.interestStatus || "Interested",
        remark: lead.notes || lead.remark || "",
        callLeadStatus: "Approved",
        leadCreated: true,
      };
    });
  return <CallLeadsPanel
    rows={rows}
    showAllRows
    showActions={false}
    showAssignee={false}
    showContactActions={false}
    canEditCallData={false}
    lockCreatedLead
    onSave={async () => {}}
    title="Approved Leads"
    subtitle="Leads created by you from Call Leads"
  />;
}

function SalesReportsTab({ contacts, showToast }) {
  const [reportScope, setReportScope] = useState("Services");
  const [program, setProgram] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const reportDate = (contact) => String(contact.lastWorkedAt || contact.createdLeadDate || contact.date || contact.createdAt || "").slice(0, 10);
  const reportCategory = (contact) => contact.listType === "training" ? "Training" : contact.listType === "services" ? "Services" : getCallListCategory(contact.program);
  const scopedContacts = contacts.filter((contact) => reportScope === "All" || reportCategory(contact) === reportScope);
  const programOptions = [...new Set([...PROGRAMS, ...scopedContacts.map((contact) => contact.program).filter(Boolean)])];

  const filteredContacts = scopedContacts.filter((c) => {
    const matchesProgram = program === "All" || c.program === program;
    const recordDate = reportDate(c);
    const matchesFrom = !dateFrom || recordDate >= dateFrom;
    const matchesTo = !dateTo || recordDate <= dateTo;
    return matchesProgram && matchesFrom && matchesTo;
  });

  const totalContacts = filteredContacts.length;
  const followUps = filteredContacts.filter((contact) => normalizeCallStatus(contact.callStatus) === "Follow Up").length;
  const completed = filteredContacts.filter((contact) => normalizeCallStatus(contact.callStatus) === "Completed").length;
  const interested = filteredContacts.filter((contact) => normalizeInterestStatus(contact.interestStatus) === "Interested").length;
  const notInterested = filteredContacts.filter((contact) => normalizeInterestStatus(contact.interestStatus) === "Not Interested").length;
  const createdLeads = filteredContacts.filter((contact) => contact.leadCreated || contact.createdLeadId || contact.callLeadStatus === "Approved").length;
  const conversionRate = totalContacts ? Math.round((createdLeads / totalContacts) * 100) : 0;
  const pipeline = [
    { label: "Total contacts", value: totalContacts, tone: "neutral" },
    { label: "Interested", value: interested, tone: "blue" },
    { label: "Follow ups", value: followUps, tone: "amber" },
    { label: "Completed", value: completed, tone: "purple" },
    { label: "Leads created", value: createdLeads, tone: "green" },
  ];
  const programRows = [...new Set(filteredContacts.map((contact) => contact.program).filter(Boolean))]
    .map((programName) => {
      const rows = filteredContacts.filter((contact) => contact.program === programName);
      const leadsCreated = rows.filter((contact) => contact.leadCreated || contact.createdLeadId || contact.callLeadStatus === "Approved").length;
      return { program: programName, total: rows.length, interested: rows.filter((contact) => normalizeInterestStatus(contact.interestStatus) === "Interested").length, leadsCreated, rate: rows.length ? Math.round((leadsCreated / rows.length) * 100) : 0 };
    })
    .sort((left, right) => right.total - left.total || right.leadsCreated - left.leadsCreated);
  // Replaced visual blocks remain mounted below for backwards compatibility;
  // the report panel hides them in favour of the operational dashboard.
  const categorySummary = [];
  const reportRows = [];

  const handleExport = () => {
    if (!programRows.length) {
      showToast("Nothing to export for the selected filters");
      return;
    }
    downloadCSV(`sales-report-${todayISO()}.csv`, programRows.map((row) => ({ Program: row.program, "Total Contacts": row.total, Interested: row.interested, "Leads Created": row.leadsCreated, "Conversion Rate": `${row.rate}%` })));
    showToast("Report exported as CSV");
  };

  return (
    <div className="panel sales-report-panel">
      <div className="panel-head">
        <div><h3>{reportScope === "Training" ? "Training Sales Report" : reportScope === "Services" ? "Service Sales Report" : "Sales Reports"}</h3><p className="panel-subtitle">Performance based on your assigned call-list contacts</p></div>
        <button className="ghost-button" onClick={handleExport}>
          <IconDownload size={16} /> Export CSV
        </button>
      </div>

      <div className="sales-report-scope" role="tablist" aria-label="Report type">
        {["Services", "Training"].map((scope) => <button key={scope} type="button" role="tab" aria-selected={reportScope === scope} className={reportScope === scope ? "active" : ""} onClick={() => { setReportScope(scope); setProgram("All"); }}>{scope}</button>)}
      </div>

      <div className="module-toolbar">
        <div className="toolbar-filters">
          <select value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="All">All Programs</option>
            {programOptions.map((p) => (
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
      <div className="sales-report-summary">
        <article><span>Total contacts</span><strong>{totalContacts}</strong><small>Within selected filters</small></article>
        <article className="blue"><span>Interested</span><strong>{interested}</strong><small>{totalContacts ? Math.round((interested / totalContacts) * 100) : 0}% of contacts</small></article>
        <article className="amber"><span>Follow ups due</span><strong>{followUps}</strong><small>Needs another conversation</small></article>
        <article className="green"><span>Leads created</span><strong>{createdLeads}</strong><small>{conversionRate}% conversion rate</small></article>
      </div>

      <div className="sales-report-content">
        <section className="sales-report-card sales-funnel">
          <div className="sales-report-card-head"><div><h4>Sales funnel</h4><p>How contacts progress through your pipeline</p></div><span>{notInterested} not interested</span></div>
          <div className="sales-funnel-bars">
            {pipeline.map((step) => <div className="sales-funnel-row" key={step.label}><div><span>{step.label}</span><strong>{step.value}</strong></div><div className="sales-bar-track"><i className={step.tone} style={{ width: `${totalContacts ? Math.max((step.value / totalContacts) * 100, step.value ? 5 : 0) : 0}%` }} /></div></div>)}
          </div>
        </section>
        <section className="sales-report-card sales-conversion-card">
          <p>Conversion rate</p><strong>{conversionRate}%</strong><div className="sales-conversion-ring" style={{ "--progress": `${conversionRate * 3.6}deg` }}><span>{createdLeads}<small>leads</small></span></div><small>Created leads out of {totalContacts} contacts</small>
        </section>
      </div>

      <section className="sales-report-card sales-program-performance">
        <div className="sales-report-card-head"><div><h4>Program performance</h4><p>Contact volume and leads created by service or training program</p></div></div>
        {!programRows.length ? <p className="sales-report-empty">No contact data matches the selected filters.</p> : <div className="sales-program-list">
          {programRows.map((row) => <div className="sales-program-row" key={row.program}><div className="sales-program-name"><strong>{row.program}</strong><span>{row.total} contacts · {row.interested} interested</span></div><div className="sales-program-bar"><i style={{ width: `${totalContacts ? (row.total / totalContacts) * 100 : 0}%` }} /></div><div className="sales-program-result"><strong>{row.leadsCreated}</strong><span>leads · {row.rate}%</span></div></div>)}
        </div>}
      </section>
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

function TaskFormModal({ initial, onClose, onSave, selfAssignee = "" }) {
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
          <span>Assigned to</span>
          <input value={selfAssignee || form.assignee || "You"} readOnly aria-label="Task is assigned to you" />
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

function TasksTab({ tasks, setTasks, showToast, currentUser }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [modalState, setModalState] = useState(null);

  const filtered = tasks.filter((t) => {
    const matchesSearch = !search.trim() || t.title.toLowerCase().includes(search.trim().toLowerCase());
    const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;
    const createdDate = String(t.createdAt || "").slice(0, 10);
    const matchesFromDate = !fromDate || (createdDate && createdDate >= fromDate);
    const matchesToDate = !toDate || (createdDate && createdDate <= toDate);
    return matchesSearch && matchesPriority && matchesFromDate && matchesToDate;
  });
  const taskSummary = {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === "To Do").length,
    progress: tasks.filter((task) => task.status === "In Progress").length,
    done: tasks.filter((task) => task.status === "Done").length,
  };

  const updateTask = async (id, patch) => {
    try {
      const saved = await updateTaskApi(id, patch);
      setTasks((prev) => prev.map((task) => task.id === id ? saved : task));
    } catch (error) { showToast(error.message || "Could not update task"); }
  };
  const handleSaveModal = async (form) => {
    if (form.id) {
      await updateTask(form.id, form); showToast("Task updated");
    } else {
      try {
        const saved = await createTaskApi({ ...form, id: genId("task"), assigneeId: currentUser?.id || currentUser?._id });
        setTasks((prev) => [saved, ...prev]); showToast("Personal task created");
      } catch (error) { showToast(error.message || "Could not create task"); return; }
    }
    setModalState(null);
  };
  const handleSearch = () => {
    if (search.trim()) {
      setSearchInput("");
      setSearch("");
      return;
    }
    setSearch(searchInput.trim());
  };
  return (
    <div className="panel">
      <div className="panel-head">
        <div><h3>My tasks</h3><p className="panel-subtitle">Tasks assigned by Admin and tasks you created for yourself</p></div>
        <button className="primary-button" onClick={() => setModalState({ ...emptyTaskForm(), assignee: currentUser?.name || currentUser?.username || "Me", assigneeId: currentUser?.id || currentUser?._id || "" })}>
          <IconPlus size={16} /> New Task
        </button>
      </div>

      <div className="crm-task-summary">
        <div><span>All tasks</span><strong>{taskSummary.total}</strong></div>
        <div className="todo"><span>To do</span><strong>{taskSummary.todo}</strong></div>
        <div className="progress"><span>In progress</span><strong>{taskSummary.progress}</strong></div>
        <div className="done"><span>Completed</span><strong>{taskSummary.done}</strong></div>
      </div>

      <div className="module-toolbar">
        <div className="toolbar-search">
          <IconSearch size={16} />
          <input
            placeholder="Search tasks"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSearch(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchInput.trim());
            }}
          />
          <button type="button" className="toolbar-search-action" onClick={handleSearch}>
            {search.trim() ? "Clear" : "Search"}
          </button>
        </div>
        <div className="toolbar-filters">
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="All">All Priorities</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <label className="task-date-filter">
            <span>Created from</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="task-date-filter">
            <span>Created to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table tasks-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Description</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <EmptyRow colSpan={7} text="No tasks match the selected filters." />}
            {filtered.map((t) => (
              <tr key={t.id}>
                <td><strong>{t.title}</strong></td>
                <td>{t.description || "-"}</td>
                <td>{t.assignee}</td>
                <td><span className={clsx("badge", priorityBadgeClass(t.priority))}>{t.priority}</span></td>
                <td>
                  <select className="inline-select" value={t.status} onChange={(e) => updateTask(t.id, { status: e.target.value })}>
                    {TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </td>
                <td>{formatDisplayDate(t.createdAt)}</td>
                <td>{formatDisplayDate(t.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalState && <TaskFormModal initial={modalState} selfAssignee={currentUser?.name || currentUser?.username || "You"} onClose={() => setModalState(null)} onSave={handleSaveModal} />}
    </div>
  );
}

/* ============================ MARK ATTENDANCE TAB =========================== */

function MarkAttendanceTab({ attendance, setAttendance, showToast, profile }) {
  const today = todayISO();
  const todaysRecord = attendance.find((a) => a.date === today) || null;
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [status, setStatus] = useState(todaysRecord?.status || "");
  const [remark, setRemark] = useState(todaysRecord?.remark || "");
  const checkIn = todaysRecord?.checkIn && todaysRecord.checkIn !== "-" ? todaysRecord.checkIn : "";
  const checkOut = todaysRecord?.checkOut && todaysRecord.checkOut !== "-" ? todaysRecord.checkOut : "";
  const formatTime = (date) => date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { setStatus(todaysRecord?.status || ""); setRemark(todaysRecord?.remark || ""); }, [todaysRecord?.id]);

  const handleCheckIn = async () => {
    if (checkIn || !status) return;
    try {
      const saved = await createAttendance({ date: today, status, remark });
      setAttendance((prev) => [saved, ...prev.filter((record) => record.id !== saved.id)]);
      showToast("Checked in successfully");
    } catch (error) { showToast(error.message || "Could not mark attendance"); }
  };

  const handleCheckOut = async () => {
    if (!checkIn || checkOut) return;
    try {
      const saved = await updateAttendance(todaysRecord.id, {});
      setAttendance((prev) => prev.map((record) => record.id === saved.id ? saved : record));
      showToast("Checked out successfully");
    } catch (error) { showToast(error.message || "Could not check out"); }
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3>Mark Attendance</h3>
        </div>
        <div className="crm-attendance-form">
          <label className="crm-attendance-field">
            <span>Employee Name</span>
            <input value={profile?.name || "CRM Executive"} readOnly />
          </label>
          <label className="crm-attendance-field">
            <span>Select Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={Boolean(checkIn)}>
              <option value="">Select Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </label>
          <label className="crm-attendance-field">
            <span>Remark</span>
            <input value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Remark (optional)" disabled={Boolean(checkIn)} />
          </label>
          <button
            className={clsx("crm-attendance-submit", checkIn && !checkOut && "checkout", checkOut && "completed")}
            onClick={checkOut ? undefined : checkIn ? handleCheckOut : handleCheckIn}
            disabled={Boolean(checkOut) || (!checkIn && !status)}
          >
            {checkOut ? "Completed" : checkIn ? "Check Out" : "Check In"}
          </button>
        </div>
        <div className="crm-attendance-clock">
          Current time: <strong>{formatTime(currentTime)}</strong>
        </div>
      </div>
    </div>
  );
}

/* =========================== ATTENDANCE REPORT TAB ========================== */

function AttendanceReportTab({ attendance, showToast }) {
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const monthOptions = useMemo(() => {
    const set = new Set(attendance.map((a) => monthKeyOf(a.date)));
    set.add(currentMonthKey());
    return Array.from(set).sort().reverse();
  }, [attendance]);

  const rows = attendance.filter((a) => monthKeyOf(a.date) === monthFilter
    && (statusFilter === "All" || a.status === statusFilter)
    && (!dateFrom || a.date >= dateFrom) && (!dateTo || a.date <= dateTo))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [monthFilter, statusFilter, dateFrom, dateTo]);
  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);

  const handleExport = () => {
    if (!rows.length) {
      showToast("No records for the selected month");
      return;
    }
    downloadCSV(`attendance-${monthFilter}.csv`, rows.map((r) => ({ Date: formatDisplayDate(r.date), Status: r.status, "Punch In Time": r.checkIn, "Punch Out Time": r.checkOut })));
    showToast("Attendance report exported");
  };
  const handleExportPdf = () => {
    if (!rows.length) return;
    exportReportPdf({
      title: "Attendance Report",
      filename: `attendance-${monthFilter}.pdf`,
      head: ["Date", "Status", "Punch In", "Punch Out"],
      body: rows.map((row) => [formatDisplayDate(row.date), row.status || "-", row.checkIn || "Not recorded", row.checkOut || "Not recorded"]),
    });
  };

  return (
    <div className="panel crm-record-report attendance-report-panel">
      <div className="panel-head">
        <div><h3>Attendance Report</h3><p className="panel-subtitle">Review your punch times and attendance history</p></div>
        <div className="report-head-actions">
          <button className="ghost-button" onClick={handleExport} disabled={!rows.length}><IconDownload size={16} /> Export CSV</button>
          <button className="primary-button" onClick={handleExportPdf} disabled={!rows.length}><IconDownload size={16} /> Export PDF ({rows.length})</button>
        </div>
      </div>
      <div className="report-summary">
        <div><span>Records</span><strong>{rows.length}</strong></div>
        <div><span>Present</span><strong>{rows.filter((row) => row.status === "Present").length}</strong></div>
        <div><span>On leave</span><strong>{rows.filter((row) => row.status === "On Leave").length}</strong></div>
        <div><span>Other</span><strong>{rows.filter((row) => !["Present", "On Leave"].includes(row.status)).length}</strong></div>
      </div>
      <div className="report-toolbar">
        <label><span>Month</span><select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {new Date(`${m}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select></label>
        <label><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="All">All statuses</option>{[...new Set(attendance.map((row) => row.status).filter(Boolean))].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label><span>From</span><input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); if (dateTo && dateTo < e.target.value) setDateTo(e.target.value); }} /></label>
        <label><span>To</span><input type="date" min={dateFrom} value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
        <button type="button" className="ghost-button" onClick={() => { setMonthFilter(currentMonthKey()); setStatusFilter("All"); setDateFrom(""); setDateTo(""); }}>Reset</button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Punch In Time</th>
              <th>Punch Out Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={4} text="No attendance records match these filters." />}
            {pageRows.map((r) => (
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
                <td>{r.checkIn || "Not recorded"}</td>
                <td>{r.checkOut || "Not recorded"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} totalPages={totalPages} totalItems={rows.length} pageSize={pageSize} onChange={setPage} />
    </div>
  );
}

/* ============================= LEAVE REQUEST TAB ============================ */

function LeaveRequestTab({ leaveRequests, setLeaveRequests, showToast }) {
  const [form, setForm] = useState({ type: LEAVE_TYPES[0], from: todayISO(), to: todayISO(), reason: "" });
  const [errors, setErrors] = useState({});
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const requestedDays = leaveDays(form.from, form.to);
  const filteredRequests = leaveRequests.filter((leave) => (typeFilter === "All" || leave.type === typeFilter)
    && (statusFilter === "All" || leave.status === statusFilter)
    && (!filterFrom || String(leave.to || "") >= filterFrom)
    && (!filterTo || String(leave.from || "") <= filterTo))
    .sort((left, right) => String(right.appliedOn || right.createdAt || "").localeCompare(String(left.appliedOn || left.createdAt || "")));
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [typeFilter, statusFilter, filterFrom, filterTo]);
  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);

  const handleExportPdf = () => {
    if (!filteredRequests.length) return;
    exportReportPdf({
      title: "My Leave Requests",
      filename: `leave-requests-${todayISO()}.pdf`,
      landscape: true,
      head: ["Type", "From", "To", "Days", "Reason", "Applied On", "Status"],
      body: filteredRequests.map((leave) => [leave.type || "-", formatDisplayDate(leave.from), formatDisplayDate(leave.to), String(Number(leave.days) > 0 ? leave.days : leaveDays(leave.from, leave.to) || "-"), leave.reason || "-", formatDisplayDate(leave.appliedOn), leave.status || "Pending"]),
    });
  };

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!form.from) nextErrors.from = "Start date is required";
    if (!form.to) nextErrors.to = "End date is required";
    if (form.from && form.to && requestedDays === null) nextErrors.to = "End date must be on or after start date";
    if (!form.reason.trim()) nextErrors.reason = "Please add a reason";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    try {
      const saved = await createLeave(form);
      setLeaveRequests((prev) => [saved, ...prev.filter((leave) => leave.id !== saved.id)]);
      setForm({ type: LEAVE_TYPES[0], from: todayISO(), to: todayISO(), reason: "" });
      setErrors({});
      showToast("Leave request submitted");
    } catch (error) { showToast(error.message || "Could not submit leave request"); }
  };

  return (
    <div>
      <div className="panel leave-request-panel">
        <div className="panel-head"><div><h3>Apply for Leave</h3><p className="panel-subtitle">Select your dates and see the total before submitting</p></div></div>
        <div className="leave-form-body">
          <div className="form-grid leave-form-grid">
            <div className="field">
              <span>Leave Type</span>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {LEAVE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>From</span>
              <input type="date" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value, to: f.to && f.to < e.target.value ? e.target.value : f.to }))} />
              {errors.from && <span className="field-error">{errors.from}</span>}
            </div>
            <div className="field">
              <span>To</span>
              <input type="date" min={form.from} value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} />
              {errors.to && <span className="field-error">{errors.to}</span>}
            </div>
            <div className="leave-duration-card" role="status"><span>Leave duration</span><strong>{requestedDays === null ? "Choose dates" : `${requestedDays} ${requestedDays === 1 ? "day" : "days"}`}</strong><small>Calendar days, including both dates</small></div>
            <div className="field span-full">
              <span>Reason</span>
              <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              {errors.reason && <span className="field-error">{errors.reason}</span>}
            </div>
          </div>
          <div className="form-actions leave-form-actions">
            <button className="primary-button" onClick={handleSubmit}>
              <IconCheck size={16} /> Submit Request
            </button>
          </div>
        </div>
      </div>

      <div className="panel leave-history-panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div><h3>My Leave Requests</h3><p className="panel-subtitle">Track the status and duration of each request</p></div>
          <button className="primary-button" onClick={handleExportPdf} disabled={!filteredRequests.length}><IconDownload size={16} /> Export PDF ({filteredRequests.length})</button>
        </div>
        <div className="report-summary leave-summary">
          <div><span>Requests</span><strong>{filteredRequests.length}</strong></div>
          <div><span>Pending</span><strong>{filteredRequests.filter((leave) => leave.status === "Pending").length}</strong></div>
          <div><span>Approved</span><strong>{filteredRequests.filter((leave) => leave.status === "Approved").length}</strong></div>
          <div><span>Rejected</span><strong>{filteredRequests.filter((leave) => leave.status === "Rejected").length}</strong></div>
        </div>
        <div className="report-toolbar">
          <label><span>Leave type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="All">All types</option>{LEAVE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="All">All statuses</option>{["Pending", "Approved", "Rejected"].map((status) => <option key={status}>{status}</option>)}</select></label>
          <label><span>Leave from</span><input type="date" value={filterFrom} onChange={(event) => { setFilterFrom(event.target.value); if (filterTo && filterTo < event.target.value) setFilterTo(event.target.value); }} /></label>
          <label><span>Leave to</span><input type="date" min={filterFrom} value={filterTo} onChange={(event) => setFilterTo(event.target.value)} /></label>
          <button type="button" className="ghost-button" onClick={() => { setTypeFilter("All"); setStatusFilter("All"); setFilterFrom(""); setFilterTo(""); }}>Reset</button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Applied On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 && <EmptyRow colSpan={7} text="No leave requests match these filters." />}
              {pageRows.map((l) => (
                <tr key={l.id}>
                  <td>{l.type}</td>
                  <td>{formatDisplayDate(l.from)}</td>
                  <td>{formatDisplayDate(l.to)}</td>
                  <td><strong>{Number(l.days) > 0 ? l.days : leaveDays(l.from, l.to) || "-"}</strong></td>
                  <td title={l.reason}>{l.reason}</td>
                  <td>{formatDisplayDate(l.appliedOn)}</td>
                  <td>
                    <span className={clsx("badge", leaveStatusBadgeClass(l.status))}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={currentPage} totalPages={totalPages} totalItems={filteredRequests.length} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  );
}

/* ================================ SETTINGS TAB ============================== */

function SettingsTab({ profile, setProfile, showToast, currentUser, onProfileUpdated }) {
  const [profileForm, setProfileForm] = useState(profile);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [message, setMessage] = useState(null);
  const [pwErrors, setPwErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleSaveProfile = async () => {
    try {
      const saved = await updateMyProfile({ name: profileForm.name, email: profileForm.email, phone: profileForm.phone });
      const nextProfile = { ...profileForm, ...saved };
      setProfile(nextProfile);
      setProfileForm(nextProfile);
      onProfileUpdated?.(saved);
      setMessage({ type: "success", text: "Profile updated successfully" });
      showToast("Profile saved");
    } catch (error) { setMessage({ type: "error", text: error.message || "Could not save profile" }); }
  };

  const handleChangePassword = async () => {
    const nextErrors = {};
    if (!passwordForm.current) nextErrors.current = "Enter your current password";
    if (!passwordForm.next || passwordForm.next.length < 6) nextErrors.next = "New password must be at least 6 characters";
    if (passwordForm.next !== passwordForm.confirm) nextErrors.confirm = "Passwords do not match";
    setPwErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPasswordSaving(true);
    try {
      await changePassword(currentUser?.id || currentUser?._id, passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "", confirm: "" });
      showToast("Password updated");
    } catch (error) {
      showToast(error.message || "Could not update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Profile</h3>
        </div>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field">
            <span>Full Name</span>
            <input value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <span>Role</span>
            <input value={profileForm.role} readOnly />
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
                    aria-label={`${showPw[key] ? "Hide" : "Show"} ${key === "current" ? "current" : key === "next" ? "new" : "confirm new"} password`}
                    onClick={() => setShowPw((f) => ({ ...f, [key]: !f[key] }))}
                  >
                    {showPw[key] ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                  </button>
                </div>
                {pwErrors[key] && <span className="field-error">{pwErrors[key]}</span>}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="primary-button" onClick={handleChangePassword} disabled={passwordSaving}>
              <IconCheck size={16} /> Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ notifications, onRead, onMarkAll }) {
  const unread = notifications.filter((item) => !item.read).length;
  return <div className="panel notifications-panel">
    <div className="panel-head notification-page-head"><div><h3>Notifications</h3><p className="panel-subtitle">Assignments, leave updates, and work activity</p></div><div className="notification-page-actions"><span className="notification-count">{unread} unread</span><button className="ghost-button" onClick={onMarkAll} disabled={!unread}>Mark all read</button></div></div>
    <div className="notification-list">
      {!notifications.length && <div className="notifications-empty"><div><IconBell size={28} /></div><strong>All caught up</strong><p>New work updates will appear here.</p></div>}
      {notifications.map((item) => <button key={item.id} className={clsx("notification-item", !item.read && "unread")} onClick={() => onRead(item.id)}>
        <span className="notification-dot" />
        <span><strong>{item.message}</strong><small>{formatDisplayDate(item.createdAt)}</small></span>
      </button>)}
    </div>
  </div>;
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
      { key: "leads", label: "Call Leads", icon: IconUsers },
      { key: "approvedleads", label: "Approved Leads", icon: IconCheck },
      { key: "salesreports", label: "Sales Report", icon: IconChart },
    ],
  },
  {
    label: "Work",
    items: [
      { key: "tasks", label: "Tasks", icon: IconTasks },
      { key: "markattendance", label: "Mark Attendance", icon: IconAttendance },
      { key: "attendancereport", label: "Attendance Report", icon: IconAttendance },
      { key: "leaverequest", label: "Leave Request", icon: IconUsers },
    ],
  },
  {
    label: "Account",
    items: [{ key: "notifications", label: "Notifications", icon: IconBell }, { key: "settings", label: "Settings", icon: IconSettings }],
  },
];

const TAB_TITLES = {
  dashboard: ["Dashboard", "Overview of your CRM performance"],
  servicecalllist: ["Service Call List", "Daily contacts for IT services"],
  trainingcalllist: ["Training Call List", "Daily contacts for training programs"],
  leads: ["Call Leads", "Interested contacts marked Follow Up or Completed"],
  approvedleads: ["Approved Leads", "Read-only list of leads you created"],
  salesreports: ["Sales Report", "Simple sales performance overview"],
  tasks: ["Tasks", "Create, assign and track work"],
  salessummary: ["Sales Summary", "Services, Training, Internship & STIP performance"],
  settings: ["Settings", "Profile, preferences and security"],
  notifications: ["Notifications", "Updates about your work"],
  markattendance: ["Mark Attendance", "Log today's attendance"],
  attendancereport: ["Attendance Report", "Monthly attendance history"],
  leaverequest: ["Leave Request", "Apply for and track leave"],
};

function Sidebar({ activeTab, onNavigate, profile, badges, onLogout }) {
  const [navSearch, setNavSearch] = useState("");
  const flatItems = NAV_GROUPS.flatMap((g) => g.items);
  const filteredKeys = navSearch.trim()
    ? new Set(flatItems.filter((i) => i.label.toLowerCase().includes(navSearch.trim().toLowerCase())).map((i) => i.key))
    : null;

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-badge">
            <span>S</span>
            <span>T</span>
          </div>
          <div className="brand-copy">
            <strong>System Technologies</strong>
            <span>CRM Executive</span>
          </div>
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
              <div className={clsx("nav-group", group.label === "Attendance" && "attendance-nav-group")} key={group.label}>
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
    </>
  );
}

/* ================================ MAIN EXPORT ================================ */

function normalizeSourceContact(row) {
  const contactDate = row.date || row.createdLeadDate || row.createdAt || todayISO();
  return {
    ...row,
    id: String(row.id || row._id || `source-contact-${Date.now()}-${Math.random()}`),
    date: String(contactDate).slice(0, 10),
    name: row.name || "",
    contact: String(row.contact || row.number || row.phone || ""),
    callStatus: normalizeCallStatus(row.callStatus),
    interactionType: row.interactionType || "Call",
    interestStatus: normalizeInterestStatus(row.interestStatus),
    program: normalizeCallProgram(row.program),
    remark: row.remark || "",
    active: row.active !== false && !row.snoozed,
    snoozeUntil: row.snoozeUntil || null,
    crmExecutiveName: row.crmExecutiveName || row.assignedToName || "",
    sourceRecord: true,
    listType: row.listType || "services",
    callListCategory: row.listType === "training" ? "Training" : "Services",
    callClicked: Boolean(row.callClicked),
    whatsappClicked: Boolean(row.whatsappClicked),
    callLead: row.callLead || null,
  };
}

function isLeadContact(contact) {
  const isCreatedLead = Boolean(contact.leadCreated || contact.createdLeadId || contact.callLeadStatus === "Approved");
  const isCompletedInterested = normalizeInterestStatus(contact.interestStatus) === "Interested"
    && normalizeCallStatus(contact.callStatus) === "Completed";
  // A created/approved lead is highlighted immediately. A completed,
  // interested call is also ready to highlight even before lead creation.
  return isCreatedLead || isCompletedInterested;
}

function leadTypeLabel(lead) {
  if (lead.type === "Service") return "Service";
  if (lead.type === "Internship" || lead.type === "STIP") return "STIP";
  if (lead.type === "Training" || lead.type === "Program") return "Program";
  const category = getCallListCategory(lead.program || lead.interest);
  if (category === "Services") return "Service";
  if (category === "Internship" || category === "STIP") return "STIP";
  return "Program";
}

function leadFromContact(contact) {
  return {
    id: `contact-lead-${contact.id}`,
    sourceContactId: String(contact.id),
    createdDate: contact.createdLeadDate || contact.date || todayISO(),
    program: contact.program || "",
    name: contact.name || "",
    contact: contact.contact || "",
    clientSourceName: contact.name || "",
    executiveName: contact.crmExecutiveName || "",
    leadName: contact.program || "",
    leadStatus: [contact.callStatus, contact.interestStatus]
      .filter((status) => status && status !== "Select Status")
      .join(" / "),
    interestType: "Interested",
    interest: "Interested",
    remark: contact.remark || "",
    status: contact.callStatus !== "Select Status" ? contact.callStatus : contact.interestStatus,
    operationRemarks: contact.operationRemarks || "",
    stage: "New",
    sourceRecord: true,
  };
}

export default function CrmExecutiveDashboard({
  initialTab = "dashboard",
  onLogout,
  currentUser,
  leads: externalLeads = [],
  sourceContacts = [],
  callsLoading = false,
  leadsLoading = false,
  onUpdateCallListContact,
  onCreateCallListContact,
  onCreateLead,
  onApproveCallLead,
  onDeleteCallContact,
  users = [],
  onProfileUpdated,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [toast, showToast] = useToast();
  const [topMenu, setTopMenu] = useState("");
  const topbarMenusRef = useRef(null);

  const [contacts, setContacts] = useState([]);
  const [appNotifications, setAppNotifications] = useState([]);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [profile, setProfile] = useState(() => ({
    name: currentUser?.name || currentUser?.username || "",
    role: currentUser?.role || "CRM Executive",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    avatarUrl: currentUser?.avatarUrl || currentUser?.imageUrl || "",
  }));
  const [loaded, setLoaded] = useState({ tasks: false, attendance: false, leaves: false, notifications: false });
  const qualifiedLeadsInitialized = useRef(false);

  useEffect(() => {
    try { window.localStorage.removeItem("crmExec.contacts"); }
    catch { /* Ignore unavailable browser storage. */ }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAttendance().then((records) => { if (active && Array.isArray(records)) setAttendance(records); })
      .catch((error) => { if (active) showToast(error.message || "Could not load attendance"); })
      .finally(() => { if (active) setLoaded((current) => ({ ...current, attendance: true })); });
    return () => { active = false; };
  }, [showToast]);

  useEffect(() => {
    let active = true;
    fetchTasks()
      .then((items) => { if (active && Array.isArray(items)) setTasks(items); })
      .catch((error) => { if (active) showToast(error.message || "Could not load tasks"); })
      .finally(() => { if (active) setLoaded((current) => ({ ...current, tasks: true })); });
    return () => { active = false; };
  }, [showToast]);

  useEffect(() => {
    let active = true;
    const refresh = () => fetchAppNotifications().then((items) => { if (active && Array.isArray(items)) setAppNotifications(items); })
      .catch(() => {})
      .finally(() => { if (active) setLoaded((current) => current.notifications ? current : { ...current, notifications: true }); });
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (topbarMenusRef.current && !topbarMenusRef.current.contains(event.target)) setTopMenu("");
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const markNotificationRead = async (id) => {
    try { const saved = await markAppNotificationRead(id); setAppNotifications((items) => items.map((item) => item.id === id ? { ...item, ...saved, read: true } : item)); }
    catch (error) { showToast(error.message || "Could not update notification"); }
  };
  const markAllNotificationsRead = async () => {
    const unread = appNotifications.filter((item) => !item.read);
    await Promise.all(unread.map((item) => markAppNotificationRead(item.id)));
    setAppNotifications((items) => items.map((item) => ({ ...item, read: true })));
  };

  useEffect(() => {
    let active = true;
    fetchLeaves().then((records) => { if (active && Array.isArray(records)) setLeaveRequests(records); })
      .catch((error) => { if (active) showToast(error.message || "Could not load leave requests"); })
      .finally(() => { if (active) setLoaded((current) => ({ ...current, leaves: true })); });
    return () => { active = false; };
  }, [showToast]);

  useEffect(() => {
    const qualifiedLeads = contacts.filter(isLeadContact).map(leadFromContact);
    setLeads((current) => {
      const manualLeads = qualifiedLeadsInitialized.current
        ? current.filter((lead) => !lead.sourceRecord && !lead.sourceContactId)
        : [];
      qualifiedLeadsInitialized.current = true;
      return [...qualifiedLeads, ...manualLeads];
    });
  }, [contacts, setLeads]);

  const syncContactLead = (contact) => {
    setLeads((current) => {
      const sourceContactId = String(contact.id);
      const withoutExisting = current.filter((lead) => String(lead.sourceContactId || "") !== sourceContactId);
      if (contact.deleted || !isLeadContact(contact)) return withoutExisting;
      return [leadFromContact(contact), ...withoutExisting];
    });
  };

  useEffect(() => {
    const normalizedContacts = sourceContacts.map(normalizeSourceContact).filter((contact) => contact.name || contact.contact);
    setContacts(normalizedContacts);
  }, [sourceContacts]);

  const handleNavigate = (tab) => {
    setActiveTab(tab);
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
    leads: leads.length || null,
    tasks: tasks.filter((t) => t.status !== "Done").length || null,
    leaverequest: leaveRequests.filter((l) => l.status === "Pending").length || null,
    notifications: appNotifications.filter((item) => !item.read).length || null,
  };

  const [title, subtitle] = TAB_TITLES[activeTab] || ["", ""];
  const pageLoading = isCrmPageLoading(activeTab, {
    callsLoading, leadsLoading, tasksLoaded: loaded.tasks,
    attendanceLoaded: loaded.attendance, leavesLoaded: loaded.leaves,
    notificationsLoaded: loaded.notifications,
  });

  return (
    <div className="crm-root">
      <div className="crm-shell">
        <Sidebar
          activeTab={activeTab}
          onNavigate={handleNavigate}
          profile={profile}
          badges={badges}
          onLogout={handleLogout}
        />

        <div className="workspace">
          <div className="topbar">
            <div className="topbar-left">
              <div>
                <h1>{title}</h1>
                <p className="topbar-subtitle">{subtitle}</p>
              </div>
            </div>
            <div className="topbar-right" ref={topbarMenusRef}>
              <div className="topbar-popover-wrap">
              <button className="icon-button notification-bell" title="Notifications" onClick={() => setTopMenu((current) => current === "notifications" ? "" : "notifications")}>
                <IconBell size={18} />
                {appNotifications.some((item) => !item.read) && <span className="bell-badge">{appNotifications.filter((item) => !item.read).length}</span>}
              </button>
              {topMenu === "notifications" && <div className="topbar-menu notifications-menu"><div className="topbar-menu-head"><strong>Notifications</strong><button onClick={markAllNotificationsRead}>Mark all read</button></div><div className="topbar-notification-list">{appNotifications.slice(0, 6).map((item) => <button key={item.id} className={clsx("topbar-notification", !item.read && "unread")} onClick={() => markNotificationRead(item.id)}>{item.message}</button>)}{!appNotifications.length && <p>No notifications yet.</p>}</div><button className="topbar-menu-link" onClick={() => { setTopMenu(""); handleNavigate("notifications"); }}>View all notifications</button></div>}
              </div>
              <div className="topbar-popover-wrap">
              <button className="user-chip user-chip-button" onClick={() => setTopMenu((current) => current === "profile" ? "" : "profile")}>
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
              </button>
              {topMenu === "profile" && <div className="topbar-menu profile-menu"><div className="profile-menu-identity"><div className="avatar">{(profile.name || "?").charAt(0)}</div><div><strong>{profile.name}</strong><span>{profile.role}</span></div></div><div className="profile-menu-data"><span>Email <b>{profile.email || "-"}</b></span><span>Phone <b>{profile.phone || "-"}</b></span></div><button className="topbar-menu-link" onClick={() => { setTopMenu(""); handleNavigate("settings"); }}>View settings</button></div>}
              </div>
            </div>
          </div>

          <div className="content">
            {pageLoading ? <div className="crm-page-loader" role="status" aria-live="polite"><span className="crm-page-spinner" aria-hidden="true" />Loading {title.toLowerCase()}...</div> : <>
            {activeTab === "dashboard" && (
              <DashboardTab
                contacts={contacts}
                leads={externalLeads}
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
                onContactChange={syncContactLead}
                onPersistContact={onUpdateCallListContact}
                onCreateContact={onCreateCallListContact}
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
                onContactChange={syncContactLead}
                onPersistContact={onUpdateCallListContact}
                onCreateContact={onCreateCallListContact}
              />
            )}
            {activeTab === "leads" && <LeadsTab rows={sourceContacts} users={users} showToast={showToast} currentUser={currentUser} onSave={onUpdateCallListContact} onApprove={onApproveCallLead} onDelete={onDeleteCallContact} onCreateLead={onCreateLead} />}
            {activeTab === "approvedleads" && <ApprovedLeadsTab leads={externalLeads} sourceContacts={sourceContacts} currentUser={currentUser} />}
            {activeTab === "salesreports" && <SalesReportsTab contacts={contacts} showToast={showToast} />}
            {activeTab === "notifications" && <NotificationsTab notifications={appNotifications} onRead={markNotificationRead} onMarkAll={markAllNotificationsRead} />}
            {activeTab === "tasks" && <TasksTab tasks={tasks} setTasks={setTasks} showToast={showToast} currentUser={currentUser} />}
            {activeTab === "settings" && (
              <SettingsTab
                profile={profile}
                setProfile={setProfile}
                showToast={showToast}
                currentUser={currentUser}
                onProfileUpdated={onProfileUpdated}
              />
            )}
            {activeTab === "markattendance" && (
              <MarkAttendanceTab attendance={attendance} setAttendance={setAttendance} showToast={showToast} profile={profile} />
            )}
            {activeTab === "attendancereport" && (
              <AttendanceReportTab attendance={attendance} showToast={showToast} />
            )}
            {activeTab === "leaverequest" && (
              <LeaveRequestTab leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} showToast={showToast} />
            )}
            </>}
          </div>
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

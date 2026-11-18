import CallLeadsPanel from "../../CallLeadsPanel.jsx";
import CallListDatePicker from "../../CallListDatePicker.jsx";
import WhatsAppModal from "../../WhatsAppModal.jsx";
import { useMessageTemplates } from "../../useMessageTemplates.js";
import { resolveLeadTemplate, templateSelectionPatch } from "../../whatsAppMessage.js";
import RemarkField from "../../RemarkField.jsx";
import { callLeadForm, callLeadProgram, callLeadReviewStatus, isCallLead } from "../../callLeads.js";
import { createTask as createTaskApi, fetchTasks, updateTask as updateTaskApi, fetchAttendanceMonth, fetchAttendanceCalendar, fetchTodayAttendance, checkInAttendance, checkOutAttendance, syncAttendanceHistory, fetchLeaves, createLeave, fetchMyProfile, updateMyProfile, uploadMyProfileDocument, uploadMyProfilePhoto, downloadMyProfileDocument, fetchAppNotifications, markAppNotificationRead } from "../../backendApi.js";
import { compressImageFile } from "../../imageUpload.js";
import PasswordResetLink from "../PasswordResetLink.jsx";
import HelpdeskChat, { HelpdeskIncomingToast } from "../shared/HelpdeskChat.jsx";
import LogoutConfirmDialog from "../shared/LogoutConfirmDialog.jsx";
import { attendanceReportStatusLabel, buildAttendanceReportRows, filterAttendanceReportRows, getAttendanceReportDateRange, getAttendanceReportMonths, pendingLeaveRequestForDate } from "./attendanceReport.js";
import { isValidAadhaar, isValidBankAccount, isValidBankText, isValidEmail, isValidIfsc, isValidIndianMobile, isValidPan, isValidPersonName, isValidProfileDob, isValidRelationship } from "../../../shared/profileValidation.js";
import SalesTableHead from "./SalesTableHead.jsx";
import SalesDropdown from "../../SalesDropdown.jsx";
import { TRAINING_CALL_LIST_PROGRAMS, SERVICE_CALL_LIST_SERVICES, CALL_STATUS_OPTIONS, CALL_LIST_INTEREST_STATUS_OPTIONS, normalizeCallStatus, normalizeInterestStatus, normalizeCallProgram, isCallContactLocked, matchesCallListFilters, callListRecordDate, callLeadRecordDate } from "../../callListConfig.js";
import { isCrmPageLoading } from "./crmPageLoading.js";
import { BellRing, CalendarDays, Check, CheckCircle2, CircleAlert, CircleX, Clock3, CreditCard, Download, Eye, FileText, Hourglass, ImagePlus, ListChecks, LoaderCircle, LockKeyhole, MessageSquareText, Phone, RefreshCw, Search, Upload, UploadCloud, UserCircle, Users, Wallet } from "lucide-react";
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
const todayIndiaISO = (date = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).filter((part) => part.type !== "literal").map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
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
const formatWeekday = (iso) => {
  if (!iso) return "-";
  const dateValue = String(iso).slice(0, 10);
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
};
const formatWorkedTime = (minutes) => {
  if (minutes === null || minutes === undefined || minutes === "" || !Number.isFinite(Number(minutes))) return "Not recorded";
  const value = Math.max(0, Math.floor(Number(minutes)));
  return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
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
const CALL_STATUS_CHOICES = [
  { value: "", label: "Choose", Icon: CircleAlert },
  { value: "Pending", label: "Pending", Icon: Hourglass },
  { value: "Follow Up", label: "Follow Up", Icon: RefreshCw },
  { value: "Completed", label: "Completed", Icon: Check },
];
function CallListStatusSelect({ contact, disabled, completionOnly = false, onChange }) {
  const status = normalizeCallStatus(contact.callStatus);
  const selected = CALL_STATUS_CHOICES.find((choice) => choice.value === status) || CALL_STATUS_CHOICES[0];
  const availableChoices = completionOnly
    ? CALL_STATUS_CHOICES.filter((choice) => ["Follow Up", "Completed"].includes(choice.value))
    : CALL_STATUS_CHOICES;
  const statusClass = (selected.value || "choose").toLowerCase().replace(/\s+/g, "-");

  return <SalesDropdown
    value={status}
    options={availableChoices.map(({ value, label, Icon: StatusIcon }) => ({
      value,
      label,
      icon: StatusIcon,
      disabled: completionOnly && value !== "Completed",
      className: value ? value.toLowerCase().replace(/\s+/g, "-") : "choose",
    }))}
    onChange={(event) => onChange(event.target.value)}
    disabled={disabled}
    wrapperClassName={`call-list-status-control call-list-status-${statusClass}`}
    className="inline-select call-list-status-trigger"
    aria-label={`Call status for ${contact.name || "contact"}`}
  />;
}
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
const IconMessage = (p) => (
  <Icon {...p}>
    <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-6a7.5 7.5 0 1 1 17-3.5Z" />
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
    timerRef.current = window.setTimeout(() => setToast(null), 5000);
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

const TABLE_PAGE_SIZE_OPTIONS = [50, 100, 200, 500, 1000];

function Pagination({ page, totalPages, totalItems, pageSize, onChange, onPageSizeChange, className = "" }) {
  const firstItem = totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(page * pageSize, totalItems);
  return (
    <div className={clsx("pagination-row call-list-pagination", className)}>
      <div className="pagination-summary">
        <span>Showing {firstItem}-{lastItem} of {totalItems}</span>
        {onPageSizeChange && <label className="pagination-page-size">Rows per page
          <SalesDropdown aria-label="Rows per page" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {TABLE_PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
          </SalesDropdown>
        </label>}
      </div>
      <div className="call-list-pagination-actions">
        <button type="button" className="ghost-button compact" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" className="ghost-button compact" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

function useStickySalesTableHeaders(contentRef, enabled, activeTab) {
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !enabled) return undefined;
    const tables = [...content.querySelectorAll(
      ".shared-call-leads .crm-call-leads-table, .sales-report-table-scroll .sales-report-table",
    )];
    const entries = tables.map((table) => ({
      table,
      cells: [...table.tHead?.querySelectorAll("th") || []],
    })).filter((entry) => entry.cells.length);
    const originalTransforms = new Map(entries.flatMap(({ cells }) => cells.map((cell) => [cell, cell.style.transform])));

    const update = () => {
      const contentRect = content.getBoundingClientRect();
      const controls = content.querySelector(".call-list-controls");
      const controlsRect = controls?.getBoundingClientRect();
      const contentTop = Math.max(0, contentRect.top);
      const stickyTop = controlsRect && controlsRect.top <= contentTop + 1
        ? Math.max(contentTop, controlsRect.bottom)
        : contentTop;
      entries.forEach(({ table, cells }) => {
        const tableRect = table.getBoundingClientRect();
        const headerHeight = table.tHead?.offsetHeight || 0;
        const offset = Math.min(Math.max(0, stickyTop - tableRect.top), Math.max(0, tableRect.height - headerHeight));
        const transform = offset > 0 && tableRect.bottom > contentTop
          ? `translateY(${offset}px)`
          : "";
        cells.forEach((cell) => {
          const next = transform || originalTransforms.get(cell) || "";
          if (cell.style.transform !== next) cell.style.transform = next;
        });
      });
    };
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(scheduleUpdate);
    mutationObserver?.observe(content, { childList: true, subtree: true, characterData: true });
    entries.forEach(({ table }) => observer?.observe(table));
    update();
    return () => {
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      observer?.disconnect();
      mutationObserver?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      originalTransforms.forEach((value, cell) => { cell.style.transform = value; });
    };
  }, [contentRef, enabled, activeTab]);
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
    && ["", "Pending", "Follow Up"].includes(normalizeCallStatus(contact.callStatus));
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
                        <strong style={{ display: "block" }} title={c.updatedAt ? `Last updated: ${new Date(c.updatedAt).toLocaleString()}` : ""}>{c.name}</strong>
                  <span style={{ color: "var(--text-soft)", fontSize: "16px" }}>
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

function emptyContactForm() {
  return {
    id: null,
    date: todayISO(),
    name: "",
    contact: "",
    program: PROGRAMS[0],
    callStatus: "",
    interactionType: "",
    interestStatus: "Not Interested",
    remark: "",
    active: true,
  };
}

function ContactFormError({ id, children }) {
  if (!children) return null;
  return <span id={id} className="contact-form-error" role="alert"><CircleAlert size={14} aria-hidden="true" />{children}</span>;
}

function ContactFormModal({ initial, onClose, onSave, category, templates, templatesLoading, templatesError, saving = false, readOnly = false }) {
  const leadType = category === "Training" ? "training" : "service";
  const validationId = useId();
  const errorId = (field) => `${validationId}-${field}-error`;
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
  const clearErrors = (...keys) => setErrors((current) => {
    const next = { ...current };
    keys.forEach((key) => delete next[key]);
    return next;
  });

  const handleSave = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required";
    else if (!/^[a-zA-Z][a-zA-Z .'-]*$/.test(form.name.trim())) nextErrors.name = "Use letters, spaces, apostrophes, or hyphens only";
    if (!/^[6-9]\d{9}$/.test(form.contact.trim())) nextErrors.contact = "Enter a valid Indian mobile number";
    if (!INTERACTION_TYPES.includes(form.interactionType)) nextErrors.interactionType = "Select an interaction type";
    if (!INTEREST_STATUS_OPTIONS.includes(form.interestStatus)) nextErrors.interestStatus = "Select an interest status";
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
          <span>Full Name <span className="contact-required-marker" aria-hidden="true">*</span></span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rohit Malhotra" maxLength={80} required aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? errorId("name") : undefined} />
          <ContactFormError id={errorId("name")}>{errors.name}</ContactFormError>
        </div>
        <div className="field">
          <span>Contact Number <span className="contact-required-marker" aria-hidden="true">*</span></span>
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
              aria-describedby={errors.contact ? errorId("contact") : undefined}
              value={form.contact}
              onChange={(e) => set("contact", e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
              readOnly={Boolean(initial.id)}
              title={initial.id ? "Contact number cannot be changed after creation" : undefined}
              aria-label="Indian mobile number, starting with 6, 7, 8, or 9"
            />
          </div>
          <ContactFormError id={errorId("contact")}>{errors.contact}</ContactFormError>
        </div>
        <div className="field">
          <span>Date <span className="contact-auto-label">Set automatically</span></span>
          <input value={formatDisplayDate(form.date)} readOnly aria-label="Date set automatically to today" />
        </div>
        <div className="field">
          <span>{category === "Training" ? "Training" : "Service"}</span>
          <SalesDropdown searchable aria-label={category === "Training" ? "Training" : "Service"} value={resolveLeadTemplate(form, leadType, templates)?.id || (form.program ? `legacy:${form.program}` : "")} disabled={templatesLoading || Boolean(templatesError)} onChange={(e) => {
            const selected = templates.find((template) => template.id === e.target.value);
            setForm((current) => ({ ...current, ...templateSelectionPatch(leadType, selected) }));
          }}>
            <option value="">{templatesLoading ? "Loading options..." : templatesError ? "Could not load options" : category === "Training" ? "Select Training" : "Select Service"}</option>
            {form.program && !resolveLeadTemplate(form, leadType, templates) && <option value={`legacy:${form.program}`}>{form.program} (previous selection)</option>}
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.title}</option>
            ))}
          </SalesDropdown>
          {templatesError && <span className="field-error" role="alert">Could not load message templates: {templatesError}</span>}
        </div>
        <div className="field">
          <span>Call Status</span>
          <SalesDropdown aria-label="Call Status" value={form.callStatus} onChange={(e) => set("callStatus", e.target.value)}>
            <option value="">Choose</option>
            {CALL_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </SalesDropdown>
        </div>
        <div className="field">
          <span>Interaction Type <span className="contact-required-marker" aria-hidden="true">*</span></span>
          <SalesDropdown required aria-label="Interaction Type" value={form.interactionType} aria-invalid={Boolean(errors.interactionType)} aria-describedby={errors.interactionType ? errorId("interactionType") : undefined} onChange={(e) => set("interactionType", e.target.value)}>
            <option value="">Select Interaction</option>
            {INTERACTION_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </SalesDropdown>
          <ContactFormError id={errorId("interactionType")}>{errors.interactionType}</ContactFormError>
        </div>
        <div className="field">
          <span>Interest Status <span className="contact-required-marker" aria-hidden="true">*</span></span>
          <SalesDropdown required aria-label="Interest Status" value={normalizeInterestStatus(form.interestStatus)} aria-invalid={Boolean(errors.interestStatus)} aria-describedby={errors.interestStatus ? errorId("interestStatus") : undefined} onChange={(e) => set("interestStatus", e.target.value)}>
            {INTEREST_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </SalesDropdown>
          <ContactFormError id={errorId("interestStatus")}>{errors.interestStatus}</ContactFormError>
        </div>
        <div className="field span-full">
          <span>Remark</span>
          <textarea value={form.remark} onChange={(e) => set("remark", e.target.value)} placeholder="Notes about this contact..." maxLength={500} />
        </div>
      </div>
      </fieldset>
      <div className="form-actions">
        <button className="ghost-button" onClick={onClose}>
          Cancel
        </button>
        {!readOnly && (
          <button className="primary-button" onClick={handleSave} disabled={saving}>
            <IconCheck size={16} /> {saving ? "Saving..." : "Save Contact"}
          </button>
        )}
      </div>
    </Modal>
  );
}

function CallListTab({ contacts, setContacts, showToast, category, title, addLabel, currentUser, onContactChange, onPersistContact, onCreateContact }) {
  const [saveStatuses, setSaveStatuses] = useState({});
  useEffect(() => {
    const handleStatus = (event) => setSaveStatuses((current) => ({ ...current, [`${event.detail.type}:${event.detail.id}`]: event.detail.status }));
    window.addEventListener("crm:call-save-status", handleStatus);
    return () => window.removeEventListener("crm:call-save-status", handleStatus);
  }, []);
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
  const [pageSize, setPageSize] = useState(100);
  const [modalState, setModalState] = useState(null); // null | form object
  const [savingContact, setSavingContact] = useState(false);
  const [whatsAppLead, setWhatsAppLead] = useState(null);
  const tableRef = useRef(null);
  // The displayed date is the immutable upload/manual-add date. CRM activity
  // remains available in lastWorkedAt without changing row order.
  const contactDate = callListRecordDate;
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

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
    const activityRecorded = persist && activityFields.some((key) => Object.prototype.hasOwnProperty.call(patch, key));
    const unchanged = Object.entries(patch).every(([key, value]) => String(existing?.[key] ?? "") === String(value ?? ""));
    if (!existing || (unchanged && !activityRecorded && !(persist && Object.prototype.hasOwnProperty.call(patch, "remark")))) return;
    if (["Follow Up", "Completed"].includes(patch.callStatus) && !callLeadProgram({ ...existing, ...patch })) {
      showToast(`Please select a ${category === "Training" ? "training" : "service"} before marking this contact ${patch.callStatus}.`);
      return;
    }
    const optimisticLastWorkedAt = activityRecorded ? new Date().toISOString() : undefined;
    setContacts((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const updated = { ...c, ...patch, ...(activityRecorded ? { lastWorkedAt: optimisticLastWorkedAt } : {}) };
      onContactChange?.(updated);
      return updated;
    }));
    if (persist && existing?.sourceRecord) {
      Promise.resolve(onPersistContact?.(existing, { ...patch, ...(activityRecorded ? { activityRecorded: true } : {}) })).catch((error) => {
        showToast(error?.message || "Could not save this update");
      });
    }
  };

  const handleCall = (c) => {
    updateContact(c.id, { callClicked: true });
    showToast(`Calling ${c.name} (${c.contact})…`);
    window.location.href = `tel:${c.contact}`;
  };
  const handleWhatsapp = (c) => {
    updateContact(c.id, { whatsappClicked: true });
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

  const handleSaveRow = async (contact) => {
    if (!contact?.sourceRecord || isConvertedToLead(contact)) return;
    try {
      await onPersistContact?.(contact, {
        callStatus: normalizeCallStatus(contact.callStatus),
        interestStatus: normalizeInterestStatus(contact.interestStatus),
        program: normalizeCallProgram(contact.program),
        ...(leadType === "training" ? { programId: contact.programId || "" } : { serviceId: contact.serviceId || "" }),
        remark: contact.remark || "",
      });
      showToast(`${contact.name || "Contact"} saved`);
    } catch (error) {
      showToast(error?.message || "Could not save this contact");
    }
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

  const isSnoozed = (c) => c.snoozeUntil && c.snoozeUntil > todayISO();
  const isConvertedToLead = isCallContactLocked;
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16); pdf.text(`${title} Report`, 14, 14);
    pdf.setFontSize(9); pdf.setTextColor(100); pdf.text(`${pageRows.length} visible contact(s) · Page ${page} of ${totalPages}`, 14, 20);
    autoTable(pdf, {
      startY: 25,
      head: [["S. No.", "Date", "Name", "Contact", "Call Status", "Interest", category === "Services" ? "Service" : "Training", "Remark"]],
      body: pageRows.map((c, index) => [(page - 1) * pageSize + index + 1, formatDisplayDate(contactDate(c)), c.name || "-", c.contact || "-", normalizeCallStatus(c.callStatus) || "Choose", normalizeInterestStatus(c.interestStatus), normalizeCallProgram(c.program) || "-", c.remark || "-"]),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [127, 78, 43] },
    });
    pdf.save(`${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${todayISO()}.pdf`);
  };

  return (
    <div className="panel call-list-panel">
      <div className="call-list-controls">
      <div className="panel-head">
        <h3>{title}</h3>
        <div className="row-actions"><button className="primary-button call-list-export-button" onClick={exportPdf} disabled={!pageRows.length}><IconDownload size={16} /> Export PDF <span className="call-list-button-count">{pageRows.length}</span></button><button className="primary-button call-list-add-button" onClick={() => setModalState({ ...emptyContactForm(), program: "", callListCategory: category })}><IconPlus size={16} /> {addLabel}</button></div>
      </div>

      {templatesError && <p className="field-error" role="alert">Could not load message templates: {templatesError}</p>}

      <div className="module-toolbar">
        <div className="toolbar-search">
          <Search className="toolbar-search-icon" size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search contacts"
            placeholder="Search by name or contact number"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSearch(e.target.value.trim());
              setPage(1);
            }}
          />
          {searchInput && <button type="button" className="toolbar-search-clear" aria-label="Clear search" title="Clear search" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}><IconClose size={16} /></button>}
        </div>
        <div className="toolbar-filters">
          <SalesDropdown searchable hideSelectedResetOption aria-label={category === "Services" ? "Filter by service" : "Filter by training"} value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
            <option value="All" data-filter-reset="true">{category === "Services" ? "All Services" : "All Training"}</option>
            <option value="">Unspecified</option>
            {[...new Set([...templates.map((template) => template.title), ...contacts.filter((contact) => (contact.callListCategory || getCallListCategory(contact.program)) === category).map((contact) => normalizeCallProgram(contact.program)).filter(Boolean)])].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </SalesDropdown>
          <SalesDropdown hideSelectedResetOption aria-label="Filter by call status" value={callStatusFilter} onChange={(e) => setCallStatusFilter(e.target.value)}>
            <option value="All" data-filter-reset="true">All Call Status</option>
            <option value="">Choose</option>
            {CALL_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </SalesDropdown>
          <SalesDropdown hideSelectedResetOption aria-label="Filter by interest status" value={interestFilter} onChange={(e) => setInterestFilter(e.target.value)}>
            <option value="All" data-filter-reset="true">All Interest</option>
            {CALL_LIST_INTEREST_STATUS_OPTIONS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </SalesDropdown>
        </div>
        <div className="call-list-date-row">
          <span className="call-list-date-caption"><CalendarDays size={15} aria-hidden="true" /> Added date</span>
          <CallListDatePicker label="From" value={fromDate} onChange={setFromDate} />
          <CallListDatePicker label="To" value={toDate} min={fromDate} onChange={setToDate} />
          <button type="button" className="ghost-button compact" onClick={resetFilters}>Reset</button>
        </div>
      </div>
      </div>

      <div className="table-wrap" ref={tableRef} tabIndex={0} role="region" aria-label="Call list table. Scroll horizontally to see all columns.">
        <table className="table">
          <SalesTableHead>
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
          </SalesTableHead>
          <tbody>
            {pageRows.length === 0 && <EmptyRow colSpan={10} text={`No ${category.toLowerCase()} contacts match the selected filters.`} />}
            {pageRows.map((c, idx) => {
              const locked = isConvertedToLead(c);
              const canCompleteSavedLead = locked
                && normalizeCallStatus(c.callStatus) === "Follow Up";
              const saveStatus = saveStatuses[`${c.listType}:${c.id}`];
              const saveLabel = locked || saveStatus === "saved" ? "Saved"
                : saveStatus === "saving" ? "Saving…"
                  : saveStatus === "failed" || saveStatus === "offline" ? "Retry" : "Save";
              const statusClass = `call-list-status-${(normalizeCallStatus(c.callStatus) || "choose").toLowerCase().replace(/\s+/g, "-")}`;
              return <tr key={c.id} className={clsx(statusClass, locked && "call-list-locked")}>
                <td><span className="call-list-serial">{(page - 1) * pageSize + idx + 1}</span></td>
                <td>{formatDisplayDate(contactDate(c))}</td>
                <td>
                  <div className="person-cell">
                    <div>
                      <strong style={{ display: "block" }}>{c.name}</strong>
                      {isSnoozed(c) && <span className="badge warning" style={{ height: 20, fontSize: "16px" }}>Snoozed till {formatDisplayDate(c.snoozeUntil)}</span>}
                    </div>
                  </div>
                </td>
                <td>{c.contact}</td>
                <td>
                  <div className="row-actions">
                    <button className="row-icon-btn call" title={c.lastCallClickedAt ? `Last call button click: ${new Date(c.lastCallClickedAt).toLocaleString()}` : "Call"} aria-label={`Call ${c.name || "contact"}`} onClick={() => handleCall(c)}>
                      <IconPhone size={16} />
                    </button>
                    <button className="row-icon-btn whatsapp" title="WhatsApp" aria-label={`Open WhatsApp for ${c.name || "contact"}`} onClick={() => handleWhatsapp(c)}>
                      <IconWhatsapp size={16} />
                    </button>
                  </div>
                </td>
                <td>
                  <CallListStatusSelect
                    contact={c}
                    disabled={locked && !canCompleteSavedLead}
                    completionOnly={canCompleteSavedLead}
                    onChange={(value) => updateContact(c.id, { callStatus: value })}
                  />
                </td>
                <td>
                  <SalesDropdown
                    className="inline-select"
                    aria-label={`Interest status for ${c.name || "contact"}`}
                    value={normalizeInterestStatus(c.interestStatus)}
                    disabled={locked}
                    onChange={(e) => updateContact(c.id, { interestStatus: e.target.value })}
                  >
                    {CALL_LIST_INTEREST_STATUS_OPTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </SalesDropdown>
                </td>
                <td>
                  <SalesDropdown searchable
                    className="inline-select call-list-program-select"
                    aria-label={category === "Services" ? `Service for ${c.name || "contact"}` : `Training for ${c.name || "contact"}`}
                    value={resolveLeadTemplate(c, leadType, templates)?.id || (normalizeCallProgram(c.program) ? `legacy:${normalizeCallProgram(c.program)}` : "")}
                    disabled={locked || templatesLoading || Boolean(templatesError)}
                    onChange={(e) => {
                      const selected = templates.find((template) => template.id === e.target.value);
                      updateContact(c.id, { ...templateSelectionPatch(leadType, selected), callListCategory: category });
                    }}
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
                  </SalesDropdown>
                </td>
                <td>
                    <div className="remark-cell">
                    <RemarkField largeText readOnly={locked} value={c.remark || ""} onChange={(value) => updateContact(c.id, { remark: value }, false)} onCommit={(value) => updateContact(c.id, { remark: value })} label={`Remark for ${c.name || "contact"}`} />
                  </div>
                </td>
                <td>
                  <div className="call-list-save-action">
                    <button
                      type="button"
                      className={clsx("call-list-save-button", (locked || saveStatus === "saved") && "is-saved", (saveStatus === "failed" || saveStatus === "offline") && "needs-retry")}
                      disabled={locked || saveStatus === "saving" || !c.sourceRecord}
                      title={locked ? "This lead form is saved and locked" : `Save ${c.name || "contact"}`}
                      aria-label={locked ? `${c.name || "Contact"} saved` : `Save ${c.name || "contact"}`}
                      onClick={() => handleSaveRow(c)}
                    >
                      <IconCheck size={15} /> <span>{saveLabel}</span>
                    </button>
                    <small aria-live="polite">
                      {locked || saveStatus === "saved" ? "Saved in database"
                        : saveStatus === "offline" ? "Offline — retry"
                          : saveStatus === "failed" ? "Save failed — retry" : ""}
                    </small>
                  </div>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} onChange={(nextPage) => {
        setPage(nextPage);
        tableRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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
      {whatsAppLead && <WhatsAppModal lead={whatsAppLead} leadType={leadType} currentUser={currentUser} onClose={() => setWhatsAppLead(null)} onSelectTemplate={(template) => updateContact(whatsAppLead.id, templateSelectionPatch(leadType, template))} />}
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
        <div className="field"><span>Lead Type *</span><SalesDropdown aria-label="Lead Type" value={form.type} onChange={(e) => { const type = e.target.value; setForm((current) => ({ ...current, type, interest: interestOptions(type)[0] })); }}><option>Training</option><option>Service</option><option>Internship</option></SalesDropdown></div>
        <div className="field"><span>Interest *</span><SalesDropdown searchable aria-label="Interest" value={form.interest} onChange={(e) => set("interest", e.target.value)}>{interestOptions(form.type).map((program) => <option key={program}>{program}</option>)}</SalesDropdown></div>
        <div className="field"><span>Value</span><input type="number" min="0" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="Enter the estimated value here" /></div>
        <div className="field"><span>Lead Source *</span><SalesDropdown aria-label="Lead Source" value={form.leadSource} onChange={(e) => set("leadSource", e.target.value)}>{["Website", "Referral", "Facebook", "Instagram", "Google", "Walk-in", "Phone Call", "Other"].map((source) => <option key={source}>{source}</option>)}</SalesDropdown></div>
        <div className="field"><span>Status *</span><SalesDropdown aria-label="Status" value={form.status} onChange={(e) => set("status", e.target.value)}><option>Pending</option><option>Interested</option><option>Not Interested</option></SalesDropdown></div>

        <p className="form-section-title">Assignment</p>
        <div className="field"><span>Entered By *</span><input value={enteredBy} readOnly /></div>
        <div className="field"><span>Assigned To *</span><SalesDropdown searchable aria-label="Assigned To" value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>{TEAM_MEMBERS.map((member) => <option key={member}>{member}</option>)}</SalesDropdown></div>
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
          <SalesTableHead>
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
          </SalesTableHead>
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
        largeText
        hideSelectedResetOption
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

function LeadFormModal({ initial, onClose, onSave, currentUser, users = [], saving = false, readOnly = false, hideAssignment = false, draftSaved = false, saveLabel = "Save lead", title }) {
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
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((current) => {
      if (!current[k]) return current;
      const next = { ...current };
      delete next[k];
      return next;
    });
  };
  const clearErrors = (...keys) => setErrors((current) => {
    if (!keys.some((key) => current[key])) return current;
    const next = { ...current };
    keys.forEach((key) => delete next[key]);
    return next;
  });
  const availableInterests = [...new Set([...interestOptions(form.type), form.interest].filter(Boolean))];
  const handleSave = () => {
    const nextErrors = {};
    const validStatuses = ["Pending", "Interested", "Not Interested"];
    const validSources = ["Website", "Referral", "Facebook", "Instagram", "Google", "Walk-in", "Phone Call", "Other"];
    if (!form.name.trim()) nextErrors.name = "Full name is required";
    else if (!/^[a-zA-Z][a-zA-Z .'-]*$/.test(form.name.trim())) nextErrors.name = "Use letters, spaces, apostrophes, or hyphens only";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) nextErrors.phone = "Enter a valid 10-digit Indian mobile number";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address";
    if (form.alternatePhone.trim() && !/^[6-9]\d{9}$/.test(form.alternatePhone.trim())) nextErrors.alternatePhone = "Enter a valid 10-digit Indian mobile number";
    if (!form.city.trim()) nextErrors.city = "City is required";
    if (!form.type) nextErrors.type = "Lead type is required";
    if (!form.interest) nextErrors.interest = "Select a service, training, or internship interest";
    if (form.value !== "" && Number(form.value) < 0) nextErrors.value = "Value cannot be negative";
    if (!validSources.includes(form.leadSource)) nextErrors.leadSource = "Select a lead source";
    if (!validStatuses.includes(form.status)) nextErrors.status = "Select a valid status";
    if (!hideAssignment && !form.assignedTo) nextErrors.assignedTo = "Select an assignee";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      requestAnimationFrame(() => {
        const firstInvalid = formRef.current?.querySelector('[aria-invalid="true"]');
        firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid?.focus({ preventScroll: true });
      });
      return;
    }
    setErrors({});
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
    <Modal title={title || (readOnly ? "View lead" : draftSaved ? "Edit saved lead form" : "Add new lead")} onClose={onClose} wide>
      <fieldset className="crm-enquiry-fieldset" disabled={readOnly}>
      <div ref={formRef} className="form-grid add-lead-form crm-enquiry-form">
        {Object.keys(errors).length > 0 && <div className="form-validation-summary span-full" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>Please correct the highlighted fields before saving.</span></div>}
        <p className="form-section-title">Contact Information</p>
        <div className="field">
          <span>Full name *</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter the lead's full name here" required aria-required="true" aria-invalid={Boolean(errors.name)} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <span>Phone *</span>
          <div className="india-phone-input">
            <span className="india-phone-prefix" aria-label="India country code plus 91">
              <span className="india-flag" aria-hidden="true" />
              <span>+91</span>
            </span>
            <input type="tel" inputMode="numeric" value={form.phone} maxLength={10} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter 10-digit mobile number" required aria-required="true" aria-invalid={Boolean(errors.phone)} aria-label="Indian mobile number, starting with 6, 7, 8, or 9" />
          </div>
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>
        <div className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Enter the lead's email here" aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="field">
          <span>Alternate Phone</span>
          <input value={form.alternatePhone} maxLength={10} onChange={(e) => set("alternatePhone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter an alternate phone number here" aria-invalid={Boolean(errors.alternatePhone)} />
          {errors.alternatePhone && <span className="field-error">{errors.alternatePhone}</span>}
        </div>
        <div className="field">
          <span>City *</span>
          <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Enter the city here" required aria-required="true" aria-invalid={Boolean(errors.city)} />
          {errors.city && <span className="field-error">{errors.city}</span>}
        </div>
        <div className="field">
          <span>Company / Organization</span>
          <input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Enter the company or organization here" />
        </div>

        <p className="form-section-title">Lead Information</p>
        <div className="field">
          <span>Lead Type *</span>
          <SalesDropdown aria-label="Lead Type" value={form.type} required aria-required="true" aria-invalid={Boolean(errors.type)} onChange={(e) => { const type = e.target.value; setForm((current) => ({ ...current, type, interest: interestOptions(type)[0] })); clearErrors("type", "interest"); }}>
            <option>Training</option>
            <option>Service</option>
            <option>Internship</option>
          </SalesDropdown>
          {errors.type && <span className="field-error">{errors.type}</span>}
        </div>
        <div className="field">
          <span>Interest *</span>
          <SalesDropdown searchable aria-label="Interest" value={form.interest} onChange={(e) => set("interest", e.target.value)} required aria-required="true" aria-invalid={Boolean(errors.interest)}>
            <option value="">Select interest</option>
            {availableInterests.map((interest) => <option key={interest}>{interest}</option>)}
          </SalesDropdown>
          {errors.interest && <span className="field-error">{errors.interest}</span>}
        </div>
        <div className="field">
          <span>Value</span>
          <input type="number" min="0" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="Enter the estimated value here" aria-invalid={Boolean(errors.value)} />
          {errors.value && <span className="field-error">{errors.value}</span>}
        </div>
        <div className="field">
          <span>Lead Source *</span>
          <SalesDropdown aria-label="Lead Source" value={form.leadSource} onChange={(e) => set("leadSource", e.target.value)} required aria-required="true" aria-invalid={Boolean(errors.leadSource)}>
            {["Website", "Referral", "Facebook", "Instagram", "Google", "Walk-in", "Phone Call", "Other"].map((source) => <option key={source}>{source}</option>)}
          </SalesDropdown>
          {errors.leadSource && <span className="field-error">{errors.leadSource}</span>}
        </div>
        <div className="field">
          <span>Status *</span>
          <SalesDropdown aria-label="Status" value={form.status} onChange={(e) => set("status", e.target.value)} required aria-required="true" aria-invalid={Boolean(errors.status)}>
            <option>Pending</option>
            <option>Interested</option>
            <option>Not Interested</option>
            {form.status && !["Pending", "Interested", "Not Interested"].includes(form.status) ? <option>{form.status}</option> : null}
          </SalesDropdown>
          {errors.status && <span className="field-error">{errors.status}</span>}
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
            <SalesDropdown searchable aria-label="Assigned To" value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} required aria-required="true" aria-invalid={Boolean(errors.assignedTo)}>
              <option value="">Select Assignee</option>
              {users.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}
            </SalesDropdown>
            {errors.assignedTo && <span className="field-error">{errors.assignedTo}</span>}
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
          {readOnly ? "Close" : "Cancel"}
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
      showToast(initial.record ? "Lead form saved. You can edit it until approval." : "Lead uploaded successfully.");
    } catch (error) { showToast(error.message || "Could not create lead"); }
    finally { setSaving(false); }
  };
  return <>
    <CallLeadsPanel rows={rows} users={users} currentUser={currentUser} largeText compactHeader hideSelectedResetOption allowUnapprovedDraftEdits onSave={onSave} onApprove={onApprove} onDelete={onDelete} onAdd={(row) => setInitial({ record: row, form: { ...callLeadForm(row), ...row.leadDraft } })} onView={(row) => setInitial({ record: row, form: { ...callLeadForm(row), ...row.leadDraft }, readOnly: true })} onUploadLead={() => setInitial({ record: null, form: callLeadForm({ listType: "services" }) })} showAssignee={false} lockCreatedLead />
    {initial && <LeadFormModal initial={initial.form} users={users} currentUser={currentUser} saving={saving} readOnly={Boolean(initial.readOnly)} title={initial.readOnly ? "View saved lead form" : undefined} onClose={() => setInitial(null)} onSave={create} hideAssignment draftSaved={Boolean(initial.record?.leadDraft)} saveLabel={initial.record ? "Save lead form" : "Save lead"} />}
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
    largeText
    showAllRows
    showActions={false}
    showAssignee={false}
    showContactActions={false}
    canEditCallData={false}
    lockCreatedLead
    hideSelectedResetOption
    onSave={async () => {}}
    title="Approved Leads"
    subtitle="Leads created by you from Call Leads"
  />;
}

const salesReportCategory = (contact) => contact.listType === "training" ? "Training" : contact.listType === "services" ? "Services" : getCallListCategory(contact.program);
const salesReportDate = (contact) => callLeadRecordDate(contact);
const salesReportApproved = (contact) => Boolean(contact.leadCreated || contact.createdLeadId || contact.callLeadStatus === "Approved");

function SalesReportTableTab({ contacts, setContacts, currentUser, users, onSave, showToast }) {
  const [scope, setScope] = useState("All");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("All");
  const [enquiriesPage, setEnquiriesPage] = useState(1);
  const [enquiriesPageSize, setEnquiriesPageSize] = useState(100);
  const [filledPage, setFilledPage] = useState(1);
  const [filledPageSize, setFilledPageSize] = useState(100);
  const [formState, setFormState] = useState(null);
  const [saving, setSaving] = useState(false);
  const candidates = contacts.filter((contact) => isCallLead(contact) || contact.leadDraft || salesReportApproved(contact));
  const scoped = candidates.filter((contact) => scope === "All" || salesReportCategory(contact) === scope);
  const filtered = scoped.filter((contact) => {
    const matchesQuery = `${contact.name} ${contact.contact} ${contact.program}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesAction = action === "All" || (action === "Approved" && salesReportApproved(contact))
      || (action === "Form filled" && Boolean(contact.leadDraft))
      || (action === "Form needed" && !contact.leadDraft);
    return matchesQuery && matchesAction;
  });
  const filled = filtered.filter((contact) => contact.leadDraft);
  const enquiriesTotalPages = Math.max(1, Math.ceil(filtered.length / enquiriesPageSize));
  const filledTotalPages = Math.max(1, Math.ceil(filled.length / filledPageSize));
  const visibleEnquiries = filtered.slice((enquiriesPage - 1) * enquiriesPageSize, enquiriesPage * enquiriesPageSize);
  const visibleFilled = filled.slice((filledPage - 1) * filledPageSize, filledPage * filledPageSize);
  useEffect(() => {
    setEnquiriesPage(1);
    setFilledPage(1);
  }, [scope, query, action]);
  useEffect(() => { setEnquiriesPage((current) => Math.min(current, enquiriesTotalPages)); }, [enquiriesTotalPages]);
  useEffect(() => { setFilledPage((current) => Math.min(current, filledTotalPages)); }, [filledTotalPages]);
  const exportSalesEnquiriesPdf = () => {
    if (!visibleEnquiries.length) return;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16); pdf.text(`${scope === "All" ? "All" : scope} Sales Enquiries`, 14, 14);
    pdf.setFontSize(9); pdf.setTextColor(100); pdf.text(`${visibleEnquiries.length} visible record(s) · Page ${enquiriesPage} of ${enquiriesTotalPages}`, 14, 20);
    autoTable(pdf, {
      startY: 25,
      head: [["S. No.", "Program", "Lead Name", "Contact", "Call Status", "Interest", "Approval", "Enquiry"]],
      body: visibleEnquiries.map((contact, index) => [(enquiriesPage - 1) * enquiriesPageSize + index + 1, contact.program || "-", contact.name || "-", contact.contact || "-", normalizeCallStatus(contact.callStatus) || "-", normalizeInterestStatus(contact.interestStatus) || "-", salesReportApproved(contact) ? "Approved" : callLeadReviewStatus(contact) || "Not reviewed", contact.leadDraft ? "Filled" : "Not filled"]),
      styles: { fontSize: 8, cellPadding: 2.4, overflow: "linebreak" },
      headStyles: { fillColor: [128, 71, 39] },
    });
    pdf.save(`sales-enquiries-${scope.toLowerCase()}-${todayISO()}.pdf`);
  };
  const exportFilledEnquiriesPdf = () => {
    if (!visibleFilled.length) return;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16); pdf.text(`${scope === "All" ? "All" : scope} Filled Enquiries`, 14, 14);
    pdf.setFontSize(9); pdf.setTextColor(100); pdf.text(`${visibleFilled.length} visible completed form(s) · Page ${filledPage} of ${filledTotalPages}`, 14, 20);
    autoTable(pdf, {
      startY: 25,
      head: [["S. No.", "Program", "Lead Name", "Contact", "City", "Company", "Form Status"]],
      body: visibleFilled.map((contact, index) => [(filledPage - 1) * filledPageSize + index + 1, contact.leadDraft.interest || contact.program || "-", contact.leadDraft.name || contact.name || "-", contact.leadDraft.phone || contact.contact || "-", contact.leadDraft.city || "-", contact.leadDraft.company || "-", "Filled"]),
      styles: { fontSize: 8, cellPadding: 2.4, overflow: "linebreak" },
      headStyles: { fillColor: [128, 71, 39] },
    });
    pdf.save(`filled-enquiries-${scope.toLowerCase()}-${todayISO()}.pdf`);
  };
  const openForm = (contact, mode) => setFormState({ contact, mode });
  const saveForm = async (form) => {
    if (!formState || saving) return;
    setSaving(true);
    try {
      const saved = await onSave(formState.contact, { leadDraft: form });
      setContacts((current) => current.map((contact) => contact.id === saved.id && contact.listType === saved.listType ? normalizeSourceContact(saved) : contact));
      setFormState(null);
      showToast("Enquiry form saved.");
    } catch (error) { showToast(error.message || "Could not save the enquiry form."); }
    finally { setSaving(false); }
  };
  const renderActions = (contact) => contact.leadDraft
    ? <button type="button" className="sales-report-icon" title="View enquiry" aria-label={`View enquiry for ${contact.name}`} onClick={() => openForm(contact, "view")}><IconEye size={16} /></button>
    : <button type="button" className="sales-report-icon" title="Fill enquiry form" aria-label={`Fill enquiry form for ${contact.name}`} onClick={() => openForm(contact, "fill")}><IconFillEnquiry size={16} /></button>;
  return <div className="sales-report-tables">
    <div className="panel sales-report-table-panel">
      <div className="panel-head"><div><h3>Sales enquiries</h3><p className="panel-subtitle">Qualified contacts from your assigned call lists</p></div><div className="sales-report-head-actions"><span className="sales-report-count">{filtered.length} records</span><button type="button" className="primary-button sales-report-export-button" disabled={!visibleEnquiries.length} onClick={exportSalesEnquiriesPdf}><IconDownload size={16} /> Export PDF <span>{visibleEnquiries.length}</span></button></div></div>
      <div className="sales-report-table-filters">
        <div className="sales-report-scope" role="tablist" aria-label="Report type">{["All", "Services", "Training"].map((item) => <button key={item} type="button" role="tab" aria-selected={scope === item} className={scope === item ? "active" : ""} onClick={() => setScope(item)}>{item}</button>)}</div>
        <div className="sales-report-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Search sales enquiries" placeholder="Search name, contact or program" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <SalesDropdown hideSelectedResetOption aria-label="Filter by action" value={action} onChange={(event) => setAction(event.target.value)}><option value="All" data-filter-reset="true">All actions</option><option>Approved</option><option>Form filled</option><option>Form needed</option></SalesDropdown>
      </div>
      <div className="sales-report-table-scroll" tabIndex={0} role="region" aria-label="Sales enquiries table. Scroll horizontally to see all columns."><table className="sales-report-table sales-report-enquiries-table"><SalesTableHead><tr><th>SR NO</th><th>PROGRAM</th><th>LEAD NAME</th><th>CONTACT</th><th>CALL STATUS</th><th>INTEREST</th><th>APPROVAL</th><th>ENQUIRY</th><th>ACTION</th></tr></SalesTableHead><tbody>
        {filtered.length ? visibleEnquiries.map((contact, index) => <tr key={`${contact.listType}-${contact.id}`}><td>{(enquiriesPage - 1) * enquiriesPageSize + index + 1}</td><td>{contact.program || "—"}</td><td className="sales-report-name">{contact.name || "—"}</td><td>{contact.contact || "—"}</td><td>{normalizeCallStatus(contact.callStatus) || "—"}</td><td>{normalizeInterestStatus(contact.interestStatus) || "—"}</td><td><span className={`sales-report-badge ${salesReportApproved(contact) ? "approved" : "pending"}`}>{salesReportApproved(contact) ? "Approved" : callLeadReviewStatus(contact) || "Not reviewed"}</span></td><td><span className={`sales-report-badge ${contact.leadDraft ? "filled" : "needed"}`}>{contact.leadDraft ? "Filled" : "Not filled"}</span></td><td>{renderActions(contact)}</td></tr>) : <tr><td colSpan={9} className="sales-report-no-results">No enquiries match these filters.</td></tr>}
      </tbody></table></div>
      <Pagination page={enquiriesPage} totalPages={enquiriesTotalPages} totalItems={filtered.length} pageSize={enquiriesPageSize} onPageSizeChange={(size) => { setEnquiriesPageSize(size); setEnquiriesPage(1); }} onChange={setEnquiriesPage} className="sales-report-pagination" />
    </div>
    <div className="panel sales-report-table-panel"><div className="panel-head"><div><h3>Filled enquiries</h3><p className="panel-subtitle">Saved form details from your sales contacts</p></div><div className="sales-report-head-actions"><span className="sales-report-count">{filled.length} forms</span><button type="button" className="primary-button sales-report-export-button" disabled={!visibleFilled.length} onClick={exportFilledEnquiriesPdf}><IconDownload size={16} /> Export PDF <span>{visibleFilled.length}</span></button></div></div><div className="sales-report-table-scroll" tabIndex={0} role="region" aria-label="Filled enquiries table. Scroll horizontally to see all columns."><table className="sales-report-table sales-report-filled-table"><SalesTableHead><tr><th>SR NO</th><th>PROGRAM</th><th>LEAD NAME</th><th>CONTACT</th><th>CITY</th><th>COMPANY</th><th>FORM STATUS</th><th>ACTION</th></tr></SalesTableHead><tbody>
      {filled.length ? visibleFilled.map((contact, index) => <tr key={`${contact.listType}-${contact.id}`}><td>{(filledPage - 1) * filledPageSize + index + 1}</td><td>{contact.leadDraft.interest || contact.program || "—"}</td><td className="sales-report-name">{contact.leadDraft.name || contact.name}</td><td>{contact.leadDraft.phone || contact.contact}</td><td>{contact.leadDraft.city || "—"}</td><td>{contact.leadDraft.company || "—"}</td><td><span className="sales-report-badge filled">Filled</span></td><td>{renderActions(contact)}</td></tr>) : <tr><td colSpan={8} className="sales-report-no-results">No filled enquiry forms match these filters.</td></tr>}
    </tbody></table></div><Pagination page={filledPage} totalPages={filledTotalPages} totalItems={filled.length} pageSize={filledPageSize} onPageSizeChange={(size) => { setFilledPageSize(size); setFilledPage(1); }} onChange={setFilledPage} className="sales-report-pagination" /></div>
    {formState && <LeadFormModal key={`${formState.contact.listType}-${formState.contact.id}-${formState.mode}`} initial={{ ...callLeadForm(formState.contact), ...formState.contact.leadDraft }} currentUser={currentUser} users={users} onClose={() => setFormState(null)} onSave={saveForm} saving={saving} readOnly={formState.mode === "view"} hideAssignment draftSaved={Boolean(formState.contact.leadDraft)} saveLabel={formState.mode === "edit" ? "Save changes" : "Save enquiry"} title={`${formState.mode === "view" ? "View" : formState.mode === "edit" ? "Edit" : "Fill"} enquiry form`} />}
  </div>;
}

function SalesReportAnalysisTab({ contacts, showToast }) {
  const [reportScope, setReportScope] = useState("All");
  const [program, setProgram] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef(null);
  const reportDate = salesReportDate;
  const scopedContacts = contacts.filter((contact) => reportScope === "All" || salesReportCategory(contact) === reportScope);
  const programOptions = [...new Set(scopedContacts.map((contact) => contact.program).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

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
  const handleExport = async () => {
    if (!filteredContacts.length || exportingPdf) {
      showToast("Nothing to export for the selected filters");
      return;
    }
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const palette = {
        ink: [48, 41, 35], muted: [132, 119, 107], line: [235, 227, 217],
        soft: [249, 246, 242], brown: [128, 80, 51], rust: [185, 99, 66],
        amber: [196, 145, 82], taupe: [167, 116, 91], track: [239, 234, 228],
      };
      const reportTitle = reportScope === "All" ? "Overall Sales Analysis" : reportScope === "Training" ? "Training Sales Analysis" : "Service Sales Analysis";
      const filterParts = [program === "All" ? "All programs" : program];
      if (dateFrom || dateTo) filterParts.push(`${dateFrom ? formatDisplayDate(dateFrom) : "Beginning"} - ${dateTo ? formatDisplayDate(dateTo) : "Today"}`);
      const setText = (color = palette.ink) => pdf.setTextColor(...color);
      const drawHeader = (continuation = false) => {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);
        setText();
        pdf.text(continuation ? `${reportTitle} - Program Performance` : reportTitle, margin, 15);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        setText(palette.muted);
        pdf.text(continuation ? "Continued from the previous page" : "Performance based on your assigned call-list contacts", margin, 21);
        pdf.text(`Filters: ${filterParts.join(" | ")}  |  Generated: ${formatDisplayDate(todayISO())}`, pageWidth - margin, 21, { align: "right" });
        pdf.setDrawColor(...palette.line);
        pdf.line(margin, 25, pageWidth - margin, 25);
      };
      const roundedCard = (x, y, width, height, accent) => {
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(...palette.line);
        pdf.roundedRect(x, y, width, height, 3, 3, "FD");
        if (accent) {
          pdf.setDrawColor(...accent);
          pdf.setLineWidth(0.8);
          pdf.line(x + 3, y, x + width - 3, y);
          pdf.setLineWidth(0.2);
        }
      };
      const summary = [
        ["Total contacts", totalContacts, "Within selected filters", null],
        ["Interested", interested, `${totalContacts ? Math.round((interested / totalContacts) * 100) : 0}% of contacts`, palette.rust],
        ["Follow ups due", followUps, "Needs another conversation", palette.amber],
        ["Leads created", createdLeads, `${conversionRate}% conversion rate`, palette.brown],
      ];

      drawHeader();
      const cardY = 31;
      const cardGap = 4;
      const cardWidth = (contentWidth - (cardGap * 3)) / 4;
      summary.forEach(([label, value, hint, accent], index) => {
        const x = margin + (index * (cardWidth + cardGap));
        roundedCard(x, cardY, cardWidth, 28, accent);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        setText(palette.muted);
        pdf.text(label, x + 5, cardY + 8);
        pdf.setFontSize(17);
        setText();
        pdf.text(String(value), x + 5, cardY + 18);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        setText(palette.muted);
        pdf.text(hint, x + 5, cardY + 24);
      });

      const funnelY = 65;
      const conversionWidth = 66;
      const sectionGap = 5;
      const funnelWidth = contentWidth - conversionWidth - sectionGap;
      roundedCard(margin, funnelY, funnelWidth, 75);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      setText();
      pdf.text("Sales funnel", margin + 5, funnelY + 9);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      setText(palette.muted);
      pdf.text("How contacts progress through your pipeline", margin + 5, funnelY + 15);
      pdf.setFillColor(249, 235, 226);
      pdf.roundedRect(margin + funnelWidth - 38, funnelY + 5, 33, 9, 4, 4, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...palette.rust);
      pdf.text(`${notInterested} not interested`, margin + funnelWidth - 21.5, funnelY + 11, { align: "center" });
      const barColors = [palette.brown, palette.rust, palette.amber, palette.taupe, palette.brown];
      pipeline.forEach((step, index) => {
        const y = funnelY + 25 + (index * 9.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        setText(palette.muted);
        pdf.text(step.label, margin + 5, y);
        pdf.setFont("helvetica", "bold");
        setText();
        pdf.text(String(step.value), margin + funnelWidth - 5, y, { align: "right" });
        pdf.setFillColor(...palette.track);
        pdf.roundedRect(margin + 5, y + 2, funnelWidth - 10, 2.3, 1, 1, "F");
        const progress = totalContacts ? (step.value / totalContacts) : 0;
        if (progress > 0) {
          pdf.setFillColor(...barColors[index]);
          pdf.roundedRect(margin + 5, y + 2, Math.max(2, (funnelWidth - 10) * progress), 2.3, 1, 1, "F");
        }
      });

      const conversionX = margin + funnelWidth + sectionGap;
      roundedCard(conversionX, funnelY, conversionWidth, 75);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      setText(palette.muted);
      pdf.text("Conversion rate", conversionX + (conversionWidth / 2), funnelY + 18, { align: "center" });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);
      pdf.setTextColor(...palette.brown);
      pdf.text(`${conversionRate}%`, conversionX + (conversionWidth / 2), funnelY + 30, { align: "center" });
      pdf.setDrawColor(...palette.line);
      pdf.setLineWidth(3.2);
      pdf.circle(conversionX + (conversionWidth / 2), funnelY + 47, 10, "S");
      pdf.setLineWidth(0.2);
      pdf.setFontSize(12);
      pdf.text(String(createdLeads), conversionX + (conversionWidth / 2), funnelY + 46, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      setText(palette.muted);
      pdf.text("leads", conversionX + (conversionWidth / 2), funnelY + 52, { align: "center" });
      pdf.text(`Created leads out of ${totalContacts} contacts`, conversionX + (conversionWidth / 2), funnelY + 67, { align: "center" });

      let rowY = 151;
      const drawProgramHeading = () => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        setText();
        pdf.text("Program performance", margin, rowY);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        setText(palette.muted);
        pdf.text("Contact volume and leads created by service or training program", margin, rowY + 6);
        rowY += 13;
      };
      drawProgramHeading();
      programRows.forEach((row) => {
        if (rowY > pageHeight - 15) {
          pdf.addPage("a4", "landscape");
          drawHeader(true);
          rowY = 34;
          drawProgramHeading();
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        setText();
        const programLabel = pdf.splitTextToSize(row.program, 67)[0];
        pdf.text(programLabel, margin, rowY);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        setText(palette.muted);
        pdf.text(`${row.total} contact${row.total === 1 ? "" : "s"} | ${row.interested} interested`, margin, rowY + 5);
        const barX = margin + 76;
        const barWidth = contentWidth - 112;
        pdf.setFillColor(...palette.track);
        pdf.roundedRect(barX, rowY - 1.5, barWidth, 2.7, 1, 1, "F");
        if (row.total > 0) {
          pdf.setFillColor(...palette.brown);
          pdf.roundedRect(barX, rowY - 1.5, Math.max(2, barWidth * (row.total / totalContacts)), 2.7, 1, 1, "F");
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...palette.brown);
        pdf.text(String(row.leadsCreated), pageWidth - margin, rowY, { align: "right" });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        setText(palette.muted);
        pdf.text(`leads | ${row.rate}%`, pageWidth - margin, rowY + 5, { align: "right" });
        pdf.setDrawColor(...palette.line);
        pdf.line(margin, rowY + 8, pageWidth - margin, rowY + 8);
        rowY += 13;
      });
      const pageCount = pdf.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        pdf.setPage(pageNumber);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        setText(palette.muted);
        pdf.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: "right" });
      }
      pdf.save(`sales-analysis-${reportScope.toLowerCase()}-${todayISO()}.pdf`);
      showToast("Analysis report exported as PDF");
    } catch (error) {
      showToast(error?.message || "Could not export the analysis report");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="panel sales-report-panel" ref={reportRef}>
      <div className="panel-head">
        <div><h3>{reportScope === "All" ? "Overall Sales Analysis" : reportScope === "Training" ? "Training Sales Analysis" : "Service Sales Analysis"}</h3><p className="panel-subtitle">Performance based on your assigned call-list contacts</p></div>
        <button className="ghost-button sales-analysis-export-button" data-html2canvas-ignore="true" onClick={handleExport} disabled={!filteredContacts.length || exportingPdf}>
          <IconDownload size={16} /> {exportingPdf ? "Exporting..." : "Export PDF"} <span>{filteredContacts.length}</span>
        </button>
      </div>

      <div className="sales-report-scope" role="tablist" aria-label="Report type">
        {["All", "Services", "Training"].map((scope) => <button key={scope} type="button" role="tab" aria-selected={reportScope === scope} className={reportScope === scope ? "active" : ""} onClick={() => { setReportScope(scope); setProgram("All"); }}>{scope}</button>)}
      </div>

      <div className="module-toolbar">
        <div className="toolbar-filters">
          <SalesDropdown searchable hideSelectedResetOption aria-label="Filter by program" value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="All" data-filter-reset="true">All Programs</option>
            {programOptions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </SalesDropdown>
          <div className="date-chip">
            <input type="date" aria-label="Analysis start date" max={dateTo || undefined} value={dateFrom} onChange={(e) => { const value = e.target.value; setDateFrom(value); if (value && dateTo && value > dateTo) setDateTo(""); }} />
            <span>–</span>
            <input type="date" aria-label="Analysis end date" min={dateFrom || undefined} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
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
  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setPriorityFilter("All");
    setFromDate("");
    setToDate("");
  };
  return (
    <div className="panel call-list-panel task-list-panel">
      <div className="panel-head">
        <div><h3>My tasks</h3><p className="panel-subtitle">Tasks assigned by Admin and tasks you created for yourself</p></div>
        <button className="primary-button call-list-add-button" onClick={() => setModalState({ ...emptyTaskForm(), assignee: currentUser?.name || currentUser?.username || "Me", assigneeId: currentUser?.id || currentUser?._id || "" })}>
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
          <IconSearch className="toolbar-search-icon" size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search tasks"
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
          {searchInput && <button type="button" className="toolbar-search-clear" aria-label="Clear task search" title="Clear search" onClick={handleSearch}><IconClose size={16} /></button>}
        </div>
        <div className="toolbar-filters">
          <select aria-label="Filter tasks by priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="All" hidden={priorityFilter === "All"}>All Priorities</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="call-list-date-row">
          <span className="call-list-date-caption"><CalendarDays size={15} aria-hidden="true" /> Created date</span>
          <CallListDatePicker label="From" value={fromDate} max={toDate || undefined} onChange={(value) => { setFromDate(value); if (value && toDate && value > toDate) setToDate(""); }} />
          <CallListDatePicker label="To" value={toDate} min={fromDate || undefined} onChange={setToDate} />
          <button type="button" className="ghost-button compact" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table tasks-table">
          <SalesTableHead>
            <tr>
              <th>Sr No</th>
              <th>Task</th>
              <th>Description</th>
              <th>Assignee</th>
              <th>Assigned By</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Due Date</th>
            </tr>
          </SalesTableHead>
          <tbody>
            {filtered.length === 0 && <EmptyRow colSpan={9} text="No tasks match the selected filters." />}
            {filtered.map((t, index) => (
              <tr key={t.id} className={t.status === "Done" ? "call-list-status-completed" : t.status === "In Progress" ? "call-list-status-follow-up" : "call-list-status-pending"}>
                <td>{index + 1}</td>
                <td><strong>{t.title}</strong></td>
                <td>{t.description || "-"}</td>
                <td>{t.assignee}</td>
                <td>{t.createdBy || t.createdByName || t.assignedBy || "-"}</td>
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

const ATTENDANCE_STATUS_OPTIONS = [
  { value: "", label: "Select Status", Icon: CircleAlert },
  { value: "Present", label: "Present", Icon: Check },
  { value: "Absent", label: "Absent", Icon: CircleX },
];
const SUNDAY_ATTENDANCE_STATUS_OPTIONS = [
  { value: "Holiday", label: "Holiday", Icon: CalendarDays },
];

function AttendanceStatusSelect({
  value,
  onChange,
  disabled,
  options = ATTENDANCE_STATUS_OPTIONS,
  ariaLabel = "Select attendance status",
  wrapperClassName = "",
  triggerClassName = "",
  menuClassName = "",
  colorByValue = true,
}) {
  const selected = options.find((option) => option.value === value) || options[0];
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(180, rect.width);
      const height = Math.min(options.length * 36 + 8, 320, window.innerHeight - 8);
      const below = window.innerHeight - rect.bottom;
      const top = below >= height || below >= rect.top ? rect.bottom + 4 : rect.top - height - 4;
      setPosition({
        top: Math.max(4, Math.min(top, window.innerHeight - height - 4)),
        left: Math.max(4, Math.min(rect.left, window.innerWidth - width - 4)),
        width: Math.min(width, window.innerWidth - 8),
      });
    };
    const closeOnOutsideClick = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === selected.value);
    optionRefs.current[index]?.focus();
  }, [open, selected.value, options.length]);

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const handleOptionKeyDown = (event, index) => {
    let next;
    if (event.key === "ArrowDown") next = (index + 1) % options.length;
    else if (event.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    } else return;
    event.preventDefault();
    optionRefs.current[next]?.focus();
  };

  return (
    <div className={clsx(
      "crm-attendance-status",
      wrapperClassName,
      colorByValue && value && `crm-attendance-status-${value.toLowerCase()}`,
    )}>
      <button
        ref={triggerRef}
        type="button"
        className={clsx("crm-attendance-status-trigger", triggerClassName)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {selected.Icon && <selected.Icon size={16} aria-hidden="true" />}
        <span>{selected.label}</span>
        <Icon size={15} aria-hidden="true"><path d="m6 9 6 6 6-6" /></Icon>
      </button>
      {open && position && createPortal(
        <div ref={menuRef} className={clsx("call-lead-status-menu", "crm-attendance-status-menu", menuClassName)} role="listbox" aria-label={`${ariaLabel} options`} style={{ ...position, position: "fixed" }}>
          {options.map(({ value: optionValue, label, Icon: StatusIcon, className }, index) => (
            <button
              key={label}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              className={clsx("call-lead-status-option", className)}
              role="option"
              aria-selected={selected.value === optionValue}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onClick={() => { onChange(optionValue); closeMenu(); }}
            >
              {StatusIcon && <StatusIcon size={15} aria-hidden="true" />}
              <span>{label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

function MarkAttendanceTab({ attendance, setAttendance, showToast, profile }) {
  const today = todayIndiaISO();
  const todaysRecord = attendance.find((a) => a.date === today) || null;
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [status, setStatus] = useState(todaysRecord?.status || "");
  const [remark, setRemark] = useState(todaysRecord?.remark || "");
  const refreshedAttendanceDate = useRef("");
  const isSundayHoliday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(currentTime) === "Sun";
  const indiaHour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(currentTime).find((part) => part.type === "hour")?.value || 0);
  const isCheckInClosed = !isSundayHoliday && indiaHour >= 12;
  const checkIn = todaysRecord?.checkIn && todaysRecord.checkIn !== "-" ? todaysRecord.checkIn : "";
  const checkOut = todaysRecord?.checkOut && todaysRecord.checkOut !== "-" ? todaysRecord.checkOut : "";
  const isAutoAbsent = Boolean(todaysRecord?.autoMarked && !todaysRecord?.correctedAt && todaysRecord?.status === "Absent");
  const canCheckOut = Boolean(checkIn && !checkOut && todaysRecord?.status === "Present");
  const formatTime = (date) => date.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  const checkInTimestamp = Date.parse(todaysRecord?.checkInAt || "");
  const liveWorkedMinutes = todaysRecord?.workedMinutes !== null && todaysRecord?.workedMinutes !== undefined && Number.isFinite(Number(todaysRecord.workedMinutes)) && checkOut
    ? Number(todaysRecord.workedMinutes)
    : Number.isFinite(checkInTimestamp) && todaysRecord?.status === "Present"
      ? Math.max(0, Math.floor((currentTime.getTime() - checkInTimestamp) / 60_000))
      : null;
  const workedTime = formatWorkedTime(liveWorkedMinutes);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    }).formatToParts(currentTime).filter((part) => part.type !== "literal").map(({ type, value }) => [type, value]));
    if (parts.hour < 12 || parts.weekday === "Sun" || refreshedAttendanceDate.current === today) return;
    refreshedAttendanceDate.current = today;
    fetchTodayAttendance()
      .then((record) => {
        if (!record) return;
        setAttendance((records) => [record, ...records.filter((item) => item.id !== record.id && item.date !== record.date)]);
      })
      .catch((error) => {
        refreshedAttendanceDate.current = "";
        showToast(error.message || "Could not refresh attendance after the cutoff.");
      });
  }, [currentTime, setAttendance, showToast, today]);

  useEffect(() => { setStatus(todaysRecord?.status || ""); setRemark(todaysRecord?.remark || ""); }, [todaysRecord?.id]);

  const handleCheckIn = async () => {
    if (isSundayHoliday || isCheckInClosed || todaysRecord || !status) return;
    try {
      const saved = await checkInAttendance({ status, remark });
      setAttendance((prev) => [saved, ...prev.filter((record) => record.id !== saved.id)]);
    } catch (error) { showToast(error.message || "Could not mark attendance"); }
  };

  const handleCheckOut = async () => {
    if (!checkIn || checkOut) return;
    try {
      const saved = await checkOutAttendance();
      setAttendance((prev) => prev.map((record) => record.id === saved.id ? saved : record));
      showToast("Checked out successfully");
    } catch (error) { showToast(error.message || "Could not check out"); }
  };

  return (
    <div className="crm-attendance-page">
      <div className="panel crm-attendance-panel">
        {isSundayHoliday && (
          <div className="crm-attendance-holiday" role="status">
            Sunday is a holiday. Attendance cannot be marked today.
          </div>
        )}
        {isAutoAbsent && (
          <div className="crm-attendance-auto-absent" role="status" aria-live="polite">
            Attendance was automatically marked Absent after 12:00 PM IST.
          </div>
        )}
        {checkIn && todaysRecord?.status === "Present" && (
          <div className="crm-attendance-success" role="status" aria-live="polite">
            <Check size={17} aria-hidden="true" />
            <span>{checkOut ? `Attendance complete: ${checkIn} - ${checkOut} (${workedTime})` : `Checked in at ${checkIn} · Worked ${workedTime}`}</span>
          </div>
        )}
        <div className="crm-attendance-form">
          <label className="crm-attendance-field">
            <span className="crm-attendance-label"><UserCircle size={15} aria-hidden="true" />Employee Name</span>
            <input value={profile?.name || "CRM Executive"} readOnly />
          </label>
          <div className="crm-attendance-field">
            <span className="crm-attendance-label"><ListChecks size={15} aria-hidden="true" />Select Status</span>
            <AttendanceStatusSelect
              value={isSundayHoliday ? "Holiday" : status}
              onChange={setStatus}
              disabled={isSundayHoliday || isCheckInClosed || Boolean(todaysRecord)}
              options={isSundayHoliday ? SUNDAY_ATTENDANCE_STATUS_OPTIONS : ATTENDANCE_STATUS_OPTIONS}
            />
          </div>
          <label className="crm-attendance-field">
            <span className="crm-attendance-label"><MessageSquareText size={15} aria-hidden="true" />Remark</span>
            <input value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Remark (optional)" disabled={isSundayHoliday || isCheckInClosed || Boolean(todaysRecord)} />
          </label>
          <div className="crm-attendance-action">
            <div className="crm-attendance-clock" aria-label={`Current India time ${formatTime(currentTime)} IST`}>
              <span className="crm-attendance-live-dot" aria-hidden="true" />
              <span>India time</span>
              <strong>{formatTime(currentTime)} IST</strong>
              {checkIn && <span className="crm-attendance-worked-time">· {workedTime}</span>}
            </div>
            <button
              className={clsx("crm-attendance-submit", canCheckOut && "checkout", (checkOut || (todaysRecord && !canCheckOut)) && "completed")}
              onClick={!todaysRecord ? handleCheckIn : canCheckOut ? handleCheckOut : undefined}
              disabled={isSundayHoliday || (todaysRecord ? !canCheckOut || Boolean(checkOut) : isCheckInClosed || !status)}
            >
              {isSundayHoliday ? "Holiday" : isAutoAbsent ? "Marked Absent" : checkOut ? "Completed" : canCheckOut ? "Check Out" : todaysRecord ? "Marked" : isCheckInClosed ? "Check-in Closed" : "Check In"}
            </button>
          </div>
        </div>
        <div className="crm-attendance-policy" role="note">
          <div className="crm-attendance-policy-item">
            <span className="crm-attendance-policy-icon" aria-hidden="true"><Clock3 size={17} /></span>
            <div><strong>Check-in window</strong><span>Monday–Saturday, before 12:00 PM IST</span></div>
          </div>
          <div className="crm-attendance-policy-item">
            <span className="crm-attendance-policy-icon" aria-hidden="true"><CircleAlert size={17} /></span>
            <div><strong>After 12:00 PM</strong><span>Unmarked attendance becomes Absent; approved leave stays unchanged</span></div>
          </div>
          <div className="crm-attendance-policy-item">
            <span className="crm-attendance-policy-icon" aria-hidden="true"><CalendarDays size={17} /></span>
            <div><strong>Sunday &amp; checkout</strong><span>Sunday holiday · Checkout until midnight</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================== ATTENDANCE REPORT TAB ========================== */

function AttendanceReportTab({ attendance, leaveRequests, joiningDate, employeeId, calendar, showToast, onMonthRequested, onApplyLeave, onSyncAttendance }) {
  const today = todayIndiaISO();
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [syncing, setSyncing] = useState(false);

  const monthOptions = useMemo(() => getAttendanceReportMonths(joiningDate, today), [joiningDate, today]);
  const reportDateRange = useMemo(() => getAttendanceReportDateRange(monthFilter, today), [monthFilter, today]);
  const monthSelectOptions = useMemo(() => monthOptions.map((month) => ({
    value: month,
    label: new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  })), [monthOptions]);
  const monthOptionsForSelect = monthSelectOptions.length
    ? monthSelectOptions
    : [{ value: "", label: "No attendance months available" }];
  const statusOptions = [
    { value: "All", label: "All statuses" },
    { value: "Present", label: "Present" },
    { value: "Absent", label: "Absent" },
    { value: "Leave", label: "Leave" },
    { value: "Holiday", label: "Holiday" },
    { value: "Pending", label: "Leave action" },
  ];

  useEffect(() => {
    if (monthOptions.length && !monthOptions.includes(monthFilter)) setMonthFilter(monthOptions[0]);
  }, [monthOptions, monthFilter]);

  useEffect(() => {
    if (!monthFilter) return;
    Promise.resolve(onMonthRequested?.(monthFilter))
      .catch((error) => showToast(error.message || "Could not load monthly attendance"));
  }, [monthFilter, onMonthRequested, showToast]);

  const allRows = useMemo(() => buildAttendanceReportRows({
    attendance,
    leaves: leaveRequests,
    month: monthFilter,
    joinedDate: joiningDate,
    today,
    employeeId,
    calendar,
  }), [attendance, calendar, employeeId, joiningDate, leaveRequests, monthFilter, today]);
  const rows = filterAttendanceReportRows(allRows, { status: statusFilter, dateFrom, dateTo });
  const displayStatus = (row) => attendanceReportStatusLabel(row, leaveRequests, employeeId);
  const statusIcon = {
    Present: Check,
    Absent: CircleX,
    Leave: Hourglass,
    Holiday: CalendarDays,
    Pending: Clock3,
  };

  const handleExport = () => {
    if (!rows.length) {
      showToast("No records for the selected month");
      return;
    }
    downloadCSV(`attendance-${monthFilter}.csv`, rows.map((r, index) => ({
      "Sr. No.": index + 1,
      Date: formatDisplayDate(r.date),
      Day: formatWeekday(r.date),
      "Punch In Time": r.checkIn,
      "Punch Out Time": r.checkOut,
      "Worked Time": formatWorkedTime(r.workedMinutes),
      Status: displayStatus(r),
      Classification: r.reason,
      Payable: r.payable ? "Yes" : "No",
    })));
    showToast("Attendance report exported");
  };
  const handleExportPdf = () => {
    if (!rows.length) return;
    exportReportPdf({
      title: "Attendance Report",
      filename: `attendance-${monthFilter}.pdf`,
      head: ["Sr. No.", "Date", "Day", "Punch In", "Punch Out", "Worked", "Status", "Classification"],
      body: rows.map((row, index) => [
        index + 1,
        formatDisplayDate(row.date),
        formatWeekday(row.date),
        row.checkIn || "Not recorded",
        row.checkOut || "Not recorded",
        formatWorkedTime(row.workedMinutes),
        displayStatus(row),
        row.reason || "-",
      ]),
    });
  };
  const handleSyncAttendance = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await onSyncAttendance?.(monthFilter);
      showToast(result?.message || "Attendance synchronized.");
    } catch (error) {
      showToast(error.message || "Could not synchronize attendance.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="panel crm-record-report attendance-report-panel">
      <div className="panel-head">
        <div><h3>Attendance History</h3><p className="panel-subtitle">Review your punch times and attendance history</p></div>
        <div className="report-head-actions">
          <button type="button" className={`ghost-button attendance-sync-button${syncing ? " syncing" : ""}`} onClick={handleSyncAttendance} disabled={syncing} title="Synchronize completed attendance since your joining date">{syncing ? <LoaderCircle size={16} /> : <RefreshCw size={16} />} {syncing ? "Syncing..." : "Sync Attendance"}</button>
          <button className="ghost-button" onClick={handleExport} disabled={!rows.length}><IconDownload size={16} /> Export CSV</button>
          <button className="primary-button" onClick={handleExportPdf} disabled={!rows.length}><IconDownload size={16} /> Export PDF ({rows.length})</button>
        </div>
      </div>
      <div className="report-summary">
        <div><span>Present</span><strong>{rows.filter((row) => row.status === "Present").length}</strong></div>
        <div><span>Absent</span><strong>{rows.filter((row) => row.status === "Absent").length}</strong></div>
        <div><span>Leave</span><strong>{rows.filter((row) => row.status === "Leave").length}</strong></div>
        <div><span>Holiday</span><strong>{rows.filter((row) => row.status === "Holiday").length}</strong></div>
        <div><span>Leave Action</span><strong>{rows.filter((row) => row.status === "Pending").length}</strong></div>
      </div>
      <div className="report-toolbar">
        <label><span>Month</span><AttendanceStatusSelect value={monthFilter} onChange={setMonthFilter} options={monthOptionsForSelect} disabled={!monthOptions.length} ariaLabel="Filter attendance by month" wrapperClassName="attendance-report-filter-select" triggerClassName="attendance-report-filter-trigger" menuClassName="attendance-report-select-menu" colorByValue={false} /></label>
        <label><span>Status</span><AttendanceStatusSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} ariaLabel="Filter attendance by status" wrapperClassName="attendance-report-filter-select" triggerClassName="attendance-report-filter-trigger" menuClassName="attendance-report-select-menu" colorByValue={false} /></label>
        <CallListDatePicker
          label="From"
          value={dateFrom}
          min={reportDateRange.start || undefined}
          max={dateTo && dateTo < (reportDateRange.end || today) ? dateTo : reportDateRange.end || today}
          onChange={(value) => { setDateFrom(value); if (value && dateTo && value > dateTo) setDateTo(""); }}
        />
        <CallListDatePicker
          label="To"
          value={dateTo}
          min={dateFrom && dateFrom > reportDateRange.start ? dateFrom : reportDateRange.start || undefined}
          max={reportDateRange.end || today}
          onChange={setDateTo}
        />
        <button type="button" className="ghost-button" onClick={() => { setMonthFilter(monthOptions[0] || today.slice(0, 7)); setStatusFilter("All"); setDateFrom(""); setDateTo(""); }}>Reset</button>
      </div>
      <div className="table-wrap">
        <table className="table attendance-report-table">
          <SalesTableHead>
            <tr>
              <th>Sr. No.</th>
              <th><span className="attendance-report-heading"><CalendarDays size={14} aria-hidden="true" />Date</span></th>
              <th><span className="attendance-report-heading"><CalendarDays size={14} aria-hidden="true" />Day</span></th>
              <th><span className="attendance-report-heading"><Clock3 size={14} aria-hidden="true" />Punch In Time</span></th>
              <th><span className="attendance-report-heading"><Clock3 size={14} aria-hidden="true" />Punch Out Time</span></th>
              <th><span className="attendance-report-heading"><UserCircle size={14} aria-hidden="true" />Status</span></th>
            </tr>
          </SalesTableHead>
          <tbody>
            {!monthOptions.length && <EmptyRow colSpan={6} text="No attendance months available for this account." />}
            {monthOptions.length > 0 && rows.length === 0 && <EmptyRow colSpan={6} text={reportDateRange.isFutureMonth ? "Attendance is not available for a future month." : "No attendance records match these filters."} />}
            {rows.map((r, index) => {
              const pendingLeave = r.status === "Pending" ? pendingLeaveRequestForDate(leaveRequests, r.date, employeeId) : null;
              const rowStatus = displayStatus(r);
              const canApplyLeave = r.status === "Pending" && !pendingLeave && r.date >= today;
              const StatusIcon = r.status === "Pending" ? (pendingLeave ? Hourglass : canApplyLeave ? CalendarDays : RefreshCw) : statusIcon[r.status] || CircleAlert;
              const statusClass = r.status === "Pending" ? (pendingLeave ? "leave-applied" : canApplyLeave ? "apply-leave" : "pending-sync") : String(r.status || "unknown").toLowerCase();
              return (
                <tr key={r.id}>
                  <td className="attendance-report-serial">{index + 1}</td>
                  <td className="attendance-report-date">{formatDisplayDate(r.date)}</td>
                  <td>{formatWeekday(r.date)}</td>
                  <td>{r.checkIn || "Not recorded"}</td>
                  <td>{r.checkOut || "Not recorded"}</td>
                  <td className="attendance-report-status-cell">
                    {canApplyLeave ? <button type="button" title={`Apply leave for ${formatDisplayDate(r.date)}`} className={clsx("attendance-report-status-pill", `is-${statusClass}`, "attendance-report-status-action")} onClick={() => onApplyLeave?.(r.date)}>
                      <StatusIcon size={13} strokeWidth={2.5} aria-hidden="true" />
                      {rowStatus}
                    </button> : <span title={pendingLeave ? "Leave request submitted and awaiting approval" : rowStatus === "Pending Sync" ? "Use Sync Attendance to finalize this completed date" : `${r.reason || "attendance"} · ${r.payable ? "payable" : "non-payable"}`} className={clsx("attendance-report-status-pill", `is-${statusClass}`)}>
                      <StatusIcon size={13} strokeWidth={2.5} aria-hidden="true" />
                      {rowStatus}
                    </span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================= LEAVE REQUEST TAB ============================ */

function LeaveRequestTab({ leaveRequests, setLeaveRequests, showToast, initialDate = "", onSubmitted }) {
  const today = todayIndiaISO();
  const defaultDate = initialDate && initialDate >= today ? initialDate : today;
  const [form, setForm] = useState({ type: LEAVE_TYPES[0], from: defaultDate, to: defaultDate, reason: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const leaveTypeOptions = LEAVE_TYPES.map((type) => ({ value: type, label: type }));
  const requestedDays = leaveDays(form.from, form.to);
  useEffect(() => {
    if (!initialDate) return;
    const selectedDate = initialDate >= today ? initialDate : today;
    setForm((current) => ({ ...current, from: selectedDate, to: selectedDate }));
  }, [initialDate, today]);
  const filteredRequests = [...leaveRequests]
    .sort((left, right) => String(right.appliedOn || right.createdAt || "").localeCompare(String(left.appliedOn || left.createdAt || "")));
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);

  const handleExportPdf = () => {
    if (!pageRows.length) return;
    exportReportPdf({
      title: "My Leave Requests",
      filename: `leave-requests-${todayISO()}.pdf`,
      landscape: true,
      head: ["Type", "From", "To", "Days", "Reason", "Applied On", "Status"],
      body: pageRows.map((leave) => [leave.type || "-", formatDisplayDate(leave.from), formatDisplayDate(leave.to), String(Number(leave.days) > 0 ? leave.days : leaveDays(leave.from, leave.to) || "-"), leave.reason || "-", formatDisplayDate(leave.appliedOn), leave.status || "Pending"]),
    });
  };

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!form.from) nextErrors.from = "Start date is required";
    if (!form.to) nextErrors.to = "End date is required";
    if (form.from && form.from < today) nextErrors.from = "Choose today or a future date";
    if (form.from && form.to && requestedDays === null) nextErrors.to = "End date must be on or after start date";
    if (!form.reason.trim()) nextErrors.reason = "Please add a reason";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const saved = await createLeave(form);
      setLeaveRequests((prev) => [saved, ...prev.filter((leave) => leave.id !== saved.id)]);
      setForm({ type: LEAVE_TYPES[0], from: today, to: today, reason: "" });
      onSubmitted?.();
      setErrors({});
      showToast("Leave request submitted");
    } catch (error) { showToast(error.message || "Could not submit leave request"); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="panel leave-request-panel">
        <div className="panel-head"><div><h3>Apply for Leave</h3><p className="panel-subtitle">Select your dates and see the total before submitting</p></div></div>
        <div className="leave-form-body">
          <div className="form-grid leave-form-grid">
            <div className="field">
              <span>Leave Type</span>
              <AttendanceStatusSelect
                value={form.type}
                onChange={(value) => setForm((current) => ({ ...current, type: value }))}
                options={leaveTypeOptions}
                ariaLabel="Select leave type"
                wrapperClassName="leave-select"
                triggerClassName="leave-select-trigger"
                menuClassName="leave-select-menu"
                colorByValue={false}
              />
            </div>
            <div className="field leave-form-date-field">
              <span>From</span>
              <CallListDatePicker
                label="From"
                value={form.from}
                min={today}
                hideLabel
                onChange={(value) => setForm((current) => ({
                  ...current,
                  from: value,
                  to: value && current.to && current.to < value ? value : current.to,
                }))}
              />
              {errors.from && <span className="field-error">{errors.from}</span>}
            </div>
            <div className="field leave-form-date-field">
              <span>To</span>
              <CallListDatePicker
                label="To"
                value={form.to}
                min={form.from && form.from > today ? form.from : today}
                hideLabel
                onChange={(value) => setForm((current) => ({ ...current, to: value }))}
              />
              {errors.to && <span className="field-error">{errors.to}</span>}
            </div>
            <div className="leave-duration-card" role="status">
              <span><Hourglass size={15} aria-hidden="true" /> Leave duration</span>
              <strong>{requestedDays === null ? "Choose dates" : `${requestedDays} ${requestedDays === 1 ? "day" : "days"}`}</strong>
            </div>
            <div className="field span-full">
              <span>Reason</span>
              <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              {errors.reason && <span className="field-error">{errors.reason}</span>}
            </div>
          </div>
          <div className="form-actions leave-form-actions">
            <button className="primary-button" onClick={handleSubmit} disabled={submitting}>
              <IconCheck size={16} /> {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      </div>

      <div className="panel leave-history-panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div><h3>My Leave Requests</h3><p className="panel-subtitle">Track the status and duration of each request</p></div>
          <button className="primary-button" onClick={handleExportPdf} disabled={!pageRows.length}><IconDownload size={16} /> Export PDF ({pageRows.length})</button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <SalesTableHead>
              <tr>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Applied On</th>
                <th>Status</th>
              </tr>
            </SalesTableHead>
            <tbody>
              {filteredRequests.length === 0 && <EmptyRow colSpan={7} text="No leave requests yet." />}
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

function validateCrmSettings(form) {
  const errors = {};
  const text = (key) => String(form[key] || "").trim();
  if (!text("name")) errors.name = "Full name is required.";
  else if (!isValidPersonName(text("name"))) errors.name = "Use letters and standard name punctuation only.";
  if (!isValidEmail(text("email"))) errors.email = "Enter a valid official email address.";
  if (text("personalEmail") && !isValidEmail(text("personalEmail"))) errors.personalEmail = "Enter a valid personal email address.";
  if (text("phone") && !isValidIndianMobile(text("phone"))) errors.phone = "Enter 10 digits beginning with 6, 7, 8, or 9.";
  if (text("dob") && !isValidProfileDob(text("dob"), todayISO())) errors.dob = "Choose a valid date between 1900 and today.";
  if (text("gender") && !["Female", "Male", "Non-binary", "Prefer not to say"].includes(text("gender"))) errors.gender = "Select a valid gender.";
  if (text("maritalStatus") && !["Single", "Married", "Divorced", "Widowed"].includes(text("maritalStatus"))) errors.maritalStatus = "Select a valid marital status.";
  if (text("education") && !isValidBankText(text("education"))) errors.education = "Use letters, numbers, and standard punctuation only.";
  if (/[\u0000-\u001f]/.test(text("address"))) errors.address = "Address contains unsupported characters.";

  const emergencyKeys = ["emergencyName", "emergencyRelationship", "emergencyPhone"];
  if (emergencyKeys.some((key) => text(key))) {
    if (!text("emergencyName")) errors.emergencyName = "Contact name is required when emergency details are added.";
    else if (!isValidPersonName(text("emergencyName"))) errors.emergencyName = "Use letters and standard name punctuation only.";
    if (!text("emergencyRelationship")) errors.emergencyRelationship = "Relationship is required.";
    else if (!isValidRelationship(text("emergencyRelationship"))) errors.emergencyRelationship = "Use letters and standard punctuation only.";
    if (!isValidIndianMobile(text("emergencyPhone"))) errors.emergencyPhone = "Enter 10 digits beginning with 6, 7, 8, or 9.";
  }

  if (text("panNumber") && !isValidPan(text("panNumber"))) errors.panNumber = "Use PAN format ABCDE1234F.";
  if (text("aadhaarNumber") && !isValidAadhaar(text("aadhaarNumber"))) errors.aadhaarNumber = "Enter a valid 12-digit Aadhaar number.";

  const bankKeys = ["bankName", "accountHolder", "accountNumber", "ifscCode", "bankBranch"];
  if (bankKeys.some((key) => text(key))) {
    if (!text("bankName")) errors.bankName = "Bank name is required when bank details are added.";
    else if (!isValidBankText(text("bankName"))) errors.bankName = "Enter a valid bank name.";
    if (!text("accountHolder")) errors.accountHolder = "Account holder name is required.";
    else if (!isValidPersonName(text("accountHolder"))) errors.accountHolder = "Enter the account holder's legal name.";
    if (!isValidBankAccount(text("accountNumber"))) errors.accountNumber = "Account number must contain 6–18 digits.";
    if (!isValidIfsc(text("ifscCode"))) errors.ifscCode = "Use IFSC format ABCD0123456.";
    if (!text("bankBranch")) errors.bankBranch = "Bank branch is required.";
    else if (!isValidBankText(text("bankBranch"))) errors.bankBranch = "Enter a valid branch name.";
  }
  return errors;
}

export function SettingsTab({ profile, setProfile, showToast, currentUser, onProfileUpdated }) {
  const [profileForm, setProfileForm] = useState(() => ({
    ...currentUser,
    ...profile,
    name: profile.name || currentUser?.name || "",
    role: profile.role || currentUser?.role || "",
    email: profile.email || currentUser?.email || "",
    phone: profile.phone || currentUser?.phone || "",
    dob: currentUser?.dob || "",
    gender: currentUser?.gender || "",
    personalEmail: currentUser?.personalEmail || "",
    maritalStatus: currentUser?.maritalStatus || "",
    education: currentUser?.education || "",
    address: currentUser?.address || "",
    emergencyName: currentUser?.emergencyName || "",
    emergencyRelationship: currentUser?.emergencyRelationship || "",
    emergencyPhone: currentUser?.emergencyPhone || currentUser?.emergencyContact || "",
    panNumber: currentUser?.panNumber || "",
    aadhaarNumber: currentUser?.aadhaarNumber || "",
    bankName: currentUser?.bankName || "",
    accountHolder: currentUser?.accountHolder || "",
    accountNumber: currentUser?.accountNumber || "",
    ifscCode: currentUser?.ifscCode || "",
    bankBranch: currentUser?.bankBranch || "",
    photo: profile.avatarUrl || currentUser?.imageUrl || "",
    imageUrl: currentUser?.imageUrl || profile.avatarUrl || "",
    imagePublicId: currentUser?.imagePublicId || "",
    documents: currentUser?.documents || {},
  }));
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState("");
  const [fileErrors, setFileErrors] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [documentPreview, setDocumentPreview] = useState(null);
  const photoPreviewUrl = useRef("");
  const documentPreviewUrl = useRef("");
  const accountId = String(currentUser?.id || currentUser?._id || "");
  useEffect(() => () => {
    if (documentPreviewUrl.current) URL.revokeObjectURL(documentPreviewUrl.current);
  }, []);
  const formatFileSize = (bytes) => {
    const size = Number(bytes) || 0;
    if (!size) return "";
    return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    let active = true;
    fetchMyProfile()
      .then((savedProfile) => {
        if (!active) return;
        setProfileForm((current) => ({
          ...current,
          ...savedProfile,
          role: profile.role || savedProfile.role || current.role,
          photo: savedProfile.imageUrl || current.photo || "",
          documents: savedProfile.documents || {},
        }));
      })
      .catch((error) => { if (active) setMessage({ type: "error", text: error.message || "Unable to load account settings." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accountId, profile.role]);

  useEffect(() => () => {
    if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
  }, []);

  const clearValidationError = (key) => setValidationErrors((errors) => errors[key] ? { ...errors, [key]: "" } : errors);
  const validateField = (key) => setValidationErrors((errors) => ({ ...errors, [key]: validateCrmSettings(profileForm)[key] || "" }));
  const setField = (key, normalize = (value) => value) => (event) => {
    setProfileForm((form) => ({ ...form, [key]: normalize(event.target.value) }));
    clearValidationError(key);
  };
  const setIndianPhone = (key) => (event) => {
    const digits = String(event.target.value || "").replace(/\D/g, "").slice(0, 10);
    setProfileForm((form) => ({ ...form, [key]: digits }));
    clearValidationError(key);
  };
  const field = (key, label, options = {}) => (
    <label className={`crm-settings-field${options.wide ? " crm-settings-wide" : ""}`}>
      <span>{label}</span>
      <input
        type={options.type || "text"}
        value={profileForm[key] || ""}
        onChange={setField(key, options.normalize)}
        placeholder={options.placeholder}
        required={options.required}
        readOnly={options.readOnly}
        maxLength={options.maxLength}
        pattern={options.pattern}
        inputMode={options.inputMode}
        autoComplete={options.autoComplete}
        aria-invalid={Boolean(validationErrors[key])}
        aria-describedby={validationErrors[key] ? `${key}-error` : undefined}
        onBlur={() => validateField(key)}
      />
      {validationErrors[key] && <small id={`${key}-error`} className="crm-settings-field-error">{validationErrors[key]}</small>}
    </label>
  );
  const indianPhoneField = (key, label, autoComplete) => (
    <label className="crm-settings-field crm-settings-phone-field">
      <span>{label}</span>
      <span className="crm-settings-phone-control">
        <span className="crm-settings-phone-prefix" aria-hidden="true"><span className="crm-settings-india-flag">🇮🇳</span><b>+91</b></span>
        <input
          type="tel"
          value={profileForm[key] || ""}
          onChange={setIndianPhone(key)}
          inputMode="numeric"
          pattern="[6-9][0-9]{9}"
          maxLength={10}
          autoComplete={autoComplete}
          placeholder="98765 43210"
          aria-label={`${label}, India country code plus 91`}
          aria-invalid={Boolean(validationErrors[key])}
          aria-describedby={validationErrors[key] ? `${key}-error` : undefined}
          title="Enter a valid 10-digit Indian mobile number beginning with 6, 7, 8, or 9."
          onBlur={() => validateField(key)}
        />
      </span>
      {validationErrors[key] && <small id={`${key}-error`} className="crm-settings-field-error">{validationErrors[key]}</small>}
    </label>
  );

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileErrors((errors) => ({ ...errors, photo: "Choose an image file." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileErrors((errors) => ({ ...errors, photo: "Choose an image smaller than 5 MB." }));
      return;
    }
    try {
      const processed = await compressImageFile(file);
      if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
      photoPreviewUrl.current = URL.createObjectURL(processed);
      setPendingPhoto(processed);
      setProfileForm((form) => ({ ...form, photo: photoPreviewUrl.current }));
      setFileErrors((errors) => ({ ...errors, photo: "" }));
    } catch (error) {
      setFileErrors((errors) => ({ ...errors, photo: error.message || "Unable to process this photo." }));
    }
  };

  const handleDocumentUpload = async (event, key) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFileErrors((errors) => ({ ...errors, [key]: "Choose a document smaller than 5 MB." }));
      return;
    }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setFileErrors((errors) => ({ ...errors, [key]: "Choose a PDF, JPG, or PNG document." }));
      return;
    }
    setUploadingDocument(key);
    setFileErrors((errors) => ({ ...errors, [key]: "" }));
    try {
      const saved = await uploadMyProfileDocument(key, file);
      const documents = { ...profileForm.documents, [key]: saved };
      setProfileForm((form) => ({ ...form, documents: { ...form.documents, [key]: saved } }));
      setProfile((current) => ({ ...current, documents }));
      onProfileUpdated?.({ documents });
    } catch (error) {
      setFileErrors((errors) => ({ ...errors, [key]: error.message || "Unable to upload this document." }));
    } finally {
      setUploadingDocument("");
    }
  };

  const handleDocumentDownload = async (key, documentInfo) => {
    try {
      const blob = await downloadMyProfileDocument(key);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = documentInfo.name || "account-document";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFileErrors((errors) => ({ ...errors, [key]: error.message || "Unable to download this document." }));
    }
  };

  const handleDocumentView = async (key, documentInfo) => {
    try {
      const blob = await downloadMyProfileDocument(key);
      if (documentPreviewUrl.current) URL.revokeObjectURL(documentPreviewUrl.current);
      const url = URL.createObjectURL(blob);
      documentPreviewUrl.current = url;
      setDocumentPreview({ name: documentInfo.name, type: documentInfo.type || blob.type, url });
    } catch (error) {
      setFileErrors((errors) => ({ ...errors, [key]: error.message || "Unable to preview this document." }));
    }
  };

  const closeDocumentPreview = () => {
    if (documentPreviewUrl.current) URL.revokeObjectURL(documentPreviewUrl.current);
    documentPreviewUrl.current = "";
    setDocumentPreview(null);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (saving || uploadingDocument) return;
    if (Object.values(fileErrors).some(Boolean)) {
      setMessage({ type: "error", text: "Resolve the highlighted upload error before saving." });
      return;
    }
    const errors = validateCrmSettings(profileForm);
    setValidationErrors(errors);
    if (Object.keys(errors).length) {
      setMessage({ type: "error", text: "Please correct the highlighted fields before saving." });
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      let saved = await updateMyProfile({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        dob: profileForm.dob,
        gender: profileForm.gender,
        personalEmail: profileForm.personalEmail,
        maritalStatus: profileForm.maritalStatus,
        education: profileForm.education,
        address: profileForm.address,
        emergencyName: profileForm.emergencyName,
        emergencyRelationship: profileForm.emergencyRelationship,
        emergencyPhone: profileForm.emergencyPhone,
        panNumber: profileForm.panNumber,
        aadhaarNumber: profileForm.aadhaarNumber,
        bankName: profileForm.bankName,
        accountHolder: profileForm.accountHolder,
        accountNumber: profileForm.accountNumber,
        ifscCode: profileForm.ifscCode,
        bankBranch: profileForm.bankBranch,
      });
      if (pendingPhoto) {
        const uploadedPhoto = await uploadMyProfilePhoto(pendingPhoto);
        if (!uploadedPhoto.imageUrl) throw new Error("ImageKit did not return a profile photo URL.");
        saved = { ...saved, ...uploadedPhoto };
      }
      if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
      photoPreviewUrl.current = "";
      setPendingPhoto(null);
      setProfileForm((form) => ({ ...form, ...saved, photo: saved.imageUrl || "" }));
      setProfile((current) => ({ ...current, ...saved, avatarUrl: saved.imageUrl || "" }));
      onProfileUpdated?.({ ...saved, avatarUrl: saved.imageUrl || "" });
      setMessage({ type: "success", text: "Account settings saved." });
      showToast("Account settings saved");
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Unable to save account settings." });
    } finally {
      setSaving(false);
    }
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
    <section className="crm-settings-page">
      <header className="crm-settings-page-heading">
        <h2><UserCircle size={23} /> Account Settings</h2>
      </header>
      {message && <p className={`crm-settings-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</p>}
      {loading ? <div className="crm-settings-loading" role="status">Loading account settings…</div> : <div className="crm-settings-layout">
        <form className="crm-settings-form" onSubmit={handleSaveProfile} noValidate>
          <section className="crm-settings-section">
            <h3><Users size={16} /> 1. Personal Details</h3>
            <div className="crm-settings-section-content">
              <div className="crm-settings-photo">
                {profileForm.photo
                  ? <img src={profileForm.photo} alt="Profile" />
                  : <div className="crm-settings-photo-placeholder"><UserCircle size={42} /></div>}
                <div className="crm-settings-photo-input">
                  <strong>Profile picture</strong>
                  <label className="crm-settings-file-picker crm-settings-photo-picker">
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
                    <ImagePlus size={17} />
                    <span>{pendingPhoto ? "Choose another photo" : profileForm.photo ? "Replace photo" : "Choose photo"}</span>
                  </label>
                  <small>JPG, PNG or WEBP · maximum 5 MB</small>
                  {pendingPhoto && <span className="crm-settings-file-selected"><CheckCircle2 size={14} /><span><b>{pendingPhoto.name}</b><small>{formatFileSize(pendingPhoto.size)} · Ready to upload when saved</small></span></span>}
                  {profileForm.photo && <button className="crm-settings-view-photo" type="button" onClick={() => setPhotoPreviewOpen(true)}><Eye size={14} /> View Current Photo</button>}
                  {fileErrors.photo && <small className="crm-settings-field-error">{fileErrors.photo}</small>}
                </div>
              </div>
              <div className="crm-settings-fields">
                {field("name", "Full Name *", { required: true, maxLength: 120, autoComplete: "name" })}
                <div className="crm-settings-field crm-settings-date-field">
                  <span>Date of Birth</span>
                  <CallListDatePicker label="Date of Birth" value={profileForm.dob || ""} min="1900-01-01" max={todayISO()} hideLabel quickMonthYear showToday={false} ariaInvalid={Boolean(validationErrors.dob)} ariaDescribedBy={validationErrors.dob ? "dob-error" : undefined} onChange={(value) => { setProfileForm((form) => ({ ...form, dob: value })); clearValidationError("dob"); }} />
                  {validationErrors.dob && <small id="dob-error" className="crm-settings-field-error">{validationErrors.dob}</small>}
                </div>
                <label className="crm-settings-field">
                  <span>Gender</span>
                  <select value={profileForm.gender || ""} onChange={setField("gender")} onBlur={() => validateField("gender")} aria-invalid={Boolean(validationErrors.gender)} aria-describedby={validationErrors.gender ? "gender-error" : undefined}>
                    <option value="">Select Gender</option>
                    {["Female", "Male", "Non-binary", "Prefer not to say"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                  {validationErrors.gender && <small id="gender-error" className="crm-settings-field-error">{validationErrors.gender}</small>}
                </label>
                {field("personalEmail", "Personal Email", { type: "email", maxLength: 254, autoComplete: "email" })}
                {field("email", "Work / Official Email *", { type: "email", required: true, maxLength: 254 })}
                {indianPhoneField("phone", "Personal Mobile Number", "tel")}
                <label className="crm-settings-field">
                  <span>Marital Status</span>
                  <select value={profileForm.maritalStatus || ""} onChange={setField("maritalStatus")} onBlur={() => validateField("maritalStatus")} aria-invalid={Boolean(validationErrors.maritalStatus)} aria-describedby={validationErrors.maritalStatus ? "maritalStatus-error" : undefined}>
                    <option value="">Select Status</option>
                    {["Single", "Married", "Divorced", "Widowed"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                  {validationErrors.maritalStatus && <small id="maritalStatus-error" className="crm-settings-field-error">{validationErrors.maritalStatus}</small>}
                </label>
                {field("education", "Education / Qualification", { maxLength: 160 })}
                <label className="crm-settings-field crm-settings-wide">
                  <span>Residential Address</span>
                  <textarea rows={3} maxLength={500} value={profileForm.address || ""} onChange={setField("address")} onBlur={() => validateField("address")} aria-invalid={Boolean(validationErrors.address)} aria-describedby={validationErrors.address ? "address-error" : undefined} />
                  {validationErrors.address && <small id="address-error" className="crm-settings-field-error">{validationErrors.address}</small>}
                </label>
              </div>
            </div>
          </section>

          <section className="crm-settings-section">
            <h3><Phone size={16} /> 2. Emergency Contact</h3>
            <div className="crm-settings-section-content crm-settings-fields">
              {field("emergencyName", "Emergency Contact Name", { maxLength: 120, pattern: "[A-Za-z][A-Za-z .'-]*", placeholder: "e.g. Priya Sharma" })}
              {field("emergencyRelationship", "Relationship", { maxLength: 80, pattern: "[A-Za-z][A-Za-z .'-]*", placeholder: "e.g. Parent, Spouse, Sibling" })}
              {indianPhoneField("emergencyPhone", "Emergency Contact Number", "tel")}
            </div>
          </section>

          <section className="crm-settings-section">
            <h3><CreditCard size={16} /> 3. Identity &amp; KYC Details (PAN &amp; Aadhaar)</h3>
            <div className="crm-settings-section-content crm-settings-fields">
              {field("panNumber", "PAN Card Number (10 Characters)", { maxLength: 10, inputMode: "text", placeholder: "ABCDE1234F", normalize: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) })}
              {field("aadhaarNumber", "Aadhaar Card Number (12 Digits)", { maxLength: 12, inputMode: "numeric", placeholder: "12-digit Aadhaar Number", normalize: (value) => value.replace(/\D/g, "").slice(0, 12) })}
            </div>
          </section>

          <section className="crm-settings-section">
            <h3><Wallet size={16} /> 4. Bank Details</h3>
            <div className="crm-settings-section-content crm-settings-fields">
              {field("bankName", "Bank Name", { maxLength: 120 })}
              {field("accountHolder", "Account Holder Name", { maxLength: 120 })}
              {field("accountNumber", "Account Number", { maxLength: 18, inputMode: "numeric", normalize: (value) => value.replace(/\D/g, "").slice(0, 18) })}
              {field("ifscCode", "IFSC Code", { maxLength: 11, placeholder: "ABCD0123456", normalize: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11) })}
              {field("bankBranch", "Bank Branch", { maxLength: 120 })}
            </div>
          </section>

          <section className="crm-settings-section">
            <h3><Upload size={16} /> 5. Document Attachments &amp; Uploads</h3>
            <div className="crm-settings-section-content crm-settings-documents">
              {documentLabels.map(([key, label, Icon]) => {
                const documentInfo = profileForm.documents?.[key];
                const uploading = uploadingDocument === key;
                return <div className={`crm-settings-document${documentInfo?.name ? " uploaded" : ""}`} key={key}>
                  <div className="crm-settings-document-head">
                    <strong><span><Icon size={15} /></span>{label}</strong>
                    <span className={`crm-settings-document-status ${documentInfo?.name ? "ready" : "empty"}`}>
                      {documentInfo?.name ? <><CheckCircle2 size={12} /> Uploaded</> : "Not uploaded"}
                    </span>
                  </div>
                  <label className={`crm-settings-file-picker${uploading ? " uploading" : ""}`}>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-label={`Upload ${label}`} disabled={uploading} onChange={(event) => handleDocumentUpload(event, key)} />
                    {uploading ? <LoaderCircle className="crm-settings-file-spinner" size={17} /> : <UploadCloud size={17} />}
                    <span>{uploading ? "Uploading to ImageKit..." : documentInfo?.name ? "Replace file" : "Choose file"}</span>
                  </label>
                  <small className="crm-settings-document-hint">PDF, JPG or PNG - maximum 5 MB</small>
                  {fileErrors[key] && <small className="crm-settings-field-error">{fileErrors[key]}</small>}
                  {documentInfo?.name
                    ? <div className="crm-settings-document-file"><FileText size={17} /><span><b title={documentInfo.name}>{documentInfo.name}</b><small>{formatFileSize(documentInfo.size)}{documentInfo.updatedAt ? ` - Updated ${formatDisplayDate(documentInfo.updatedAt)}` : ""}</small></span><button type="button" title={`View ${label}`} aria-label={`View ${label}`} onClick={() => handleDocumentView(key, documentInfo)}><Eye size={15} /></button><button type="button" title={`Download ${label}`} aria-label={`Download ${label}`} onClick={() => handleDocumentDownload(key, documentInfo)}><Download size={15} /></button></div>
                    : <span className="crm-settings-document-empty">No file has been added yet</span>}
                </div>;
              })}
            </div>
          </section>
          <button className="crm-settings-save" type="submit" disabled={saving || Boolean(uploadingDocument) || loading}>
            <Check size={15} /> {saving ? "Saving…" : "Save Profile & KYC Changes"}
          </button>
        </form>

        <aside className="crm-settings-password">
          <h3><LockKeyhole size={16} /> Change Password</h3>
          <div className="crm-settings-password-content">
            <PasswordResetLink userId={currentUser?.id || currentUser?._id} email={currentUser?.email || profileForm.email} />
          </div>
        </aside>
      </div>}
      {photoPreviewOpen && profileForm.photo && <div className="crm-settings-photo-modal" onClick={() => setPhotoPreviewOpen(false)}>
        <div role="dialog" aria-modal="true" aria-label="Current profile photo" onClick={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Close photo preview" onClick={() => setPhotoPreviewOpen(false)}><CircleX size={18} /></button>
          <img src={profileForm.photo} alt="Current profile" />
        </div>
      </div>}
      {documentPreview && <div className="crm-settings-photo-modal crm-settings-document-preview" onClick={closeDocumentPreview}>
        <div role="dialog" aria-modal="true" aria-label={`Preview of ${documentPreview.name}`} onClick={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Close document preview" onClick={closeDocumentPreview}><CircleX size={18} /></button>
          <h3>{documentPreview.name}</h3>
          {documentPreview.type?.startsWith("image/")
            ? <img src={documentPreview.url} alt={documentPreview.name} />
            : documentPreview.type === "application/pdf"
              ? <iframe title={`Preview of ${documentPreview.name}`} src={documentPreview.url} />
              : <p>This file type cannot be previewed in the browser.</p>}
        </div>
      </div>}
    </section>
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
      { key: "salesanalysis", label: "Sales Report Analysis", icon: IconSummary },
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
    label: "Support",
    items: [{ key: "hrhelpdesk", label: "HR Helpdesk", icon: IconMessage }],
  },
  {
    label: "Account",
    items: [{ key: "notifications", label: "Notifications", icon: BellRing }, { key: "settings", label: "Settings", icon: IconSettings }],
  },
];

const TAB_TITLES = {
  dashboard: ["Dashboard", "Overview of your CRM performance"],
  servicecalllist: ["Service Call List", "Daily contacts for IT services"],
  trainingcalllist: ["Training Call List", "Daily contacts for training programs"],
  leads: ["Call Leads", "Interested contacts with a selected service or training, ready for sales follow-up"],
  approvedleads: ["Approved Leads", "Read-only list of leads you created"],
  salesreports: ["Sales Report", "Enquiry and approval records from your call lists"],
  salesanalysis: ["Sales Report Analysis", "Sales performance and conversion trends"],
  tasks: ["Tasks", "Create, assign and track work"],
  salessummary: ["Sales Summary", "Services, Training, Internship & STIP performance"],
  settings: ["Settings", "Profile, preferences and security"],
  notifications: ["Notifications", "Updates about your work"],
  markattendance: ["Mark Attendance", "Log today's attendance"],
  attendancereport: ["Attendance Report", "Monthly attendance history"],
  leaverequest: ["Leave Request", "Apply for and track leave"],
  hrhelpdesk: ["HR Helpdesk", "Chat directly with the HR team"],
};

function Sidebar({ activeTab, onNavigate, profile, badges, onLogout }) {
  const [navSearch, setNavSearch] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => setAvatarFailed(false), [profile.avatarUrl]);
  const profileName = profile.name?.trim() || "CRM Executive";
  const profileInitial = profileName.charAt(0).toUpperCase();
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
          {profile.avatarUrl && !avatarFailed ? (
            <img
              className="sidebar-profile-image"
              src={profile.avatarUrl}
              alt={`${profileName} profile`}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <div className="sidebar-profile-avatar" aria-hidden="true">{profileInitial}</div>
          )}
          <span className="sidebar-profile-name">{profileName}</span>
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
  const contactDate = callListRecordDate(row) || todayISO();
  return {
    ...row,
    id: String(row.id || row._id || `source-contact-${Date.now()}-${Math.random()}`),
    date: String(contactDate).slice(0, 10),
    name: row.name || "",
    contact: String(row.contact || row.number || row.phone || ""),
    callStatus: normalizeCallStatus(row.callStatus),
    interactionType: row.interactionType || "Call",
    interestStatus: normalizeInterestStatus(row.interestStatus),
    program: callLeadProgram(row),
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
  return isCallLead(contact);
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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return window.localStorage.getItem("crm_dashboard_dark_mode") === "true"; }
    catch (error) {
      console.warn("Unable to read the CRM dashboard theme preference.", error);
      return false;
    }
  });
  const [helpdeskMessageAlert, setHelpdeskMessageAlert] = useState(false);
  const topbarMenusRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [activeTab]);

  useEffect(() => {
    try { window.localStorage.setItem("crm_dashboard_dark_mode", String(darkMode)); }
    catch (error) { console.warn("Unable to save the CRM dashboard theme preference.", error); }
  }, [darkMode]);

  useEffect(() => {
    let timer;
    const handleIncomingMessage = () => {
      setHelpdeskMessageAlert(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHelpdeskMessageAlert(false), 1800);
    };
    window.addEventListener("crm:helpdesk-incoming-message", handleIncomingMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("crm:helpdesk-incoming-message", handleIncomingMessage);
    };
  }, []);

  const [contacts, setContacts] = useState([]);
  const [appNotifications, setAppNotifications] = useState([]);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceCalendar, setAttendanceCalendar] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveRequestDate, setLeaveRequestDate] = useState("");
  const [profile, setProfile] = useState(() => ({
    name: currentUser?.name || currentUser?.username || "",
    role: currentUser?.role || "CRM Executive",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    avatarUrl: currentUser?.avatarUrl || currentUser?.imageUrl || "",
  }));
  const [loaded, setLoaded] = useState({ tasks: false, attendance: false, leaves: false, notifications: false });
  const attendanceMonthsLoaded = useRef(new Set());
  const attendanceCalendarLoaded = useRef(false);
  const qualifiedLeadsInitialized = useRef(false);

  useEffect(() => {
    try { window.localStorage.removeItem("crmExec.contacts"); }
    catch { /* Ignore unavailable browser storage. */ }
  }, []);

  const loadAttendanceMonth = useCallback(async (month, { force = false } = {}) => {
    if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return;
    const needsRecords = force || !attendanceMonthsLoaded.current.has(month);
    const needsCalendar = !attendanceCalendarLoaded.current;
    if (!needsRecords && !needsCalendar) return;
    const [records, calendar] = await Promise.all([
      needsRecords ? fetchAttendanceMonth(month) : Promise.resolve(null),
      needsCalendar ? fetchAttendanceCalendar() : Promise.resolve(null),
    ]);
    if (records !== null) {
      if (!Array.isArray(records)) throw new Error("Attendance returned an invalid response.");
      attendanceMonthsLoaded.current.add(month);
      setAttendance((current) => {
        const outsideMonth = current.filter((record) => String(record.date || record.workDate || "").slice(0, 7) !== month);
        return [...records, ...outsideMonth];
      });
    }
    if (calendar !== null) {
      if (!calendar || !Array.isArray(calendar.weeklyHolidays) || !Array.isArray(calendar.holidays)) {
        throw new Error("Attendance calendar returned an invalid response.");
      }
      attendanceCalendarLoaded.current = true;
      setAttendanceCalendar(calendar);
    }
  }, []);
  const refreshAttendanceMonth = useCallback(
    (month) => loadAttendanceMonth(month, { force: true }),
    [loadAttendanceMonth],
  );
  const synchronizeAttendance = useCallback(async (month) => {
    const result = await syncAttendanceHistory();
    attendanceMonthsLoaded.current.clear();
    setAttendance([]);
    await loadAttendanceMonth(month || todayIndiaISO().slice(0, 7), { force: true });
    return result;
  }, [loadAttendanceMonth]);

  useEffect(() => {
    let active = true;
    const month = todayIndiaISO().slice(0, 7);
    loadAttendanceMonth(month)
      .catch((error) => { if (active) showToast(error.message || "Could not load attendance"); })
      .finally(() => { if (active) setLoaded((current) => ({ ...current, attendance: true })); });
    return () => { active = false; };
  }, [loadAttendanceMonth, showToast]);

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
    let pending = false;
    const refresh = () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      return fetchAppNotifications().then((items) => { if (active && Array.isArray(items)) setAppNotifications(items); })
      .catch(() => {})
      .finally(() => { pending = false; if (active) setLoaded((current) => current.notifications ? current : { ...current, notifications: true }); });
    };
    refresh();
    // The backend keeps a mutation-aware notification snapshot. A one-minute
    // poll is responsive without repeatedly querying Firestore in every tab.
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
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
    if (!["attendancereport", "leaverequest"].includes(activeTab)) return undefined;
    let active = true;
    let pending = false;
    const refresh = () => {
      if (!active || pending) return;
      pending = true;
      fetchLeaves()
        .then((records) => { if (active && Array.isArray(records)) setLeaveRequests(records); })
        .catch((error) => { if (active) showToast(error.message || "Could not refresh leave requests"); })
        .finally(() => { pending = false; });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [activeTab, showToast]);

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
    if (tab !== "leaverequest") setLeaveRequestDate("");
    setActiveTab(tab);
  };
  const handleApplyLeave = (date) => {
    setLeaveRequestDate(date);
    setActiveTab("leaverequest");
  };

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    if (typeof onLogout === "function") {
      onLogout();
    } else {
      showToast("Logged out");
    }
  };

  const unreadNotificationCount = appNotifications.filter((item) => !item.read).length;
  const badges = {
    leads: leads.length || null,
    tasks: tasks.filter((t) => t.status !== "Done").length || null,
    leaverequest: leaveRequests.filter((l) => l.status === "Pending").length || null,
    notifications: unreadNotificationCount || null,
  };

  const [title, subtitle] = TAB_TITLES[activeTab] || ["", ""];
  const pageLoading = isCrmPageLoading(activeTab, {
    callsLoading, leadsLoading, tasksLoaded: loaded.tasks,
    attendanceLoaded: loaded.attendance, leavesLoaded: loaded.leaves,
    notificationsLoaded: loaded.notifications,
  });
  useStickySalesTableHeaders(contentRef, !pageLoading && ["leads", "approvedleads", "salesreports"].includes(activeTab), activeTab);

  return (
    <div className={clsx("crm-root", darkMode && "crm-dark-mode")}>
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
              <button className={clsx("icon-button notification-bell", unreadNotificationCount ? "has-unread" : helpdeskMessageAlert && "has-incoming")} title="Notifications" aria-label="Notifications" onClick={() => setTopMenu((current) => current === "notifications" ? "" : "notifications")}>
                <BellRing size={18} />
                {unreadNotificationCount > 0 && <span className="bell-badge">{unreadNotificationCount}</span>}
              </button>
              {topMenu === "notifications" && <div className="topbar-menu notifications-menu"><div className="topbar-menu-head"><strong>Notifications</strong><button onClick={markAllNotificationsRead}>Mark all read</button></div><div className="topbar-notification-list">{appNotifications.slice(0, 6).map((item) => <button key={item.id} className={clsx("topbar-notification", !item.read && "unread")} onClick={() => markNotificationRead(item.id)}>{item.message}</button>)}{!appNotifications.length && <p>No notifications yet.</p>}</div><button className="topbar-menu-link" onClick={() => { setTopMenu(""); handleNavigate("notifications"); }}>View all notifications</button></div>}
              </div>
              <div className="topbar-popover-wrap">
              <button className="user-chip user-chip-button" type="button" aria-haspopup="dialog" aria-expanded={topMenu === "profile"} onClick={() => setTopMenu((current) => current === "profile" ? "" : "profile")}>
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
                  <strong style={{ display: "block", fontSize: "16px" }}>{profile.name}</strong>
                  <span style={{ fontSize: "16px", color: "var(--text-soft)" }}>{profile.role}</span>
                </div>
              </button>
              {topMenu === "profile" && <div className="topbar-menu profile-menu" role="dialog" aria-label="Profile details">
                <div className="profile-menu-identity">
                  {profile.avatarUrl
                    ? <img className="profile-menu-avatar" src={profile.avatarUrl} alt={`${profile.name || "User"} profile`} />
                    : <div className="profile-menu-avatar-fallback" aria-hidden="true">{(profile.name || "?").charAt(0).toUpperCase()}</div>}
                  <div className="profile-menu-copy"><strong>{profile.name || "CRM Executive"}</strong><span>{profile.role || "CRM Executive"}</span></div>
                </div>
                <div className="profile-menu-data">
                  <div><span>Email</span><b title={profile.email || "Not provided"}>{profile.email || "Not provided"}</b></div>
                  <div><span>Phone</span><b>{profile.phone || "Not provided"}</b></div>
                </div>
                <button className="topbar-menu-link" type="button" onClick={() => { setTopMenu(""); handleNavigate("settings"); }}>View settings</button>
              </div>}
              </div>
            </div>
          </div>

          <div ref={contentRef} className={clsx("content", ["servicecalllist", "trainingcalllist"].includes(activeTab) && "call-list-content", ["leads", "approvedleads"].includes(activeTab) && "leads-content", activeTab === "salesreports" && "sales-report-list-content", activeTab === "hrhelpdesk" && "helpdesk-content")}>
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
            {activeTab === "leads" && <LeadsTab rows={contacts} users={users} showToast={showToast} currentUser={currentUser} onSave={onUpdateCallListContact} onApprove={onApproveCallLead} onDelete={onDeleteCallContact} onCreateLead={onCreateLead} />}
            {activeTab === "approvedleads" && <ApprovedLeadsTab leads={externalLeads} sourceContacts={sourceContacts} currentUser={currentUser} />}
            {activeTab === "salesreports" && <SalesReportTableTab contacts={contacts} setContacts={setContacts} currentUser={currentUser} users={users} onSave={onUpdateCallListContact} showToast={showToast} />}
            {activeTab === "salesanalysis" && <SalesReportAnalysisTab contacts={contacts} showToast={showToast} />}
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
              <AttendanceReportTab
                attendance={attendance}
                leaveRequests={leaveRequests}
                joiningDate={currentUser?.joined}
                employeeId={currentUser?.id || currentUser?._id}
                calendar={attendanceCalendar}
                showToast={showToast}
                onMonthRequested={refreshAttendanceMonth}
                onApplyLeave={handleApplyLeave}
                onSyncAttendance={synchronizeAttendance}
              />
            )}
            {activeTab === "leaverequest" && (
              <LeaveRequestTab leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} showToast={showToast} initialDate={leaveRequestDate} onSubmitted={() => setLeaveRequestDate("")} />
            )}
            {activeTab === "hrhelpdesk" && <HelpdeskChat user={currentUser} displayName={profile.name} />}
            </>}
          </div>
        </div>
      </div>
      <Toast toast={toast} />
      <HelpdeskIncomingToast user={currentUser} onOpen={() => handleNavigate("hrhelpdesk")} />
      <LogoutConfirmDialog open={logoutConfirmOpen} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={confirmLogout} />
    </div>
  );
}

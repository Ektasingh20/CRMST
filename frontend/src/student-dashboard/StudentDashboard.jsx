import React, { useEffect, useState, useMemo, useRef } from "react";
import { certificateImage } from "./certificateImage";
import { shareCourseCertificate } from "../../backendApi";
import StudentProfileEditor from "./StudentProfileEditor";
import { dedupeStudentAssignments, formatAssignmentMarks } from "./studentAssignments";

/* ============================================================
   THEME TOKENS — pulled from the reference CRM screenshot
   ============================================================ */
const C = {
  sidebarBg: "#121214",
  sidebarBg2: "#1c1c1f",
  sidebarLabel: "rgba(255,255,255,0.52)",
  sidebarText: "rgba(255,255,255,0.88)",
  sidebarTextBright: "#ffffff",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarActive: "rgba(255,255,255,0.09)",
  sidebarBorder: "rgba(255,255,255,0.08)",

  bg: "#ebe7e2",
  card: "#ffffff",
  border: "#eee8dc",
  text: "#1f1a17",
  textSecondary: "#675d55",
  textMuted: "#9c8f86",

  badgeBg: "#f3ddba",
  badgeIcon: "#7a4a1e",

  accent: "#8d5e38",
  accentDark: "#643e23",

  pillBg: "#f5efe8",
  pillBorder: "rgba(178,147,118,0.18)",

  deleteBg: "#fbeae8",
  deleteText: "#c0392b",

  green: "#3f7a52",
  greenBg: "#e8f3ea",
  amber: "#a8710a",
  amberBg: "#fbf1de",
};

/* ============================================================
   ICONS
   ============================================================ */
const Icon = {
  dashboard: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  courses: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  myCourses: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" /><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </svg>
  ),
  video: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="2" y="5" width="15" height="14" rx="2" /><path d="M17 9l5-3v12l-5-3" />
    </svg>
  ),
  notes: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" />
    </svg>
  ),
  assignments: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  progress: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.1-2.8-2.8L7 14" />
    </svg>
  ),
  bell: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  user: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  ),
  print: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v7H6z" /></svg>,
  download: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>,
  verify: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>,
  share: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></svg>,
  logout: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
    </svg>
  ),
  chevronRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}><path d="M9 6l6 6-6 6" /></svg>
  ),
  arrowLeft: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="m12 19-7-7 7-7" /><path d="M5 12h14" /></svg>
  ),
  chevronDown: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}><path d="M6 9l6 6 6-6" /></svg>
  ),
  pointer: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M5 3l5.5 17 3-6 6 3L5 3z" /><path d="M13.5 14l3.5 5" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
  ),
  lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  play: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5v14l11-7z" /></svg>
  ),
  x: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
  ),
  menu: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}><path d="M20 6L9 17l-5-5" /></svg>
  ),
};

/* ============================================================
   DUMMY DATA
   ============================================================ */
const NAV_SECTIONS = [
  { label: "Overview", items: [
    { id: "dashboard", label: "Dashboard", icon: Icon.dashboard },
  ]},
  { label: "Learning", items: [
    { id: "all-courses", label: "All Courses", icon: Icon.courses },
    { id: "my-courses", label: "My Courses", icon: Icon.myCourses },
    { id: "assignments", label: "Assignments", icon: Icon.assignments },
    { id: "progress", label: "My Progress", icon: Icon.progress },
    { id: "certificates", label: "Certificates", icon: Icon.verify },
  ]},
  { label: "Updates", items: [
    { id: "announcements", label: "Announcements", icon: Icon.bell },
  ]},
  { label: "Account", items: [
    { id: "profile", label: "My Profile", icon: Icon.user },
  ]},
];

const PAGE_META = {
  "dashboard": { title: "Student Dashboard", sub: "Welcome back, Student" },
  "all-courses": { title: "All Courses", sub: "Every course offered by the organization" },
  "my-courses": { title: "My Courses", sub: "Courses you're currently enrolled in" },
  "course-player": { title: "Course Player", sub: "" },
  "assignments": { title: "Assignments", sub: "Review tasks and submission status" },
  "progress": { title: "My Progress", sub: "Track your learning and course completion" },
  "certificates": { title: "Certificates", sub: "View certificates earned from completed courses" },
  "announcements": { title: "Announcements", sub: "Updates and reminders for your courses" },
  "profile": { title: "My Profile", sub: "Your account details" },
};

/* Minimum seconds a lesson video must play before it is allowed to auto-complete */
const MIN_WATCH_SECONDS = 10;

/* Unique id for a lesson across sections (two sections could reuse a lesson id) */
function getLessonUID(lesson = {}) {
  const section = String(lesson.section || "General").trim().toLowerCase() || "general";
  return `${section}::${lesson.id || lesson.lessonId || ""}`;
}

function slugify(value) {
  return String(value || "general").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "general";
}

/* Mirrors the backend REST shape: /courses/:courseId/sections/:sectionSlug/lessons/:lessonId/:resource */
function buildLessonPath(courseId, section, lessonId, resource) {
  return `/courses/${courseId}/sections/${slugify(section)}/lessons/${lessonId}${resource ? `/${resource}` : ""}`;
}

/* ============================================================
   SMALL PRIMITIVES
   ============================================================ */
function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: C.pillBg, color: C.textSecondary, border: C.pillBorder },
    green: { bg: C.greenBg, color: C.green, border: "transparent" },
    amber: { bg: C.amberBg, color: C.amber, border: "transparent" },
    blue: { bg: "#e7f1fb", color: "#245b8f", border: "#d3e5f6" },
    purple: { bg: "#f1eafa", color: "#6843a0", border: "#e5d8f4" },
    slate: { bg: "#edf0f3", color: "#4e5968", border: "#dfe4e9" },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-block", fontSize: 16, fontWeight: 700, padding: "4px 10px",
      borderRadius: 20, background: t.bg, color: t.color, border: `1px solid ${t.border}`,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Btn({ children, variant = "outline", onClick, style, disabled }) {
  const base = {
    border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 16,
    fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", transition: "all .15s ease",
    fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
  };
  const variants = {
    outline: { background: C.pillBg, color: C.text, border: `1px solid ${C.pillBorder}` },
    primary: { background: C.accent, color: "#fff" },
    delete: { background: C.deleteBg, color: C.deleteText },
  };
  const buttonContent = children === "Print" ? <><Icon.print style={{ width: 13, height: 13 }} /> Print</> : children === "Download PDF" ? "Download" : children;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], opacity: disabled ? 0.55 : 1, ...style }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(0.96)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
    >
      {buttonContent}
    </button>
  );
}

function CourseCard({ course, onOpen, onContinue, onRequestEnrollment }) {
  const activate = () => (course.enrolled ? (onContinue || onOpen)(course) : onOpen(course));
  const requestPending = Boolean(course.requestPending);
  const requestStatus = String(course.requestStatus?.status || "").toLowerCase();
  const hasRequest = Boolean(course.requestStatus);
  const requestLabel = requestStatus === "contacted" ? "Request Contacted"
    : requestStatus === "approved" ? "Request Approved"
      : requestStatus === "rejected" ? "Request Rejected"
        : requestStatus === "completed" ? "Request Completed" : "Request Sent";
  return (
    <div
      onClick={activate}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden",
        boxShadow: "0 2px 5px rgba(33,28,46,0.04), 0 12px 28px rgba(33,28,46,0.07)",
        display: "flex", flexDirection: "column", cursor: "pointer", minWidth: 0,
      }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 7", minHeight: 150, maxHeight: 220, background: "#f5ede2", overflow: "hidden" }}>
        {course.thumbnail || course.imageUrl ? (
          <img src={course.thumbnail || course.imageUrl} alt={`${course.title} thumbnail`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.badgeIcon, background: `linear-gradient(135deg, ${C.badgeBg}, #ead1ae)` }}>
            <Icon.courses style={{ width: 42, height: 42, opacity: 0.72 }} />
          </div>
        )}
        <div style={{ position: "absolute", top: 14, right: 16 }}>
          {course.enrolled ? <Badge tone="green">✓ Enrolled</Badge> : <Badge>Not Enrolled</Badge>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", padding: "16px 18px 16px", minHeight: 190 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h4 style={{ margin: 0, minHeight: 44, fontSize: 18, lineHeight: 1.25, fontWeight: 800, overflowWrap: "anywhere" }}>{course.title}</h4>
        </div>
      </div>

      <p style={{ margin: "0 0 16px", fontSize: 16, lineHeight: 1.4, color: C.textSecondary, minHeight: 50, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{course.desc}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, padding: "0 0 13px", marginBottom: 12, borderBottom: `1px solid ${C.border}` }}>
        <CardStat icon={Icon.clock} label="Duration" value={course.duration} />
        <CardStat icon={Icon.notes} label="Lessons" value={course.lessons} />
        <CardStat icon={Icon.progress} label="Status" value={course.enrolled ? "Active" : "Available"} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        {course.enrolled ? (
          <Btn variant="primary" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); activate(); }}>
            Continue Course
          </Btn>
        ) : hasRequest ? (
          <Btn variant="outline" disabled style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>
            {requestLabel}
          </Btn>
        ) : (
          <Btn variant="primary" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onRequestEnrollment?.(course); }}>
            Request Enroll
          </Btn>
        )}
      </div>
      </div>
    </div>
  );
}

function CardStat({ icon: StatIcon, label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.accent, marginBottom: 6 }}>
        <StatIcon style={{ width: 16, height: 16 }} />
        <span style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textMuted, fontWeight: 800 }}>{label}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, overflowWrap: "anywhere" }}>{value === "" || value == null ? "Not specified" : value}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, right }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   MODAL — course detail
   ============================================================ */
function getLessonCompletion(courseId, lesson, lessonProgress) {
  const key = getLessonProgressKey(courseId, lesson);
  const progress = { ...(lesson.studentProgress || {}), ...(lessonProgress[key] || {}) };
  const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
  const allTasksCompleted = tasks.length === 0 || tasks.every((task, index) => progress.taskSubmissions?.[String(task.id || `task-${index + 1}`)]?.submitted === true);
  return {
    studentProgress: progress,
    completed: Boolean(progress.completed || (progress.videoCompleted && progress.notesCompleted && allTasksCompleted)),
    videoCompleted: Boolean(progress.videoCompleted),
    notesCompleted: Boolean(progress.notesCompleted),
    taskCompleted: allTasksCompleted,
  };
}

function getLessonProgressKey(courseId, lesson = {}) {
  const section = String(lesson.section || "General").trim().toLowerCase() || "general";
  return `${courseId}:${section}:${lesson.id || lesson.lessonId || ""}`;
}

function getLessonProgressRatio(lesson = {}, progressOverride = {}) {
  // CoursePlayer flattens lessons and exposes their completion fields directly
  // on the lesson. Include those fields as well as persisted studentProgress,
  // otherwise its right-hand progress rail incorrectly falls back to 0%.
  const progress = { ...lesson, ...(lesson.studentProgress || {}), ...progressOverride };
  const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
  const taskSubmissions = progress.taskSubmissions || {};
  const submittedTasks = tasks.filter((task, index) => taskSubmissions[String(task.id || `task-${index + 1}`)]?.submitted === true).length;
  const taskDone = submittedTasks || (progress.taskCompleted ? tasks.length : 0);
  const total = 1 + (lesson.notesUrl ? 1 : 0) + tasks.length;
  const done = (progress.videoCompleted ? 1 : 0)
    + (lesson.notesUrl ? (progress.notesCompleted ? 1 : 0) : 0)
    + taskDone;
  return total ? done / total : 0;
}

function getNotificationEvaluation(notifications, courseId, lesson, task) {
  const taskName = String(task?.title || lesson?.title || "").trim().toLowerCase();
  const notification = (notifications || []).find((item) => item.type === "assignment_evaluated"
    && String(item.courseId || "") === String(courseId)
    && (!taskName || String(item.message || "").toLowerCase().includes(`"${taskName}"`)));
  if (!notification) return null;
  const match = String(notification.message || "").match(/Grade:\s*([^/.]+)\/100(?:\.\s*Feedback:\s*(.*))?$/i);
  return { grade: match?.[1]?.trim() || null, feedback: match?.[2]?.trim() || "" };
}

function parseStudentDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatStudentDate(value) {
  const date = value instanceof Date ? value : parseStudentDate(value);
  return date ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "No due date";
}

function isActionRequiredAnnouncement(item = {}) {
  const type = String(item.type || "").toLowerCase();
  const priority = String(item.priority || "").toLowerCase();
  return item.requiresAction === true || item.urgent === true
    || ["urgent", "required_action", "action_required"].includes(type)
    || ["urgent", "high", "critical"].includes(priority);
}

function getCourseSectionGroups(course = {}, lessonProgress = {}) {
  const directLessons = Array.isArray(course.lessonsData) ? course.lessonsData : Array.isArray(course.lessons) ? course.lessons : [];
  const nestedLessons = Array.isArray(course.sections)
    ? course.sections.flatMap((section) => (Array.isArray(section?.lessons)
      ? section.lessons.map((lesson) => ({ ...lesson, section: lesson.section || section.name || section.title || "General" }))
      : []))
    : [];
  const lessons = directLessons.length ? directLessons : nestedLessons;
  const groups = new Map();

  lessons.forEach((lesson) => {
    const sectionName = String(lesson.section || "General").trim() || "General";
    if (!groups.has(sectionName)) groups.set(sectionName, []);
    const state = getLessonCompletion(course.id || course._id, lesson, lessonProgress);
    groups.get(sectionName).push({ ...lesson, courseId: course.id || course._id, ...state });
  });

  return [...groups.entries()].map(([name, list]) => ({
    name,
    lessons: list.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
  }));
}

function CourseModal({ course, onClose, onToast, onContinue, onRequestEnrollment }) {
  if (!course) return null;
  const requestPending = Boolean(course.requestPending);
  const requestStatus = String(course.requestStatus?.status || "").toLowerCase();
  const hasRequest = Boolean(course.requestStatus);
  const requestLabel = requestStatus === "contacted" ? "Request Contacted"
    : requestStatus === "approved" ? "Request Approved"
      : requestStatus === "rejected" ? "Request Rejected"
        : requestStatus === "completed" ? "Request Completed" : "Request Sent";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(33,28,46,0.5)", zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.card, borderRadius: 20, maxWidth: 760, width: "100%",
        padding: 26, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, background: C.badgeBg, color: C.badgeIcon,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon.courses style={{ width: 22, height: 22 }} />
          </div>
          <button onClick={onClose} style={{ background: C.pillBg, border: `1px solid ${C.pillBorder}`, borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon.x style={{ width: 15, height: 15, color: C.textSecondary }} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{course.title}</h3>
          {course.enrolled ? <Badge tone="green">✓ Enrolled</Badge> : <Badge>Not Enrolled</Badge>}
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 16, color: C.textSecondary }}>{course.desc}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18, padding: 14, background: C.pillBg, borderRadius: 12 }}>
          <Stat label="Duration" value={course.duration} />
          <Stat label="Lessons" value={course.lessons} />
          <Stat label="Status" value={course.enrolled ? "Enrolled" : "Not Enrolled"} />
        </div>

        {course.enrolled ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 7, background: "#f0ece2", borderRadius: 20, overflow: "hidden" }}>
                <div style={{ width: `${course.progress}%`, height: "100%", background: C.accent, borderRadius: 20 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>{course.progress}%</div>
            </div>
            <Btn variant="primary" style={{ width: "100%" }} onClick={() => onContinue?.(course)}>
              {course.progress > 0 ? "Continue Learning" : "Start Course"}
            </Btn>
          </>
        ) : (
          <>
            <p style={{ fontSize: 16, color: C.textSecondary, marginBottom: 18 }}>
              Enroll in this course to unlock its videos, notes and assignments.
            </p>
            {hasRequest ? (
              <Btn variant="outline" disabled style={{ width: "100%" }} onClick={() => undefined}>
                {requestLabel}
              </Btn>
            ) : (
              <Btn variant="primary" style={{ width: "100%" }} onClick={() => { onRequestEnrollment?.(course); }}>
                Request Enroll
              </Btn>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VideoModal({ video, onClose }) {
  if (!video) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(33,28,46,0.62)", zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ background: C.card, borderRadius: 20, maxWidth: 860, width: "100%", padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div><h3 style={{ margin: 0, fontSize: 17 }}>{video.title}</h3><p style={{ margin: "4px 0 0", color: C.textSecondary, fontSize: 16 }}>{video.courseTitle}</p></div>
          <button onClick={onClose} aria-label="Close video" style={{ background: C.pillBg, border: `1px solid ${C.pillBorder}`, borderRadius: 9, width: 32, height: 32, cursor: "pointer" }}><Icon.x style={{ width: 15, height: 15, color: C.textSecondary }} /></button>
        </div>
        <video src={video.videoUrl} controls autoPlay onEnded={video.onEnded} style={{ display: "block", width: "100%", maxHeight: "70vh", borderRadius: 12, background: "#111" }} />
      </div>
    </div>
  );
}

function ResourceModal({ resource, onClose, onUpload }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    setFile(null);
    setUploading(false);
    setUploadError("");
    setDownloading(false);
  }, [resource?.courseId, resource?.lessonId, resource?.taskId]);
  if (!resource) return null;
  const chooseFile = (event) => { setFile(event.target.files?.[0] || null); setUploadError(""); };
  const downloadPdf = async () => {
    if (!resource.adminUrl || downloading) return;
    setDownloading(true);
    setUploadError("");
    try {
      const response = await fetch(resource.adminUrl);
      if (!response.ok) throw new Error("PDF download failed.");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resource.fileName || `${resource.title || "assignment"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      setUploadError("Could not download the PDF directly. Use View PDF to open it and save it from your browser.");
    } finally {
      setDownloading(false);
    }
  };
  const submitPdf = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setUploadError("");
    try {
      await onUpload(file, resource.kind);
      onClose();
    } catch (error) {
      setUploadError(error?.message || "Could not submit your PDF. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(33,28,46,0.62)", zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div role="dialog" aria-modal="true" aria-label={resource.title} onClick={(event) => event.stopPropagation()} style={{ background: C.card, borderRadius: 20, maxWidth: resource.kind === "assignment" ? 760 : 480, maxHeight: "90vh", overflowY: "auto", width: "100%", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div><h3 style={{ margin: 0, fontSize: 17 }}>{resource.title}</h3><p style={{ margin: "4px 0 0", color: C.textSecondary, fontSize: 16 }}>{resource.courseTitle}</p></div>
          <button onClick={onClose} aria-label="Close" style={{ background: C.pillBg, border: `1px solid ${C.pillBorder}`, borderRadius: 9, width: 32, height: 32, cursor: "pointer" }}><Icon.x style={{ width: 15, height: 15 }} /></button>
        </div>
        {resource.adminUrl ? <div style={{ display: "flex", gap: 10, marginBottom: 12 }}><Btn variant="outline" style={{ flex: 1 }} onClick={() => window.open(resource.adminUrl, "_blank", "noopener,noreferrer")}>View PDF</Btn><Btn variant="outline" style={{ flex: 1 }} disabled={downloading} onClick={downloadPdf}>{downloading ? "Downloading..." : "Download PDF"}</Btn></div> : <p style={{ fontSize: 16, color: C.textMuted }}>Admin PDF is not available yet.</p>}
        {resource.kind === "assignment" && resource.adminUrl && <iframe title={`${resource.title} PDF`} src={resource.adminUrl} style={{ display: "block", width: "100%", height: "min(42vh, 400px)", marginBottom: 14, border: `1px solid ${C.border}`, borderRadius: 10 }} />}
        {resource.kind === "assignment" ? (
          <>
            {resource.studentUrl && <a href={resource.studentUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginBottom: 12, color: C.accent, fontWeight: 700 }}>View your submitted PDF</a>}
            <label style={{ display: "block", padding: 14, border: `1px dashed ${C.pillBorder}`, borderRadius: 12, fontSize: 16, color: C.textSecondary, cursor: "pointer" }}>
              {resource.studentUrl ? "Upload an updated PDF" : "Upload your PDF"}
              <input type="file" accept=".pdf,application/pdf" onChange={chooseFile} disabled={uploading} style={{ display: "block", marginTop: 8, width: "100%" }} />
            </label>
            {uploadError && <p role="alert" style={{ margin: "12px 0 0", color: "#b54730", fontSize: 16 }}>{uploadError}</p>}
            <Btn variant="primary" disabled={!file || uploading} style={{ width: "100%", marginTop: 14 }} onClick={submitPdf}>{uploading ? "Uploading and saving..." : resource.studentUrl ? "Update PDF" : "Submit PDF"}</Btn>
          </>
        ) : uploadError && <p role="alert" style={{ margin: "12px 0 0", color: "#b54730", fontSize: 16 }}>{uploadError}</p>}
      </div>
    </div>
  );
}

/* ============================================================
   COURSE PLAYER — Udemy / YouTube style playlist layout
   ============================================================ */
function CoursePlayer({ course, lessonProgress, activeLessonUID, activeTab, onSelectLesson, onSetTab, onMarkWatched, onMarkProgress, onStudySeconds, onOpenResource, onBack, backLabel }) {
  const groups = useMemo(() => getCourseSectionGroups(course, lessonProgress), [course, lessonProgress]);
  const flatLessons = useMemo(() => groups.flatMap((g) => g.lessons), [groups]);
  const currentLesson = flatLessons.find((l) => getLessonUID(l) === activeLessonUID) || flatLessons[0] || null;
  const currentSectionName = currentLesson ? String(currentLesson.section || "General").trim() || "General" : null;
  const currentModuleIndex = groups.findIndex((g) => g.name === currentSectionName);
  const watchedLessonRef = useRef("");
  const studyTimeRef = useRef({ lastTickAt: null, pendingSeconds: 0 });
  const onStudySecondsRef = useRef(onStudySeconds);
  onStudySecondsRef.current = onStudySeconds;

  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    groups.forEach((g) => { initial[g.name] = true; });
    return initial;
  });
  useEffect(() => {
    if (currentSectionName) setExpanded((cur) => (cur[currentSectionName] ? cur : { ...cur, [currentSectionName]: true }));
  }, [currentSectionName]);

  useEffect(() => {}, [activeLessonUID]);

  const watchKey = `${course.id || "course"}:${activeLessonUID || "lesson"}`;
  useEffect(() => {
    watchedLessonRef.current = "";
  }, [watchKey]);

  useEffect(() => () => {
    const wholeSeconds = Math.floor(studyTimeRef.current.pendingSeconds);
    if (wholeSeconds > 0) onStudySecondsRef.current?.(wholeSeconds);
    studyTimeRef.current = { lastTickAt: null, pendingSeconds: 0 };
  }, [watchKey]);

  if (!currentLesson) {
    return <div style={{ padding: 24, color: C.textSecondary }}>This course doesn't have any lessons yet.</div>;
  }

  const idx = flatLessons.findIndex((l) => getLessonUID(l) === activeLessonUID);
  const prevLesson = idx > 0 ? flatLessons[idx - 1] : null;
  const nextLesson = idx >= 0 && idx < flatLessons.length - 1 ? flatLessons[idx + 1] : null;

  const totalLessons = flatLessons.length;
  const completedLessons = flatLessons.filter((l) => l.completed).length;
  const overallPercent = flatLessons.length
    ? Math.round((flatLessons.reduce((sum, lesson) => sum + getLessonProgressRatio(lesson), 0) / flatLessons.length) * 100)
    : Number(course.progress || 0);
  const generatedSyllabus = groups
    .map((section) => `${section.name}: ${section.lessons.map((lesson) => lesson.title).join(", ")}`)
    .filter(Boolean)
    .join(". ");
  const courseSyllabus = course.syllabus && !String(course.syllabus).startsWith("Imported from folder:")
    ? course.syllabus
    : generatedSyllabus || course.syllabus || "Course syllabus is not available yet.";
  const flushStudyTime = () => {
    const wholeSeconds = Math.floor(studyTimeRef.current.pendingSeconds);
    if (wholeSeconds < 1) return;
    studyTimeRef.current.pendingSeconds -= wholeSeconds;
    onStudySecondsRef.current?.(wholeSeconds);
  };
  const trackStudyTime = (event, finish = false) => {
    const tracker = studyTimeRef.current;
    const now = Date.now();
    if (tracker.lastTickAt !== null && !event.currentTarget.seeking) {
      tracker.pendingSeconds += Math.min(5, Math.max(0, (now - tracker.lastTickAt) / 1000));
    }
    tracker.lastTickAt = finish ? null : now;
    if (tracker.pendingSeconds >= 15 || finish) flushStudyTime();
  };
  const handleTimeUpdate = (e) => {
    if (!e.currentTarget.paused) trackStudyTime(e);
    const t = e.currentTarget.currentTime || 0;
    if (t >= MIN_WATCH_SECONDS && !currentLesson.videoCompleted && watchedLessonRef.current !== watchKey) {
      watchedLessonRef.current = watchKey;
      onMarkWatched(currentLesson);
    }
  };
  const handleEnded = (event) => {
    trackStudyTime(event, true);
    if (!currentLesson.videoCompleted && watchedLessonRef.current !== watchKey) {
      watchedLessonRef.current = watchKey;
      onMarkWatched(currentLesson);
    }
  };

  const TABS = [
    { id: "about", label: "About" },
    { id: "notes", label: "Notes" },
    { id: "tasks", label: "Tasks", count: (currentLesson.tasks || []).length },
  ];
  const activeContentTab = ["about", "notes", "tasks"].includes(activeTab) ? activeTab : "about";

  return (
    <div className="cp-wrap">
      <style>{`
        .cp-wrap { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 18px; align-items: stretch; margin: -22px -28px -46px; height: calc(100vh - 88px); min-height: 520px; overflow: hidden; }
        .cp-rail { grid-column: 2; grid-row: 1; position: relative; align-self: stretch; min-height: 0; overflow: hidden; border-right: none !important; border-left: 1px solid rgba(178,147,118,0.14); }
        .cp-main { grid-column: 1; grid-row: 1; }
        @media (max-width: 980px) {
          .cp-wrap { grid-template-columns: 1fr; margin: 0; height: auto; overflow: visible; }
          .cp-rail { grid-column: 1; grid-row: 2; position: static; max-height: 360px; }
          .cp-main { grid-column: 1; grid-row: 1; }
        }
      `}</style>

      {/* LEFT RAIL — dark, matches the app's sidebar palette */}
      <div className="cp-rail" style={{ background: `linear-gradient(180deg, ${C.sidebarBg}, #0c0c0e)`, borderRight: "1px solid rgba(178,147,118,0.14)", display: "flex", flexDirection: "column", height: "100%", minHeight: "100%" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 700, padding: "18px 18px 4px", cursor: "pointer", fontFamily: "inherit" }}>
          <Icon.arrowLeft style={{ width: 17, height: 17, flexShrink: 0 }} /> <span>Back to {backLabel}</span>
        </button>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 18px 16px", borderBottom: "1px solid rgba(178,147,118,0.14)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: C.badgeBg, color: C.badgeIcon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {course.thumbnail || course.imageUrl ? (
              <img
                src={course.thumbnail || course.imageUrl}
                alt={`${course.title} thumbnail`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(event) => { event.currentTarget.style.display = "none"; }}
              />
            ) : (
              <Icon.courses style={{ width: 19, height: 19 }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>{course.title}</div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Complete Course</div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(178,147,118,0.14)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ width: `${overallPercent}%`, height: "100%", background: "linear-gradient(90deg,#3f7a52,#57a06d)", borderRadius: 20, transition: "width .3s ease" }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.72)", flexShrink: 0 }}>{overallPercent}% Complete</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0 14px" }}>
          {groups.map((section, sIdx) => {
            const isOpen = Boolean(expanded[section.name]);
            const sectionDone = section.lessons.filter((l) => l.videoCompleted && l.taskCompleted).length;
            return (
              <div key={section.name}>
                <button
                  onClick={() => setExpanded((cur) => ({ ...cur, [section.name]: !cur[section.name] }))}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 16, fontWeight: 700, color: "#fff" }}>
                    {isOpen ? <Icon.chevronDown style={{ width: 13, height: 13, color: "rgba(255,255,255,0.5)" }} /> : <Icon.chevronRight style={{ width: 13, height: 13, color: "rgba(255,255,255,0.5)" }} />}
                    Module {sIdx + 1}: {section.name}
                  </span>
                  <span style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>{sectionDone} / {section.lessons.length}</span>
                </button>
                {isOpen && (
                  <ul style={{ listStyle: "none", margin: 0, padding: "0 0 6px" }}>
                    {section.lessons.map((lesson, i) => {
                      const uid = getLessonUID(lesson);
                      const active = uid === activeLessonUID;
                      const done = lesson.videoCompleted && lesson.taskCompleted;
                      return (
                        <li key={uid}>
                          <button
                            onClick={() => onSelectLesson(uid)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 18px 9px 14px",
                              background: active ? "linear-gradient(135deg, rgba(41,41,44,0.92), rgba(28,28,31,0.95))" : "transparent",
                              border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                              borderLeft: active ? `3px solid #d55c41` : "3px solid transparent",
                            }}
                          >
                            <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "rgba(63,122,82,0.22)" : active ? "rgba(213,92,65,0.22)" : "rgba(255,255,255,0.08)", color: done ? "#5fbd7c" : active ? "#e2734a" : "rgba(255,255,255,0.4)" }}>
                              {done ? <Icon.check style={{ width: 11, height: 11 }} /> : active ? <Icon.play style={{ width: 9, height: 9 }} /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}
                            </span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: active ? 700 : 500, color: active ? "#fff" : "rgba(255,255,255,0.78)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i + 1}. {lesson.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT — breadcrumb, video, tabs, meta */}
      <div className="cp-main" style={{ padding: "22px 26px 32px", minWidth: 0, overflowY: "auto", height: "100%" }}>
        <div style={{ fontSize: 16, color: C.textMuted, marginBottom: 6 }}>
          {course.title} <span style={{ margin: "0 6px" }}>›</span> Module {Math.max(currentModuleIndex, 0) + 1}: {currentSectionName} <span style={{ margin: "0 6px" }}>›</span> Lecture {idx + 1}
        </div>
        <h2 style={{ margin: "0 0 16px", fontSize: 19, fontWeight: 800 }}>Lecture {idx + 1}: {currentLesson.title}</h2>

        {currentLesson.videoUrl ? (
          <video
            key={activeLessonUID}
            src={currentLesson.videoUrl}
            controls
            onPlay={(event) => { studyTimeRef.current.lastTickAt = Date.now(); }}
            onPause={(event) => trackStudyTime(event, true)}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            style={{ display: "block", width: "100%", maxHeight: "56vh", borderRadius: 14, background: "#111", boxShadow: "0 14px 40px rgba(20,15,10,0.18)" }}
          />
        ) : (
          <div style={{ padding: "60px 0", textAlign: "center", color: "rgba(255,255,255,0.5)", background: "#111", borderRadius: 14 }}>
            <Icon.lock style={{ width: 22, height: 22, marginBottom: 8 }} />
            <div>No video is available for this lesson yet.</div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, color: currentLesson.videoCompleted ? C.green : C.textMuted }}>
            <Icon.check style={{ width: 14, height: 14, opacity: currentLesson.videoCompleted ? 1 : 0.35 }} />
            {currentLesson.videoCompleted ? "Watched — notes & task unlocked" : `Watch at least ${MIN_WATCH_SECONDS}s to mark this lesson watched`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" disabled={!prevLesson} onClick={() => prevLesson && onSelectLesson(getLessonUID(prevLesson))}>← Previous</Btn>
            <Btn variant="outline" disabled={!nextLesson} onClick={() => nextLesson && onSelectLesson(getLessonUID(nextLesson))}>Next →</Btn>
          </div>
        </div>

        {/* tab strip */}
        <div style={{ display: "flex", gap: 4, marginTop: 22, borderBottom: `1px solid ${C.border}` }}>
          {TABS.map((tab) => {
            const active = activeContentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSetTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "transparent", border: "none",
                  borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
                  color: active ? C.accentDark : C.textSecondary, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {tab.label}
                {tab.id === "tasks" && tab.count > 0 && (
                  <span style={{ background: C.badgeBg, color: C.badgeIcon, borderRadius: 20, fontSize: 16, fontWeight: 800, padding: "1px 6px" }}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* content + meta side panel */}
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 24, marginTop: 18 }}>
          <div>
            {activeContentTab === "about" && (
              <>
                <h4 style={{ margin: "0 0 8px", fontSize: 16 }}>About this lecture</h4>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: C.textSecondary }}>
                  {courseSyllabus || currentLesson.description || `In this lecture, we cover ${currentLesson.title.toLowerCase()} as part of ${currentSectionName}. Watch the video, review the notes, then complete the linked task to mark this lesson done.`}
                </p>
              </>
            )}
            {activeContentTab === "notes" && (
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: 16 }}>{currentLesson.title} — Notes</h4>
                {currentLesson.notesUrl ? (
                  <Btn variant="primary" onClick={() => { onMarkProgress(currentLesson, { notesCompleted: true }); onOpenResource({ title: `${currentLesson.title} — Notes`, courseTitle: course.title, adminUrl: currentLesson.notesUrl, kind: "notes", courseId: course.id, lessonId: currentLesson.id }); }}>
                    Open Notes PDF
                  </Btn>
                ) : (
                  <p style={{ fontSize: 16, color: C.textMuted }}>No notes have been uploaded for this lesson yet.</p>
                )}
              </div>
            )}
            {activeContentTab === "tasks" && (
              <TaskDropdownList lesson={currentLesson} course={course} onOpenResource={onOpenResource} />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, borderLeft: `1px solid ${C.border}`, paddingLeft: 20 }}>
            <MetaRow icon={Icon.clock} label="Course duration" value={course.duration || "—"} />
            <MetaRow icon={Icon.clock} label="Video duration" value={currentLesson.durationTime || currentLesson.duration || "—"} />
            <MetaRow icon={Icon.pointer} label="Topics" value={`${currentSectionName}, ${currentLesson.title}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ icon: IconCmp, label, value }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <IconCmp style={{ width: 15, height: 15, color: C.accent, marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 16, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

function TaskDropdownList({ lesson, course, onOpenResource }) {
  const tasks = lesson.tasks || [];
  const [openTaskId, setOpenTaskId] = useState(tasks[0]?.id || (tasks.length ? "task-1" : null));
  if (!tasks.length) {
    return <p style={{ fontSize: 16, color: C.textMuted }}>No tasks are assigned for this lesson.</p>;
  }
  return (
    <div>
      <h4 style={{ margin: "0 0 10px", fontSize: 16 }}>Tasks for {lesson.title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tasks.map((task, i) => {
          const taskId = String(task.id || `task-${i + 1}`);
          const isOpen = openTaskId === taskId;
          const taskSubmission = lesson.studentProgress?.taskSubmissions?.[taskId];
          const hasGrade = taskSubmission?.grade !== undefined && taskSubmission?.grade !== null && taskSubmission.grade !== "";
          const status = hasGrade ? `Graded · ${taskSubmission.grade}/100` : taskSubmission?.submitted ? "Submitted" : "Pending";
          return (
            <div key={taskId} style={{ border: `1px solid ${C.pillBorder}`, borderRadius: 12, overflow: "hidden" }}>
              <button
                onClick={() => setOpenTaskId(isOpen ? null : taskId)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", background: C.pillBg, border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              >
                <span style={{ fontSize: 16, fontWeight: 700 }}>{task.title || `Task ${i + 1}`}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge tone={hasGrade || status === "Submitted" ? "green" : "amber"}>{status}</Badge>
                  {isOpen ? <Icon.chevronDown style={{ width: 13, height: 13 }} /> : <Icon.chevronRight style={{ width: 13, height: 13 }} />}
                </span>
              </button>
              {isOpen && (
                <div style={{ padding: 14, fontSize: 16, color: C.textSecondary }}>
                  <p style={{ margin: "0 0 12px" }}>{task.description || "Complete this task and submit your work as a PDF."}</p>
                  <Btn
                    variant="primary"
                    disabled={!lesson.videoCompleted}
                    onClick={() => onOpenResource({
                      title: task.title || lesson.title, courseTitle: course.title, adminUrl: task.pdfUrl, fileName: task.fileName || "",
                      studentUrl: taskSubmission?.taskStudentPdfUpload || "", kind: "assignment",
                      progressKey: getLessonProgressKey(course.id, lesson), courseId: course.id, lessonId: lesson.id, taskId, section: lesson.section,
                    })}
                  >
                    {lesson.videoCompleted ? "Open Task" : "Watch the video first"}
                  </Btn>
                  {taskSubmission?.taskStudentPdfUpload && <a href={taskSubmission.taskStudentPdfUpload} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginLeft: 14, color: C.accent, fontWeight: 700 }}>View submitted PDF</a>}
                  {taskSubmission?.grade !== undefined && taskSubmission?.grade !== null && taskSubmission.grade !== "" && (
                    <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: C.greenBg, color: C.green }}>
                      <div style={{ fontWeight: 800 }}>Grade: {taskSubmission.grade}/100</div>
                      {taskSubmission.feedback && <div style={{ marginTop: 5, color: C.textSecondary }}>Feedback: {taskSubmission.feedback}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   PAGE SECTIONS
   ============================================================ */
function SummaryCards({ courses, completedCourses, pendingAssignments, unreadCount }) {
  const items = [
    { label: "Enrolled Courses", value: courses.filter(c => c.enrolled).length, icon: Icon.myCourses },
    { label: "Completed Courses", value: completedCourses, icon: Icon.check },
    { label: "Pending Assignments", value: pendingAssignments, icon: Icon.assignments },
    { label: "Unread Notices", value: unreadCount, icon: Icon.bell },
  ];
  return (
    <div className="dashboard-summary-grid">
      {items.map((it) => (
        <div key={it.label} className="dashboard-stat-card">
          <div>
            <div className="dashboard-stat-value">{it.value}</div>
            <div className="dashboard-stat-label">{it.label}</div>
          </div>
          <it.icon style={{ width: 20, height: 20, color: "#c6c9cb" }} />
        </div>
      ))}
    </div>
  );
}

function ContinueLearning({ course, onOpen }) {
  if (!course) return null;
  return (
    <section className="dashboard-panel dashboard-continue">
      <h2>Continue Learning</h2>
      <button type="button" className="dashboard-resume" onClick={() => onOpen(course)}>
        <span className="dashboard-play"><Icon.play style={{ width: 17, height: 17 }} /></span>
        <span className="dashboard-resume-body">
          <strong>{course.title}</strong>
          <span>{course.currentLesson || "Resume your last accessed lesson"}</span>
          <span className="dashboard-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, Number(course.progress) || 0))}%` }} /></span>
        </span>
        <span className="dashboard-progress-value">{course.progress}%</span>
      </button>
    </section>
  );
}

function SectionHead({ title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 0 12px" }}>
      <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>{title}</h3>
      {right}
    </div>
  );
}

function AssignmentsTable({ rows, onOpen }) {
  const badgeTone = { Pending: "blue", Locked: "slate", Open: "blue", "Open after video": "slate", Completed: "green", Submitted: "amber", Evaluated: "purple", Graded: "purple" };
  return (
    <div className="student-assignment-table-wrap">
      <table className="student-assignment-table" style={{ width: "100%", minWidth: 840, borderCollapse: "collapse" }}>
        <thead><tr>{["Sr No", "Assignment", "Course", "Due Date", "Status", "Marks", "Action"].map((heading) => (
          <th key={heading} scope="col" style={{ textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, padding: heading === "Sr No" ? "12px 10px 12px 20px" : "12px 20px", width: heading === "Sr No" ? 76 : undefined, whiteSpace: heading === "Sr No" ? "nowrap" : undefined, background: C.pillBg, borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>{heading}</th>
        ))}</tr></thead>
        <tbody>{rows.map((assignment, index) => (
          <tr key={`${assignment.courseId || "course"}:${String(assignment.section || "General").trim().toLowerCase()}:${assignment.lessonId || "lesson"}:${assignment.id || index}`}>
            <td style={{ ...cellStyle(index, rows.length), padding: "12px 10px 12px 20px" }}><span className="student-assignment-serial">{index + 1}</span></td>
            <td style={cellStyle(index, rows.length)}><div style={{ fontWeight: 700 }}>{assignment.name}</div></td>
            <td style={cellStyle(index, rows.length)}>{assignment.course}</td>
            <td style={cellStyle(index, rows.length)}>{assignment.due || "No due date"}</td>
            <td style={cellStyle(index, rows.length)}><Badge tone={badgeTone[assignment.status] || "neutral"}>{assignment.status}</Badge></td>
            <td style={{ ...cellStyle(index, rows.length), fontWeight: assignment.status === "Graded" ? 700 : 400, color: assignment.status === "Graded" ? "#6843a0" : C.textMuted, whiteSpace: "nowrap" }}>{formatAssignmentMarks(assignment)}</td>
            <td style={cellStyle(index, rows.length)}><button type="button" className="student-assignment-open" onClick={() => onOpen?.(assignment)}>Open <Icon.chevronRight style={{ width: 14, height: 14 }} /></button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
function cellStyle(i, len) {
  return { padding: "12px 20px", fontSize: 16, borderBottom: i === len - 1 ? "none" : `1px solid ${C.border}` };
}

function ActivityList({ items }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((a, i) => (
        <li key={a.id} style={{ display: "flex", gap: 12, padding: "13px 20px", borderBottom: i === items.length - 1 ? "none" : `1px solid ${C.border}` }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: C.badgeBg, color: C.badgeIcon, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.check style={{ width: 14, height: 14 }} />
          </div>
          <div style={{ fontSize: 16 }}>
            <div style={{ fontWeight: 700 }}>{a.text}</div>
            <div style={{ color: C.textSecondary }}>{a.detail}</div>
            <div style={{ fontSize: 16, color: C.textMuted, marginTop: 2 }}>{a.time}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProgressStat({ label, value, compact = false }) {
  return <div style={{ minWidth: 0, padding: compact ? 14 : 18, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 3px 12px rgba(48,35,24,.04)" }}>
    <div style={{ color: C.textSecondary, marginBottom: 8 }}>{label}</div>
    <strong style={{ display: "block", fontSize: compact ? 20 : 26, color: C.text, overflowWrap: "anywhere" }}>{value}</strong>
  </div>;
}

function studyDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function WeeklyLearningChart({ secondsByDay }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const seconds = Math.max(0, Number(secondsByDay[studyDateKey(date)]) || 0);
    return { key: studyDateKey(date), label: date.toLocaleDateString("en-US", { weekday: "short" }), date: date.getDate(), seconds };
  });
  const highestMinutes = Math.max(...days.map((day) => day.seconds / 60));
  const scaleMinutes = Math.max(20, Math.ceil(highestMinutes * 1.2 / 20) * 20);
  const ticks = [4, 3, 2, 1, 0].map((step) => Math.round(scaleMinutes * step / 4));

  return <Panel title="Weekly Learning Activity" right={<span style={{ color: C.textSecondary, fontSize: 16 }}>Last 7 days</span>}>
    <div style={{ padding: "20px 20px 18px" }}>
      <div style={{ color: C.textSecondary, marginBottom: 18 }}>Video watch time on this device</div>
      <div role="img" aria-label={`Video watch time in the last seven days: ${days.map((day) => `${day.label} ${day.date}, ${Math.round(day.seconds / 60)} minutes`).join("; ")}`} style={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr)", gap: 10 }}>
        <div style={{ height: 220, display: "flex", flexDirection: "column", justifyContent: "space-between", color: C.textMuted, whiteSpace: "nowrap" }}>
          {ticks.map((value, index) => <span key={index}>{value}m</span>)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ position: "relative", height: 220, borderBottom: `1px solid ${C.border}` }}>
            {ticks.map((_, index) => <div key={index} style={{ position: "absolute", top: `${index * 25}%`, left: 0, right: 0, borderTop: `1px solid ${C.border}`, pointerEvents: "none" }} />)}
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", alignItems: "end", gap: 8, padding: "0 4px" }}>
              {days.map((day) => {
                const minutes = Math.round(day.seconds / 60);
                return <div key={day.key} style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", minWidth: 0 }}>
                  {minutes > 0 && <span style={{ position: "absolute", bottom: `calc(${Math.min(100, day.seconds / (scaleMinutes * 60) * 100)}% + 7px)`, color: C.text, fontWeight: 700, whiteSpace: "nowrap" }}>{minutes}m</span>}
                  <div style={{ width: "min(42px, 85%)", height: `${Math.min(100, day.seconds / (scaleMinutes * 60) * 100)}%`, minHeight: day.seconds > 0 ? 3 : 0, background: C.accent, borderRadius: "7px 7px 0 0" }} />
                </div>;
              })}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, padding: "9px 4px 0", textAlign: "center", color: C.textSecondary }}>
            {days.map((day) => <span key={day.key}>{day.label}<br />{day.date}</span>)}
          </div>
        </div>
      </div>
      {highestMinutes === 0 && <p style={{ margin: "16px 0 0", color: C.textSecondary }}>Watch a lesson to start your activity chart.</p>}
    </div>
  </Panel>;
}

function AnnouncementList({ items, onRead }) {
  return items.length ? <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
    {items.map((item, index) => <li key={item.id} onClick={() => onRead?.(item.id)} style={{ display: "flex", gap: 12, padding: "15px 18px", borderBottom: index === items.length - 1 ? 0 : `1px solid ${C.border}`, cursor: "pointer" }}>
      <span style={{ width: 10, height: 10, marginTop: 6, borderRadius: "50%", flexShrink: 0, background: item.read ? C.border : "#e2734a" }} />
      <span style={{ minWidth: 0 }}><span style={{ display: "block", lineHeight: 1.45 }}>{item.message}</span><span style={{ display: "block", marginTop: 5, color: C.textMuted }}>{formatNotificationTime(item.createdAt)}</span></span>
    </li>)}
  </ul> : <div style={{ padding: 20, color: C.textSecondary }}>No notices supplied.</div>;
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ============================================================
   MAIN APP
   ============================================================ */
export default function StudentDashboard({ user, onLogout, onProfileUpdated, courses = [], notifications = [], enrollmentRequests = [], onRefreshNotifications, onReadNotification, onReadAllNotifications, uploadStudentResource, saveLessonProgress, loadCourse, onLoadCourseCatalog, onRequestCourseEnrollment }) {
  const recentCourseStorageKey = `crmst-recent-course-${user?.id || user?._id || "student"}`;
  const [activeNav, setActiveNav] = useState("dashboard");
  const [assignmentsReturnNav, setAssignmentsReturnNav] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [query, setQuery] = useState("");
  const [openCourse, setOpenCourse] = useState(null);
  const [playerCourseId, setPlayerCourseId] = useState(null);
  const [playerLessonUID, setPlayerLessonUID] = useState(null);
  const [playerTab, setPlayerTab] = useState("about");
  const [playerReturnNav, setPlayerReturnNav] = useState("my-courses");
  const [recentCourseId, setRecentCourseId] = useState(() => {
    try { return window.localStorage.getItem(recentCourseStorageKey) || ""; } catch { return ""; }
  });
  const [openResource, setOpenResource] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profilePopupRef = useRef(null);
  const profileButtonRef = useRef(null);
  useEffect(() => {
    if (!profileOpen) return;
    const dismissOutside = (event) => {
      if (!profilePopupRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const dismissEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissEscape);
    };
  }, [profileOpen]);
  const notifs = notifications;
  const [toast, setToast] = useState(null);
  const [lessonProgress, setLessonProgress] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(`crmst-progress-${user?.id || user?._id}`) || "{}"); } catch { return {}; }
  });
  const [uploadedResources, setUploadedResources] = useState({});
  const [courseDetails, setCourseDetails] = useState({});
  const [loadingCourseId, setLoadingCourseId] = useState(null);
  const [catalogRows, setCatalogRows] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentLoadError, setAssignmentLoadError] = useState(false);
  const [assignmentLoadAttempt, setAssignmentLoadAttempt] = useState(0);
  const courseDetailRequests = useRef(new Map());
  const catalogLoadStarted = useRef(false);
  const [selectedCertificateId, setSelectedCertificateId] = useState("");

  const studentName = user?.name || "Student";
  const studentInitials = initials(studentName);
  const studentEmail = user?.email || "";
  const studentId = String(user?.id || user?._id || "");
  const studyStorageKey = `crmst-study-seconds-${studentId}`;
  const [studySecondsByDay, setStudySecondsByDay] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(studyStorageKey) || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    try { setStudySecondsByDay(JSON.parse(window.localStorage.getItem(studyStorageKey) || "{}")); } catch { setStudySecondsByDay({}); }
  }, [studyStorageKey]);
  const recordStudySeconds = (seconds) => {
    const amount = Math.max(0, Math.floor(Number(seconds) || 0));
    if (!amount) return;
    const day = studyDateKey(new Date());
    setStudySecondsByDay((current) => {
      const next = { ...current, [day]: (Number(current[day]) || 0) + amount };
      try { window.localStorage.setItem(studyStorageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const requestStatusMap = useMemo(() => {
    const next = new Map();
    (Array.isArray(enrollmentRequests) ? enrollmentRequests : []).forEach((request) => {
      const courseId = String(request.courseId || "").trim().toLowerCase();
      const courseName = String(request.courseName || "").trim().toLowerCase();
      if (courseId) next.set(`id:${courseId}`, request);
      if (courseName) next.set(`name:${courseName}`, request);
    });
    return next;
  }, [enrollmentRequests]);

  const courseRowsForView = useMemo(() => {
    if (catalogRows === null) return courses;
    const enrolledById = new Map(courses.map((course) => [String(course.id || course._id), course]));
    const merged = catalogRows.map((course) => {
      const enrolled = enrolledById.get(String(course.id || course._id));
      return enrolled ? { ...course, ...enrolled, enrolled: true } : course;
    });
    const catalogIds = new Set(merged.map((course) => String(course.id || course._id)));
    return [...merged, ...courses.filter((course) => !catalogIds.has(String(course.id || course._id)))];
  }, [catalogRows, courses]);
  const catalogCourses = useMemo(() => courseRowsForView.map((sourceCourse) => {
    const course = courseDetails[sourceCourse.id || sourceCourse._id] || sourceCourse;
    const { fees, fee, price, courseFee, courseFees, ...studentCourse } = course;
    const studentIds = Array.isArray(course.studentIds) ? course.studentIds.map(String) : [];
    const lessons = Array.isArray(course.lessons) ? course.lessons : [];
    const courseId = String(course.id || course._id || "");
    const progress = lessons.length ? Math.round((lessons.reduce((total, lesson) => (
      total + getLessonProgressRatio(lesson, {
        ...(lesson.studentProgress || {}),
        ...(lessonProgress[getLessonProgressKey(courseId, lesson)] || {}),
      })
    ), 0) / lessons.length) * 100) : Number(course.progress || 0);
    return {
      ...studentCourse,
      id: courseId,
      title: course.title || course.name || course.courseTitle || "Untitled course",
      desc: course.syllabus || `${course.mode || "Online"} course covering ${course.tools || "practical skills"}.`,
      duration: course.duration || "-",
      lessons: course.totalLessons || lessons.length,
      lessonsData: lessons,
      enrolled: typeof course.enrolled === "boolean" ? course.enrolled : Boolean(studentId && studentIds.includes(studentId)),
      requestStatus: requestStatusMap.get(`id:${courseId.trim().toLowerCase()}`)
        || requestStatusMap.get(`name:${String(course.title || course.name || "").trim().toLowerCase()}`)
        || null,
      requestPending: (requestStatusMap.get(`id:${courseId.trim().toLowerCase()}`)?.status || requestStatusMap.get(`name:${String(course.title || course.name || "").trim().toLowerCase()}`)?.status) === "pending",
      progress,
      completed: course.completed === true || progress >= 100,
    };
  }), [courseRowsForView, courseDetails, studentId, lessonProgress, requestStatusMap]);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2600);
  };

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogCourses;
    return catalogCourses.filter(c => c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  }, [catalogCourses, query]);

  const enrolledCourses = useMemo(() => catalogCourses.filter((course) => course.enrolled), [catalogCourses]);
  const completedCourses = useMemo(() => enrolledCourses.filter((course) => course.completed || course.progress >= 100), [enrolledCourses]);
  const selectedCertificate = completedCourses.find((course) => String(course.id) === String(selectedCertificateId)) || completedCourses[0] || null;
  const averageProgress = enrolledCourses.length
    ? Math.round(enrolledCourses.reduce((total, course) => total + Number(course.progress || 0), 0) / enrolledCourses.length)
    : 0;
  const batchYear = user?.batchNo || user?.batch || user?.batchYear || null;
  const [certificateBusy, setCertificateBusy] = useState(false);
  const [certificateLink, setCertificateLink] = useState("");
  const sharingRef = useRef(false);
  const [certificateDate] = useState(() => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  const certificateArt = useMemo(() => activeNav === "certificates" && selectedCertificate ? certificateImage({
    name: studentName, studentId: user?.studentId || user?.registrationId || studentId,
    batch: batchYear, title: selectedCertificate.title,
    id: selectedCertificate.certificateId || selectedCertificate.id, date: certificateDate,
  }) : "", [activeNav, selectedCertificate, studentName, studentId, user?.studentId, user?.registrationId, batchYear, certificateDate]);
  const downloadCertificate = async (course) => {
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [210, 170] });
      pdf.addImage(certificateArt, "PNG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      pdf.save(`${String(course.title || "course").replace(/[^a-z0-9]+/gi, "-")}-certificate.pdf`);
    } catch { showToast("Could not create the PDF. Please try again."); }
  };
  const printCertificate = () => {
    const printWindow = window.open("", "_blank", "width=800,height=800");
    if (!printWindow) { showToast("Allow pop-ups to print the certificate."); return; }
    printWindow.document.write(`<!doctype html><html><head><title>Certificate</title><style>
      @page { size: 210mm 170mm; margin: 0; }
      html, body { margin: 0; padding: 0; width: 210mm; height: 170mm; overflow: hidden; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      img { display: block; width: 210mm; height: 170mm; margin: 0; padding: 0; object-fit: fill; break-inside: avoid; page-break-inside: avoid; }
      @media print { img { position: absolute; left: 0; top: 0; } }
    </style></head><body></body></html>`);
    printWindow.document.close();
    const artwork = printWindow.document.createElement("img");
    artwork.alt = "Certificate of Completion";
    artwork.onload = async () => {
      await artwork.decode().catch(() => {});
      printWindow.requestAnimationFrame(() => {
        printWindow.focus();
        printWindow.print();
      });
    };
    artwork.src = certificateArt;
    printWindow.document.body.appendChild(artwork);
  };
  const shareCertificate = async (course) => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setCertificateBusy(true);
    try {
      const result = await shareCourseCertificate(course.id, certificateArt);
      setCertificateLink(result.certificateUrl);
    } catch (err) { showToast(err.message || "Could not share the certificate."); }
    finally { sharingRef.current = false; setCertificateBusy(false); }
  };
  const recentCourse = enrolledCourses.find((course) => String(course.id) === String(recentCourseId)) || enrolledCourses[0] || null;
  const enrolledLessons = enrolledCourses.flatMap((course) => course.lessonsData.map((lesson) => {
    const progress = { ...(lesson.studentProgress || {}), ...(lessonProgress[getLessonProgressKey(course.id, lesson)] || {}) };
    const videoCompleted = Boolean(progress.videoCompleted);
    const assignmentCompleted = Boolean(progress.taskCompleted);
    const notesCompleted = Boolean(progress.notesCompleted);
    const completed = Boolean(progress.completed || (videoCompleted && notesCompleted && assignmentCompleted));
    return { ...lesson, courseTitle: course.title, courseId: course.id, completed, locked: false, videoCompleted, notesCompleted, assignmentCompleted, studentProgress: progress };
  }));
  const assignments = dedupeStudentAssignments(enrolledLessons.flatMap((lesson) => (lesson.tasks || []).map((task, index) => {
    const taskId = String(task.id || `task-${index + 1}`);
    const submission = lesson.studentProgress?.taskSubmissions?.[taskId] || {};
    const submitted = Boolean(submission.submitted || submission.taskStudentPdfUpload);
    const graded = submission.grade !== undefined && submission.grade !== null && submission.grade !== "";
    return {
      ...task,
      id: taskId,
      taskId,
      lesson,
      lessonUID: getLessonUID(lesson),
      lessonTitle: lesson.title,
      courseTitle: lesson.courseTitle,
      courseId: lesson.courseId,
      lessonId: lesson.id,
      section: lesson.section,
      videoCompleted: lesson.videoCompleted,
      taskCompleted: lesson.assignmentCompleted,
      completed: lesson.completed,
      submitted,
      status: graded ? "Graded" : submitted ? "Submitted" : lesson.videoCompleted ? "Pending" : "Locked",
      submission,
      dueValue: task.dueDate || task.dueAt || task.deadline || task.due || "",
    };
  })));

  useEffect(() => {
    if (activeNav !== "all-courses" || catalogRows !== null || catalogLoadStarted.current) return;
    if (!onLoadCourseCatalog) {
      setCatalogRows(courses);
      return;
    }
    catalogLoadStarted.current = true;
    setCatalogLoading(true);
    Promise.resolve(onLoadCourseCatalog())
      .then((rows) => setCatalogRows(Array.isArray(rows) ? rows : []))
      .catch(() => setCatalogRows(courses))
      .finally(() => setCatalogLoading(false));
  }, [activeNav, catalogRows]);

  const assignmentCourseKey = enrolledCourses.map((course) => course.id).join("|");
  const fetchCourseDetail = (courseId) => {
    const id = String(courseId);
    if (courseDetailRequests.current.has(id)) return courseDetailRequests.current.get(id);
    const request = Promise.resolve().then(() => loadCourse?.(id))
      .finally(() => courseDetailRequests.current.delete(id));
    courseDetailRequests.current.set(id, request);
    return request;
  };
  useEffect(() => {
    if (activeNav !== "dashboard" && activeNav !== "assignments") return undefined;
    const missing = enrolledCourses.filter((course) => (
      !Object.prototype.hasOwnProperty.call(courseDetails, course.id)
      && Number(course.lessons || 0) > 0
      && !course.lessonsData.length
    ));
    if (!missing.length || !loadCourse) {
      setAssignmentsLoading(false);
      return undefined;
    }
    let active = true;
    const loadMissing = () => {
      setAssignmentsLoading(true);
      setAssignmentLoadError(false);
      Promise.allSettled(missing.map((course) => fetchCourseDetail(course.id)))
        .then((results) => {
          if (!active) return;
          const loaded = Object.fromEntries(results.flatMap((result, index) => result.status === "fulfilled" && result.value ? [[missing[index].id, result.value]] : []));
          if (Object.keys(loaded).length) setCourseDetails((current) => ({ ...current, ...loaded }));
          if (results.some((result) => result.status !== "fulfilled" || !result.value)) setAssignmentLoadError(true);
        })
        .finally(() => { if (active) setAssignmentsLoading(false); });
    };
    const timer = activeNav === "dashboard" ? window.setTimeout(loadMissing, 300) : null;
    if (timer === null) loadMissing();
    return () => { active = false; if (timer !== null) window.clearTimeout(timer); };
  }, [activeNav, assignmentCourseKey, assignmentLoadAttempt]);

  const assignmentDetailsReady = enrolledCourses.every((course) => (
    Object.prototype.hasOwnProperty.call(courseDetails, course.id)
    || course.lessonsData.length > 0
    || Number(course.lessons || 0) === 0
  ));
  const hasPendingSummaryCounts = enrolledCourses.every((course) => course.pendingAssignments != null && Number.isFinite(Number(course.pendingAssignments)));
  const pendingAssignmentCount = assignmentDetailsReady
    ? assignments.filter((assignment) => !assignment.submitted).length
    : hasPendingSummaryCounts
      ? enrolledCourses.reduce((total, course) => total + course.pendingAssignments, 0)
      : assignmentsLoading ? "…" : "—";
  const sortedAnnouncements = [...notifs].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingDeadlines = assignments
    .map((assignment) => ({ ...assignment, dueDate: parseStudentDate(assignment.dueValue) }))
    .filter((assignment) => !assignment.submitted && (!assignment.dueDate || assignment.dueDate >= today))
    .sort((left, right) => (left.dueDate?.getTime() ?? Infinity) - (right.dueDate?.getTime() ?? Infinity))
    .slice(0, 3);
  const overdueAssignments = assignments.filter((assignment) => {
    const dueDate = parseStudentDate(assignment.dueValue);
    return dueDate && dueDate < today && !assignment.submitted;
  });
  const actionRequiredAnnouncements = sortedAnnouncements.filter(isActionRequiredAnnouncement);
  const markLessonProgress = (lesson, patch) => {
    const key = getLessonProgressKey(lesson.courseId, lesson);
    Promise.resolve(saveLessonProgress?.(lesson.courseId, lesson.id, patch, studentId, lesson.section))
      .then((savedProgress) => {
        if (!savedProgress) return;
        setLessonProgress((current) => ({
          ...current,
          [key]: { ...(current[key] || {}), ...savedProgress },
        }));
      })
      .catch(() => {});
    setLessonProgress((current) => {
      const next = { ...current, [key]: { ...(current[key] || {}), ...patch } };
      window.localStorage.setItem(`crmst-progress-${studentId}`, JSON.stringify(next));
      return next;
    });
    if (patch.videoCompleted) showToast("Video watched. Notes and task unlocked.");
  };

  const pickDefaultLessonUID = (course) => {
    const groups = getCourseSectionGroups(course, lessonProgress);
    const flat = groups.flatMap((g) => g.lessons);
    const next = flat.find((l) => !l.completed);
    return getLessonUID(next || flat[0] || {});
  };

  const openCoursePlayer = async (course, lessonUID, returnNav = activeNav) => {
    if (!course) return;
    setOpenCourse(null);
    let playableCourse = course;
    const cachedDetail = courseDetails[course.id];
    if (course.enrolled && !cachedDetail) {
      setLoadingCourseId(course.id);
      try {
        playableCourse = await fetchCourseDetail(course.id);
        if (!playableCourse) { showToast("Could not load this course. Please try again."); return; }
        if (playableCourse !== course) setCourseDetails((current) => ({ ...current, [course.id]: playableCourse }));
      } catch {
        showToast("Could not load this course. Please try again.");
        return;
      } finally {
        setLoadingCourseId(null);
      }
    } else if (cachedDetail) {
      playableCourse = cachedDetail;
    }
    setRecentCourseId(course.id);
    try { window.localStorage.setItem(recentCourseStorageKey, String(course.id)); } catch {}
    setPlayerCourseId(course.id);
    setPlayerLessonUID(lessonUID || pickDefaultLessonUID(playableCourse));
    setPlayerTab("about");
    setPlayerReturnNav(returnNav === "course-player" ? "my-courses" : returnNav);
    setActiveNav("course-player");
    setMobileOpen(false);
  };
  const openAssignment = (assignment) => {
    if (assignment.status === "Locked") {
      openCoursePlayer(enrolledCourses.find((course) => course.id === assignment.courseId), assignment.lessonUID, "assignments");
      return;
    }
    setOpenResource({
      title: assignment.title || assignment.lessonTitle || "Assignment",
      courseTitle: assignment.courseTitle,
      adminUrl: assignment.pdfUrl || "",
      fileName: assignment.fileName || "",
      studentUrl: assignment.submission?.taskStudentPdfUpload || "",
      kind: "assignment",
      progressKey: getLessonProgressKey(assignment.courseId, assignment.lesson),
      courseId: assignment.courseId,
      lessonId: assignment.lessonId,
      taskId: assignment.taskId,
      section: assignment.section,
    });
  };
  const playerCourse = catalogCourses.find((c) => c.id === playerCourseId) || null;
  const activePlayerLesson = useMemo(() => {
    if (!playerCourse || !playerLessonUID) return null;
    return getCourseSectionGroups(playerCourse, lessonProgress)
      .flatMap((section) => section.lessons)
      .find((lesson) => getLessonUID(lesson) === playerLessonUID) || null;
  }, [playerCourse, playerLessonUID, lessonProgress]);
  const selectPlayerLesson = (uid) => {
    setPlayerLessonUID(uid);
    setPlayerTab("about");
    if (playerCourseId) {
      setRecentCourseId(playerCourseId);
      try { window.localStorage.setItem(recentCourseStorageKey, String(playerCourseId)); } catch {}
    }
  };
  const unreadCount = notifs.filter(n => !n.read).length;
  useEffect(() => {
    if (!onRefreshNotifications) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") onRefreshNotifications();
    };
    const interval = window.setInterval(refreshWhenVisible, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [onRefreshNotifications]);

  const markAllRead = () => onReadAllNotifications?.();

  const meta = PAGE_META[activeNav] || PAGE_META.dashboard;

  const handleNav = (id) => {
    if (id === "logout") {
      setMobileOpen(false);
      if (onLogout) {
        onLogout();
      } else {
        showToast("Logged out (demo only — this is a prototype).");
      }
      return;
    }
    if (id === "assignments" && activeNav !== "assignments" && activeNav !== "course-player") {
      setAssignmentsReturnNav(activeNav);
    }
    setActiveNav(id);
    setMobileOpen(false);
  };

  return (
    <div className="sd-student-root" style={{ fontFamily: "Manrope, sans-serif", background: C.bg, color: C.text, minHeight: "100vh", fontSize: 16, position: "relative" }}>
      {loadingCourseId || certificateBusy ? (
        <div role="status" aria-live="polite" style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(20,18,17,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 16, padding: "24px 30px", minWidth: 220, textAlign: "center", boxShadow: "0 18px 50px rgba(0,0,0,0.24)" }}>
            <div style={{ width: 34, height: 34, margin: "0 auto 12px", border: `3px solid ${C.pillBorder}`, borderTopColor: C.accent, borderRadius: "50%", animation: "course-load-spin 0.8s linear infinite" }} />
            <div style={{ fontWeight: 700, color: C.text }}>{certificateBusy ? "Creating certificate link" : "Loading course"}</div>
            <div style={{ marginTop: 5, fontSize: 16, color: C.textSecondary }}>{certificateBusy ? "Uploading your certificate and saving its URL..." : "Loading your progress and tasks..."}</div>
          </div>
        </div>
      ) : null}
      <style>{`
        .sd-student-root, .sd-student-root * { box-sizing: border-box; }
        .sd-student-root button, .sd-student-root input, .sd-student-root select, .sd-student-root textarea { font-family: inherit; font-size: 16px; }
        .student-assignment-open { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 12px; min-height: 36px; border: 1px solid #8d5e38; border-radius: 9px; background: #8d5e38; color: #fff; font-weight: 700; cursor: pointer; transition: background .15s ease, box-shadow .15s ease; }
        .student-assignment-open:hover { background: #643e23; box-shadow: 0 3px 9px rgba(100, 62, 35, .2); }
        .student-assignment-open:focus-visible { outline: 3px solid #e7b586; outline-offset: 2px; }
        .student-assignment-serial { display: inline; min-width: 0; min-height: 0; padding: 0; border-radius: 0; background: transparent; color: #1f1a17; font-weight: 400; }
        @keyframes course-load-spin { to { transform: rotate(360deg); } }
        @media (max-width: 1320px) {
          .courses-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 980px) {
          .summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .two-col { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          .courses-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .progress-detail-grid { grid-template-columns: minmax(0, 1fr) !important; }
        }
        @media (max-width: 860px) {
          .sd-sidebar { position: fixed !important; top: 12px !important; bottom: 12px !important; left: 12px !important; width: min(320px, calc(100vw - 24px)) !important; min-height: 0 !important; transform: translateX(-110%); }
          .sd-sidebar.open { transform: translateX(0); }
          .sd-shell { grid-template-columns: 1fr !important; padding: 12px !important; }
          .sd-main { margin-left: 0 !important; }
          .sd-menu-toggle { display: flex !important; }
          .sd-overlay.show { display: block !important; }
        }
        @media (max-width: 600px) {
          .summary-grid { grid-template-columns: 1fr 1fr !important; }
          .courses-grid { grid-template-columns: 1fr !important; }
          .student-profile-grid { grid-template-columns: 1fr !important; }
        }
        .sd-shell {
          height: 100vh;
          min-height: 0;
          display: grid !important;
          grid-template-columns: 300px minmax(0, 1fr);
          padding: 10px;
          gap: 12px;
          overflow: hidden;
        }
        .sd-sidebar {
          position: static !important;
          width: auto !important;
          height: calc(100vh - 32px);
          min-height: 0;
          border-radius: 24px !important;
          padding: 12px 10px 10px !important;
          box-shadow: 0 24px 50px rgba(8, 9, 10, 0.22) !important;
          overflow: hidden;
          scrollbar-width: none;
        }
        .sd-sidebar::-webkit-scrollbar,
        .sd-content::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .sd-sidebar-nav { scrollbar-width: thin; scrollbar-color: #666 #171719; }
        .sd-sidebar-nav::-webkit-scrollbar { width: 6px; }
        .sd-sidebar-nav::-webkit-scrollbar-thumb { background: #666; border-radius: 999px; }
        .sd-sidebar-brand { display: flex; align-items: center; gap: 8px; padding: 2px 5px 12px; border-bottom: 1px solid rgba(178,147,118,.12); }
        .sd-sidebar-brand-name { color: #fff; font-size: 16px; font-weight: 700; white-space: nowrap; }
        .sd-sidebar-brand-subtitle { margin-top: 1px; color: rgba(255,255,255,.66); font-size: 16px; }
        .sd-sidebar-profile { display: flex; flex-direction: column; align-items: center; gap: 12px; width: calc(100% - 24px); max-width: 288px; margin: 14px auto 0; padding: 16px 12px 18px; color: #fff; text-align: center; }
        .sd-sidebar-avatar { display: grid; place-items: center; flex: 0 0 150px; width: 150px; height: 150px; overflow: hidden; border: 3px solid rgba(255,255,255,.8); border-radius: 8px; background: linear-gradient(135deg,#df684b,#ad3e2d); color: #fff; font-size: 3.5rem; font-weight: 800; }
        .sd-sidebar-avatar img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .sd-sidebar-profile-name { color: #fff; font-size: 16px; font-weight: 700; overflow-wrap: anywhere; }
        .sd-sidebar-profile-role { color: rgba(255,255,255,.6); font-size: 16px; }
        .sd-sidebar-search { display: flex; align-items: center; gap: 7px; height: 34px; margin: 10px 3px 6px; padding: 0 10px; border: 1px solid rgba(225,86,54,.4); border-radius: 10px; background: rgba(255,255,255,.04); color: rgba(255,255,255,.62); }
        .sd-sidebar-search svg { flex: 0 0 16px; width: 16px; height: 16px; }
        .sd-sidebar-search input { width: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: #fff; }
        .sd-sidebar-search input::placeholder { color: rgba(255,255,255,.5); }
        .sd-sidebar-nav { flex: 1; min-height: 0; overflow-y: auto; padding: 2px 3px; }
        .sd-sidebar-section { margin-bottom: 8px; }
        .sd-sidebar-section + .sd-sidebar-section { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.12); }
        .sd-sidebar-section-label { margin: 8px 8px 4px; color: rgba(255,255,255,.52); font-size: 16px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        .sd-sidebar-link { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 8px 9px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: rgba(255,255,255,.88); text-align: left; font-size: 16px; font-weight: 700; letter-spacing: .01em; cursor: pointer; }
        .sd-sidebar-link:hover:not(.active) { background: rgba(255,255,255,.055); color: #fff; border-color: rgba(255,255,255,.12); }
        .sd-sidebar-link.active { background: linear-gradient(135deg,rgba(41,41,44,.92),rgba(28,28,31,.95)); color: #fff; border-color: rgba(215,86,56,.78); box-shadow: inset 3px 0 0 #f06a4a,0 5px 14px rgba(0,0,0,.2); }
        .sd-sidebar-link svg { flex: 0 0 18px; width: 18px; height: 18px; }
        .sd-sidebar-link-label { min-width: 0; }
        .sd-sidebar-link .sd-sidebar-chevron { flex: 0 0 13px; width: 13px; height: 13px; margin-left: auto; opacity: .45; }
        .sd-sidebar-badge { display: grid; place-items: center; min-width: 26px; height: 26px; margin-left: auto; padding: 0 6px; border-radius: 999px; background: linear-gradient(135deg,#d26147,#9a3828); color: #fff; font-size: 16px; font-weight: 800; box-shadow: 0 8px 18px rgba(173,63,42,.3); }
        .sd-sidebar-footer { padding: 12px 8px 2px; border-top: 1px solid rgba(216,82,53,.28); }
        .sd-sidebar-logout { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 8px 9px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: #fff; text-align: left; font-size: 16px; font-weight: 700; cursor: pointer; }
        .sd-sidebar-logout:hover { background: rgba(255,255,255,.055); }
        .sd-sidebar-logout svg { flex: 0 0 18px; width: 18px; height: 18px; }
        .sd-main {
          margin-left: 0 !important;
          min-width: 0;
          min-height: 0;
          height: calc(100vh - 32px);
          background: rgba(255, 255, 255, 0.58);
          border: 1px solid rgba(255, 255, 255, 0.72);
          border-radius: 32px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .sd-main.dashboard-view { background: #f8f6f2; border-color: #f1ebe3; color: #1f1a17; }
        .sd-main.dashboard-view .sd-topbar { background: #fff !important; border-color: #eee8dc !important; color: #1f1a17; }
        .sd-main.dashboard-view .sd-content { background: #f8f6f2; }
        .dashboard-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
        .dashboard-stat-card, .dashboard-panel { background: #fff; border: 1px solid #ece3d8; border-radius: 16px; box-shadow: 0 3px 12px rgba(76, 52, 31, .045); }
        .dashboard-stat-card { min-height: 112px; padding: 20px; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
        .dashboard-stat-card svg { color: #8d5e38 !important; background: #f8ebda; box-sizing: content-box; padding: 10px; border-radius: 11px; }
        .dashboard-stat-value { font-size: 25px; line-height: 1; font-weight: 800; color: #1f1a17; }
        .dashboard-stat-label { color: #675d55; margin-top: 15px; }
        .dashboard-panel { padding: 19px 22px; }
        .dashboard-panel h2 { margin: 0 0 16px; font-size: 18px; font-weight: 750; color: #1f1a17; }
        .dashboard-continue { margin-bottom: 18px; }
        .dashboard-resume { width: 100%; display: flex; align-items: center; gap: 16px; padding: 0 4px; background: transparent; border: 0; color: #1f1a17; text-align: left; cursor: pointer; }
        .dashboard-resume-body { flex: 1; min-width: 0; display: grid; gap: 7px; color: #675d55; }
        .dashboard-resume-body strong { color: #1f1a17; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dashboard-play { width: 38px; height: 38px; display: grid; place-items: center; flex-shrink: 0; border: 0; border-radius: 11px; background: #f5dfbf; color: #7a4a1e; }
        .dashboard-progress-track { height: 7px; border-radius: 99px; background: #eee8df; overflow: hidden; }
        .dashboard-progress-track > span { display: block; height: 100%; border-radius: inherit; background: #8d5e38; }
        .dashboard-progress-value { align-self: end; color: #8d5e38; font-weight: 700; }
        .dashboard-feeds { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        .dashboard-feed-list { display: grid; gap: 0; }
        .dashboard-feed-item { display: flex; justify-content: space-between; gap: 12px; width: 100%; padding: 12px 0; border: 0; border-top: 1px solid #eee8dc; background: none; color: #1f1a17; text-align: left; cursor: pointer; }
        .dashboard-feed-item span:last-child { color: #86766a; white-space: nowrap; }
        .dashboard-empty { padding-top: 12px; border-top: 1px solid #eee8dc; color: #675d55; }
        .dashboard-attention { margin-top: 18px; border-color: #efcba5; background: #fff8ef; }
        .dashboard-attention p { margin: 0; color: #675d55; }
        @media (max-width: 980px) { .dashboard-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 700px) { .dashboard-feeds { grid-template-columns: 1fr; } }
        @media (max-width: 480px) { .dashboard-summary-grid { grid-template-columns: 1fr; } }
        .sd-topbar {
          padding: 24px 26px !important;
          min-height: 88px;
          border-bottom: 1px solid rgba(178, 147, 118, 0.14) !important;
          background: rgba(255, 255, 255, 0.94) !important;
        }
        .sd-content {
          min-height: 0;
          flex: 1;
          padding: 24px !important;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
        }
        .student-assignment-table-wrap {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
        }
        .student-assignment-table {
          display: table;
          width: 100%;
          min-width: 840px;
          table-layout: auto;
        }
        .sd-logo-badge {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #050607;
          color: #fff;
          display: grid;
          place-items: center;
          position: relative;
          flex-shrink: 0;
          overflow: hidden;
          box-shadow: 0 12px 24px rgba(0,0,0,0.22);
        }
        .sd-logo-badge span {
          position: absolute;
          font-weight: 800;
          font-size: 1.25rem;
          line-height: 1;
        }
        .sd-logo-badge span:first-child { left: 6px; top: 6px; }
        .sd-logo-badge span:last-child { right: 7px; bottom: 5px; }
        .sd-logo-badge i {
          position: absolute;
          width: 7px;
          height: 120%;
          background: #fff;
          transform: rotate(24deg);
          border-radius: 999px;
        }
        @media (max-width: 860px) {
          .sd-sidebar {
            position: fixed !important;
            top: 12px !important;
            bottom: 12px !important;
            left: 12px !important;
            width: min(300px, calc(100vw - 24px)) !important;
            height: auto !important;
            transform: translateX(-110%);
          }
          .sd-sidebar.open { transform: translateX(0); }
          .sd-shell {
            width: 100%;
            height: auto !important;
            min-height: 100vh !important;
            overflow: visible !important;
          }
          .sd-main {
            width: 100%;
            max-width: 100%;
            height: auto !important;
            min-height: calc(100vh - 24px) !important;
          }
          .sd-content { padding: 16px !important; }
        }
        /* Match the browser's 80% desktop zoom without shrinking dialogs or overlays. */
        @media (min-width: 981px) {
          .sd-shell { zoom: .8; width: 100%; height: 125vh; }
          .sd-sidebar, .sd-main { height: calc(125vh - 32px); }
          .sd-student-root .cp-wrap { height: calc(125vh - 88px) !important; }
        }
      `}</style>

      {mobileOpen && (
        <div className="sd-overlay show" onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,17,28,0.5)", zIndex: 90 }} />
      )}

      <div className="sd-shell" style={{ display: "flex", padding: 16, gap: 16 }}>
        {/* SIDEBAR */}
        <aside className={`sd-sidebar${mobileOpen ? " open" : ""}`} style={{
          width: 302, background: `linear-gradient(180deg, ${C.sidebarBg}, #0c0c0e)`, border: "1px solid rgba(208,72,50,0.42)", borderRadius: 30, position: "fixed", top: 16, left: 16, bottom: 16,
          display: "flex", flexDirection: "column", zIndex: 100, transition: "transform .2s ease",
          boxShadow: "0 24px 50px rgba(8,9,10,0.22)",
        }}>
          <div className="sd-sidebar-brand">
            <div className="sd-logo-badge"><span>S</span><i /><span>T</span></div>
            <div>
              <div className="sd-sidebar-brand-name">SYSTEM TECHNOLOGIES</div>
              <div className="sd-sidebar-brand-subtitle">Ajmer Student Portal</div>
            </div>
          </div>

          <div className="sd-sidebar-profile">
            <span className="sd-sidebar-avatar">
              {user?.imageUrl ? <img src={user.imageUrl} alt="" /> : studentName.trim().charAt(0).toUpperCase() || "S"}
            </span>
            <strong className="sd-sidebar-profile-name">{studentName}</strong>
            <span className="sd-sidebar-profile-role">Student</span>
          </div>

          <div className="sd-sidebar-search">
            <Icon.search aria-hidden="true" />
            <input aria-label="Search menu" placeholder="Search menu" value={navSearch} onChange={(event) => setNavSearch(event.target.value)} />
          </div>

          <nav className="sd-sidebar-nav">
            {NAV_SECTIONS.map(section => ({ ...section, items: section.items.filter(item => item.label.toLowerCase().includes(navSearch.trim().toLowerCase())) })).filter(section => section.items.length > 0).map(section => (
              <div className="sd-sidebar-section" key={section.label}>
                <div className="sd-sidebar-section-label">{section.label}</div>
                {section.items.map(item => {
                  const active = activeNav === item.id;
                  return (
                    <button type="button"
                      key={item.id}
                      className={`sd-sidebar-link${active ? " active" : ""}`}
                      aria-current={active ? "page" : undefined}
                      onClick={() => handleNav(item.id)}
                    >
                      <item.icon aria-hidden="true" />
                      <span className="sd-sidebar-link-label">{item.label}</span>
                      {item.id === "announcements" && unreadCount > 0 && (
                        <span className="sd-sidebar-badge">{unreadCount}</span>
                      )}
                      {["all-courses", "my-courses"].includes(item.id) && !(item.id === "announcements" && unreadCount > 0) && (
                        <Icon.chevronRight className="sd-sidebar-chevron" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sd-sidebar-footer">
            <button className="sd-sidebar-logout" type="button" onClick={() => handleNav("logout")}><Icon.logout aria-hidden="true" />Logout</button>
          </div>
        </aside>

        {/* MAIN */}
        <div className={`sd-main${activeNav === "dashboard" ? " dashboard-view" : ""}`} style={{ marginLeft: 318, flex: 1, minWidth: 0 }}>
          {/* TOPBAR */}
          <header className="sd-topbar" style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="sd-menu-toggle" onClick={() => setMobileOpen(true)} style={{ display: "none", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, alignItems: "center", justifyContent: "center", color: C.textSecondary, cursor: "pointer" }}>
                <Icon.menu style={{ width: 16, height: 16 }} />
              </button>
              {activeNav !== "course-player" && (
                <div>
                  <h1 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>{meta.title}</h1>
                  <p style={{ margin: "2px 0 0", fontSize: 16, color: C.textSecondary }}>{activeNav === "dashboard" ? `Welcome back, ${studentName}! Here's what needs your attention.` : meta.sub}</p>
                </div>
              )}
              {activeNav === "course-player" && (
                <button type="button" onClick={() => handleNav(playerReturnNav)} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "10px 15px", border: `1px solid ${C.accent}`, borderRadius: 11, background: C.accent, color: "#fff", fontWeight: 700, cursor: "pointer" }}><Icon.arrowLeft style={{ width: 18, height: 18, flexShrink: 0 }} /><span>Back to {PAGE_META[playerReturnNav]?.title || "My Courses"}</span></button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setNotifOpen(o => !o)}
                style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: C.textSecondary, cursor: "pointer" }}
              >
                <Icon.bell style={{ width: 16, height: 16 }} />
                {unreadCount > 0 && <span style={{ position: "absolute", top: 6, right: 7, width: 6, height: 6, background: "#e2734a", borderRadius: "50%", border: `1.5px solid ${C.card}` }} />}
              </button>

              {notifOpen && (
                <div style={{ position: "absolute", top: 44, right: 44, width: 300, background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 12px 30px rgba(33,28,46,0.15)", overflow: "hidden", zIndex: 60 }}>
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Notifications</span>
                    <button onClick={markAllRead} style={{ background: "none", border: "none", color: C.accent, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Mark all read</button>
                  </div>
                  <div style={{ maxHeight: 260, overflowY: "auto" }}>
                    {notifs.map(n => (
                       <div key={n.id} onClick={() => onReadNotification?.(n.id)} style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, cursor: "pointer" }}>
                        {!n.read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e2734a", marginTop: 5, flexShrink: 0 }} />}
                        <div>
                          <div style={{ fontSize: 16, color: C.text, lineHeight: 1.4 }}>{n.message}</div>
                          <div style={{ fontSize: 16, color: C.textMuted, marginTop: 2 }}>{formatNotificationTime(n.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div ref={profilePopupRef} style={{ position: "relative" }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false); }}>
              <button type="button" ref={profileButtonRef} aria-expanded={profileOpen} aria-controls="student-profile-popup" onClick={() => { setProfileOpen((open) => !open); setNotifOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px 4px 4px", border: `1px solid ${C.border}`, borderRadius: 24, cursor: "pointer", background: C.card, color: C.text, fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.badgeBg, color: C.badgeIcon, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontWeight: 700, fontSize: 16 }}>{user?.imageUrl ? <img src={user.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : studentInitials}</div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{studentName}</div>
                  <div style={{ fontSize: 16, color: C.textSecondary }}>Student</div>
                </div>
                <Icon.chevronDown style={{ width: 12, height: 12, color: C.textMuted, marginLeft: 2 }} />
              </button>
              {profileOpen && (
                <section id="student-profile-popup" aria-label="Student profile details" style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, width: "min(330px, calc(100vw - 48px))", padding: 20, background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 12px 36px rgba(40,30,20,.16)", zIndex: 70 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.badgeBg, color: C.badgeIcon, display: "grid", placeItems: "center", overflow: "hidden", fontWeight: 800, flexShrink: 0 }}>{user?.imageUrl ? <img src={user.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : studentInitials}</div>
                    <div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 16, overflowWrap: "anywhere" }}>{studentName}</div><div style={{ color: C.textSecondary, fontSize: 16, marginTop: 3 }}>Student</div></div>
                  </div>
                  <dl style={{ margin: "12px 0 18px" }}>
                    {[["Student ID", user?.studentId || user?.registrationId || studentId || "Not assigned"], ["Email", studentEmail || "Not provided"], ["Phone", user?.phone || "Not provided"], ...(batchYear ? [["Batch", batchYear]] : []), ["Enrolled courses", enrolledCourses.length]].map(([label, value]) => (
                      <div key={label} style={{ display: "grid", gridTemplateColumns: "100px minmax(0, 1fr)", gap: 10, padding: "7px 0", fontSize: 16 }}>
                        <dt style={{ color: C.textSecondary }}>{label}</dt><dd style={{ margin: 0, textAlign: "right", fontWeight: 600, overflowWrap: "anywhere" }}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Btn variant="primary" style={{ width: "100%" }} onClick={() => { setProfileOpen(false); handleNav("profile"); profileButtonRef.current?.focus(); }}>View full profile</Btn>
                </section>
              )}
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="sd-content" style={{ padding: "22px 28px 46px" }} onClick={() => notifOpen && setNotifOpen(false)}>

            {activeNav === "dashboard" && (
              <div className="dashboard-page">
                <SummaryCards courses={enrolledCourses} completedCourses={completedCourses.length} pendingAssignments={pendingAssignmentCount} unreadCount={unreadCount} />
                <ContinueLearning course={recentCourse} onOpen={(course) => openCoursePlayer(course)} />
                <div className="dashboard-feeds">
                  <section className="dashboard-panel">
                    <h2>Assignments to Work On</h2>
                    {upcomingDeadlines.length ? <div className="dashboard-feed-list">{upcomingDeadlines.map((assignment) => (
                      <button type="button" className="dashboard-feed-item" key={`${assignment.courseId}:${assignment.lessonUID}:${assignment.id}`} onClick={() => openCoursePlayer(enrolledCourses.find((course) => course.id === assignment.courseId), assignment.lessonUID)}>
                        <span>{assignment.title || "Assignment"}</span><span>{formatStudentDate(assignment.dueDate)}</span>
                      </button>
                    ))}</div> : <div className="dashboard-empty">{assignmentsLoading ? "Loading assignments..." : assignmentLoadError ? "Assignments could not load. Open Assignments to retry." : assignmentDetailsReady ? "No pending assignments." : "Checking your assignments..."}</div>}
                  </section>
                  <section className="dashboard-panel">
                    <h2>Latest Announcements</h2>
                    {sortedAnnouncements.length ? <div className="dashboard-feed-list">{sortedAnnouncements.slice(0, 3).map((notice) => (
                      <button type="button" className="dashboard-feed-item" key={notice.id} onClick={() => onReadNotification?.(notice.id)}>
                        <span>{notice.message}</span><span>{formatNotificationTime(notice.createdAt)}</span>
                      </button>
                    ))}</div> : <div className="dashboard-empty">No notices supplied.</div>}
                  </section>
                </div>
                {overdueAssignments.length || actionRequiredAnnouncements.length ? (
                  <section className="dashboard-panel dashboard-attention">
                    <h2>Attention Required</h2>
                    <p>{overdueAssignments.length ? `${overdueAssignments.length} overdue assignment${overdueAssignments.length === 1 ? "" : "s"}` : ""}{overdueAssignments.length && actionRequiredAnnouncements.length ? " and " : ""}{actionRequiredAnnouncements.length ? `${actionRequiredAnnouncements.length} urgent notice${actionRequiredAnnouncements.length === 1 ? "" : "s"}` : ""} need your attention.</p>
                  </section>
                ) : null}
              </div>
            )}

            {activeNav === "all-courses" && (
              <>
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <Icon.search style={{ width: 15, height: 15, position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search courses by name or topic..."
                    style={{
                      width: "100%", padding: "12px 16px 12px 40px", borderRadius: 12, border: `1px solid ${C.pillBorder}`,
                      background: C.pillBg, fontSize: 16, outline: "none", fontFamily: "inherit", color: C.text,
                    }}
                  />
                </div>
                {catalogLoading ? <div role="status" style={{ padding: 24, color: C.textSecondary }}>Loading course catalog...</div> : (
                  <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20 }}>
                    {filteredCourses.length ? filteredCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} onContinue={openCoursePlayer} onRequestEnrollment={(course) => onRequestCourseEnrollment?.(course)} />) : (
                      <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", color: C.textSecondary }}>{catalogCourses.length ? `No courses match "${query}".` : "No courses are available."}</div>
                    )}
                  </div>
                  )}
              </>
            )}

            {activeNav === "my-courses" && (
              <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20 }}>
                {enrolledCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} onContinue={openCoursePlayer} onRequestEnrollment={(course) => onRequestCourseEnrollment?.(course)} />)}
                {!enrolledCourses.length && <div style={{ gridColumn: "1 / -1", padding: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, color: C.textSecondary }}>You are not enrolled in any courses yet. Visit All Courses to explore the catalog.</div>}
              </div>
            )}

            {activeNav === "course-player" && (
              playerCourse ? (
                <CoursePlayer
                  course={playerCourse}
                  lessonProgress={lessonProgress}
                  activeLessonUID={playerLessonUID}
                  activeTab={playerTab}
                  onSelectLesson={selectPlayerLesson}
                  onSetTab={setPlayerTab}
                  onMarkWatched={(lesson) => markLessonProgress(lesson, { videoCompleted: true })}
                  onMarkProgress={markLessonProgress}
                  onStudySeconds={recordStudySeconds}
                  onOpenResource={setOpenResource}
                  onBack={() => handleNav(playerReturnNav)}
                  backLabel={PAGE_META[playerReturnNav]?.title || "My Courses"}
                />
              ) : (
                <div style={{ padding: 24, color: C.textSecondary }}>Select a course from My Courses to start learning.</div>
              )
            )}

            {activeNav === "assignments" && (
              <Panel title="Course Assignments" right={<Btn variant="outline" onClick={() => handleNav(assignmentsReturnNav)}><Icon.arrowLeft style={{ width: 17, height: 17 }} />Back to {PAGE_META[assignmentsReturnNav]?.title || "Dashboard"}</Btn>}>
                {assignmentsLoading ? <div role="status" style={{ padding: 24, color: C.textSecondary }}>Loading your assignments...</div> : assignmentLoadError ? <div style={{ padding: 24, color: C.textSecondary }}>Some assignments could not load. <button type="button" onClick={() => setAssignmentLoadAttempt((attempt) => attempt + 1)} style={{ border: 0, padding: 0, background: "none", color: C.accent, cursor: "pointer", fontWeight: 700 }}>Retry</button></div> : assignments.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <AssignmentsTable
                      rows={assignments.map((assignment) => ({ ...assignment, name: assignment.title || "Assignment", course: assignment.courseTitle, due: formatStudentDate(assignment.dueValue) }))}
                      onOpen={openAssignment}
                    />
                  </div>
                ) : <div style={{ padding: 24, color: C.textSecondary }}>No assignments are available in your enrolled courses.</div>}
              </Panel>
            )}

            {activeNav === "progress" && (
              <div style={{ display: "grid", gap: 18 }}>
                <div className="summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
                  <ProgressStat label="Overall Progress" value={`${averageProgress}%`} />
                  <ProgressStat label="Lessons Completed" value={`${enrolledCourses.reduce((total, course) => total + Number(course.completedLessons || 0), 0)} / ${enrolledCourses.reduce((total, course) => total + Number(course.lessons || 0), 0)}`} />
                  <ProgressStat label="Courses Completed" value={`${completedCourses.length} / ${enrolledCourses.length}`} />
                  <ProgressStat label="Assignments Submitted" value={assignmentDetailsReady ? `${assignments.filter((assignment) => assignment.submitted).length} / ${assignments.length}` : "Open Assignments"} />
                </div>
                <div className="progress-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, alignItems: "start" }}>
                  <Panel title="Course-wise Progress" right={<button type="button" onClick={() => handleNav("my-courses")} style={{ background: "none", border: 0, padding: 0, color: C.accent, cursor: "pointer", font: "inherit", fontWeight: 700 }}>View My Courses</button>}>
                    {enrolledCourses.length ? enrolledCourses.map((course) => (
                      <div key={course.id} style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 9, fontWeight: 700 }}><span style={{ overflowWrap: "anywhere" }}>{course.title}</span><span style={{ color: C.accent, flexShrink: 0 }}>{course.progress}%</span></div>
                        <div style={{ height: 10, borderRadius: 99, overflow: "hidden", background: C.pillBg }}><div style={{ width: `${course.progress}%`, height: "100%", borderRadius: 99, background: course.progress >= 100 ? C.green : C.accent }} /></div>
                      </div>
                    )) : <div style={{ padding: 24, color: C.textSecondary }}>Enroll in a course to start tracking your progress.</div>}
                  </Panel>
                  <WeeklyLearningChart secondsByDay={studySecondsByDay} />
                </div>
                <div className="two-col" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                  <Panel title="Assignment Performance">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, padding: 18 }}>
                      <ProgressStat label="Submitted" value={assignmentDetailsReady ? assignments.filter((assignment) => assignment.submitted).length : "—"} compact />
                      <ProgressStat label="Pending" value={pendingAssignmentCount} compact />
                    </div>
                  </Panel>
                  <Panel title="Certificates Earned"><div style={{ padding: 20 }}>{completedCourses.length} course certificate{completedCourses.length === 1 ? "" : "s"} available. <button type="button" onClick={() => handleNav("certificates")} style={{ background: "none", border: 0, padding: 0, color: C.accent, cursor: "pointer", font: "inherit", fontWeight: 700 }}>View Certificates</button></div></Panel>
                </div>
              </div>
            )}

            {activeNav === "certificates" && (
              <div className="two-col" style={{ display: "grid", gridTemplateColumns: "minmax(260px, .8fr) minmax(0, 1.5fr)", gap: 18, alignItems: "start" }}>
                <Panel title={`Earned Certificates (${completedCourses.length})`}>
                  {completedCourses.length ? completedCourses.map((course) => {
                    const selected = String(selectedCertificate?.id) === String(course.id);
                    return <button type="button" key={course.id} onClick={() => setSelectedCertificateId(course.id)} style={{ width: "calc(100% - 24px)", margin: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, border: selected ? `1px solid ${C.accent}` : `1px solid ${C.border}`, borderRadius: 12, background: selected ? "#fbf6f0" : "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}><span style={{ minWidth: 0, fontWeight: 700 }}>{course.title}</span><span style={{ color: C.green, flexShrink: 0 }}>{selected ? "Selected" : "View"}</span></button>;
                  }) : <div style={{ padding: 24, color: C.textSecondary }}>Complete a course to unlock a certificate.</div>}
                </Panel>
                <Panel title="Certificate Preview">
                  {selectedCertificate ? (
                    <div style={{ padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                        <strong>{selectedCertificate.title}</strong>
                        <div style={{ display: "flex", gap: 10 }}><Btn variant="outline" onClick={printCertificate}>Print</Btn><Btn variant="primary" onClick={() => downloadCertificate(selectedCertificate)}>Download PDF</Btn></div>
                      </div>
                      <img src={certificateArt} alt={`Certificate of Completion for ${studentName}: ${selectedCertificate.title}`} style={{ display: "block", width: "min(100%, 720px)", height: "auto", margin: "0 auto" }} />
                    </div>
                  ) : <div style={{ padding: 24, color: C.textSecondary }}>Your certificate preview will appear here after you complete a course.</div>}
                </Panel>
              </div>
            )}

            {activeNav === "announcements" && (
              <Panel title="All Announcements" right={<button onClick={markAllRead} style={{ background: "none", border: "none", color: C.accent, font: "inherit", fontWeight: 700, cursor: "pointer" }}>Mark all read</button>}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {sortedAnnouncements.length ? sortedAnnouncements.map((n, i) => (
                    <li key={n.id} onClick={() => onReadNotification?.(n.id)} style={{ display: "flex", gap: 10, padding: "16px 20px", borderBottom: i === sortedAnnouncements.length - 1 ? "none" : `1px solid ${C.border}`, cursor: "pointer" }}>
                      {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e2734a", marginTop: 5, flexShrink: 0 }} />}
                      <div>
                        <div>{n.message}</div>
                        <div style={{ color: C.textMuted, marginTop: 4 }}>{formatNotificationTime(n.createdAt)}</div>
                      </div>
                    </li>
                  )) : <li style={{ padding: 24, listStyle: "none", color: C.textSecondary }}>No announcements or notices yet.</li>}
                </ul>
              </Panel>
            )}

            {activeNav === "profile" && (
              <StudentProfileEditor user={user} enrolledCount={enrolledCourses.length} onSaved={onProfileUpdated} />
            )}
          </div>
        </div>
      </div>

      {certificateLink && (
        <div style={{ position: "fixed", inset: 0, zIndex: 510, background: "rgba(20,18,17,.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onKeyDown={(event) => { if (event.key === "Escape") setCertificateLink(""); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="certificate-link-title" style={{ background: "#fff", borderRadius: 18, padding: 26, width: "min(100%, 520px)", boxShadow: "0 18px 50px #0004" }}>
            <h3 id="certificate-link-title" style={{ margin: "0 0 10px" }}>Your certificate is ready to share</h3>
            <p style={{ color: C.textSecondary }}>Use this link to view or share your certificate image.</p>
            <input autoFocus readOnly aria-label="Certificate image URL" value={certificateLink} onFocus={(event) => event.target.select()} style={{ width: "100%", padding: 12, border: `1px solid ${C.border}`, borderRadius: 8 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setCertificateLink("")} style={{ padding: "10px 16px", cursor: "pointer" }}>Close</button>
              <Btn variant="primary" onClick={async () => { try { await navigator.clipboard.writeText(certificateLink); showToast("Certificate link copied."); } catch { showToast("Copy unavailable. Select the URL and copy it manually."); } }}>Copy URL</Btn>
            </div>
          </div>
        </div>
      )}
      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: C.accentDark, color: "#fff", padding: "11px 20px", borderRadius: 30,
          fontSize: 16, fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 300,
        }}>
          {toast}
        </div>
      )}

      <CourseModal
        course={openCourse}
        onClose={() => setOpenCourse(null)}
        onToast={showToast}
        onContinue={openCoursePlayer}
        onRequestEnrollment={(course) => onRequestCourseEnrollment?.(course)}
      />
      <ResourceModal resource={openResource} onClose={() => setOpenResource(null)} onUpload={async (file, kind) => {
        if (!uploadStudentResource || !openResource?.courseId || !openResource?.lessonId || !openResource?.taskId) throw new Error("This task cannot be submitted right now. Please reopen it and try again.");
        const savedProgress = await uploadStudentResource(file, openResource.courseId, openResource.lessonId, openResource.taskId, kind, studentId, openResource.section);
        if (!savedProgress?.taskSubmissions?.[String(openResource.taskId)]?.submitted) throw new Error("The PDF was uploaded, but the submission was not saved. Please try again.");
        const key = openResource?.progressKey;
        if (key && kind === "assignment") setLessonProgress((current) => {
          const next = {
            ...current,
            [key]: {
              ...(current[key] || {}),
              ...(savedProgress || {}),
            },
          };
          window.localStorage.setItem(`crmst-progress-${studentId}`, JSON.stringify(next));
          return next;
        });
        setUploadedResources((current) => ({ ...current, [openResource?.title]: file.name }));
        showToast(`${file.name} uploaded successfully.`);
      }} />
    </div>
  );
}

function formatNotificationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

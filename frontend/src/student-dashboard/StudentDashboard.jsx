import React, { useEffect, useState, useMemo, useRef } from "react";
import { jsPDF } from "jspdf";
import { certificateImage } from "./certificateImage";
import { shareCourseCertificate } from "../../backendApi";

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
const COURSES = [
  { id: "mern", title: "MERN Stack Development", desc: "Build full-stack apps using MongoDB, Express, React and Node.js.", duration: "12 weeks", lessons: 48, enrolled: true, progress: 72, currentLesson: "Building REST APIs with Express", lastWatched: "Connecting MongoDB with Mongoose · 2 days ago" },
  { id: "python", title: "Python Programming", desc: "Learn Python fundamentals, OOP concepts and real-world scripting.", duration: "8 weeks", lessons: 36, enrolled: true, progress: 45, currentLesson: "Working with Classes & Objects", lastWatched: "Exception Handling in Python · 4 days ago" },
  { id: "data", title: "Data Analytics", desc: "Analyze and visualize data using Excel, SQL and Power BI.", duration: "10 weeks", lessons: 30, enrolled: false },
  { id: "web", title: "Web Development", desc: "Master HTML, CSS and JavaScript to build modern websites.", duration: "9 weeks", lessons: 40, enrolled: false },
  { id: "ai", title: "Artificial Intelligence", desc: "Understand core AI concepts, ML basics and practical use cases.", duration: "14 weeks", lessons: 52, enrolled: false },
  { id: "marketing", title: "Digital Marketing", desc: "Learn SEO, social media and campaign strategy fundamentals.", duration: "6 weeks", lessons: 24, enrolled: false },
];

const ASSIGNMENTS = [
  { id: 1, name: "Build a REST API", course: "MERN Stack Development", due: "Aug 22, 2026", status: "Pending" },
  { id: 2, name: "Data Structures Quiz", course: "Python Programming", due: "Aug 18, 2026", status: "Submitted" },
  { id: 3, name: "Mongoose Schema Design", course: "MERN Stack Development", due: "Aug 12, 2026", status: "Evaluated" },
  { id: 4, name: "Python OOP Assignment", course: "Python Programming", due: "Aug 25, 2026", status: "Pending" },
];

const ACTIVITY = [
  { id: 1, text: "Completed a lesson", detail: "Building REST APIs with Express", time: "2 hours ago" },
  { id: 2, text: "Watched a video", detail: "Connecting MongoDB with Mongoose", time: "2 days ago" },
  { id: 3, text: "Downloaded notes", detail: "Python OOP Cheat Sheet", time: "3 days ago" },
  { id: 4, text: "Submitted an assignment", detail: "Data Structures Quiz", time: "5 days ago" },
];

const NOTIFICATIONS = [
  { id: 1, text: "Your assignment \u201cData Structures Quiz\u201d was evaluated.", time: "1 hour ago", unread: true },
  { id: 2, text: "New lesson added to MERN Stack Development.", time: "1 day ago", unread: true },
  { id: 3, text: "Reminder: \u201cBuild a REST API\u201d is due in 2 days.", time: "1 day ago", unread: false },
  { id: 4, text: "You completed 72% of MERN Stack Development.", time: "3 days ago", unread: false },
];

const NAV_SECTIONS = [
  { label: "Student", items: [
    { id: "dashboard", label: "Dashboard", icon: Icon.dashboard },
    { id: "all-courses", label: "All Courses", icon: Icon.courses },
    { id: "my-courses", label: "My Courses", icon: Icon.myCourses },
  ]},
  { label: "Account", items: [
    { id: "notifications", label: "Notifications", icon: Icon.bell },
    { id: "profile", label: "Profile", icon: Icon.user },
  ]},
];

const PAGE_META = {
  "dashboard": { title: "Student Dashboard", sub: "Welcome back, Student" },
  "all-courses": { title: "All Courses", sub: "Every course offered by the organization" },
  "my-courses": { title: "My Courses", sub: "Courses you're currently enrolled in" },
  "course-player": { title: "Course Player", sub: "" },
  "notifications": { title: "Notifications", sub: "Recent updates and reminders" },
  "profile": { title: "Profile", sub: "Your account details" },
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
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700, padding: "4px 10px",
      borderRadius: 20, background: t.bg, color: t.color, border: `1px solid ${t.border}`,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Btn({ children, variant = "outline", onClick, style, disabled }) {
  const base = {
    border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12.5,
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
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 5.8", minHeight: 104, maxHeight: 150, background: "#f5ede2", overflow: "hidden" }}>
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
          <h4 style={{ margin: 0, fontSize: 18, lineHeight: 1.15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.title}</h4>
        </div>
      </div>

      <p style={{ margin: "0 0 16px", fontSize: 12.5, lineHeight: 1.4, color: C.textSecondary, minHeight: 50, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{course.desc}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, padding: "0 0 13px", marginBottom: 12, borderBottom: `1px solid ${C.border}` }}>
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
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textMuted, fontWeight: 800 }}>{label}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, right }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</div>
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
        <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textSecondary }}>{course.desc}</p>

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
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{course.progress}%</div>
            </div>
            <Btn variant="primary" style={{ width: "100%" }} onClick={() => onContinue?.(course)}>
              {course.progress > 0 ? "Continue Learning" : "Start Course"}
            </Btn>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: C.textSecondary, marginBottom: 18 }}>
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
          <div><h3 style={{ margin: 0, fontSize: 17 }}>{video.title}</h3><p style={{ margin: "4px 0 0", color: C.textSecondary, fontSize: 12 }}>{video.courseTitle}</p></div>
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
  if (!resource) return null;
  const chooseFile = (event) => setFile(event.target.files?.[0] || null);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(33,28,46,0.62)", zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ background: C.card, borderRadius: 20, maxWidth: 480, width: "100%", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div><h3 style={{ margin: 0, fontSize: 17 }}>{resource.title}</h3><p style={{ margin: "4px 0 0", color: C.textSecondary, fontSize: 12 }}>{resource.courseTitle}</p></div>
          <button onClick={onClose} aria-label="Close" style={{ background: C.pillBg, border: `1px solid ${C.pillBorder}`, borderRadius: 9, width: 32, height: 32, cursor: "pointer" }}><Icon.x style={{ width: 15, height: 15 }} /></button>
        </div>
        {resource.adminUrl ? <Btn variant="outline" style={{ width: "100%", marginBottom: 12 }} onClick={() => window.open(resource.adminUrl, "_blank", "noopener,noreferrer")}>View PDF</Btn> : <p style={{ fontSize: 12, color: C.textMuted }}>Admin PDF is not available yet.</p>}
        {resource.kind === "assignment" ? (
          <>
            <label style={{ display: "block", padding: 14, border: `1px dashed ${C.pillBorder}`, borderRadius: 12, fontSize: 12, color: C.textSecondary, cursor: "pointer" }}>
              Upload your PDF
              <input type="file" accept="application/pdf" onChange={chooseFile} style={{ display: "block", marginTop: 8, width: "100%" }} />
            </label>
            <Btn variant="primary" disabled={!file || uploading} style={{ width: "100%", marginTop: 14 }} onClick={async () => { setUploading(true); try { await onUpload(file, resource.kind); onClose(); } finally { setUploading(false); } }}>{uploading ? "Uploading..." : "Submit PDF"}</Btn>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================
   COURSE PLAYER — Udemy / YouTube style playlist layout
   ============================================================ */
function CoursePlayer({ course, lessonProgress, activeLessonUID, activeTab, onSelectLesson, onSetTab, onMarkWatched, onMarkProgress, onOpenResource, onBack }) {
  const groups = useMemo(() => getCourseSectionGroups(course, lessonProgress), [course, lessonProgress]);
  const flatLessons = useMemo(() => groups.flatMap((g) => g.lessons), [groups]);
  const currentLesson = flatLessons.find((l) => getLessonUID(l) === activeLessonUID) || flatLessons[0] || null;
  const currentSectionName = currentLesson ? String(currentLesson.section || "General").trim() || "General" : null;
  const currentModuleIndex = groups.findIndex((g) => g.name === currentSectionName);
  const watchedLessonRef = useRef("");

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
  const handleTimeUpdate = (e) => {
    const t = e.currentTarget.currentTime || 0;
    if (t >= MIN_WATCH_SECONDS && !currentLesson.videoCompleted && watchedLessonRef.current !== watchKey) {
      watchedLessonRef.current = watchKey;
      onMarkWatched(currentLesson);
    }
  };
  const handleEnded = () => {
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
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, padding: "18px 18px 4px", cursor: "pointer", fontFamily: "inherit" }}>
          <Icon.chevronRight style={{ width: 13, height: 13, transform: "rotate(180deg)" }} /> Back to My Courses
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
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>{course.title}</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Complete Course</div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(178,147,118,0.14)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ width: `${overallPercent}%`, height: "100%", background: "linear-gradient(90deg,#3f7a52,#57a06d)", borderRadius: 20, transition: "width .3s ease" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.72)", flexShrink: 0 }}>{overallPercent}% Complete</span>
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
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
                    {isOpen ? <Icon.chevronDown style={{ width: 13, height: 13, color: "rgba(255,255,255,0.5)" }} /> : <Icon.chevronRight style={{ width: 13, height: 13, color: "rgba(255,255,255,0.5)" }} />}
                    Module {sIdx + 1}: {section.name}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>{sectionDone} / {section.lessons.length}</span>
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
                            <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#fff" : "rgba(255,255,255,0.78)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i + 1}. {lesson.title}</span>
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
        <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>
          {course.title} <span style={{ margin: "0 6px" }}>›</span> Module {Math.max(currentModuleIndex, 0) + 1}: {currentSectionName} <span style={{ margin: "0 6px" }}>›</span> Lecture {idx + 1}
        </div>
        <h2 style={{ margin: "0 0 16px", fontSize: 19, fontWeight: 800 }}>Lecture {idx + 1}: {currentLesson.title}</h2>

        {currentLesson.videoUrl ? (
          <video
            key={activeLessonUID}
            src={currentLesson.videoUrl}
            controls
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: currentLesson.videoCompleted ? C.green : C.textMuted }}>
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
                  color: active ? C.accentDark : C.textSecondary, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {tab.label}
                {tab.id === "tasks" && tab.count > 0 && (
                  <span style={{ background: C.badgeBg, color: C.badgeIcon, borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>{tab.count}</span>
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
                <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>About this lecture</h4>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: C.textSecondary }}>
                  {courseSyllabus || currentLesson.description || `In this lecture, we cover ${currentLesson.title.toLowerCase()} as part of ${currentSectionName}. Watch the video, review the notes, then complete the linked task to mark this lesson done.`}
                </p>
              </>
            )}
            {activeContentTab === "notes" && (
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>{currentLesson.title} — Notes</h4>
                {currentLesson.notesUrl ? (
                  <Btn variant="primary" onClick={() => { onMarkProgress(currentLesson, { notesCompleted: true }); onOpenResource({ title: `${currentLesson.title} — Notes`, courseTitle: course.title, adminUrl: currentLesson.notesUrl, kind: "notes", courseId: course.id, lessonId: currentLesson.id }); }}>
                    Open Notes PDF
                  </Btn>
                ) : (
                  <p style={{ fontSize: 12.5, color: C.textMuted }}>No notes have been uploaded for this lesson yet.</p>
                )}
              </div>
            )}
            {activeContentTab === "tasks" && (
              <TaskDropdownList lesson={currentLesson} course={course} onOpenResource={onOpenResource} />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, borderLeft: `1px solid ${C.border}`, paddingLeft: 20 }}>
            <MetaRow icon={Icon.clock} label="Course duration" value={course.duration || "—"} />
            <MetaRow icon={Icon.notes} label="Fees" value={course.fees || course.price || "—"} />
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
        <div style={{ fontSize: 10.5, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

function TaskDropdownList({ lesson, course, onOpenResource }) {
  const tasks = lesson.tasks || [];
  const [openTaskId, setOpenTaskId] = useState(tasks[0]?.id || (tasks.length ? "task-1" : null));
  if (!tasks.length) {
    return <p style={{ fontSize: 12.5, color: C.textMuted }}>No tasks are assigned for this lesson.</p>;
  }
  return (
    <div>
      <h4 style={{ margin: "0 0 10px", fontSize: 14.5 }}>Tasks for {lesson.title}</h4>
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
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{task.title || `Task ${i + 1}`}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge tone={hasGrade || status === "Submitted" ? "green" : "amber"}>{status}</Badge>
                  {isOpen ? <Icon.chevronDown style={{ width: 13, height: 13 }} /> : <Icon.chevronRight style={{ width: 13, height: 13 }} />}
                </span>
              </button>
              {isOpen && (
                <div style={{ padding: 14, fontSize: 12, color: C.textSecondary }}>
                  <p style={{ margin: "0 0 12px" }}>{task.description || "Complete this task and submit your work as a PDF."}</p>
                  <Btn
                    variant="primary"
                    disabled={!lesson.videoCompleted}
                    onClick={() => onOpenResource({
                      title: task.title || lesson.title, courseTitle: course.title, adminUrl: task.pdfUrl, kind: "assignment",
                      progressKey: getLessonProgressKey(course.id, lesson), courseId: course.id, lessonId: lesson.id, taskId, section: lesson.section,
                    })}
                  >
                    {lesson.videoCompleted ? "Open Task" : "Watch the video first"}
                  </Btn>
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
function WelcomeBanner({ name }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 22px",
      marginBottom: 20, boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)",
    }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Welcome back, {name}!</h2>
      <p style={{ margin: 0, fontSize: 12.5, color: C.textSecondary }}>Continue learning and keep track of your progress.</p>
    </div>
  );
}

function SummaryCards({ courses, assignments }) {
  const items = [
    { label: "Total Courses", value: courses.length, icon: Icon.courses },
    { label: "Enrolled Courses", value: courses.filter(c => c.enrolled).length, icon: Icon.myCourses },
    { label: "Completed Courses", value: courses.filter((course) => course.progress >= 100).length, icon: Icon.check },
    { label: "Pending Assignments", value: assignments.length, icon: Icon.assignments },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }} className="summary-grid">
      {items.map((it) => (
        <div key={it.label} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 20px",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)",
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{it.value}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{it.label}</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.badgeBg, color: C.badgeIcon, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <it.icon style={{ width: 18, height: 18 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ContinueLearning({ course, onOpen }) {
  if (!course) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHead title="Continue Learning" />
      <div
        onClick={() => onOpen(course)}
        style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 22px",
          display: "flex", gap: 18, alignItems: "center", cursor: "pointer",
          boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)",
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 12, background: C.badgeBg, color: C.badgeIcon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon.play style={{ width: 20, height: 20 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{course.title}</h4>
              <div style={{ fontSize: 12, color: C.textSecondary, margin: "3px 0 12px" }}>Current lesson: {course.currentLesson}</div>
            </div>
            <Btn variant="primary" onClick={(e) => { e.stopPropagation(); onOpen(course); }}>Continue Learning</Btn>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ flex: 1, height: 6, background: "#f0ece2", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ width: `${course.progress}%`, height: "100%", background: C.accent, borderRadius: 20 }} />
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, width: 32, textAlign: "right" }}>{course.progress}%</div>
          </div>
          <div style={{ fontSize: 11.5, color: C.textMuted }}>Last watched: {course.lastWatched}</div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 0 12px" }}>
      <h3 style={{ fontSize: 14.5, margin: 0, fontWeight: 700 }}>{title}</h3>
      {right}
    </div>
  );
}

function AssignmentsTable({ rows, onOpen }) {
  const badgeTone = { Pending: "amber", Locked: "neutral", Open: "amber", "Open after video": "neutral", Ready: "green", Completed: "green", Submitted: "neutral", Evaluated: "green" };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {["Assignment", "Course", "Due Date", "Status", "Action"].map(h => (
            <th key={h} style={{ textAlign: "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, padding: "10px 20px", background: C.pillBg, borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((a, i) => (
          <tr key={`${a.courseId || "course"}:${String(a.section || "General").trim().toLowerCase()}:${a.lessonId || "lesson"}:${a.id || i}`}>
            <td style={cellStyle(i, rows.length)}>
              <div style={{ fontWeight: 700 }}>{a.name}</div>
            </td>
            <td style={cellStyle(i, rows.length)}>{a.course}</td>
            <td style={cellStyle(i, rows.length)}>{a.due}</td>
            <td style={cellStyle(i, rows.length)}><Badge tone={badgeTone[a.status]}>{a.status}</Badge></td>
            <td style={cellStyle(i, rows.length)}>
              <a href={onOpen ? "#" : a.pdfUrl || "#"} target={!onOpen && a.pdfUrl ? "_blank" : undefined} rel={!onOpen && a.pdfUrl ? "noreferrer" : undefined} onClick={(e) => { e.preventDefault(); if (onOpen) onOpen(a); }} style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>
                {a.status === "Pending" ? "Open" : "View"}
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function cellStyle(i, len) {
  return { padding: "12px 20px", fontSize: 12.5, borderBottom: i === len - 1 ? "none" : `1px solid ${C.border}` };
}

function ActivityList({ items }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((a, i) => (
        <li key={a.id} style={{ display: "flex", gap: 12, padding: "13px 20px", borderBottom: i === items.length - 1 ? "none" : `1px solid ${C.border}` }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: C.badgeBg, color: C.badgeIcon, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon.check style={{ width: 14, height: 14 }} />
          </div>
          <div style={{ fontSize: 12.5 }}>
            <div style={{ fontWeight: 700 }}>{a.text}</div>
            <div style={{ color: C.textSecondary }}>{a.detail}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{a.time}</div>
          </div>
        </li>
      ))}
    </ul>
  );
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
export default function StudentDashboard({ user, onLogout, courses = [], notifications = [], enrollmentRequests = [], onRefreshNotifications, onReadNotification, onReadAllNotifications, uploadStudentResource, saveLessonProgress, loadCourse, onRequestCourseEnrollment }) {
  const recentCourseStorageKey = `crmst-recent-course-${user?.id || user?._id || "student"}`;
  const [activeNav, setActiveNav] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [openCourse, setOpenCourse] = useState(null);
  const [playerCourseId, setPlayerCourseId] = useState(null);
  const [playerLessonUID, setPlayerLessonUID] = useState(null);
  const [playerTab, setPlayerTab] = useState("about");
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
  const [selectedCertificateId, setSelectedCertificateId] = useState("");

  const studentName = user?.name || "Student";
  const studentInitials = initials(studentName);
  const studentEmail = user?.email || "";
  const studentId = String(user?.id || user?._id || "");

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

  const catalogCourses = useMemo(() => courses.map((sourceCourse) => {
    const course = courseDetails[sourceCourse.id || sourceCourse._id] || sourceCourse;
    const studentIds = Array.isArray(course.studentIds) ? course.studentIds.map(String) : [];
    const lessons = Array.isArray(course.lessons) ? course.lessons : [];
    const courseId = String(course.id || course._id || "");
    return {
      ...course,
      id: courseId,
      title: course.title || "Untitled course",
      desc: course.syllabus || `${course.mode || "Online"} course covering ${course.tools || "practical skills"}.`,
      duration: course.duration || "-",
      lessons: course.totalLessons || lessons.length,
      lessonsData: lessons,
      enrolled: typeof course.enrolled === "boolean" ? course.enrolled : Boolean(studentId && studentIds.includes(studentId)),
      requestStatus: requestStatusMap.get(`id:${courseId.trim().toLowerCase()}`)
        || requestStatusMap.get(`name:${String(course.title || course.name || "").trim().toLowerCase()}`)
        || null,
      requestPending: (requestStatusMap.get(`id:${courseId.trim().toLowerCase()}`)?.status || requestStatusMap.get(`name:${String(course.title || course.name || "").trim().toLowerCase()}`)?.status) === "pending",
      progress: lessons.length ? Math.round((lessons.reduce((total, lesson) => (
        total + getLessonProgressRatio(lesson, lessonProgress[getLessonProgressKey(course.id, lesson)] || {})
      ), 0) / lessons.length) * 100) : 0,
    };
  }), [courses, courseDetails, studentId, lessonProgress, requestStatusMap]);

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

  const enrolledCourses = catalogCourses.filter(c => c.enrolled);
  const completedCourses = enrolledCourses.filter((course) => course.progress >= 100);
  const selectedCertificate = completedCourses.find((course) => String(course.id) === String(selectedCertificateId)) || completedCourses[0] || null;
  const averageProgress = enrolledCourses.length
    ? Math.round(enrolledCourses.reduce((total, course) => total + Number(course.progress || 0), 0) / enrolledCourses.length)
    : 0;
  const joinedValue = String(user?.joined || "").trim();
  const joinedDate = joinedValue ? new Date(`${joinedValue.slice(0, 10)}T00:00:00`) : null;
  const hasJoinedDate = joinedDate && !Number.isNaN(joinedDate.getTime());
  const batchYear = user?.batchNo || user?.batch || user?.batchYear || (hasJoinedDate ? joinedDate.getFullYear() : null);
  const joinedLabel = hasJoinedDate
    ? joinedDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "Not set";
  const [certificateBusy, setCertificateBusy] = useState(false);
  const [certificateLink, setCertificateLink] = useState("");
  const sharingRef = useRef(false);
  const [certificateDate] = useState(() => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
  const certificateArt = useMemo(() => selectedCertificate ? certificateImage({
    name: studentName, studentId: user?.studentId || user?.registrationId || studentId,
    batch: batchYear, title: selectedCertificate.title,
    id: selectedCertificate.certificateId || selectedCertificate.id, date: certificateDate,
  }) : "", [selectedCertificate, studentName, studentId, user?.studentId, user?.registrationId, batchYear, certificateDate]);
  const downloadCertificate = (course) => {
    try {
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
  const assignments = enrolledLessons.flatMap((lesson) => (lesson.tasks || []).map((task) => ({
    ...task,
    lessonTitle: lesson.title,
    courseTitle: lesson.courseTitle,
    courseId: lesson.courseId,
    lessonId: lesson.id,
    section: lesson.section,
    videoCompleted: lesson.videoCompleted,
    taskCompleted: lesson.assignmentCompleted,
    completed: lesson.completed,
  })));
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

  const openCoursePlayer = async (course, lessonUID) => {
    setOpenCourse(null);
    let playableCourse = course;
    const cachedDetail = courseDetails[course.id];
    if (course.enrolled && !cachedDetail) {
      setLoadingCourseId(course.id);
      try {
        playableCourse = await loadCourse?.(course.id) || course;
        if (playableCourse !== course) setCourseDetails((current) => ({ ...current, [course.id]: playableCourse }));
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
    setActiveNav("course-player");
    setMobileOpen(false);
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
    const interval = window.setInterval(refreshWhenVisible, 60000);
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
    setActiveNav(id);
    setMobileOpen(false);
  };

  return (
    <div style={{ fontFamily: "Manrope, sans-serif", background: C.bg, color: C.text, minHeight: "100vh", fontSize: 13.5, position: "relative" }}>
      {loadingCourseId || certificateBusy ? (
        <div role="status" aria-live="polite" style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(20,18,17,0.48)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 16, padding: "24px 30px", minWidth: 220, textAlign: "center", boxShadow: "0 18px 50px rgba(0,0,0,0.24)" }}>
            <div style={{ width: 34, height: 34, margin: "0 auto 12px", border: `3px solid ${C.pillBorder}`, borderTopColor: C.accent, borderRadius: "50%", animation: "course-load-spin 0.8s linear infinite" }} />
            <div style={{ fontWeight: 700, color: C.text }}>{certificateBusy ? "Creating certificate link" : "Loading course"}</div>
            <div style={{ marginTop: 5, fontSize: 12, color: C.textSecondary }}>{certificateBusy ? "Uploading your certificate and saving its URL..." : "Loading your progress and tasks..."}</div>
          </div>
        </div>
      ) : null}
      <style>{`
        * { box-sizing: border-box; }
        @keyframes course-load-spin { to { transform: rotate(360deg); } }
        @media (max-width: 1180px) {
          .summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .courses-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .two-col { grid-template-columns: 1fr !important; }
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
        }
        .sd-shell {
          height: 100vh;
          min-height: 0;
          display: grid !important;
          grid-template-columns: 302px 1fr;
          padding: 16px;
          gap: 16px;
          overflow: hidden;
        }
        .sd-sidebar {
          position: static !important;
          width: auto !important;
          height: calc(100vh - 32px);
          min-height: 0;
          border-radius: 30px !important;
          padding: 18px 14px 14px !important;
          box-shadow: 0 24px 50px rgba(8, 9, 10, 0.22) !important;
          overflow: hidden;
          scrollbar-width: none;
        }
        .sd-sidebar::-webkit-scrollbar,
        .sd-sidebar nav::-webkit-scrollbar,
        .sd-content::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .sd-sidebar nav {
          scrollbar-width: none;
        }
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
          .sd-shell {
            height: auto;
            min-height: 100vh;
            overflow: visible;
          }
          .sd-main {
            height: auto;
            min-height: calc(100vh - 24px);
          }
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 8px 16px", margin: "18px 14px 0", borderBottom: "1px solid rgba(178,147,118,0.12)" }}>
            <div className="sd-logo-badge"><span>S</span><i /><span>T</span></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: C.sidebarTextBright }}>SYSTEM TECHNOLOGIES</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.66)", marginTop: 1 }}>Ajmer Student Portal</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px 8px" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #f5e5d3, #e8cda9)", color: C.accentDark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>{studentInitials}</div>
            <strong style={{ fontSize: 14, color: C.sidebarTextBright, textAlign: "center" }}>{studentName}</strong>
          </div>

          <div style={{ margin: "14px 20px 8px", height: 42, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(225,86,54,0.4)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", color: "rgba(255,255,255,0.62)" }}>
            <Icon.search style={{ width: 16, height: 16, flexShrink: 0 }} />
            <input value={sidebarQuery} onChange={(event) => setSidebarQuery(event.target.value)} placeholder="Search modules..." style={{ width: "100%", background: "transparent", border: 0, color: "#fff", outline: "none", fontSize: 13 }} />
          </div>

          <nav style={{ flex: 1, overflowY: "auto", padding: "4px 12px 10px" }}>
            {NAV_SECTIONS.map(section => (
              <div key={section.label}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.16em", color: C.sidebarLabel, fontWeight: 800, padding: "16px 10px 8px" }}>{section.label}</div>
                {section.items.filter((item) => item.label.toLowerCase().includes(sidebarQuery.trim().toLowerCase())).map(item => {
                  const active = activeNav === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 14,
                        color: active ? "#fff" : C.sidebarText, background: active ? "linear-gradient(135deg, rgba(41,41,44,0.92), rgba(28,28,31,0.95))" : "transparent",
                        border: active ? "1px solid rgba(215,86,56,0.48)" : "1px solid transparent", fontSize: 13, fontWeight: 700, marginBottom: 1, cursor: "pointer", position: "relative",
                        boxShadow: active ? "inset 3px 0 0 #d55c41" : "none",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.sidebarHover; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      {active && <span style={{ position: "absolute", left: 0, top: 8, width: 3, height: 18, background: "#d55c41", borderRadius: "0 3px 3px 0" }} />}
                      <item.icon style={{ width: 16, height: 16, opacity: 0.9, flexShrink: 0 }} />
                      <span>{item.label}</span>
                      {item.id === "notifications" && unreadCount > 0 && (
                        <span style={{ marginLeft: "auto", background: "#e2734a", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>{unreadCount}</span>
                      )}
                      {["all-courses", "my-courses"].includes(item.id) && !(item.id === "notifications" && unreadCount > 0) && (
                        <Icon.chevronRight style={{ width: 13, height: 13, opacity: 0.45, marginLeft: "auto" }} />
                      )}
                    </div>
                  );
                })}
                {section.label === "Student" && enrolledCourses.length > 0 && !sidebarQuery.trim() && (
                  <>
                    <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.16em", color: C.sidebarLabel, fontWeight: 800, padding: "16px 10px 8px" }}>Recent Course</div>
                    {recentCourse ? [recentCourse].map((c) => {
                      const isCurrent = activeNav === "course-player" && playerCourseId === c.id;
                      return (
                        <div
                          key={`recent-${c.id}`}
                          onClick={() => openCoursePlayer(c)}
                          style={{
                            padding: "10px 12px", borderRadius: 14, marginBottom: 6, cursor: "pointer",
                            background: isCurrent ? "linear-gradient(135deg, rgba(41,41,44,0.92), rgba(28,28,31,0.95))" : "rgba(255,255,255,0.03)",
                            border: isCurrent ? "1px solid rgba(215,86,56,0.48)" : "1px solid rgba(255,255,255,0.06)",
                          }}
                          onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = C.sidebarHover; }}
                          onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                          {isCurrent && activePlayerLesson ? <div style={{ marginTop: 3, fontSize: 10.5, color: "rgba(255,255,255,0.56)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Now learning: {activePlayerLesson.title}</div> : null}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                            <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 20, overflow: "hidden" }}>
                              <div style={{ width: `${c.progress}%`, height: "100%", background: "#d55c41", borderRadius: 20 }} />
                            </div>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", flexShrink: 0 }}>{c.progress}%</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); openCoursePlayer(c); }}
                            style={{ marginTop: 8, width: "100%", background: "rgba(213,92,65,0.16)", border: "1px solid rgba(215,86,56,0.4)", color: "#e2734a", borderRadius: 9, padding: "6px 0", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                          >
                            Continue Learning
                          </button>
                        </div>
                      );
                    }) : null}
                  </>
                )}
              </div>
            ))}
          </nav>

          <div style={{ borderTop: "1px solid rgba(216,82,53,0.28)", padding: "18px 26px 20px" }}>
            <button type="button" onClick={() => handleNav("logout")} style={{ width: "100%", border: 0, background: "transparent", color: C.sidebarTextBright, display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer", fontFamily: "inherit", fontSize: 16, textAlign: "left" }}><Icon.logout style={{ width: 21, height: 21, color: "#fff" }} />Logout</button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="sd-main" style={{ marginLeft: 318, flex: 1, minWidth: 0 }}>
          {/* TOPBAR */}
          <header className="sd-topbar" style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="sd-menu-toggle" onClick={() => setMobileOpen(true)} style={{ display: "none", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, alignItems: "center", justifyContent: "center", color: C.textSecondary, cursor: "pointer" }}>
                <Icon.menu style={{ width: 16, height: 16 }} />
              </button>
              {activeNav !== "course-player" && (
                <div>
                  <h1 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>{meta.title}</h1>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textSecondary }}>{meta.sub}</p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: C.textSecondary, cursor: "pointer" }}
              >
                <Icon.bell style={{ width: 16, height: 16 }} />
                {unreadCount > 0 && <span style={{ position: "absolute", top: 6, right: 7, width: 6, height: 6, background: "#e2734a", borderRadius: "50%", border: `1.5px solid ${C.card}` }} />}
              </button>

              {notifOpen && (
                <div style={{ position: "absolute", top: 44, right: 44, width: 300, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 12px 30px rgba(33,28,46,0.15)", overflow: "hidden", zIndex: 60 }}>
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Notifications</span>
                    <button onClick={markAllRead} style={{ background: "none", border: "none", color: C.accent, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Mark all read</button>
                  </div>
                  <div style={{ maxHeight: 260, overflowY: "auto" }}>
                    {notifs.map(n => (
                       <div key={n.id} onClick={() => onReadNotification?.(n.id)} style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, cursor: "pointer" }}>
                        {!n.read && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e2734a", marginTop: 5, flexShrink: 0 }} />}
                        <div>
                          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{n.message}</div>
                          <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 2 }}>{formatNotificationTime(n.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div ref={profilePopupRef} style={{ position: "relative" }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false); }}>
              <button type="button" ref={profileButtonRef} aria-expanded={profileOpen} aria-controls="student-profile-popup" onClick={() => { setProfileOpen((open) => !open); setNotifOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px 4px 4px", border: `1px solid ${C.border}`, borderRadius: 24, cursor: "pointer", background: C.card, color: C.text, fontFamily: "inherit", textAlign: "left" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.badgeBg, color: C.badgeIcon, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{studentInitials}</div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{studentName}</div>
                  <div style={{ fontSize: 10.5, color: C.textSecondary }}>Student</div>
                </div>
                <Icon.chevronDown style={{ width: 12, height: 12, color: C.textMuted, marginLeft: 2 }} />
              </button>
              {profileOpen && (
                <section id="student-profile-popup" aria-label="Student profile details" style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, width: "min(330px, calc(100vw - 48px))", padding: 20, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 12px 36px rgba(40,30,20,.16)", zIndex: 70 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.badgeBg, color: C.badgeIcon, display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 }}>{studentInitials}</div>
                    <div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 15, overflowWrap: "anywhere" }}>{studentName}</div><div style={{ color: C.textSecondary, fontSize: 12, marginTop: 3 }}>Student</div></div>
                  </div>
                  <dl style={{ margin: "12px 0 18px" }}>
                    {[["Student ID", user?.studentId || user?.registrationId || studentId || "Not assigned"], ["Email", studentEmail || "Not provided"], ["Phone", user?.phone || "Not provided"], ["Batch", batchYear || "Not assigned"], ["Enrolled courses", enrolledCourses.length]].map(([label, value]) => (
                      <div key={label} style={{ display: "grid", gridTemplateColumns: "100px minmax(0, 1fr)", gap: 10, padding: "7px 0", fontSize: 12 }}>
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
              <>
                <WelcomeBanner name={studentName} />
                <SummaryCards courses={catalogCourses} assignments={assignments} />
                <ContinueLearning course={recentCourse} onOpen={(course) => openCoursePlayer(course)} />

                <SectionHead title="All Courses" right={<a href="#" onClick={(e) => { e.preventDefault(); handleNav("all-courses"); }} style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>View all</a>} />
                <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 360px))", gap: 16, marginBottom: 26 }}>
                  {catalogCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} onContinue={openCoursePlayer} onRequestEnrollment={(course) => onRequestCourseEnrollment?.(course)} />)}
                </div>

                <SectionHead title="Recent Assignments & Activity" />
                <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
                  <Panel title="Recent Assignments"><AssignmentsTable rows={assignments.slice(0, 5).map((task) => ({ ...task, name: task.title, course: task.courseTitle, due: "-", status: "Pending" }))} /></Panel>
                  <Panel title="Recent Learning Activity"><ActivityList items={ACTIVITY} /></Panel>
                </div>
              </>
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
                      background: C.pillBg, fontSize: 13, outline: "none", fontFamily: "inherit", color: C.text,
                    }}
                  />
                </div>
                <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 360px))", gap: 16 }}>
                  {filteredCourses.length ? filteredCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} onContinue={openCoursePlayer} onRequestEnrollment={(course) => onRequestCourseEnrollment?.(course)} />) : (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", color: C.textSecondary, fontSize: 13 }}>No courses match "{query}".</div>
                  )}
                </div>
              </>
            )}

            {activeNav === "my-courses" && (
              <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 360px))", gap: 16 }}>
                {enrolledCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} onContinue={openCoursePlayer} onRequestEnrollment={(course) => onRequestCourseEnrollment?.(course)} />)}
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
                  onOpenResource={setOpenResource}
                  onBack={() => handleNav("my-courses")}
                />
              ) : (
                <div style={{ padding: 24, color: C.textSecondary }}>Select a course from My Courses to start learning.</div>
              )
            )}

            {activeNav === "notifications" && (
              <Panel title="All Notifications" right={<button onClick={markAllRead} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mark all read</button>}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {notifs.map((n, i) => (
                    <li key={n.id} onClick={() => onReadNotification?.(n.id)} style={{ display: "flex", gap: 10, padding: "14px 20px", borderBottom: i === notifs.length - 1 ? "none" : `1px solid ${C.border}`, cursor: "pointer" }}>
                      {!n.read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e2734a", marginTop: 5, flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontSize: 13 }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{formatNotificationTime(n.createdAt)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {activeNav === "profile" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18, width: "100%", maxWidth: 1240 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22, boxShadow: "0 8px 24px rgba(48,35,24,.05)", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 26 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, gridColumn: "1 / -1", paddingBottom: 18 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>{studentInitials}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{studentName}</div>
                    <div style={{ fontSize: 12.5, color: C.textSecondary }}>Student{batchYear ? ` · Batch ${batchYear}` : ""}</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: C.green, background: C.greenBg, borderRadius: 999, padding: "5px 9px", fontSize: 10.5, fontWeight: 800 }}>Active</span>
                    <button type="button" onClick={() => showToast("Profile editing will be available soon.")} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 11px", color: C.textSecondary, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700 }}>Edit details</button>
                  </div>
                </div>
                {[["Student ID", user?.studentId || user?.registrationId || studentId || "Not assigned"], ["Email", studentEmail || "Not provided"], ["Phone", user?.phone || "Not provided"], ["Batch no.", batchYear ? String(batchYear) : "Not assigned"], ["Joined on", joinedLabel], ["Enrolled courses", `${enrolledCourses.length} courses`]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "12px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12.5 }}>
                    <span style={{ color: C.textSecondary }}>{k}</span>
                    <span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
                  </div>
                ))}
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22, boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div><div style={{ fontSize: 15, fontWeight: 800 }}>Learning overview</div><div style={{ marginTop: 3, fontSize: 12, color: C.textSecondary }}>Your course progress and certificates</div></div>
                    <div style={{ color: C.green, background: C.greenBg, padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>{averageProgress}% average</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                    {[["Enrolled", enrolledCourses.length], ["Completed", completedCourses.length], ["In progress", Math.max(enrolledCourses.length - completedCourses.length, 0)]].map(([label, value]) => <div key={label} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 10px", background: C.pillBg }}><div style={{ color: C.textMuted, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div><div style={{ marginTop: 4, fontSize: 20, fontWeight: 800 }}>{value}</div></div>)}
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 7 }}>Course progress</div>
                    {enrolledCourses.length ? enrolledCourses.slice(0, 4).map((course) => (
                      <div key={course.id} style={{ padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5, fontWeight: 700 }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.title}</span><span style={{ color: C.accent, flexShrink: 0 }}>{course.progress}%</span></div>
                        <div style={{ height: 6, borderRadius: 99, background: C.pillBg, marginTop: 7, overflow: "hidden" }}><div style={{ width: `${course.progress}%`, height: "100%", background: course.progress >= 100 ? C.green : C.accent, borderRadius: 99 }} /></div>
                      </div>
                    )) : <div style={{ padding: "12px 0", color: C.textSecondary, fontSize: 12.5 }}>No enrolled courses yet.</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 3 }}><div style={{ fontSize: 13, fontWeight: 800 }}>Certificates</div><span style={{ color: C.green, background: C.greenBg, padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>{completedCourses.length} available</span></div>
                  {completedCourses.length ? completedCourses.map((course) => {
                    const selected = String(selectedCertificate?.id) === String(course.id);
                    return (
                    <button type="button" key={course.id} onClick={() => setSelectedCertificateId(course.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 13, border: selected ? `1px solid ${C.accent}` : `1px solid ${C.border}`, borderRadius: 12, marginTop: 9, background: selected ? "#fbf6f0" : "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                      <div style={{ minWidth: 0 }}><div style={{ color: C.green, fontSize: 11, fontWeight: 800 }}>CERTIFICATE READY</div><div style={{ marginTop: 3, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.title}</div></div>
                      <span style={{ color: selected ? C.accentDark : C.textSecondary, fontSize: 11.5, fontWeight: 800, flexShrink: 0 }}>{selected ? "Selected" : "View"}</span>
                    </button>
                  );
                  }) : <div style={{ padding: 14, borderRadius: 12, background: C.pillBg, color: C.textSecondary, fontSize: 12.5 }}>Complete a course to unlock a downloadable certificate.</div>}
                </div>
                <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22, boxShadow: "0 8px 24px rgba(48,35,24,.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}><div><div style={{ fontSize: 16, fontWeight: 800 }}>Certificates</div></div><span style={{ color: "#df5b3f", background: "#fff5f1", border: "1px solid #f4c7ba", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800 }}>{completedCourses.length} available</span></div>
                  {selectedCertificate ? [selectedCertificate].map((course) => (
                    <div key={`preview-${course.id}`}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 16, background: "#fff" }}>
                        <div><div style={{ color: "#df5b3f", fontSize: 10.5, fontWeight: 800 }}>CERTIFICATE READY</div><div style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>{course.title}</div></div>
                        <div style={{ display: "flex", gap: 9 }}><Btn variant="outline" style={{ padding: "8px 14px", fontSize: 12 }} onClick={printCertificate}>Print</Btn><Btn variant="outline" style={{ padding: "8px 18px", fontSize: 12, background: "#f3f3f3", borderColor: "#ededed" }} onClick={() => downloadCertificate(course)}>Download PDF</Btn></div>
                      </div>
                      <img src={certificateArt} alt={`Certificate of Completion for ${studentName}: ${course.title}`} style={{ display: "block", width: "min(100%, 520px)", height: 420, objectFit: "fill", margin: "0 auto" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 16, padding: "16px 12px 2px", borderTop: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 13 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Icon.verify style={{ width: 17, height: 17, color: "#df5b3f" }} />Official verification record hosted on Ajmer Academic Board</span><span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><button type="button" onClick={() => shareCertificate(course)} style={{ border: 0, background: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon.share style={{ width: 16, height: 16 }} />Copy Link</button><span style={{ color: C.textMuted }}>•</span><button type="button" onClick={() => downloadCertificate(course)} style={{ border: 0, background: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon.download style={{ width: 16, height: 16 }} />Download PDF</button></span></div>
                    </div>
                  )) : <div style={{ padding: "22px 0", color: C.textSecondary, fontSize: 13 }}>Complete a course to unlock a verified certificate preview.</div>}
                </section>
              </div>
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
          fontSize: 12.5, fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 300,
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
        let savedProgress = null;
        if (uploadStudentResource && openResource?.courseId && openResource?.lessonId && openResource?.taskId) {
          savedProgress = await uploadStudentResource(file, openResource.courseId, openResource.lessonId, openResource.taskId, kind, studentId, openResource.section);
        }
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

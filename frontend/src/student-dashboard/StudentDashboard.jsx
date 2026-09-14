import React, { useEffect, useState, useMemo } from "react";

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
    { id: "logout", label: "Logout", icon: Icon.logout },
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
    fontFamily: "inherit",
  };
  const variants = {
    outline: { background: C.pillBg, color: C.text, border: `1px solid ${C.pillBorder}` },
    primary: { background: C.accent, color: "#fff" },
    delete: { background: C.deleteBg, color: C.deleteText },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], opacity: disabled ? 0.55 : 1, ...style }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(0.96)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
    >
      {children}
    </button>
  );
}

function CourseCard({ course, onOpen, onContinue }) {
  const activate = () => (course.enrolled ? (onContinue || onOpen)(course) : onOpen(course));
  return (
    <div
      onClick={activate}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20,
        boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)",
        display: "flex", flexDirection: "column", cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: C.badgeBg, color: C.badgeIcon,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon.courses style={{ width: 20, height: 20 }} />
        </div>
        {course.enrolled ? <Badge tone="green">✓ Enrolled</Badge> : <Badge>Not Enrolled</Badge>}
      </div>

      <h4 style={{ margin: "0 0 6px", fontSize: 15.5, fontWeight: 700 }}>{course.title}</h4>
      <p style={{ margin: "0 0 16px", fontSize: 12.5, color: C.textSecondary, minHeight: 34 }}>{course.desc}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        <Stat label="Duration" value={course.duration} />
        <Stat label="Lessons" value={course.lessons} />
        <Stat label="Status" value={course.enrolled ? "Active" : "Available"} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <Btn variant="primary" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); activate(); }}>
          {course.enrolled ? "Continue Course" : "Explore Course"}
        </Btn>
      </div>
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
  const progress = { ...(lesson.studentProgress || {}), ...progressOverride };
  const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
  const taskSubmissions = progress.taskSubmissions || {};
  const taskDone = tasks.filter((task, index) => taskSubmissions[String(task.id || `task-${index + 1}`)]?.submitted === true).length;
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

function CourseModal({ course, onClose, onToast, onContinue }) {
  if (!course) return null;

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
            <Btn variant="primary" style={{ width: "100%" }} onClick={() => { onToast(`Enrollment request sent for “${course.title}”.`); onClose(); }}>
              Request Enrollment
            </Btn>
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

  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    groups.forEach((g) => { initial[g.name] = true; });
    return initial;
  });
  useEffect(() => {
    if (currentSectionName) setExpanded((cur) => (cur[currentSectionName] ? cur : { ...cur, [currentSectionName]: true }));
  }, [currentSectionName]);

  useEffect(() => {}, [activeLessonUID]);

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
    if (t >= MIN_WATCH_SECONDS && !currentLesson.videoCompleted) onMarkWatched(currentLesson);
  };
  const handleEnded = () => { if (!currentLesson.videoCompleted) onMarkWatched(currentLesson); };

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
          <div style={{ width: 40, height: 40, borderRadius: 11, background: C.badgeBg, color: C.badgeIcon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon.courses style={{ width: 19, height: 19 }} />
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
            <MetaRow icon={Icon.clock} label="Duration seconds" value={currentLesson.durationSec ? `${currentLesson.durationSec} sec` : currentLesson.duration || "—"} />
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
export default function StudentDashboard({ user, onLogout, courses = [], notifications = [], onRefreshNotifications, onReadNotification, onReadAllNotifications, uploadStudentResource, saveLessonProgress }) {
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
  const notifs = notifications;
  const [toast, setToast] = useState(null);
  const [lessonProgress, setLessonProgress] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(`crmst-progress-${user?.id || user?._id}`) || "{}"); } catch { return {}; }
  });
  const [uploadedResources, setUploadedResources] = useState({});

  const studentName = user?.name || "Student";
  const studentInitials = initials(studentName);
  const studentEmail = user?.email || "";
  const studentId = String(user?.id || user?._id || "");

  const catalogCourses = useMemo(() => courses.map((course) => {
    const studentIds = Array.isArray(course.studentIds) ? course.studentIds.map(String) : [];
    const lessons = Array.isArray(course.lessons) ? course.lessons : [];
    return {
      ...course,
      id: course.id || course._id,
      title: course.title || "Untitled course",
      desc: course.syllabus || `${course.mode || "Online"} course covering ${course.tools || "practical skills"}.`,
      duration: course.duration || "-",
      lessons: course.totalLessons || lessons.length,
      lessonsData: lessons,
      enrolled: Boolean(studentId && studentIds.includes(studentId)),
      progress: lessons.length ? Math.round((lessons.reduce((total, lesson) => (
        total + getLessonProgressRatio(lesson, lessonProgress[getLessonProgressKey(course.id, lesson)] || {})
      ), 0) / lessons.length) * 100) : 0,
    };
  }), [courses, studentId, lessonProgress]);

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

  const openCoursePlayer = (course, lessonUID) => {
    setOpenCourse(null);
    setRecentCourseId(course.id);
    try { window.localStorage.setItem(recentCourseStorageKey, String(course.id)); } catch {}
    setPlayerCourseId(course.id);
    setPlayerLessonUID(lessonUID || pickDefaultLessonUID(course));
    setPlayerTab("about");
    setActiveNav("course-player");
    setMobileOpen(false);
  };
  const playerCourse = catalogCourses.find((c) => c.id === playerCourseId) || null;
  const unreadCount = notifs.filter(n => !n.read).length;
  useEffect(() => {
    if (!onRefreshNotifications) return undefined;
    const interval = window.setInterval(onRefreshNotifications, 15000);
    return () => window.clearInterval(interval);
  }, [onRefreshNotifications]);

  const markAllRead = () => onReadAllNotifications?.();

  const meta = PAGE_META[activeNav] || PAGE_META.dashboard;

  const handleNav = (id) => {
    setActiveNav(id);
    setMobileOpen(false);
    if (id === "logout") {
      if (onLogout) onLogout();
      else showToast("Logged out (demo only — this is a prototype).");
    }
  };

  return (
    <div style={{ fontFamily: "Manrope, sans-serif", background: C.bg, color: C.text, minHeight: "100vh", fontSize: 13.5, position: "relative" }}>
      <style>{`
        * { box-sizing: border-box; }
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
          min-height: 100vh;
          display: grid !important;
          grid-template-columns: 302px 1fr;
          padding: 16px;
          gap: 16px;
        }
        .sd-sidebar {
          position: static !important;
          width: auto !important;
          min-height: calc(100vh - 32px);
          border-radius: 30px !important;
          padding: 18px 14px 14px !important;
          box-shadow: 0 24px 50px rgba(8, 9, 10, 0.22) !important;
        }
        .sd-main {
          margin-left: 0 !important;
          min-width: 0;
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
          padding: 24px !important;
          overflow: auto;
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

          <div style={{ borderTop: "1px solid rgba(216,82,53,0.28)", padding: "14px 16px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => handleNav("profile")}>
            <div style={{ width: 38, height: 38, borderRadius: 14, background: "linear-gradient(135deg, #e0694d, #b73e28)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12.5, flexShrink: 0 }}>{studentInitials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.8, fontWeight: 700, color: C.sidebarTextBright, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{studentName}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.66)" }}>Student</div>
            </div>
            <Icon.chevronDown style={{ width: 14, height: 14, color: "rgba(255,255,255,0.52)", marginLeft: "auto", flexShrink: 0 }} />
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

              <div onClick={() => handleNav("profile")} style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px 4px 4px", border: `1px solid ${C.border}`, borderRadius: 24, cursor: "pointer" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.badgeBg, color: C.badgeIcon, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{studentInitials}</div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{studentName}</div>
                  <div style={{ fontSize: 10.5, color: C.textSecondary }}>Student</div>
                </div>
                <Icon.chevronDown style={{ width: 12, height: 12, color: C.textMuted, marginLeft: 2 }} />
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
                <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 26 }}>
                  {catalogCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} onContinue={openCoursePlayer} />)}
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
                <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {filteredCourses.length ? filteredCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} onContinue={openCoursePlayer} />) : (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", color: C.textSecondary, fontSize: 13 }}>No courses match "{query}".</div>
                  )}
                </div>
              </>
            )}

            {activeNav === "my-courses" && (
              <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {enrolledCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} onContinue={openCoursePlayer} />)}
              </div>
            )}

            {activeNav === "course-player" && (
              playerCourse ? (
                <CoursePlayer
                  course={playerCourse}
                  lessonProgress={lessonProgress}
                  activeLessonUID={playerLessonUID}
                  activeTab={playerTab}
                  onSelectLesson={(uid) => { setPlayerLessonUID(uid); setPlayerTab("about"); }}
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
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 26, maxWidth: 480, boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>{studentInitials}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{studentName}</div>
                    <div style={{ fontSize: 12.5, color: C.textSecondary }}>Student · Batch of 2026</div>
                  </div>
                </div>
                {[["Email", studentEmail || "—"], ["Enrolled Courses", `${enrolledCourses.length} courses`], ["Member Since", "Jan 2026"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
                    <span style={{ color: C.textSecondary }}>{k}</span>
                    <span style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
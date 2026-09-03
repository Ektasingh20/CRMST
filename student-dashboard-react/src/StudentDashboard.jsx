import React, { useState, useMemo } from "react";

/* ============================================================
   THEME TOKENS — pulled from the reference CRM screenshot
   ============================================================ */
const C = {
  sidebarBg: "#211c2e",
  sidebarBg2: "#2a2438",
  sidebarLabel: "#8b8494",
  sidebarText: "#c9c4d1",
  sidebarTextBright: "#f3f1f6",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarActive: "rgba(255,255,255,0.09)",
  sidebarBorder: "rgba(255,255,255,0.08)",

  bg: "#f5f1e9",
  card: "#ffffff",
  border: "#eee8dc",
  text: "#211c2e",
  textSecondary: "#736b62",
  textMuted: "#a49b8f",

  badgeBg: "#f3ddba",
  badgeIcon: "#7a4a1e",
  

  accent: "#5c3a2e",
  accentDark: "#472c22",

  pillBg: "#faf7f0",
  pillBorder: "#ece4d3",

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
  {
    id: "frontend-foundation",
    title: "Front End Development Foundation",
    desc: "Build a strong foundation in front-end web development.",
    duration: "3 months",
    price: "₹9,000",
    software: ["HTML5", "CSS3", "Bootstrap", "JavaScript", "jQuery", "Responsive Design", "Git"],
    enrolled: true,
    progress: 72,
    currentLesson: "Front End Development Foundation",
    lastWatched: "Continue your front-end training"
  },

  {
    id: "frontend-development",
    title: "Front End Development",
    desc: "Learn modern front-end development and popular frameworks.",
    duration: "5 months",
    price: "₹13,000",
    software: ["HTML5", "CSS3", "Bootstrap", "JavaScript", "jQuery", "React JS", "Next.js", "Angular", "Git"],
    enrolled: false
  },

  {
    id: "backend-php",
    title: "Back End Development",
    desc: "Learn backend development, APIs, authentication and deployment.",
    duration: "6 months",
    price: "₹12,000",
    software: ["PHP", "MySQL", "RESTful APIs", "Authentication & Security", "Git", "Deployment & Hosting"],
    enrolled: false
  },

  {
    id: "backend-python",
    title: "Back End Development",
    desc: "Develop backend applications using Python and databases.",
    duration: "6 months",
    price: "₹14,000 - 1 DB / ₹16,000 - 2 DB",
    software: ["Python", "MongoDB", "PostgreSQL", "REST APIs", "Authentication", "Git", "Deployment"],
    enrolled: false
  },

  {
    id: "backend-node",
    title: "Back End Development",
    desc: "Build scalable backend applications using Node.js.",
    duration: "6 months",
    price: "₹15,000",
    software: ["Node.js", "PostgreSQL", "RESTful APIs", "Authentication & Security", "Git", "Deployment & Hosting"],
    enrolled: false
  },

  {
    id: "fullstack-php",
    title: "Full Stack Development",
    desc: "Learn complete web development from frontend to backend.",
    duration: "7 months",
    price: "₹18,000",
    software: ["Front-End Basics", "PHP", "MySQL", "REST APIs", "Authentication & Security", "Git", "Deployment"],
    enrolled: false
  },

  {
    id: "fullstack-python",
    title: "Full Stack Development",
    desc: "Build full-stack applications using Python and PostgreSQL.",
    duration: "7 months",
    price: "₹22,000",
    software: ["Front-End Basics", "Python", "PostgreSQL", "REST APIs", "Authentication & Security", "Git", "Deployment"],
    enrolled: false
  },

  {
    id: "fullstack-node",
    title: "Full Stack Development",
    desc: "Build modern full-stack applications using Node.js and MongoDB.",
    duration: "7 months",
    price: "₹28,000",
    software: ["Front-End Basics", "Node.js", "MongoDB", "REST APIs", "Authentication & Security", "Git", "Deployment"],
    enrolled: false
  },

  {
    id: "video-editing",
    title: "Video Editing",
    desc: "Learn professional video editing, effects, audio and color correction.",
    duration: "3 months",
    price: "₹14,000",
    software: [
      "Sequencing & Media Import",
      "Basic Editing",
      "Effects",
      "Audio",
      "Color Correction",
      "Slow Motion",
      "Green Screen",
      "Exporting"
    ],
    enrolled: false
  },

  {
    id: "autocad",
    title: "AutoCAD (2D & 3D)",
    desc: "Learn 2D drafting, advanced design and 3D modeling with AutoCAD.",
    duration: "3 months",
    price: "₹11,000",
    software: [
      "Introduction to AutoCAD",
      "2D Drafting & Design",
      "Advanced 2D",
      "3D Modeling",
      "Real-World Project"
    ],
    enrolled: false
  },

  {
    id: "wordpress",
    title: "WordPress Web Design",
    desc: "Create and customize professional WordPress websites.",
    duration: "2 months",
    price: "₹8,000",
    software: [
      "WordPress",
      "Content Management",
      "Theme Customization",
      "Plugins",
      "Website Optimization",
      "WooCommerce",
      "Advanced Features"
    ],
    enrolled: false
  },

  {
    id: "android",
    title: "Android App Development",
    desc: "Learn Android application development from UI to publishing.",
    duration: "6 months",
    price: "₹17,000",
    software: [
      "Kotlin / Java",
      "UI Design",
      "Activities & Navigation",
      "Data Management",
      "Networking & APIs",
      "Testing & Debugging",
      "Publishing"
    ],
    enrolled: false
  },

  {
    id: "vfx-animation",
    title: "VFX & Animation",
    desc: "Learn 2D and 3D animation, VFX, compositing and rendering.",
    duration: "7 months",
    price: "₹30,000",
    software: [
      "Adobe After Effects",
      "Blender",
      "Illustrator",
      "Autodesk Maya",
      "2D & 3D Animation",
      "Compositing",
      "Motion Tracking",
      "Lighting",
      "Texturing",
      "Rendering",
      "Portfolio"
    ],
    enrolled: false
  },

  {
    id: "graphics-design",
    title: "Graphics & Visual Designing",
    desc: "Learn graphic design, visual design, branding and portfolio creation.",
    duration: "4 months",
    price: "₹16,000",
    software: [
      "Photoshop",
      "Illustrator",
      "InDesign",
      "Canva",
      "Figma",
      "Typography",
      "Color Theory",
      "Layout & Composition",
      "Branding",
      "Portfolio"
    ],
    enrolled: false
  },

  {
    id: "photoshop",
    title: "Adobe Photoshop",
    desc: "Learn Photoshop fundamentals, effects, selections, masks and exporting.",
    duration: "2 months",
    price: "₹6,000",
    software: [
      "Introduction",
      "Layers",
      "Text & Shapes",
      "Filters & Effects",
      "Layer Masks & Selections",
      "Exporting"
    ],
    enrolled: false
  },

  {
    id: "coreldraw",
    title: "CorelDraw",
    desc: "Learn vector graphics, typography, effects and professional printing.",
    duration: "1.5 months",
    price: "₹5,500",
    software: [
      "Basic Shapes & Lines",
      "Text",
      "Effects & Styles",
      "Layers & Object Management",
      "Exporting & Printing"
    ],
    enrolled: false
  },

  {
    id: "digital-marketing",
    title: "Digital Marketing",
    desc: "Learn SEO, social media, analytics, advertising and content marketing.",
    duration: "6 months",
    price: "₹22,000",
    software: [
      "SEO",
      "SMO",
      "Google Analytics 4",
      "GTM",
      "Content Marketing",
      "YouTube Marketing",
      "ASO",
      "GMB",
      "Google Ads",
      "Facebook Ads",
      "Email Marketing",
      "WordPress"
    ],
    enrolled: false
  },

  {
    id: "illustrator",
    title: "Adobe Illustrator",
    desc: "Learn illustration, typography, branding, logo design and advanced Illustrator techniques.",
    duration: "2 months",
    price: "₹8,000",
    software: [
      "Illustrator & UI",
      "Basic Shapes & Tools",
      "Pen Tool Illustrations",
      "Typography & Text Effects",
      "Layers & Artboards",
      "Advanced Techniques",
      "Brushes",
      "Logo Design & Branding",
      "Exporting"
    ],
    enrolled: false
  },

  {
    id: "3d-design",
    title: "3D Interior & Exterior Design",
    desc: "Learn interior and exterior design for residential and commercial spaces.",
    duration: "6 months",
    price: "₹26,000",
    software: [
      "Design Principles",
      "Interior Fundamentals",
      "Design Tools & Software",
      "Residential Interior",
      "Commercial Interior",
      "Exterior Design"
    ],
    enrolled: false
  }
];

const ASSIGNMENTS = [
  { id: 1, name: "Responsive Landing Page", course: "Front End Development Foundation", due: "Aug 28, 2026", status: "Pending" },
  { id: 2, name: "HTML & CSS Practical", course: "Front End Development Foundation", due: "Aug 24, 2026", status: "Submitted" },
  { id: 3, name: "JavaScript Fundamentals", course: "Front End Development", due: "Sep 2, 2026", status: "Evaluated" },
  { id: 4, name: "Git & Version Control Task", course: "Front End Development Foundation", due: "Sep 5, 2026", status: "Pending" },
];

const ACTIVITY = [
  { id: 1, text: "Completed a lesson", detail: "HTML5 & CSS3 Fundamentals", time: "2 hours ago" },
  { id: 2, text: "Watched a video", detail: "Responsive Web Design", time: "2 days ago" },
  { id: 3, text: "Downloaded notes", detail: "JavaScript Fundamentals", time: "3 days ago" },
  { id: 4, text: "Submitted an assignment", detail: "HTML & CSS Practical", time: "5 days ago" },
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
  { label: "Learning", items: [
    { id: "videos", label: "Videos", icon: Icon.video },
    { id: "notes", label: "Notes", icon: Icon.notes },
    { id: "assignments", label: "Assignments", icon: Icon.assignments },
    { id: "progress", label: "My Progress", icon: Icon.progress },
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
  "videos": { title: "Videos", sub: "Video lessons from your enrolled courses" },
  "notes": { title: "Notes", sub: "Downloadable notes from your enrolled courses" },
  "assignments": { title: "Assignments", sub: "Track and submit your coursework" },
  "progress": { title: "My Progress", sub: "Your progress across enrolled courses" },
  "notifications": { title: "Notifications", sub: "Recent updates and reminders" },
  "profile": { title: "Profile", sub: "Your account details" },
};

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

function CourseCard({ course, onOpen }) {
  return (
    <div
      onClick={() => onOpen(course)}
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
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.textSecondary, minHeight: 34 }}>{course.desc}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
        <Stat label="Duration" value={course.duration} />
        <Stat label="Price" value={course.price} />
        <Stat label="Status" value={course.enrolled ? "Active" : "Locked"} />
      </div>

      <div style={{
        marginBottom: 16,
        fontSize: 11.5,
        lineHeight: 1.55,
        color: C.textSecondary,
        minHeight: 34,
      }}>
        <span style={{ fontWeight: 700, color: C.text }}>Software & Tools:</span>{" "}
        {course.software?.join(" • ")}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <Btn variant="primary" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onOpen(course); }}>
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
function CourseModal({ course, onClose, onToast }) {
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
        background: C.card, borderRadius: 20, maxWidth: 480, width: "100%",
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

        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>{course.title}</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textSecondary }}>{course.desc}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18, padding: 14, background: C.pillBg, borderRadius: 12 }}>
          <Stat label="Duration" value={course.duration} />
          <Stat label="Price" value={course.price} />
          <Stat label="Status" value={course.enrolled ? "Enrolled" : "Not Enrolled"} />
        </div>

        <div style={{
          marginBottom: 18,
          padding: 14,
          background: C.pillBg,
          border: `1px solid ${C.pillBorder}`,
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: C.textMuted, fontWeight: 700, marginBottom: 7 }}>
            Software & Tools
          </div>
          <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.65 }}>
            {course.software?.join(" • ")}
          </div>
        </div>

        {course.enrolled ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1, height: 7, background: "#f0ece2", borderRadius: 20, overflow: "hidden" }}>
                <div style={{ width: `${course.progress}%`, height: "100%", background: C.accent, borderRadius: 20 }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{course.progress}%</div>
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 18px" }}>Current lesson: {course.currentLesson}</p>
            <Btn variant="primary" style={{ width: "100%" }} onClick={() => { onToast("Resuming \u201c" + course.currentLesson + "\u201d\u2026"); onClose(); }}>
              Continue Learning
            </Btn>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: C.textSecondary, marginBottom: 18 }}>
              Enroll in this course to unlock its videos, notes and assignments.
            </p>
            <Btn variant="primary" style={{ width: "100%" }} onClick={() => { onToast("Enrollment request sent for \u201c" + course.title + "\u201d."); onClose(); }}>
              Request Enrollment
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   PAGE SECTIONS
   ============================================================ */
function WelcomeBanner() {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 22px",
      marginBottom: 20, boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)",
    }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Welcome back, Student!</h2>
      <p style={{ margin: 0, fontSize: 12.5, color: C.textSecondary }}>Continue learning and keep track of your progress.</p>
    </div>
  );
}

function SummaryCards() {
  const items = [
    { label: "Total Courses", value: COURSES.length, icon: Icon.courses },
    { label: "Enrolled Courses", value: COURSES.filter(c => c.enrolled).length, icon: Icon.myCourses },
    { label: "Completed Courses", value: 1, icon: Icon.check },
    { label: "Pending Assignments", value: ASSIGNMENTS.filter(a => a.status === "Pending").length, icon: Icon.assignments },
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

function ContinueLearning({ onOpen }) {
  const course = COURSES.find(c => c.enrolled) || COURSES[0];
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

function AssignmentsTable({ rows }) {
  const badgeTone = { Pending: "amber", Submitted: "neutral", Evaluated: "green" };
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
          <tr key={a.id}>
            <td style={cellStyle(i, rows.length)}>
              <div style={{ fontWeight: 700 }}>{a.name}</div>
            </td>
            <td style={cellStyle(i, rows.length)}>{a.course}</td>
            <td style={cellStyle(i, rows.length)}>{a.due}</td>
            <td style={cellStyle(i, rows.length)}><Badge tone={badgeTone[a.status]}>{a.status}</Badge></td>
            <td style={cellStyle(i, rows.length)}>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>
                {a.status === "Pending" ? "Start" : "View"}
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

/* ============================================================
   MAIN APP
   ============================================================ */
export default function StudentDashboard({ user, onLogout }) {
  const studentName = user?.name || "Student";
  const studentEmail = user?.email || "";

  function initials(name) {
    return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }
  const studentInitials = initials(studentName);

  const [activeNav, setActiveNav] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openCourse, setOpenCourse] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2600);
  };

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COURSES;
    return COURSES.filter(c => c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  }, [query]);

  const enrolledCourses = COURSES.filter(c => c.enrolled);
  const unreadCount = notifs.filter(n => n.unread).length;

  const markAllRead = () => setNotifs(notifs.map(n => ({ ...n, unread: false })));

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
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", background: C.bg, color: C.text, minHeight: "100vh", fontSize: 13.5, position: "relative" }}>
      <style>{`
        * { box-sizing: border-box; }
        @media (max-width: 1180px) {
          .summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .courses-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .two-col { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 860px) {
          .sd-sidebar { transform: translateX(-100%); }
          .sd-sidebar.open { transform: translateX(0); }
          .sd-main { margin-left: 0 !important; }
          .sd-menu-toggle { display: flex !important; }
          .sd-overlay.show { display: block !important; }
        }
        @media (max-width: 600px) {
          .summary-grid { grid-template-columns: 1fr 1fr !important; }
          .courses-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {mobileOpen && (
        <div className="sd-overlay show" onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,17,28,0.5)", zIndex: 90 }} />
      )}

      <div style={{ display: "flex" }}>
        {/* SIDEBAR */}
        <aside className={`sd-sidebar${mobileOpen ? " open" : ""}`} style={{
          width: 254, background: C.sidebarBg, position: "fixed", top: 0, left: 0, bottom: 0,
          display: "flex", flexDirection: "column", zIndex: 100, transition: "transform .2s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 20px 18px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 13 }}>ED</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: C.sidebarTextBright }}>EduCRM</div>
              <div style={{ fontSize: 10.5, color: "#6c637a", marginTop: 1 }}>Learning Portal</div>
            </div>
          </div>

          <nav style={{ flex: 1, overflowY: "auto", padding: "4px 12px 10px" }}>
            {NAV_SECTIONS.map(section => (
              <div key={section.label}>
                <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.09em", color: C.sidebarLabel, fontWeight: 700, padding: "16px 10px 8px" }}>{section.label}</div>
                {section.items.map(item => {
                  const active = activeNav === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: 8,
                        color: active ? "#fff" : C.sidebarText, background: active ? C.sidebarActive : "transparent",
                        fontSize: 13, fontWeight: 500, marginBottom: 1, cursor: "pointer", position: "relative",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.sidebarHover; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      {active && <span style={{ position: "absolute", left: -12, top: "50%", transform: "translateY(-50%)", width: 3, height: 18, background: "#e2b97e", borderRadius: "0 3px 3px 0" }} />}
                      <item.icon style={{ width: 16, height: 16, opacity: 0.9, flexShrink: 0 }} />
                      <span>{item.label}</span>
                      {item.id === "notifications" && unreadCount > 0 && (
                        <span style={{ marginLeft: "auto", background: "#e2734a", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>{unreadCount}</span>
                      )}
                      {["all-courses", "my-courses", "assignments"].includes(item.id) && !(item.id === "notifications" && unreadCount > 0) && (
                        <Icon.chevronRight style={{ width: 13, height: 13, opacity: 0.45, marginLeft: "auto" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          <div style={{ borderTop: `1px solid ${C.sidebarBorder}`, padding: "14px 16px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => handleNav("profile")}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>{studentInitials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.8, fontWeight: 700, color: C.sidebarTextBright, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{studentName}</div>
              <div style={{ fontSize: 11, color: "#6c637a" }}>Student</div>
            </div>
            <Icon.chevronDown style={{ width: 14, height: 14, color: "#6c637a", marginLeft: "auto", flexShrink: 0 }} />
          </div>
        </aside>

        {/* MAIN */}
        <div className="sd-main" style={{ marginLeft: 254, flex: 1, minWidth: 0 }}>
          {/* TOPBAR */}
          <header style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="sd-menu-toggle" onClick={() => setMobileOpen(true)} style={{ display: "none", background: "none", border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, alignItems: "center", justifyContent: "center", color: C.textSecondary, cursor: "pointer" }}>
                <Icon.menu style={{ width: 16, height: 16 }} />
              </button>
              <div>
                <h1 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>{meta.title}</h1>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textSecondary }}>{meta.sub}</p>
              </div>
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
                      <div key={n.id} style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
                        {n.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e2734a", marginTop: 5, flexShrink: 0 }} />}
                        <div>
                          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>{n.text}</div>
                          <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 2 }}>{n.time}</div>
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
          <div style={{ padding: "22px 28px 46px" }} onClick={() => notifOpen && setNotifOpen(false)}>

            {activeNav === "dashboard" && (
              <>
                <WelcomeBanner />
                <SummaryCards />
                <ContinueLearning onOpen={setOpenCourse} />

                <SectionHead title="All Courses" right={<a href="#" onClick={(e) => { e.preventDefault(); handleNav("all-courses"); }} style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>View all</a>} />
                <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 26 }}>
                  {COURSES.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} />)}
                </div>

                <SectionHead title="Recent Assignments & Activity" />
                <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
                  <Panel title="Recent Assignments"><AssignmentsTable rows={ASSIGNMENTS} /></Panel>
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
                  {filteredCourses.length ? filteredCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} />) : (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", color: C.textSecondary, fontSize: 13 }}>No courses match "{query}".</div>
                  )}
                </div>
              </>
            )}

            {activeNav === "my-courses" && (
              <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {enrolledCourses.map(c => <CourseCard key={c.id} course={c} onOpen={setOpenCourse} />)}
              </div>
            )}

            {activeNav === "videos" && (
              <Panel title="Course Videos">
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {COURSES.map((c, i) => (
                    <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: i === COURSES.length - 1 ? "none" : `1px solid ${C.border}` }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: c.enrolled ? C.badgeBg : "#f1ede4", color: c.enrolled ? C.badgeIcon : C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {c.enrolled ? <Icon.play style={{ width: 15, height: 15 }} /> : <Icon.lock style={{ width: 14, height: 14 }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{c.title}</div>
                        <div style={{ fontSize: 11.5, color: C.textMuted }}>{c.enrolled ? "Video lessons unlocked" : "Enroll to unlock video lessons"}</div>
                      </div>
                      {c.enrolled
                        ? <Btn variant="primary" onClick={() => setOpenCourse(c)}>Watch</Btn>
                        : <Btn variant="outline" onClick={() => setOpenCourse(c)} disabled={false}>Locked</Btn>}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {activeNav === "notes" && (
              <Panel title="Course Notes">
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {COURSES.map((c, i) => (
                    <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: i === COURSES.length - 1 ? "none" : `1px solid ${C.border}` }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: c.enrolled ? C.badgeBg : "#f1ede4", color: c.enrolled ? C.badgeIcon : C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {c.enrolled ? <Icon.notes style={{ width: 15, height: 15 }} /> : <Icon.lock style={{ width: 14, height: 14 }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{c.title} — Notes</div>
                        <div style={{ fontSize: 11.5, color: C.textMuted }}>{c.enrolled ? "PDF & slide notes available" : "Enroll to unlock notes"}</div>
                      </div>
                      {c.enrolled
                        ? <Btn variant="outline" onClick={() => showToast(`Downloading notes for "${c.title}"…`)}>Download</Btn>
                        : <Btn variant="outline" onClick={() => setOpenCourse(c)}>Locked</Btn>}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {activeNav === "assignments" && (
              <Panel title="All Assignments"><AssignmentsTable rows={ASSIGNMENTS} /></Panel>
            )}

            {activeNav === "progress" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {enrolledCourses.map(c => (
                  <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20, boxShadow: "0 1px 2px rgba(33,28,46,0.03), 0 4px 14px rgba(33,28,46,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{c.title}</h4>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{c.progress || 0}%</span>
                    </div>
                    <div style={{ height: 8, background: "#f0ece2", borderRadius: 20, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ width: `${c.progress || 0}%`, height: "100%", background: C.accent, borderRadius: 20 }} />
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary }}>Current lesson: {c.currentLesson || "Course not started yet"}</div>
                  </div>
                ))}
              </div>
            )}

            {activeNav === "notifications" && (
              <Panel title="All Notifications" right={<button onClick={markAllRead} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mark all read</button>}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {notifs.map((n, i) => (
                    <li key={n.id} style={{ display: "flex", gap: 10, padding: "14px 20px", borderBottom: i === notifs.length - 1 ? "none" : `1px solid ${C.border}` }}>
                      {n.unread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e2734a", marginTop: 5, flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontSize: 13 }}>{n.text}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{n.time}</div>
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

      <CourseModal course={openCourse} onClose={() => setOpenCourse(null)} onToast={showToast} />
    </div>
  );
}

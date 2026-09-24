import CallLeadsPanel from "./CallLeadsPanel.jsx";
import RemarkField from "./RemarkField.jsx";
import { callLeadForm, isCallLead } from "./callLeads.js";
import { subscribeCallListChanges } from "./backendApi.js";
import { mergeCallListRows } from "./callListConfig.js";
import { TRAINING_CALL_LIST_PROGRAMS, SERVICE_CALL_LIST_SERVICES, CALL_STATUS_OPTIONS, CALL_LIST_INTEREST_STATUS_OPTIONS, normalizeCallStatus, normalizeInterestStatus, normalizeCallProgram, callListPrograms, matchesCallListFilters } from "./callListConfig.js";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Activity,
  ArrowRight,
  Award,
  BadgeIndianRupee,
  BarChart3,
  Bell,
  Blocks,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarClock,
  CalendarMinus2,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Code2,
  CirclePlus,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  ContactRound,
  DoorOpen,
  DraftingCompass,
  Edit3,
  Figma,
  Film,
  Globe,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  ListTodo,
  LockKeyhole,
  Menu,
  MessageCircle,
  Megaphone,
  MonitorSmartphone,
  Palette,
  PenTool,
  PhoneCall,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  Upload,
  User,
  UserPlus,
  UserRoundCheck,
  Users,
  Workflow,
  X,
  Eye,
  EyeOff,
  FileText,
  Plus,
  FolderUp,
  Info,
  ChevronDown,
  Video,
  Layers,
} from "lucide-react";
import crmHero from "./assets/crm-hero.png";
import crmOperations from "./assets/crm-operations.png";
import programImage1 from "./assets/1.png";
import programImage2 from "./assets/2.png";
import programImage3 from "./assets/3.png";
import programImage4 from "./assets/4.png";
import programImage5 from "./assets/5.png";
import programImage11 from "./assets/11.png";
import programImage12 from "./assets/12.png";
import programImage13 from "./assets/13.png";
import programImage14 from "./assets/14.png";
import {
  authLogin,
  authSignup,
  loadUsers,
  loadAssignableUsers,
  loadLeads,
  loadServices,
  saveServicesToBackend,
  loadTrainings,
  saveTrainingsToBackend,
  loadCourses,
  loadCourse,
  loadNotifications,
  readNotification,
  readAllNotifications,
  loadEnrollmentRequests,
  requestCourseEnrollment,
  loadPendingEnrollmentRequests,
  updateEnrollmentRequestStatusForAdmin,
  createCourse,
  updateCourse,
  deleteCourse,
  addCourseLesson,
  deleteCourseLesson,
  updateCourseLesson,
  loadStipPrograms,
  loadStipApplications,
  loadTasks,
  createTask,
  saveTasksToBackend,
  loadLeaves,
  saveLeavesToBackend,
  updateLeave,
  loadAttendance,
  saveAttendanceToBackend,
  loadEmployees,
  saveEmployeesToBackend,
  createUser,
  updateUser,
  changePassword,
  deleteUser,
  createLead as createLeadApi,
  updateLead,
  deleteLead,
  createService,
  updateService,
  deleteService,
  createTraining,
  updateTraining,
  deleteTraining as deleteTrainingApi,
  createStipProgram,
  updateStipProgram,
  deleteStipProgram as deleteStipProgramApi,
  createStipApplication,
  updateStipApplication,
  deleteStipApplication,
  uploadImage,
  uploadCourseAsset,
  uploadStudentCourseResource,
  saveStudentLessonProgress,
  loadTaskSubmissions,
  gradeStudentTask,
  invalidateCoursesCache,
  getCurrentUser,
  logoutUser,
  loadCallListData,
  uploadCallListData,
  saveCallListData,
  removeCallListData,
} from "./backendClient";
import ErrorBoundary from "./ErrorBoundary";
import StudentDashboard from "./src/student-dashboard/StudentDashboard";
import CrmExecutiveDashboard from "./src/crm-executive/CrmExecutiveDashboard";
import ITDashboard from "./src/It- dashboard/ITDashboard";
import CreateProjectForm from "./src/admin/CreateProjectForm";
import {
  compressImageFile,
  createPreviewUrl,
  revokePreviewUrl,
  sanitizeImageCollection,
  sanitizeImageRecord,
  sanitizeImageReference,
} from "./imageUpload";

const STUDENT_DASHBOARD_URL = "http://localhost:5175";

const USERS_STORAGE_KEY = "crmst-users.txt";
const LEADS_STORAGE_KEY = "crmst-leads.txt";
const LEADS_CACHE_VERSION = 3;
const SESSION_STORAGE_KEY = "crmst-current-user";
const SAVED_LOGIN_STORAGE_KEY = "crmst-saved-login";
const SERVICES_STORAGE_KEY = "crmst-services.txt";
const TRAININGS_STORAGE_KEY = "crmst-trainings.txt";
const STIP_PROGRAMS_STORAGE_KEY = "crmst-stip-programs.txt";
const STIP_APPLICATIONS_STORAGE_KEY = "crmst-stip-applications.txt";
const STUDENT_COURSES_STORAGE_KEY = "crmst-student-courses-v2.txt";
const STUDENT_COURSES_CACHE_TTL_MS = 5 * 60 * 1000;
const STUDENT_NOTIFICATIONS_STORAGE_KEY = "crmst-student-notifications-v2.txt";
const STUDENT_NOTIFICATIONS_CACHE_TTL_MS = 5 * 60 * 1000;
const STUDENT_ENROLLMENT_REQUESTS_STORAGE_KEY = "crmst-student-enrollment-requests-v1.txt";
const STUDENT_ENROLLMENT_REQUESTS_CACHE_TTL_MS = 5 * 60 * 1000;
const ENROLLMENT_REQUEST_SYNC_KEY = "crmst-enrollment-request-sync-v1";
const CRM_EXEC_LEADS_STORAGE_KEY = "crmExec.adminLeads";

function publishEnrollmentRequestEvent(request) {
  if (!request) return;
  const message = JSON.stringify({ request, sentAt: Date.now() });
  try { localStorage.setItem(ENROLLMENT_REQUEST_SYNC_KEY, message); } catch {}
  try { window.dispatchEvent(new CustomEvent("crmst:enrollment-request", { detail: request })); } catch {}
}

function isCrmExecutive(role) {
  return ["crm executive", "crm_executive"].includes(String(role || "").trim().toLowerCase());
}

function isAdminUser(user) {
  const role = String(user?.role || "").trim().toLowerCase();
  const department = String(user?.dept || user?.department || "").trim().toLowerCase();
  const username = String(user?.username || "").trim().toLowerCase();
  return ["admin", "administrator", "super admin", "superadmin"].includes(role)
    || department === "admin"
    || username === "admin";
}

function isLeadAssignmentUser(user) {
  const role = String(user?.role || "").trim().toLowerCase();
  const department = String(user?.dept || user?.department || "").trim().toLowerCase();
  const position = String(user?.position || "").trim().toLowerCase();
  const status = String(user?.status || "Active").trim().toLowerCase();
  return status !== "inactive" && (
    role.includes("admin") || role.startsWith("operation")
    || department.includes("admin") || department.startsWith("operation")
    || position.includes("admin") || position.startsWith("operation")
  );
}

function getStudentCacheUserKey(user) {
  return String(user?.id || user?._id || user?.username || user?.email || "").trim().toLowerCase();
}

function readStudentCoursesFromStorage(user) {
  const userKey = getStudentCacheUserKey(user);
  if (!userKey) return { courses: [], fetchedAt: 0 };
  try {
    const raw = localStorage.getItem(STUDENT_COURSES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.userKey !== userKey || !Array.isArray(parsed.courses)) return { courses: [], fetchedAt: 0 };
    return { courses: parsed.courses, fetchedAt: Number(parsed.fetchedAt || 0) };
  } catch {
    return { courses: [], fetchedAt: 0 };
  }
}

function writeStudentCoursesToStorage(user, courses) {
  const userKey = getStudentCacheUserKey(user);
  if (!userKey || !Array.isArray(courses) || courses.length === 0) return;
  safeStorageSet(STUDENT_COURSES_STORAGE_KEY, JSON.stringify({ userKey, courses, fetchedAt: Date.now() }));
}

function readStudentNotificationsFromStorage(user) {
  const userKey = getStudentCacheUserKey(user);
  if (!userKey) return { items: [], fetchedAt: 0 };
  try {
    const raw = localStorage.getItem(STUDENT_NOTIFICATIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.userKey !== userKey || !Array.isArray(parsed.items)) return { items: [], fetchedAt: 0 };
    return { items: parsed.items, fetchedAt: Number(parsed.fetchedAt || 0) };
  } catch {
    return { items: [], fetchedAt: 0 };
  }
}

function writeStudentNotificationsToStorage(user, items) {
  const userKey = getStudentCacheUserKey(user);
  if (!userKey || !Array.isArray(items)) return;
  safeStorageSet(STUDENT_NOTIFICATIONS_STORAGE_KEY, JSON.stringify({ userKey, items, fetchedAt: Date.now() }));
}

function readStudentEnrollmentRequestsFromStorage(user) {
  const userKey = getStudentCacheUserKey(user);
  if (!userKey) return { items: [], fetchedAt: 0 };
  try {
    const raw = localStorage.getItem(STUDENT_ENROLLMENT_REQUESTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.userKey !== userKey || !Array.isArray(parsed.items)) return { items: [], fetchedAt: 0 };
    return { items: parsed.items, fetchedAt: Number(parsed.fetchedAt || 0) };
  } catch {
    return { items: [], fetchedAt: 0 };
  }
}

function writeStudentEnrollmentRequestsToStorage(user, items) {
  const userKey = getStudentCacheUserKey(user);
  if (!userKey || !Array.isArray(items)) return;
  safeStorageSet(STUDENT_ENROLLMENT_REQUESTS_STORAGE_KEY, JSON.stringify({ userKey, items, fetchedAt: Date.now() }));
}

const backendDepartments = ["CRM", "HR", "IT", "Operation", "Student"];
const departmentRoleMap = {
  CRM: "CRM Executive",
  HR: "HR",
  IT: "IT",
  Operation: "Operation",
  Student: "Student",
  Admin: "Admin",
};

function normalizeCourseToTraining(course) {
  const id = course?.id || course?._id || "course-unknown";
    const rawFees = course?.fees ?? course?.price ?? "₹0";
  const feeText = String(rawFees).trim();
    const displayFees = /^\d+(\.\d+)?$/.test(feeText)
      ? `₹${Number(feeText.replace(/,/g, "")).toLocaleString("en-IN")}`
      : (feeText || "₹0");
  const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
  const sourceSections = Array.isArray(course?.sections) && course.sections.length
    ? course.sections
    : [...new Set(lessons.map((lesson) => String(lesson.section || "General").trim() || "General"))].map((name) => ({ name }));
  const sections = sourceSections.map((section, index) => {
    const sectionName = String(section?.name || section?.title || "General").trim() || "General";
    return {
      ...section,
      id: section?.id || createEntityId(`section-${index}`),
      name: sectionName,
      lessons: Array.isArray(section?.lessons)
        ? section.lessons
        : lessons.filter((lesson) => String(lesson.section || "General").trim().toLowerCase() === sectionName.toLowerCase()),
    };
  });
  const firstLesson = Array.isArray(course?.lessons) ? course.lessons[0] : null;
  const firstTask = Array.isArray(firstLesson?.tasks) ? firstLesson.tasks[0] : null;
  return {
    ...course,
    id,
    name: course?.title || course?.name || "Untitled course",
    section: course?.section || "General",
    duration: course?.duration || "N/A",
    price: displayFees,
    tools: course?.tools || "",
    trainer: "System Technologies Team",
    mode: course?.mode || "Hybrid",
    level: course?.level || "Advanced",
    seats: Array.isArray(course?.studentIds) ? String(course.studentIds.length || 24) : "24",
    batchTiming: course?.batchTiming || "Mon-Fri • 6PM-8PM",
    projects: `${lessons.length} lessons`,
    certification: course?.certification || "Industry certificate",
    placement: course?.placement || "100% interview prep",
    imageUrl: course?.thumbnail || course?.imageUrl || "",
    syllabus: course?.syllabus || "",
    sections,
    lessons,
    lessonTitle: firstLesson?.title || "",
    videoUrl: firstLesson?.videoUrl || "",
    notesUrl: firstLesson?.notesUrl || "",
    assignmentTitle: firstTask?.title || "",
    assignmentTime: firstTask?.timeLimit || "",
    assignmentUrl: firstTask?.pdfUrl || firstTask?.url || "",
    assignment: firstTask?.description || "",
  };
}

function fileNameFromUrl(url, fallback) {
  if (!url) return fallback;
  try {
      const name = decodeURIComponent(String(url).split("?")[0].split("/").pop() || fallback);
    return name || fallback;
  } catch {
    return fallback;
  }
}

function normalizeLeadForUi(lead) {
  if (!lead || typeof lead !== "object") return lead;
  const statusValue = String(lead.status || "Pending").trim().toLowerCase();
  const statusMap = {
    pending: "Pending",
    "follow-up": "Follow-up",
    interested: "Interested",
    converted: "Converted",
    approved: "Approved",
    lost: "Lost",
    not_interested: "Not Interested",
    "not interested": "Not Interested",
  };
  return {
    ...lead,
    id: String(lead.id || lead._id || ""),
    assignedTo: lead.assignedTo === undefined || lead.assignedTo === null ? "" : String(lead.assignedTo),
    status: statusMap[statusValue] || String(lead.status || "Pending"),
    source: lead.source || lead.leadSource || "",
  };
}

const sidebarSections = [
  {
    heading: "PROJECTS",
    items: [{ id: "project-create", label: "Create Project", icon: CirclePlus }],
  },
  {
    heading: "CRM",
    items: [
      { id: "dashboard", label: "CRM Dashboard", icon: LayoutDashboard },
      { id: "crm", label: "All Leads", icon: PhoneCall },
      { id: "co-approved", label: "Assigned Leads", icon: CheckCheck },
      { id: "sales-report", label: "CRM Reports", icon: Activity },
      { id: "crm-upload", label: "Upload CRM Data", icon: Upload },
    ],
  },
  {
    heading: "USERS",
    items: [
      { id: "user-create", label: "Create User", icon: UserPlus },
      { id: "user-view", label: "View Users", icon: Users },
    ],
  },
  {
    heading: "SALES",
    items: [
      { id: "sales-add", label: "Add Lead", icon: CirclePlus },
      { id: "sales-approved", label: "Assigned Leads", icon: CheckCircle2 },
      { id: "sales-report", label: "Sales Reports", icon: Activity },
    ],
  },
  {
    heading: "HR",
    items: [
      { id: "hr-assign", label: "Assign Task", icon: ClipboardCheck },
      { id: "hr-tasks", label: "All Tasks", icon: ListTodo },
      { id: "hr-leaves", label: "Leave Requests", icon: CalendarMinus2 },
      { id: "hr-attendance", label: "Attendance", icon: CalendarCheck2 },
      { id: "hr-emp", label: "Employee Profiles", icon: IdCard },
    ],
  },
  {
    heading: "CATALOGUE",
    items: [
      {
        id: "services",
        label: "Services",
        icon: BriefcaseBusiness,
      },
      {
        id: "trainings",
        label: "Training",
        icon: GraduationCap,
      },
      { id: "stip", label: "STIP", icon: Award },
    ],
  },
  {
    heading: "COURSES",
    items: [
      { id: "course-add", label: "Add Course", icon: CirclePlus },
      { id: "course-view", label: "View Courses", icon: BookOpen },
      { id: "course-check", label: "Check Tasks", icon: ClipboardCheck },
      { id: "enrollment-requests", label: "Enrollment Requests", icon: Bell },
    ],
  },
  {
    heading: "SYSTEM",
    items: [
      { id: "logs", label: "System Logs", icon: ShieldCheck },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

const trainingCatalog = TRAINING_CALL_LIST_PROGRAMS;

const serviceCatalog = SERVICE_CALL_LIST_SERVICES;

const internshipTracks = ["Front End (React.js)", "Back End (Node.js)", "Full Stack"];

const serviceReferenceImages = [programImage1, programImage2, programImage3, programImage4, programImage5];
const stipReferenceImages = [programImage11, programImage12, programImage13, programImage14];

const initialUsers = [
  {
    id: "1",
    name: "Rahul Joshi",
    username: "rahul",
    password: "rahul123",
    email: "rahul@st.co.in",
    phone: "9876001001",
    emergencyContact: "9876001002",
    maritalStatus: "Single",
    education: "B.Tech",
    role: "CRM Executive",
    dept: "CRM",
    position: "CRM Executive",
    status: "Active",
    joined: "2026-01-15",
    state: "Rajasthan",
    branch: "Ajmer",
    branchCode: "AJ-01",
    address: "123 Main Road, Ajmer, Rajasthan",
    type: "Current",
  },
  {
    id: "2",
    name: "Priya Meena",
    username: "priya",
    password: "priya123",
    email: "priya@st.co.in",
    phone: "9876001002",
    emergencyContact: "9876001003",
    maritalStatus: "Married",
    education: "MBA",
    role: "Sales Executive",
    dept: "Sales",
    position: "Sales Executive",
    status: "Active",
    joined: "2026-03-01",
    state: "Rajasthan",
    branch: "Jaipur",
    branchCode: "JP-01",
    address: "456 MG Road, Jaipur, Rajasthan",
    type: "Current",
  },
  {
    id: "3",
    name: "Amit Sharma",
    username: "amit",
    password: "amit123",
    email: "amit@st.co.in",
    phone: "9876001003",
    emergencyContact: "9876001004",
    maritalStatus: "Single",
    education: "B.Com",
    role: "HR",
    dept: "HR",
    position: "HR Executive",
    status: "Active",
    joined: "2025-06-10",
    state: "Rajasthan",
    branch: "Ajmer",
    branchCode: "AJ-01",
    address: "789 Civil Lines, Ajmer, Rajasthan",
    type: "Current",
  },
];

const initialLeads = [
  {
    id: "1",
    name: "Neha Joshi",
    phone: "9876500001",
    email: "neha@example.com",
    alternatePhone: "",
    city: "",
    company: "",
    type: "Training",
    interest: "Digital Marketing",
    value: 45000,
    status: "Pending",
    source: "WhatsApp",
    leadSource: "WhatsApp",
    assignedTo: "",
    assignedDate: "",
    notes: "",
    createdAt: "2026-07-10",
  },
  {
    id: "2",
    name: "Arjun Mehta",
    phone: "9876500002",
    email: "arjun@example.com",
    alternatePhone: "",
    city: "Jaipur",
    company: "",
    type: "Service",
    interest: "E-commerce Website",
    value: 55000,
    status: "Pending",
    source: "Referral",
    leadSource: "Referral",
    assignedTo: "2",
    assignedDate: "",
    notes: "",
    createdAt: "2026-07-12",
  },
  {
    id: "3",
    name: "Rahul Kumar",
    phone: "9876500004",
    email: "rahulk@example.com",
    alternatePhone: "",
    city: "Beawar",
    company: "",
    type: "Training",
    interest: "VFX & Animation",
    value: 50000,
    status: "Pending",
    source: "Walk-in",
    leadSource: "Walk-in",
    assignedTo: "2",
    assignedDate: "",
    notes: "",
    createdAt: "2026-07-16",
  },
  {
    id: 4,
    name: "Mohan Das",
    phone: "9876500006",
    email: "mohan@example.com",
    alternatePhone: "",
    city: "Kota",
    company: "",
    type: "Service",
    interest: "SEO",
    value: 15000,
    status: "Pending",
    source: "Referral",
    leadSource: "Referral",
    assignedTo: "2",
    assignedDate: "",
    notes: "",
    createdAt: "2026-07-22",
  },
];

const initialCrmReports = [
  {
    id: 1,
    exec: "Rahul Joshi",
    calls: 47,
    connected: 31,
    interested: 13,
    converted: 4,
    assigned: 52,
    status: "Active",
  },
  {
    id: 2,
    exec: "Priya Meena",
    calls: 45,
    connected: 28,
    interested: 10,
    converted: 3,
    assigned: 50,
    status: "Active",
  },
];

const initialTasks = [
  {
    id: "1",
    emp: "Rahul Joshi",
    title: "Follow up 20 warm leads",
    priority: "High",
    due: "2026-08-01",
    status: "In Progress",
  },
  {
    id: "2",
    emp: "Priya Meena",
    title: "Prepare July sales report",
    priority: "Medium",
    due: "2026-08-03",
    status: "Pending",
  },
  {
    id: "3",
    emp: "Amit Sharma",
    title: "Process 3 leave requests",
    priority: "Low",
    due: "2026-07-31",
    status: "Done",
  },
];

const initialLeaves = [
  {
    id: "1",
    emp: "Sunita Verma",
    type: "Sick",
    from: "2026-07-30",
    to: "2026-07-31",
    days: 2,
    reason: "Fever and rest",
    status: "Pending",
  },
  {
    id: "2",
    emp: "Rahul Joshi",
    type: "Casual",
    from: "2026-08-04",
    to: "2026-08-04",
    days: 1,
    reason: "Personal work",
    status: "Approved",
  },
];

const initialInterns = [
  {
    id: "1",
    name: "Ankita Rawat",
    phone: "9876501001",
    college: "Govt. College Ajmer",
    track: "Front End (React.js)",
    status: "Selected",
    date: "2026-07-08",
  },
  {
    id: "2",
    name: "Mohit Yadav",
    phone: "9876501002",
    college: "MDS University",
    track: "Full Stack",
    status: "Under Review",
    date: "2026-07-14",
  },
];

const initialLogs = [
  {
    id: 1,
    user: "Admin",
    action: "Logged in from admin console",
    ip: "192.168.1.1",
    time: "09:02",
    kind: "success",
  },
  {
    id: 2,
    user: "Rahul Joshi",
    action: "Added 3 new leads",
    ip: "192.168.1.15",
    time: "11:45",
    kind: "info",
  },
  {
    id: 3,
    user: "Unknown",
    action: "Failed login attempt",
    ip: "103.45.67.89",
    time: "10:11",
    kind: "danger",
  },
];

const initialServiceRows = [
  // 1. Website Development
  { id: "web-dev-1", category: "Website Development", name: "Basic Website", details: "Up to 5 pages responsive design, contact form", price: "₹9,999", status: "Active" },
  { id: "web-dev-2", category: "Website Development", name: "Dynamic Website", details: "up to 10 pages, CMS, Blog, Contact forms, Basic SEO, Admin Panel, etc.", price: "₹22,999", status: "Active" },
  { id: "web-dev-3", category: "Website Development", name: "E-commerce Website", details: "Products, Payments, Admin Panel, order management, Basic SEO, Coupan System.", price: "₹50,000 – ₹75,000", status: "Active" },
  { id: "web-dev-4", category: "Website Development", name: "Annual Maintenance", details: "Regular updates & support, Backup, Bug Fixes, Plugin Updates", price: "₹5,000 – ₹10,000", status: "Active" },

  // 2. Android & iOS App Development
  { id: "app-dev-1", category: "Android & iOS App Development", name: "Basic Android App", details: "Login, Forms, Push Notifications, Admin Panel, Plays Store Ready.", price: "₹40,000 – ₹70,000", status: "Active" },
  { id: "app-dev-2", category: "Android & iOS App Development", name: "E-commerce / Service App", details: "Products, cart, payments, admin panel, user accounts, Order Tracking, Push notifications, payment Gateway.", price: "₹1,50,000 – ₹3,00,000", status: "Active" },
  { id: "app-dev-3", category: "Android & iOS App Development", name: "Hybrid / Cross-platform (Android + iOS)", details: "Single codebase (Flutter/React Native) for both platforms", price: "₹80,000 – ₹2,50,000", status: "Active" },
  { id: "app-dev-4", category: "Android & iOS App Development", name: "App Maintenance & Updates", details: "Bug fixes, OS updates, minor feature tweaks", price: "15–20% of build cost, per year", status: "Active" },

  // 3. Graphic Designing
  { id: "graphic-des-1", category: "Graphic Designing", name: "Logo Design", details: "Business logo design", price: "₹4,000 – ₹8,000", status: "Active" },
  { id: "graphic-des-2", category: "Graphic Designing", name: "Social Media Creatives", details: "Custom post designs", price: "₹500/post – ₹6,000 for 12", status: "Active" },
  { id: "graphic-des-3", category: "Graphic Designing", name: "Brochure / Flyer / Poster", details: "Print & digital", price: "₹2,000 – 5,000 (single-page flyer/poster); ₹5,000 – 10,000 (multi-page brochure)", status: "Active" },

  // 4. Branding & Brand Promotion
  { id: "branding-1", category: "Branding & Brand Promotion", name: "Corporate Presentation", details: "Branded PPTs", price: "₹8,000 – ₹12,000", status: "Active" },
  { id: "branding-2", category: "Branding & Brand Promotion", name: "Basic Branding", details: "Logo + Guidelines + 10 Social Posts", price: "₹11,000", status: "Active" },
  { id: "branding-3", category: "Branding & Brand Promotion", name: "Standard Branding", details: "Logo + Stationery + 15 Posts + Ads", price: "₹19,000", status: "Active" },
  { id: "branding-4", category: "Branding & Brand Promotion", name: "Premium Branding", details: "Full Brand Kit + 20 Posts + Influencers + Ads", price: "₹32,000 / month", status: "Active" },

  // 5. Digital Marketing
  { id: "dig-mkt-1", category: "Digital Marketing", name: "SEO", details: "On-page & Off-page Optimization", price: "₹8,000 – 12,000 /month", status: "Active" },
  { id: "dig-mkt-2", category: "Digital Marketing", name: "SMM", details: "FB, Insta, LinkedIn, Twitter mgmt", price: "₹10,000 – 15,000 /month", status: "Active" },
  { id: "dig-mkt-3", category: "Digital Marketing", name: "Google / Meta Ads", details: "PPC Campaigns (Ad spend extra)", price: "₹6,000 – 10,000 /month", status: "Active" },
  { id: "dig-mkt-4", category: "Digital Marketing", name: "Email / WhatsApp Marketing", details: "Bulk & automated campaigns", price: "₹5,000 – 8,000 /month", status: "Active" },

  // 6. VFX & Animation
  { id: "vfx-anim-1", category: "VFX & Animation", name: "Logo Animation", details: "2D/3D logo motion", price: "₹5,000 – 15,000", status: "Active" },
  { id: "vfx-anim-2", category: "VFX & Animation", name: "Explainer / Product Video", details: "1–2 minutes", price: "₹35,000 – 80,000", status: "Active" },
  { id: "vfx-anim-3", category: "VFX & Animation", name: "3D Animation / VFX", details: "Advanced projects", price: "₹60,000 – 2,50,000", status: "Active" },

  // 7. CRM Solutions
  { id: "crm-sol-1", category: "CRM Solutions", name: "Basic CRM Setup (Small Business)", details: "Setup for small teams", price: "₹15,000 – 30,000 (one-time)", status: "Active" },
  { id: "crm-sol-2", category: "CRM Solutions", name: "Custom CRM Development", details: "Advanced features", price: "₹1,50,000 – 4,00,000", status: "Active" },
  { id: "crm-sol-3", category: "CRM Solutions", name: "CRM Maintenance", details: "Regular support", price: "₹5,000 – 15,000/month", status: "Active" },

  // 8. Cloud Solutions
  { id: "cloud-sol-1", category: "Cloud Solutions", name: "Cloud Hosting Setup", details: "Server hosting & config", price: "₹8,000–25,000 (one-time)", status: "Active" },
  { id: "cloud-sol-2", category: "Cloud Solutions", name: "Migration to Cloud", details: "Data migration & deployment", price: "₹15,000–50,000", status: "Active" },
  { id: "cloud-sol-3", category: "Cloud Solutions", name: "Cloud Maintenance & Security", details: "Monitoring & protection", price: "₹8,000–25,000/mo", status: "Active" },

  // 9. Marketing Tools & Automation
  { id: "mkt-tools-1", category: "Marketing Tools & Automation", name: "Email Automation Setup", details: "Automated email campaigns", price: "₹5,000–15,000", status: "Active" },
  { id: "mkt-tools-2", category: "Marketing Tools & Automation", name: "Analytics Dashboard Setup", details: "Reports & tracking", price: "₹10,000–25,000", status: "Active" },
  { id: "mkt-tools-3", category: "Marketing Tools & Automation", name: "Full Marketing Automation", details: "Tools + workflows setup", price: "₹25,000–60,000", status: "Active" },

  // 10. Content Creation & Copywriting
  { id: "content-1", category: "Content Creation & Copywriting", name: "Blog Writing", details: "Professional blog posts", price: "1,000-word blog = ₹3,000–10,000", status: "Active" },
  { id: "content-2", category: "Content Creation & Copywriting", name: "Website Content", details: "SEO-friendly content", price: "₹1,000–3,000", status: "Active" },
  { id: "content-3", category: "Content Creation & Copywriting", name: "Product Descriptions", details: "E-commerce descriptions", price: "₹25–150 product", status: "Active" },

  // 11. UI/UX Design
  { id: "uiux-1", category: "UI/UX Design", name: "Wireframe & Prototype", details: "Interactive mockups", price: "₹15,000–40,000", status: "Active" },
  { id: "uiux-2", category: "UI/UX Design", name: "App / Website UI Design", details: "Modern & responsive UI", price: "₹30,000–80,000", status: "Active" },

  // 12. Social Media Management
  { id: "smm-pkg-1", category: "Social Media Management", name: "Basic Package", details: "10 posts + 1 reel / month", price: "₹10,000–15,000", status: "Active" },
  { id: "smm-pkg-2", category: "Social Media Management", name: "Standard Package", details: "15 posts + 2 reels / month", price: "₹20,000–40,000/mo", status: "Active" },
  { id: "smm-pkg-3", category: "Social Media Management", name: "Premium Package", details: "20 posts + 4 reels + full mgmt", price: "₹30,000–75,000/month", status: "Active" },

  // 13. E-commerce Development & Management
  { id: "ecom-dev-1", category: "E-commerce Development & Management", name: "Shopify / WooCommerce", details: "Online store setup", price: "₹25,000–75,000", status: "Active" },
  { id: "ecom-dev-2", category: "E-commerce Development & Management", name: "Marketplace Management", details: "Amazon / Flipkart handling", price: "₹10,000–25,000/mo", status: "Active" },

  // 14. Performance Marketing
  { id: "perf-mkt-1", category: "Performance Marketing", name: "Campaign Setup", details: "PPC, SMM campaigns", price: "₹15,000–80,000/mo", status: "Active" },
  { id: "perf-mkt-2", category: "Performance Marketing", name: "Landing Page Creation", details: "Responsive, high-converting", price: "₹8,000–25,000", status: "Active" },

  // 15. Influencer Marketing
  { id: "infl-mkt-1", category: "Influencer Marketing", name: "Influencer Campaign", details: "Planning & execution", price: "₹8,000–15,000", status: "Active" },
  { id: "infl-mkt-2", category: "Influencer Marketing", name: "Influencer Management", details: "Handling influencers", price: "₹12,000–25,000/mo", status: "Active" },

  // 16. Photography & Videography
  { id: "photo-video-1", category: "Photography & Videography", name: "Product Shoot", details: "Up to 20 products", price: "₹6,000–20,000", status: "Active" },
  { id: "photo-video-2", category: "Photography & Videography", name: "Lifestyle / Corporate Shoot", details: "Professional team", price: "₹15,000–50,000/day", status: "Active" },

  // 17. Public Relations (PR)
  { id: "pr-1", category: "Public Relations (PR)", name: "Press Release", details: "Media-ready content", price: "500 words = ₹1,500–10,000", status: "Active" },
  { id: "pr-2", category: "Public Relations (PR)", name: "Media Coverage", details: "PR distribution & outreach", price: "₹15,000–1,00,000+/mo", status: "Active" },

  // 18. Bulk Marketing (Highlighted Service)
  { id: "bulk-mkt-1", category: "Bulk Marketing (Highlighted Service)", name: "Bulk SMS Marketing", details: "₹0.20 – ₹0.35 per SMS (package-based)", price: "₹0.10–0.22 per SMS", status: "Active" },
  { id: "bulk-mkt-2", category: "Bulk Marketing (Highlighted Service)", name: "Bulk WhatsApp Marketing", details: "₹0.30 – ₹0.50 per message", price: "₹0.30–0.80/msg (API-based)", status: "Active" },
  { id: "bulk-mkt-3", category: "Bulk Marketing (Highlighted Service)", name: "Email Marketing Campaigns", details: "Monthly campaigns", price: "₹5,000 – ₹15,000 / month", status: "Active" },
  { id: "bulk-mkt-4", category: "Bulk Marketing (Highlighted Service)", name: "Lead Generation Campaigns", details: "Targeted lead generation", price: "₹8,000–25,000 / month", status: "Active" },
];

const initialTrainingRows = [
  // 1. Front End Development Foundation (2 options)
  { id: "training-fe-1", name: "Front End Development Foundation (Option 1 - 3 Months)", duration: "3 MONTHS", price: "₹9,000", tools: "HTML5 • CSS3 • Bootstrap • JavaScript • jQuery • Responsive Design • Version Control (Git)" },
  { id: "training-fe-2", name: "Front End Development Foundation (Option 2 - 5 Months)", duration: "5 MONTHS", price: "₹13,000", tools: "HTHTML5 • CSS3 • Bootstrap • JavaScript • jQuery • Responsive Design • Version Control (Git) + Frameworks: React JS • Next.js • Angular" },

  // 2. Back End Development (3 options)
  { id: "training-be-1", name: "Back End Development (Option 1 - PHP & MySQL)", duration: "6 MONTHS", price: "₹12,000", tools: "PHP • MySQL • RESTful APIs • Authentication & Security • Version Control (Git) • Deployment & Hosting" },
  { id: "training-be-2", name: "Back End Development (Option 2 - Python & DBs)", duration: "6 MONTHS", price: "₹14,000-1DB / ₹16,000-2DB", tools: "Python + MongoDB + PostgreSQL (two DBs), REST APIs, Auth, Git, Deployment" },
  { id: "training-be-3", name: "Back End Development (Option 3 - Node.js & PostgreSQL)", duration: "6 MONTHS", price: "₹15,000", tools: "Node.js • PostgreSQL • RESTful APIs • Authentication & Security • Version Control (Git) • Deployment & Hosting" },

  // 3. Full Stack Development (3 options)
  { id: "training-fs-1", name: "Full Stack Development (Option 1 - PHP Stack)", duration: "7 MONTHS", price: "₹18,000", tools: "Front-End Basics + PHP • MySQL • REST APIs • Auth & Security • Git • Deployment" },
  { id: "training-fs-2", name: "Full Stack Development (Option 2 - Python Stack)", duration: "7 MONTHS", price: "₹22,000", tools: "Front-End Basics + Python • PostgreSQL • REST APIs • Auth & Security • Git • Deployment" },
  { id: "training-fs-3", name: "Full Stack Development (Option 3 - MERN/Node.js Stack)", duration: "7 MONTHS", price: "₹28,000", tools: "Front-End Basics + Node.js • MongoDB • REST APIs • Auth & Security • Git • Deployment" },

  // 4. Video Editing
  { id: "training-ve-1", name: "Video Editing", duration: "3 MONTHS", price: "₹14,000", tools: "Sequencing & Media Import • Basic Editing • Effects • Audio • Color Correction • Slow Motion • Green Screen • Exporting" },

  // 5. AutoCAD (2D & 3D)
  { id: "training-cad-1", name: "AutoCAD (2D & 3D)", duration: "3 MONTHS", price: "₹11,000", tools: "Intro to AutoCAD • 2D Drafting & Design • Advanced 2D • 3D Modeling (Intro + Advanced) • Real-World Project" },

  // 6. Wordpress Web Design
  { id: "training-wp-1", name: "Wordpress Web Design", duration: "2 MONTHS", price: "₹8,000", tools: "Intro to WordPress • Content Management • Theme Customization • Plugins • Website Optimization • WooCommerce (E-Commerce) • Advanced Features" },

  // 7. Android App Development
  { id: "training-android-1", name: "Android App Development", duration: "6 MONTHS", price: "₹17,000", tools: "KOTLIN/JAVA • UI DESIGN • ACTIVITIES & NAVIGATION • DATA MANAGEMENT • NETWORKING & APIS • TESTING & DEBUGGING • PUBLISHING" },

  // 8. VFX & ANIMATION
  { id: "training-vfx-1", name: "VFX & ANIMATION", duration: "7 MONTHS", price: "₹30,000", tools: "Adobe After Effects • Blender • Illustrator • Autodesk Maya • 2D & 3D Animation • Compositing & Motion Tracking • Lighting/Texturing/Rendering • Portfolio" },

  // 9. Graphics & Visual Designing
  { id: "training-gvd-1", name: "Graphics & Visual Designing", duration: "4 MONTHS", price: "₹16,000", tools: "Photoshop • Illustrator • InDesign • Canva • Figma • Typography • Color Theory • Layout & Composition • Branding • Portfolio" },

  // 10. Adobe Photoshop
  { id: "training-ps-1", name: "Adobe Photoshop", duration: "2 MONTHS", price: "₹6,000", tools: "Intro • Layers • Text & Shapes • Filters & Effects • Layer Masks & Selections • Exporting" },

  // 11. CorelDraw
  { id: "training-cd-1", name: "CorelDraw", duration: "1.5 MONTHS", price: "₹5,500", tools: "Intro • Basic Shapes & Lines • Text • Effects & Styles • Layers & Object Management • Exporting & Printing" },

  // 12. Digital marketing
  { id: "training-dm-1", name: "Digital marketing", duration: "6 MONTHS", price: "₹22,000", tools: "SEO • SMO • GOOGLE ANALYTICS 4 • GTM • CONTENT MARKETING • YOUTUBE MARKETING • ASO • GMB • GOOGLE ADS • FACEBOOK ADS • EMAIL MARKETING • WORDPRESS" },

  // 13. Adobe Illustrator
  { id: "training-ai-1", name: "Adobe Illustrator", duration: "2 MONTHS", price: "₹8,000", tools: "INTRO TO ILLUSTRATOR & UI • BASIC SHAPES & TOOLS • PEN TOOL ILLUSTRATIONS • TYPOGRAPHY & TEXT EFFECTS • LAYERS & ARTBOARDS • ADVANCED TECHNIQUES • BRUSHES • LOGO DESIGN & BRANDING • EXPORTING (PRINT/WEB/SOCIAL)" },

  // 14. 3D INTERIOR EXTERIOR DESIGN
  { id: "training-3d-1", name: "3D INTERIOR EXTERIOR DESIGN", duration: "6 MONTHS", price: "₹26,000", tools: "Design Principles • Interior Fundamentals • Design Tools & Software • Residential & Commercial Interior • Exterior Design" },
];

const initialStipPrograms = [
  { id: "1", track: "Front End (React.js)", duration: "3 months", focus: "React components, responsive UI, state management, API integration", outcome: "Portfolio-ready frontend projects", fee: "Editable" },
  { id: "2", track: "Back End (Node.js)", duration: "3 months", focus: "Node.js, Express, databases, auth, REST APIs", outcome: "Backend services and deployment practice", fee: "Editable" },
  { id: "3", track: "Full Stack", duration: "6 months", focus: "React + Node.js + database architecture + deployment", outcome: "End-to-end internship project delivery", fee: "Editable" },
];

function parsePriceNumber(value) {
  if (value === null || value === undefined) return null;
  const matches = String(value).match(/\d+(?:,\d{3})*(?:\.\d+)?/g);
  if (!matches) return null;
  const numbers = matches.map((match) => Number(String(match).replace(/,/g, "")));
  return numbers[0] ?? null;
}

function deriveServiceStatus(rows) {
  return rows.some((row) => String(row.status || "Active").toLowerCase() === "inactive") ? "Inactive" : "Active";
}

function extractCategoryPrice(rows) {
  const values = rows
    .map((row) => parsePriceNumber(row.price))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return "Custom";
  const lowest = Math.min(...values);
  return `Rs ${Math.round(lowest / 1000)}K+`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function compactCurrency(value) {
  if (!value) return "₹0";
  if (value >= 1000) return `₹${Math.round(value / 1000)}K`;
  return `₹${value}`;
}

function formatDateDDMMYYYY(value) {
  if (!value) return "-";
  const parts = String(value).split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return value;
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function badgeClass(status) {
  const value = status.toLowerCase();
  if (["active", "approved", "won", "enrolled", "done", "selected", "interested"].includes(value)) {
    return "badge success";
  }
  if (["hot", "high", "danger", "rejected", "lost", "not_interested", "not interested"].includes(value)) {
    return "badge danger";
  }
  if (["follow-up", "medium", "pending", "under review", "in progress"].includes(value)) {
    return "badge warning";
  }
  return "badge neutral";
}

function hasTaskGrade(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getThumbnailPreset(label = "") {
  const value = label.toLowerCase();

  if (value.includes("wordpress")) return { icon: Globe, tone: "gold" };
  if (value.includes("autocad") || value.includes("interior") || value.includes("exterior")) return { icon: DraftingCompass, tone: "sand" };
  if (value.includes("ui/ux") || value.includes("wireframe") || value.includes("prototype")) return { icon: Figma, tone: "peach" };
  if (value.includes("graphic") || value.includes("graphics") || value.includes("photoshop") || value.includes("illustrator") || value.includes("coreldraw")) return { icon: Palette, tone: "rose" };
  if (value.includes("brand")) return { icon: PenTool, tone: "peach" };
  if (value.includes("digital marketing") || value.includes("seo") || value.includes("marketing")) return { icon: Megaphone, tone: "mint" };
  if (value.includes("crm")) return { icon: Blocks, tone: "blue" };
  if (value.includes("cloud")) return { icon: Cloud, tone: "sky" };
  if (value.includes("video editing")) return { icon: Film, tone: "violet" };
  if (value.includes("vfx") || value.includes("animation")) return { icon: Sparkles, tone: "violet" };
  if (value.includes("mobile") || value.includes("android") || value.includes("ios") || value.includes("app development")) return { icon: Smartphone, tone: "sky" };
  if (value.includes("website") || value.includes("front end") || value.includes("frontend")) return { icon: LayoutDashboard, tone: "blue" };
  if (value.includes("back end") || value.includes("backend") || value.includes("full stack") || value.includes("react") || value.includes("node") || value.includes("python") || value.includes("php")) return { icon: Code2, tone: "blue" };
  if (value.includes("internship")) return { icon: MonitorSmartphone, tone: "mint" };
  return { icon: GraduationCap, tone: "gold" };
}

function DecorativeThumbnail({ label, image, className = "" }) {
  const preset = getThumbnailPreset(label);
  const Icon = preset.icon;

  return (
    <div className={`dashboard-thumbnail dashboard-thumbnail-${preset.tone} ${className}`.trim()} aria-hidden="true">
      {image ? (
        <img src={image} alt="" loading="lazy" />
      ) : (
        <div className="dashboard-thumbnail-art">
          <span className="dashboard-thumbnail-orb" />
          <span className="dashboard-thumbnail-chip dashboard-thumbnail-chip-top" />
          <span className="dashboard-thumbnail-chip dashboard-thumbnail-chip-bottom" />
          <span className="dashboard-thumbnail-panel" />
          <span className="dashboard-thumbnail-line dashboard-thumbnail-line-one" />
          <span className="dashboard-thumbnail-line dashboard-thumbnail-line-two" />
          <span className="dashboard-thumbnail-dot" />
          <span className="dashboard-thumbnail-icon-shell">
            <Icon size={28} strokeWidth={1.9} />
          </span>
        </div>
      )}
    </div>
  );
}

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn(`Failed reading localStorage key ${key}`, err);
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Failed writing localStorage key ${key}`, err);
    return false;
  }
}

function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`Failed removing localStorage key ${key}`, err);
  }
}

function readSavedLogin() {
  const raw = safeStorageGet(SAVED_LOGIN_STORAGE_KEY);
  if (!raw) return { username: "", password: "" };
  try {
    const saved = JSON.parse(raw);
    return {
      username: String(saved?.username || ""),
      password: String(saved?.password || ""),
    };
  } catch {
    return { username: "", password: "" };
  }
}

function getDisplayImage(primaryImageUrl, fallbackImage, previewImage = "") {
  return previewImage || sanitizeImageReference(primaryImageUrl) || fallbackImage;
}

function cleanupPreviewImages(items = []) {
  items.forEach((item) => revokePreviewUrl(item?._previewImage));
}

function cleanupModalStateImages(modalState) {
  if (!modalState) return;
  if (Array.isArray(modalState.rows)) {
    cleanupPreviewImages(modalState.rows);
  }
  if (modalState.item) {
    revokePreviewUrl(modalState.item._previewImage);
  }
  if (modalState.row) {
    revokePreviewUrl(modalState.row._previewImage);
  }
}

async function preparePendingImage(file) {
  const compressedFile = await compressImageFile(file);
  return {
    file: compressedFile,
    previewUrl: createPreviewUrl(compressedFile),
  };
}

async function persistImageIfNeeded(item, notify) {
  const existingImage = sanitizeImageReference(item.imageUrl);
  const pendingFile = item?._pendingImageFile;

  if (!pendingFile) {
    return sanitizeImageRecord({ ...item, imageUrl: existingImage });
  }

  try {
    const result = await uploadImage(pendingFile);
    const newUrl = result?.imageUrl || "";

    if (existingImage && existingImage !== newUrl) {
      const oldPublicId = item?.imagePublicId;
      if (oldPublicId) {
        await deleteImage(oldPublicId).catch(() => {});
      }
    }

    return sanitizeImageRecord({
      ...item,
      imageUrl: newUrl,
      imagePublicId: result?.publicId || "",
    });
  } catch (err) {
    notify(err.message || "Image upload failed.");
    throw err;
  }
}

function readUsersFromStorage() {
  const raw = safeStorageGet(USERS_STORAGE_KEY);
  if (!raw) return initialUsers;
  try {
    const parsed = sanitizeImageCollection(JSON.parse(raw));
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialUsers;
  } catch {
    return initialUsers;
  }
}

function getLeadCacheUserKey(user) {
  return String(user?.id || user?._id || user?.username || "");
}

function readLeadsFromStorage(user) {
  const raw = safeStorageGet(LEADS_STORAGE_KEY);
  if (!raw) return { items: initialLeads, hasCache: false };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { items: [], hasCache: false };
    }
    if (
      parsed?.version === LEADS_CACHE_VERSION
      && parsed.userKey === getLeadCacheUserKey(user)
      && Array.isArray(parsed.items)
    ) {
      const items = sanitizeImageCollection(parsed.items);
      return { items, hasCache: items.length > 0 };
    }
  } catch {
    // Fall through to the local demo data when an older cache is invalid.
  }
  return { items: initialLeads, hasCache: false };
}

function readSessionFromStorage() {
  const raw = safeStorageGet(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readCollectionFromStorage(key, fallback) {
  const raw = safeStorageGet(key);
  if (!raw) return fallback;
  try {
    const parsed = sanitizeImageCollection(JSON.parse(raw));
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function isItUser(user) {
  return String(user?.role || "").trim().toLowerCase() === "it"
    || String(user?.dept || user?.department || "").trim().toLowerCase() === "it";
}

function ItDashboard({ user, users = [], tasks = [], leaves = [], employees = [], onLogout }) {
  const [activeSection, setActiveSection] = useState("overview");
  const displayTasks = Array.isArray(tasks) ? tasks : [];
  const displayLeaves = Array.isArray(leaves) ? leaves : [];
  const displayEmployees = Array.isArray(employees) && employees.length ? employees : users;
  const activeUsers = users.filter((item) => String(item?.status || "").toLowerCase() === "active");
  const pendingTasks = displayTasks.filter((item) => !["completed", "done"].includes(String(item?.status || "").toLowerCase()));
  const pendingLeaves = displayLeaves.filter((item) => ["pending", "requested", "open"].includes(String(item?.status || "").toLowerCase()));
  const sections = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "team", label: "Team Directory", icon: Users },
    { id: "tasks", label: "IT Tasks", icon: ListTodo },
    { id: "leaves", label: "Leave Requests", icon: CalendarCheck2 },
  ];

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><LogoBadge /><div><strong>SYSTEM TECHNOLOGIES</strong><span>IT Operations Portal</span></div></div>
        <div className="sidebar-profile"><div className="avatar soft">{initials(user?.name || "IT")}</div><strong>{user?.name || "IT User"}</strong><span>IT Department</span></div>
        <nav className="sidebar-nav">
          <p className="sidebar-label">IT OPERATIONS</p>
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`sidebar-nav-item ${activeSection === id ? "active" : ""}`} onClick={() => setActiveSection(id)}><Icon size={17} /><span>{label}</span></button>
          ))}
          <p className="sidebar-label">ACCOUNT</p>
          <button type="button" className="sidebar-nav-item" onClick={onLogout}><DoorOpen size={17} /><span>Logout</span></button>
        </nav>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header"><div><p className="eyebrow">IT OPERATIONS</p><h1>{sections.find((section) => section.id === activeSection)?.label || "Overview"}</h1><p>Connected to your CRM backend workspace.</p></div><div className="dashboard-user"><div className="avatar soft">{initials(user?.name || "IT")}</div><span>{user?.name || "IT User"}</span></div></header>
        <div className="dashboard-content">
          {activeSection === "overview" ? (
            <>
              <div className="stats-grid">
                <div className="stat-card"><span>Active team members</span><strong>{activeUsers.length}</strong><small>From backend users</small></div>
                <div className="stat-card"><span>Open IT tasks</span><strong>{pendingTasks.length}</strong><small>Assigned work items</small></div>
                <div className="stat-card"><span>Leave requests</span><strong>{pendingLeaves.length}</strong><small>Awaiting action</small></div>
                <div className="stat-card"><span>Directory records</span><strong>{displayEmployees.length}</strong><small>Employee profiles</small></div>
              </div>
              <div className="content-grid-two">
                <section className="panel"><div className="panel-heading"><h2>Recent team members</h2><button type="button" className="text-button" onClick={() => setActiveSection("team")}>View all</button></div>{displayEmployees.slice(0, 5).map((item) => <div className="list-row" key={item.id || item._id || item.username}><div className="avatar soft small">{initials(item.name || item.username || "User")}</div><div><strong>{item.name || item.username}</strong><span>{item.position || item.role || item.dept || "Team member"}</span></div><small>{item.status || "Active"}</small></div>)}</section>
                <section className="panel"><div className="panel-heading"><h2>Open tasks</h2><button type="button" className="text-button" onClick={() => setActiveSection("tasks")}>View all</button></div>{pendingTasks.slice(0, 5).map((item, index) => <div className="list-row" key={item.id || item._id || index}><div className="list-icon"><ListTodo size={16} /></div><div><strong>{item.title || item.name || "Untitled task"}</strong><span>{item.priority || item.status || "Pending"}</span></div><small>{item.dueDate || item.due || "No due date"}</small></div>)}</section>
              </div>
            </>
          ) : null}
          {activeSection === "team" ? <section className="panel"><div className="panel-heading"><h2>Team Directory</h2><span>{displayEmployees.length} records</span></div>{displayEmployees.map((item, index) => <div className="list-row" key={item.id || item._id || index}><div className="avatar soft small">{initials(item.name || item.username || "User")}</div><div><strong>{item.name || item.username}</strong><span>{item.email || item.position || item.dept || "Team member"}</span></div><small>{item.status || "Active"}</small></div>)}</section> : null}
          {activeSection === "tasks" ? <section className="panel"><div className="panel-heading"><h2>IT Tasks</h2><span>{displayTasks.length} records</span></div>{displayTasks.map((item, index) => <div className="list-row" key={item.id || item._id || index}><div className="list-icon"><ListTodo size={16} /></div><div><strong>{item.title || item.name || "Untitled task"}</strong><span>{item.description || item.priority || "Task"}</span></div><small>{item.status || "Pending"}</small></div>)}</section> : null}
          {activeSection === "leaves" ? <section className="panel"><div className="panel-heading"><h2>Leave Requests</h2><span>{displayLeaves.length} records</span></div>{displayLeaves.map((item, index) => <div className="list-row" key={item.id || item._id || index}><div className="list-icon"><CalendarCheck2 size={16} /></div><div><strong>{item.emp || item.employeeName || item.name || "Employee"}</strong><span>{item.reason || item.type || "Leave request"}</span></div><small>{item.status || "Pending"}</small></div>)}</section> : null}
        </div>
      </main>
    </div>
  );
}

function App() {
  const [appView, setAppView] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [activePage, setActivePage] = useState("dashboard");
  const [adminPreviewProjects, setAdminPreviewProjects] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const contentRef = useRef(null);
  const deferredQuery = useDeferredValue(globalQuery);
  const [toast, setToast] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [trainingQuery, setTrainingQuery] = useState("");
  const [taskReviewQuery, setTaskReviewQuery] = useState("");
  const [stipQuery, setStipQuery] = useState("");
  const [servicePage, setServicePage] = useState(1);
  const [trainingPage, setTrainingPage] = useState(1);
  const [stipPage, setStipPage] = useState(1);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState(null);
  const [serviceDetailTab, setServiceDetailTab] = useState("overview");
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [serviceModal, setServiceModal] = useState(null);
  const [trainingModal, setTrainingModal] = useState(null);
  const [stipModal, setStipModal] = useState(null);
  const [serviceModalUploading, setServiceModalUploading] = useState(false);
  const [trainingModalUploading, setTrainingModalUploading] = useState(false);
  const [trainingAssetUploading, setTrainingAssetUploading] = useState("");
  const [stipModalUploading, setStipModalUploading] = useState(false);
  const [courseBuilderMode, setCourseBuilderMode] = useState("manual");
  const [folderUploadState, setFolderUploadState] = useState(null);
  const [openSectionIds, setOpenSectionIds] = useState([]);
  const [focusedLessonId, setFocusedLessonId] = useState("");
  const [crmUploadRows, setCrmUploadRows] = useState([]);

  const [settingsForm, setSettingsForm] = useState({ name: "", email: "", phone: "", emergencyContact: "", maritalStatus: "", education: "", dept: "", position: "", role: "", joined: "", state: "", branch: "", branchCode: "", address: "", username: "", imageUrl: "", imagePublicId: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsMessageType, setSettingsMessageType] = useState("success");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordMessageType, setPasswordMessageType] = useState("success");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const [users, setUsers] = useState(initialUsers);
  const [leadAssignmentUsers, setLeadAssignmentUsers] = useState([]);
  const [leads, setLeads] = useState(initialLeads);
  const [leadsLoadedFromBackend, setLeadsLoadedFromBackend] = useState(false);
  const leadRecoveryAttempted = useRef(false);
  const adminAllLeadsLoadedForUser = useRef("");
  const staleCallLeadCleanup = useRef(new Set());
  const leadsCacheHydrated = useRef(false);
  const leadCacheUserKey = useRef("");
  const isHydratingInitialData = useRef(true);
  const [crmReports] = useState(initialCrmReports);
  const [tasks, setTasks] = useState(initialTasks);
  const [attendance, setAttendance] = useState([]);
  const [adminTaskForm, setAdminTaskForm] = useState({ title: "", description: "", assigneeId: "", priority: "Medium", dueDate: new Date().toISOString().slice(0, 10) });
  const [leaves, setLeaves] = useState([]);
  const [interns, setInterns] = useState(initialInterns);
  const [logs] = useState(initialLogs);
  const [serviceRows, setServiceRows] = useState(initialServiceRows);
  const [trainingRows, setTrainingRows] = useState(initialTrainingRows);
  const [courseRows, setCourseRows] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [studentEnrollmentRequests, setStudentEnrollmentRequests] = useState([]);
  const [allEnrollmentRequests, setAllEnrollmentRequests] = useState([]);
  const [enrollmentRequestQuery, setEnrollmentRequestQuery] = useState("");
  const [enrollmentRequestStatus, setEnrollmentRequestStatus] = useState("all");
  const [enrollmentRequestDate, setEnrollmentRequestDate] = useState("");
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [taskSubmissionLoading, setTaskSubmissionLoading] = useState(false);
  const [taskSubmissionModal, setTaskSubmissionModal] = useState(null);
  const [taskGradeForm, setTaskGradeForm] = useState({ grade: "", feedback: "" });
  const [taskGradeSaving, setTaskGradeSaving] = useState(false);
  const [itTasks, setItTasks] = useState([]);
  const [itLeaves, setItLeaves] = useState([]);
  const [itEmployees, setItEmployees] = useState([]);
  const [stipPrograms, setStipPrograms] = useState(initialStipPrograms);
  const [loginForm, setLoginForm] = useState(readSavedLogin);
  const [rememberLogin, setRememberLogin] = useState(() => Boolean(readSavedLogin().username));
  const [signupForm, setSignupForm] = useState({ name: "", username: "", password: "" });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("studentLogout") === "1") {
        logoutUser();
        return null;
      }
    } catch {}
    return getCurrentUser();
  });
  const [dashboardTab, setDashboardTab] = useState("overview");
  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    emergencyContact: "",
    maritalStatus: "",
    education: "",
    username: "",
    password: "",
    role: "CRM Executive",
    dept: "CRM",
    position: "",
    joined: "",
    state: "",
    branch: "",
    branchCode: "",
    address: "",
    imageUrl: "",
    imagePublicId: "",
  });
  const [createUserPreview, setCreateUserPreview] = useState("");
  const [createUserFile, setCreateUserFile] = useState(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [createLead, setCreateLead] = useState({
    name: "",
    phone: "",
    email: "",
    alternatePhone: "",
    city: "Ajmer",
    company: "",
    type: "Training",
    interest: trainingCatalog[0],
    value: "",
    status: "Pending",
    source: "Website",
    leadSource: "Website",
    enteredBy: "",
    assignedTo: "1",
    assignedDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [editingLeadReturnPage, setEditingLeadReturnPage] = useState("sales-approved");
  const [leadCreationSource, setLeadCreationSource] = useState(null);

  useEffect(() => {
    try { window.localStorage.removeItem("admin-crm-upload-rows"); }
    catch { /* Ignore unavailable browser storage. */ }
  }, []);

  useEffect(() => {
    if (!currentUser || !(isLeadAssignmentUser(currentUser) || isCrmExecutive(currentUser.role))) return;
    let cancelled = false;
    const refreshCallLists = () => loadCallListData().then((records) => {
      if (!cancelled && Array.isArray(records)) {
        setCrmUploadRows(mergeCallListRows(records));

      }
    }).catch(() => { /* Preserve the last snapshot during a temporary connection failure. */ });
    let streamConnected = false;
    const unsubscribe = subscribeCallListChanges(({ record, deleted }) => {
      if (cancelled) return;
      setCrmUploadRows((current) => {
        const remaining = current.filter((row) => !(row.id === record.id && row.listType === record.listType));
        return deleted ? mergeCallListRows(remaining) : mergeCallListRows([record], remaining);
      });
    }, () => {
      if (streamConnected) refreshCallLists();
      streamConnected = true;
    });
    refreshCallLists();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !isCrmExecutive(currentUser.role)) return;
    let active = true;
    loadAssignableUsers().then((assignees) => {
      if (active && Array.isArray(assignees)) setLeadAssignmentUsers(assignees);
    }).catch(() => { /* Keep the last available assignment roster. */ });
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    // load local fallback immediately
    const savedUsers = readUsersFromStorage();
    const savedSession = readSessionFromStorage();
    const savedLeadCache = readLeadsFromStorage(savedSession);
    const savedServices = readCollectionFromStorage(SERVICES_STORAGE_KEY, initialServiceRows);
    const savedStipPrograms = readCollectionFromStorage(STIP_PROGRAMS_STORAGE_KEY, initialStipPrograms);
    const savedInterns = readCollectionFromStorage(STIP_APPLICATIONS_STORAGE_KEY, initialInterns);
    setUsers(savedUsers);
    setLeads(savedLeadCache.items.map(normalizeLeadForUi));
    leadsCacheHydrated.current = savedLeadCache.hasCache;
    leadCacheUserKey.current = getLeadCacheUserKey(savedSession);
    setLeadsLoadedFromBackend(savedLeadCache.hasCache);
    setServiceRows(savedServices);
    setStipPrograms(savedStipPrograms);
    setInterns(savedInterns);
    if (savedSession) {
      setCurrentUser(savedSession);
      if (String(savedSession.role || "").toLowerCase() === "student") {
        localStorage.setItem("crmst-student-session", JSON.stringify(savedSession));
        setAppView("student-dashboard");
      } else if (isCrmExecutive(savedSession.role)) {
        setAppView("crm-executive");
      } else if (isItUser(savedSession)) {
        setAppView("it-dashboard");
      } else {
        setAppView("dashboard");
      }
    }

    const session = savedSession || getCurrentUser();
    if (!session) {
      isHydratingInitialData.current = false;
      return;
    }

    (async () => {
      try {
        if (String(session.role || "").trim().toLowerCase() === "student") {
          const cachedCourses = readStudentCoursesFromStorage(session);
          if (cachedCourses.courses.length) setCourseRows(cachedCourses.courses);
          const remoteCourses = await loadCourses(false, true);
          if (Array.isArray(remoteCourses) && remoteCourses.length) {
            setCourseRows(remoteCourses);
            writeStudentCoursesToStorage(session, remoteCourses);
          }
          return;
        }
        if (isItUser(session)) {
          const [remoteTasks, remoteLeaves, remoteEmployees] = await Promise.all([
            loadTasks(),
            loadLeaves(),
            loadEmployees(),
          ]);
          if (Array.isArray(remoteTasks)) setItTasks(remoteTasks);
          if (Array.isArray(remoteLeaves)) setItLeaves(remoteLeaves);
          if (Array.isArray(remoteEmployees)) setItEmployees(remoteEmployees);
          return;
        }
        if (isCrmExecutive(session.role)) {
          const [remoteLeads, remoteAssignees] = await Promise.all([loadLeads(), loadAssignableUsers()]);
          if (Array.isArray(remoteAssignees)) setLeadAssignmentUsers(remoteAssignees);
          if (Array.isArray(remoteLeads)) {
            setLeads(remoteLeads.map(normalizeLeadForUi));
            leadsCacheHydrated.current = true;
            setLeadsLoadedFromBackend(true);
          }
          return;
        }
        const [remoteUsers, remoteLeads, remoteServices, remoteCourses, remoteStip, remoteInterns, remoteTasks, remoteAttendance, remoteLeaves] = await Promise.all([
          loadUsers(),
          loadLeads(true),
          loadServices(),
          loadCourses(),
          loadStipPrograms(),
          loadStipApplications(),
          loadTasks(),
          loadAttendance(),
          loadLeaves(),
        ]);
        if (Array.isArray(remoteTasks)) setTasks(remoteTasks);
        if (Array.isArray(remoteAttendance)) setAttendance(remoteAttendance);
        if (Array.isArray(remoteLeaves)) setLeaves(remoteLeaves);
        if (remoteUsers.length) {
          setUsers(remoteUsers);
          const savedProfile = remoteUsers.find((user) => String(user._id || user.id) === String(session._id || session.id));
          if (savedProfile) setCurrentUser(savedProfile);
        }
        if (Array.isArray(remoteLeads)) {
          setLeads(remoteLeads.map(normalizeLeadForUi));
          leadsCacheHydrated.current = true;
          setLeadsLoadedFromBackend(true);
        }
        if (remoteServices.length) setServiceRows(remoteServices);
        if (remoteCourses.length) setCourseRows(remoteCourses);
        if (remoteStip.length) setStipPrograms(remoteStip);
        if (remoteInterns.length) setInterns(remoteInterns);
      } catch (err) {
        console.warn("Initial load failed", err);
      } finally {
        isHydratingInitialData.current = false;
      }
    })();
  }, []);

  useEffect(() => {
    const role = String(currentUser?.role || "").trim().toLowerCase();
    if (!currentUser || role === "student" || activePage !== "course-check") return undefined;
    let active = true;
    setTaskSubmissionLoading(true);
    loadTaskSubmissions().then((items) => {
      if (active && Array.isArray(items)) setTaskSubmissions(items);
    }).catch((err) => {
      if (active) notify(err?.message || "Could not load task submissions.");
    }).finally(() => {
      if (active) setTaskSubmissionLoading(false);
    });
    return () => { active = false; };
  }, [activePage, currentUser]);

  useEffect(() => {
    const role = String(currentUser?.role || "").trim().toLowerCase();
    const studentId = String(currentUser?.id || currentUser?._id || "").trim();
    if (role !== "student" || !studentId) {
      setNotifications([]);
      setStudentEnrollmentRequests([]);
      return undefined;
    }

    let active = true;
    const cachedRequests = readStudentEnrollmentRequestsFromStorage(currentUser);
    if (cachedRequests.items.length) setStudentEnrollmentRequests(cachedRequests.items);
    const refreshStudentEnrollmentRequests = async () => {
      try {
        const result = await loadEnrollmentRequests(studentId);
        if (active && Array.isArray(result)) {
          setStudentEnrollmentRequests(result);
          writeStudentEnrollmentRequestsToStorage(currentUser, result);
        }
      } catch (err) {
        if (active && err?.status !== 401) console.warn("Enrollment request refresh failed", err);
      }
    };

    if (!cachedRequests.fetchedAt || Date.now() - cachedRequests.fetchedAt >= STUDENT_ENROLLMENT_REQUESTS_CACHE_TTL_MS) {
      refreshStudentEnrollmentRequests();
    }
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    if (!isAdminUser(currentUser)) {
      setAllEnrollmentRequests([]);
      return undefined;
    }

    let active = true;
    const refreshPendingEnrollmentRequests = async () => {
      try {
        const result = await loadPendingEnrollmentRequests();
        if (active && Array.isArray(result)) {
          setAllEnrollmentRequests(result);
        }
      } catch (err) {
        if (active && err?.status !== 401) console.warn("Pending enrollment requests load failed", err);
      }
    };

    refreshPendingEnrollmentRequests();
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    if (!isAdminUser(currentUser) || activePage !== "enrollment-requests") return undefined;

    let active = true;
    const applyIncomingRequest = (request) => {
      if (!request || request.status !== "pending") return;
      setAllEnrollmentRequests((current) => [
        request,
        ...current.filter((item) => String(item.id || "") !== String(request.id || "")),
      ]);
    };
    const handleRequestEvent = (event) => applyIncomingRequest(event.detail);
    const handleStorageEvent = (event) => {
      if (event.key !== ENROLLMENT_REQUEST_SYNC_KEY || !event.newValue) return;
      try { applyIncomingRequest(JSON.parse(event.newValue).request); } catch {}
    };

    window.addEventListener("crmst:enrollment-request", handleRequestEvent);
    window.addEventListener("storage", handleStorageEvent);

    const syncEnrollmentRequests = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const result = await loadPendingEnrollmentRequests();
        if (active && Array.isArray(result)) setAllEnrollmentRequests(result);
      } catch (err) {
        if (active && err?.status !== 401) console.warn("Enrollment request sync failed", err);
      }
    };

    const interval = window.setInterval(syncEnrollmentRequests, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", syncEnrollmentRequests);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncEnrollmentRequests);
      window.removeEventListener("crmst:enrollment-request", handleRequestEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [currentUser, activePage]);

  async function handleRequestCourseEnrollment(course) {
    const studentId = String(currentUser?.id || currentUser?._id || "").trim();
    const courseId = String(course?.id || course?._id || "").trim();
    if (!studentId || !courseId) {
      notify("Unable to request enrollment right now.");
      return;
    }

    try {
      const result = await requestCourseEnrollment(studentId, courseId, course?.title || course?.name || "Course", {
        studentName: currentUser?.name || currentUser?.username || "",
        studentPhone: currentUser?.phone || "",
      });
      if (result) {
        notify(`Enrollment request sent for “${course?.title || course?.name || "this course"}”.`);
        const optimisticRequest = {
          id: result.id,
          studentId,
          courseId,
          courseName: course?.title || course?.name || "Course",
          studentName: currentUser?.name || currentUser?.username || "",
          studentPhone: currentUser?.phone || "",
          status: "pending",
          requestedAt: result.requestedAt || new Date().toISOString(),
        };
        setStudentEnrollmentRequests((current) => {
          const next = [optimisticRequest, ...current.filter((item) => String(item.courseId || "") !== courseId)];
          writeStudentEnrollmentRequestsToStorage(currentUser, next);
          return next;
        });
        publishEnrollmentRequestEvent(optimisticRequest);
      }
    } catch (err) {
      if (err?.status === 409) {
        const existingRequest = err.request || {
          id: `existing-${courseId}`,
          studentId,
          courseId,
          courseName: course?.title || course?.name || "Course",
          studentName: currentUser?.name || currentUser?.username || "",
          studentPhone: currentUser?.phone || "",
          status: "pending",
          requestedAt: new Date().toISOString(),
        };
        setStudentEnrollmentRequests((current) => {
          const next = [existingRequest, ...current.filter((item) => String(item.courseId || "") !== courseId)];
          writeStudentEnrollmentRequestsToStorage(currentUser, next);
          return next;
        });
        publishEnrollmentRequestEvent(existingRequest);
        notify("This enrollment request has already been sent.");
      } else {
        notify(err?.message || "Unable to submit the enrollment request.");
      }
    }
  }

  async function handleUpdateEnrollmentRequestStatus(request, nextStatus, remark = request?.remark || "") {
    const studentId = String(request?.studentId || "").trim();
    const requestId = String(request?.id || "").trim();
    if (!studentId || !requestId) return;

    try {
      const updated = await updateEnrollmentRequestStatusForAdmin(studentId, requestId, nextStatus, remark);
      if (updated) {
        setAllEnrollmentRequests((current) => current.map((item) => (
          String(item.id || "") === requestId ? { ...item, ...updated, status: nextStatus, remark } : item
        )));
        notify(`Enrollment request marked as ${nextStatus}.`);
      }
    } catch (err) {
      notify(err?.message || "Unable to update enrollment request.");
    }
  }

  useEffect(() => {
    const role = String(currentUser?.role || "").trim().toLowerCase();
    const studentId = String(currentUser?.id || currentUser?._id || "").trim();
    if (role !== "student" || !studentId) {
      setNotifications([]);
      return undefined;
    }

    let active = true;
    const cached = readStudentNotificationsFromStorage(currentUser);
    if (cached.items.length) setNotifications(cached.items);
    let knownNotificationIds = new Set(cached.items.map((item) => String(item.id || "")));
    const refreshEvaluatedCourses = async (items) => {
      const hasNewCourseNotification = items.some((item) => (
        ["assignment_evaluated", "lesson_added"].includes(item.type)
        && !knownNotificationIds.has(String(item.id || ""))
      ));
      knownNotificationIds = new Set(items.map((item) => String(item.id || "")));
      if (!hasNewCourseNotification) return;
      invalidateCoursesCache();
      const refreshedCourses = await loadCourses(true, true);
      if (active && refreshedCourses.length) {
        setCourseRows(refreshedCourses);
        writeStudentCoursesToStorage(currentUser, refreshedCourses);
      }
    };
    if (cached.fetchedAt && Date.now() - cached.fetchedAt < STUDENT_NOTIFICATIONS_CACHE_TTL_MS) {
      refreshEvaluatedCourses(cached.items).catch(() => {});
      return undefined;
    }
    const refreshNotifications = async () => {
      try {
        const result = await loadNotifications(studentId);
        if (active && Array.isArray(result)) {
          setNotifications(result);
          writeStudentNotificationsToStorage(currentUser, result);
          await refreshEvaluatedCourses(result);
        }
      } catch (err) {
        if (err?.status !== 401) console.warn("Notification refresh failed", err);
      }
    };
    refreshNotifications();
    return () => {
      active = false;
    };
  }, [currentUser]);

  async function handleReadNotification(notificationId) {
    const studentId = String(currentUser?.id || currentUser?._id || "").trim();
    if (!studentId || !notificationId) return;
    try {
      const updated = await readNotification(studentId, notificationId);
      if (updated) {
        setNotifications((current) => {
          const next = current.map((notification) => (
            notification.id === notificationId ? { ...notification, ...updated, read: true } : notification
          ));
          writeStudentNotificationsToStorage(currentUser, next);
          return next;
        });
      }
    } catch (err) {
      if (err?.status !== 401) console.warn("Notification update failed", err);
    }
  }

  async function handleReadAllNotifications() {
    const studentId = String(currentUser?.id || currentUser?._id || "").trim();
    if (!studentId) return;
    try {
      await readAllNotifications(studentId);
      setNotifications((current) => {
        const next = current.map((notification) => ({ ...notification, read: true }));
        writeStudentNotificationsToStorage(currentUser, next);
        return next;
      });
    } catch (err) {
      if (err?.status !== 401) console.warn("Notification update failed", err);
    }
  }

  useEffect(() => {
    const userKey = getLeadCacheUserKey(currentUser);
    if (!userKey || leadCacheUserKey.current === userKey) return;

    leadCacheUserKey.current = userKey;
    const cachedLeads = readLeadsFromStorage(currentUser);
    setLeads(cachedLeads.items.map(normalizeLeadForUi));
    leadsCacheHydrated.current = cachedLeads.hasCache;
    if (cachedLeads.hasCache) {
      setLeadsLoadedFromBackend(true);
      return;
    }

    loadLeads().then((remoteLeads) => {
      if (!Array.isArray(remoteLeads)) return;
      setLeads(remoteLeads.map(normalizeLeadForUi));
      leadsCacheHydrated.current = true;
      setLeadsLoadedFromBackend(true);
    });
  }, [currentUser]);

  useEffect(() => {
    const sanitizedUsers = sanitizeImageCollection(users);
    if (!safeStorageSet(USERS_STORAGE_KEY, JSON.stringify(sanitizedUsers))) {
      notify("Browser storage is full. Continuing without caching large local data.");
    }
  }, [users]);

  useEffect(() => {
    if (!leadsCacheHydrated.current || !leadCacheUserKey.current) return;
    const sanitizedLeads = sanitizeImageCollection(leads);
    const cache = {
      version: LEADS_CACHE_VERSION,
      userKey: leadCacheUserKey.current,
      items: sanitizedLeads,
    };
    if (!safeStorageSet(LEADS_STORAGE_KEY, JSON.stringify(cache))) {
      notify("Browser storage is full. Lead changes are still kept in memory.");
    }
  }, [leads]);

  useEffect(() => {
    const sanitizedServices = sanitizeImageCollection(serviceRows);
    if (!safeStorageSet(SERVICES_STORAGE_KEY, JSON.stringify(sanitizedServices))) {
      notify("Browser storage is full. Service changes are still kept in memory.");
    }
  }, [serviceRows]);

  useEffect(() => {
    const sanitizedPrograms = sanitizeImageCollection(stipPrograms);
    safeStorageSet(STIP_PROGRAMS_STORAGE_KEY, JSON.stringify(sanitizedPrograms));
  }, [stipPrograms]);

  useEffect(() => {
    const sanitizedInterns = sanitizeImageCollection(interns);
    safeStorageSet(STIP_APPLICATIONS_STORAGE_KEY, JSON.stringify(sanitizedInterns));
  }, [interns]);

  useEffect(() => {
    if (currentUser) {
      if (!safeStorageSet(SESSION_STORAGE_KEY, JSON.stringify(currentUser))) {
        notify("Unable to update your local session cache.");
      }
    } else {
      safeStorageRemove(SESSION_STORAGE_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (String(currentUser.role || "").toLowerCase() === "student") {
      localStorage.setItem("crmst-student-session", JSON.stringify(currentUser));
      setAppView("student-dashboard");
    } else if (isCrmExecutive(currentUser.role)) {
      setAppView("crm-executive");
    }
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("studentLogout") === "1") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const handleAuthRequired = (event) => {
      cleanupModalStateImages(serviceModal);
      cleanupModalStateImages(trainingModal);
      cleanupModalStateImages(stipModal);
      setServiceModal(null);
      setTrainingModal(null);
      setStipModal(null);
      setCurrentUser(null);
      setAppView("auth");
      setAuthMode("login");
      notify(event?.detail?.message || "Your session expired. Please log in again.");
    };

    window.addEventListener("crmst:auth-required", handleAuthRequired);
    return () => window.removeEventListener("crmst:auth-required", handleAuthRequired);
  }, [serviceModal, trainingModal, stipModal]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Keep course data in sync with the backend when an administrator changes a
  // lesson or uploads a new video. This runs only for a visible browser tab.
  useEffect(() => {
    if (!currentUser) return undefined;
    const coursePage = ["course-view", "course-add", "course-check", "dashboard"].includes(activePage)
      || String(currentUser.role || "").toLowerCase() === "student";
    if (!coursePage) return undefined;
    let active = true;
    const refreshCourses = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const refreshed = await loadCourses();
        if (!active || !Array.isArray(refreshed)) return;
        setCourseRows(refreshed);
        if (String(currentUser.role || "").toLowerCase() === "student") {
          writeStudentCoursesToStorage(currentUser, refreshed);
        }
      } catch (error) {
        console.warn("Course refresh failed", error);
      }
    };
    const interval = window.setInterval(refreshCourses, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", refreshCourses);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshCourses);
    };
  }, [currentUser, activePage]);

  const navResults = useMemo(() => {
    if (!deferredQuery.trim()) return sidebarSections;
    return sidebarSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.label.toLowerCase().includes(deferredQuery.toLowerCase()),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [deferredQuery]);

  const pageTitle =
    sidebarSections
      .flatMap((section) => section.items)
      .find((item) => item.id === activePage)?.label || "Dashboard";

  const pendingEnrollmentRequestCount = allEnrollmentRequests.filter((request) => request.status === "pending").length;
  const filteredEnrollmentRequests = allEnrollmentRequests.filter((request) => {
    const query = enrollmentRequestQuery.trim().toLowerCase();
    const matchesQuery = !query || [request.studentName, request.studentPhone, request.courseName, request.courseId]
      .join(" ").toLowerCase().includes(query);
    const requestDate = request.requestedAt ? new Date(request.requestedAt) : null;
    const matchesDate = !enrollmentRequestDate || (requestDate && !Number.isNaN(requestDate.getTime())
      && requestDate.toISOString().slice(0, 10) === enrollmentRequestDate);
    const matchesStatus = enrollmentRequestStatus === "all" || request.status === enrollmentRequestStatus;
    return matchesQuery && matchesDate && matchesStatus;
  });
  const activeEnrollmentRequests = filteredEnrollmentRequests.filter((request) => ["pending", "contacted"].includes(request.status));
  const processedEnrollmentRequests = filteredEnrollmentRequests.filter((request) => ["approved", "rejected", "completed"].includes(request.status));

  const displayTrainingRows = useMemo(() => {
    return courseRows.map((course) => normalizeCourseToTraining(course));
  }, [courseRows]);

  const lessonSectionOptions = useMemo(() => {
    const courseId = String(trainingModal?.item?.courseId || "");
    if (!courseId) return [];
    const course = courseRows.find((row) => String(row.id || row._id) === courseId);
    return [...new Set((course?.lessons || []).map((lesson) => String(lesson.section || "General").trim()).filter(Boolean))].sort();
  }, [courseRows, trainingModal?.item?.courseId]);

  const currentLessonNumber = useMemo(() => {
    const item = trainingModal?.item;
    const courseId = String(item?.courseId || "");
    const section = String(item?.section || "General").trim().toLowerCase() || "general";
    const course = courseRows.find((row) => String(row.id || row._id) === courseId);
    const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
    const sectionLessons = lessons.filter((lesson) => String(lesson.section || "General").trim().toLowerCase() === section);
    if (trainingModal?.mode === "edit-lesson") {
      const index = sectionLessons.findIndex((lesson) => String(lesson.id) === String(item?.lessonId));
      return index >= 0 ? index + 1 : sectionLessons.length + 1;
    }
    return sectionLessons.length + 1;
  }, [courseRows, trainingModal?.item, trainingModal?.mode]);

  const visibleUsers = useMemo(() => {
    return users.filter((user) => !isAdminUser(user));
  }, [users]);

  const activeUsers = users.filter((user) => String(user?.status || "Active").trim().toLowerCase() !== "inactive");
  const leadAssignableUsers = activeUsers.filter(isLeadAssignmentUser);
  const enteredBy = currentUser
    ? `${currentUser.name || currentUser.username || "User"} (${currentUser.position || currentUser.role || "User"})`
    : "";
  const studentUsers = useMemo(() => users.filter((user) => {
    const role = String(user?.role || "").trim().toLowerCase();
    const department = String(user?.dept || user?.department || "").trim().toLowerCase();
    return role === "student" || department === "student";
  }), [users]);

  const taskReviewRows = useMemo(() => taskSubmissions
    .filter((submission) => String(submission.taskStudentPdfUpload || "").trim())
    .map((submission) => {
      const student = studentUsers.find((user) => String(user.id || user._id) === String(submission.studentId));
      const course = courseRows.find((item) => String(item.id || item._id) === String(submission.courseId));
      const lesson = course?.lessons?.find((item) => String(item.id) === String(submission.lessonId) && String(item.section || "General").trim().toLowerCase() === String(submission.section || "General").trim().toLowerCase());
      const task = lesson?.tasks?.find((item) => String(item.id) === String(submission.taskId));
      return {
        ...submission,
        grade: hasTaskGrade(submission.grade) ? submission.grade : null,
        studentName: student?.name || student?.username || submission.studentId,
        studentEmail: student?.email || "",
        taskTitle: task?.title || submission.taskId || "Assignment",
        taskPdfUrl: task?.pdfUrl || task?.url || "",
      };
    })
    .sort((left, right) => {
      const leftGraded = hasTaskGrade(left.grade);
      const rightGraded = hasTaskGrade(right.grade);
      if (leftGraded !== rightGraded) return Number(leftGraded) - Number(rightGraded);
      const rightTime = new Date(right.updatedAt || 0).getTime();
      const leftTime = new Date(left.updatedAt || 0).getTime();
      return rightTime - leftTime;
    }), [taskSubmissions, studentUsers, courseRows]);

  useEffect(() => {
    const courseFormOpen = ["add", "edit", "lesson", "edit-lesson"].includes(trainingModal?.mode);
    if (!courseFormOpen || studentUsers.length > 0 || !isAdminUser(currentUser)) return;
    let active = true;
    loadUsers().then((remoteUsers) => {
      if (active && Array.isArray(remoteUsers) && remoteUsers.length > 0) setUsers(remoteUsers);
    });
    return () => {
      active = false;
    };
  }, [trainingModal?.mode, studentUsers.length, currentUser]);

  const currentUserId = String(currentUser?.id || currentUser?._id || "").trim();
  const assignedLeads = currentUserId
    ? leads.filter((lead) => String(lead.assignedTo || "") === currentUserId)
    : [];
  const wonLeads = leads.filter((lead) => ["Interested", "Converted", "Approved"].includes(String(lead.status || "").trim().replace(/_/g, " ")));
  const followUps = leads.filter((lead) => lead.status === "Follow-up");
  const revenue = wonLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);

  useEffect(() => {
    const approvedPage = activePage === "sales-approved" || activePage === "co-approved" || activePage === "sales-report";
    if (!approvedPage || leadRecoveryAttempted.current || wonLeads.length > 0) return;
    leadRecoveryAttempted.current = true;
    loadLeads().then((remoteLeads) => {
      if (!Array.isArray(remoteLeads)) return;
      setLeads(remoteLeads.map(normalizeLeadForUi));
      leadsCacheHydrated.current = true;
      setLeadsLoadedFromBackend(true);
    });
  }, [activePage, leadsLoadedFromBackend, wonLeads.length]);

  useEffect(() => {
    if (activePage !== "crm" || !isAdminUser(currentUser)) return undefined;
    const userKey = String(currentUser?.id || currentUser?._id || currentUser?.username || "");
    if (!userKey || adminAllLeadsLoadedForUser.current === userKey) return undefined;

    adminAllLeadsLoadedForUser.current = userKey;
    let active = true;
    loadLeads(true).then((remoteLeads) => {
      if (!active || !Array.isArray(remoteLeads)) return;
      setLeads(remoteLeads.map(normalizeLeadForUi));
      leadsCacheHydrated.current = true;
      setLeadsLoadedFromBackend(true);
    }).catch(() => {
      adminAllLeadsLoadedForUser.current = "";
    });
    return () => { active = false; };
  }, [activePage, currentUser]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activePage]);
  const leavePendingCount = leaves.filter((leave) => leave.status === "Pending").length;
  const sourceCounts = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {});
  const maxSourceCount = Math.max(...Object.values(sourceCounts), 1);

  function getCrmReportForUser(userName) {
    const userLeads = leads.filter((lead) => {
      const assignedUser = users.find((u) => String(u.id || u._id) === String(lead.assignedTo));
      return assignedUser?.name === userName;
    });
    const completed = userLeads.filter((lead) => lead.status === "Interested").length;
    const pending = userLeads.filter((lead) => lead.status === "Pending").length;
    const followUp = userLeads.filter((lead) => lead.status === "Follow-up").length;
    const notAttended = userLeads.filter((lead) => lead.status === "Not Interested").length;
    const total = userLeads.length;
    return { completed, pending, followUp, notAttended, total };
  }

  const crmReportUsers = activeUsers
    .filter((user) => ["CRM Executive", "Sales Executive"].includes(user.role))
    .map((user) => ({
      exec: user.name,
      ...getCrmReportForUser(user.name),
    }));

  const callTotal = crmReportUsers.reduce((sum, report) => sum + (report.total || 0), 0);
  const callConnected = crmReportUsers.reduce((sum, report) => sum + (report.completed || 0), 0);
  const callNotConnected = crmReportUsers.reduce((sum, report) => sum + (report.notAttended || 0), 0);
  const callConnectionRate = callTotal > 0 ? Math.round((callConnected / callTotal) * 100) : 0;

  const pipelineStages = [
    { label: "New", count: leads.filter((l) => l.status === "Pending").length, color: "var(--blue)" },
    { label: "Contacted", count: leads.filter((l) => l.status === "Pending" && l.assignedDate).length, color: "var(--teal)" },
    { label: "Follow-up", count: leads.filter((l) => l.status === "Follow-up").length, color: "var(--warning)" },
    { label: "Interested", count: leads.filter((l) => l.status === "Interested").length, color: "var(--success)" },
    { label: "Approved", count: leads.filter((l) => l.status === "Interested" && l.value > 0).length, color: "var(--violet)" },
    { label: "Won / Lost", count: leads.filter((l) => ["Interested", "Not Interested"].includes(l.status)).length, color: "var(--danger)" },
  ];

  const salesTrend = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short" });
      const value = leads
        .filter((l) => l.createdAt && String(l.createdAt).startsWith(key))
        .reduce((sum, l) => sum + Number(l.value || 0), 0);
      months.push({ month: label, value });
    }
    return months;
  }, [leads]);
  const maxSalesTrend = Math.max(...salesTrend.map((s) => s.value), 1);

  const quickActions = [
    { label: "Add Lead", icon: CirclePlus, action: () => setActivePage("sales-add") },
    { label: "Create User", icon: UserPlus, action: () => setActivePage("user-create") },
    { label: "Assign Task", icon: ClipboardCheck, action: () => setActivePage("hr-assign") },
    { label: "CRM Reports", icon: Activity, action: () => setActivePage("crm") },
    { label: "Sales Reports", icon: TrendingUp, action: () => setActivePage("sales-report") },
  ];

  const serviceCategoryCards = useMemo(() => {
    const grouped = serviceRows.reduce((acc, row) => {
      const category = row.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        ...row,
        status: row.status || "Active",
        updatedAt: row.updatedAt || "2026-08-01",
      });
      return acc;
    }, {});

    return Object.entries(grouped).map(([category, rows]) => ({
      category,
      services: rows.map((row) => row.name),
      pricing: rows.map((row) => row.price),
      status: deriveServiceStatus(rows),
      updatedAt: rows[0]?.updatedAt || "2026-08-01",
      rows,
    }));
  }, [serviceRows]);

  const selectedCategoryRows = useMemo(() => {
    if (!selectedServiceCategory) return [];
    return serviceRows.filter((row) => (row.category || "Uncategorized") === selectedServiceCategory);
  }, [selectedServiceCategory, serviceRows]);

  function createEntityId(prefix = "record") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function notify(message) {
    setToast(message);
  }

  function closeServiceModal() {
    cleanupModalStateImages(serviceModal);
    setServiceModal(null);
  }

  function closeTrainingModal() {
    const shouldReturnToCourseLibrary = ["add", "edit", "lesson", "edit-lesson"].includes(trainingModal?.mode);
    cleanupModalStateImages(trainingModal);
    setTrainingModal(null);
    setFolderUploadState(null);
    setCourseBuilderMode("manual");
    setOpenSectionIds([]);
    if (shouldReturnToCourseLibrary) setActivePage("course-view");
  }

  function closeStipModal() {
    cleanupModalStateImages(stipModal);
    setStipModal(null);
  }

  useEffect(() => {
    if (currentUser) {
      setSettingsForm({
        name: currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        emergencyContact: currentUser.emergencyContact || "",
        maritalStatus: currentUser.maritalStatus || "",
        education: currentUser.education || "",
        dept: currentUser.dept || "",
        position: currentUser.position || "",
        role: currentUser.role || "",
        joined: currentUser.joined || "",
        state: currentUser.state || "",
        branch: currentUser.branch || "",
        branchCode: currentUser.branchCode || "",
        address: currentUser.address || "",
        username: currentUser.username || "",
        imageUrl: currentUser.imageUrl || "",
        imagePublicId: currentUser.imagePublicId || "",
      });
      setAvatarPreview(currentUser.imageUrl || "");
    }
  }, [currentUser]);

  async function handleSaveProfile() {
    if (!currentUser) return;
    setSettingsMessage("");
    setUsernameError("");

    const name = settingsForm.name.trim();
    const email = settingsForm.email.trim();
    const phone = settingsForm.phone.trim();
    const emergencyContact = settingsForm.emergencyContact.trim();
    const maritalStatus = settingsForm.maritalStatus.trim();
    const education = settingsForm.education.trim();
    const dept = settingsForm.dept.trim();
    const position = settingsForm.position.trim();
    const role = settingsForm.role.trim();
    const joined = settingsForm.joined.trim();
    const state = settingsForm.state.trim();
    const branch = settingsForm.branch.trim();
    const branchCode = settingsForm.branchCode.trim();
    const address = settingsForm.address.trim();
    const username = settingsForm.username.trim();

    if (!username) {
      setUsernameError("Username is required");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSettingsMessage("Enter a valid email address.");
      setSettingsMessageType("error");
      return;
    }

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      setSettingsMessage("Contact number must be exactly 10 digits and start with 6, 7, 8, or 9.");
      setSettingsMessageType("error");
      return;
    }

    if (emergencyContact && !/^[6-9]\d{9}$/.test(emergencyContact)) {
      setSettingsMessage("Emergency contact must be exactly 10 digits and start with 6, 7, 8, or 9.");
      setSettingsMessageType("error");
      return;
    }

    try {
      setSettingsSaving(true);
      const updatedUser = { name, email, phone, emergencyContact, maritalStatus, education, dept, position, role, joined, state, branch, branchCode, address, username };

      if (avatarFile) {
        const compressed = await compressImageFile(avatarFile);
        const uploadResult = await uploadImage(compressed);
        updatedUser.imageUrl = uploadResult.imageUrl;
        updatedUser.imagePublicId = uploadResult.publicId;
      } else {
        updatedUser.imageUrl = settingsForm.imageUrl;
        updatedUser.imagePublicId = settingsForm.imagePublicId;
      }

      const userId = currentUser._id || currentUser.id;
      const savedUser = await updateUser(userId, updatedUser);
      setCurrentUser(savedUser);
      setUsers((items) => items.map((user) => String(user._id || user.id) === String(userId) ? savedUser : user));
      setAvatarFile(null);
      setSettingsMessage("Profile updated successfully.");
      setSettingsMessageType("success");
    } catch (err) {
      setSettingsMessage(err.message || "Failed to update profile.");
      setSettingsMessageType("error");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentUser) return;
    setPasswordMessage("");

    const { current, new: newPass, confirm } = passwordForm;

    if (!current || !newPass || !confirm) {
      setPasswordMessage("All password fields are required");
      setPasswordMessageType("error");
      return;
    }

    if (newPass !== confirm) {
      setPasswordMessage("New password and confirm password do not match");
      setPasswordMessageType("error");
      return;
    }

    if (newPass.length < 6) {
      setPasswordMessage("New password must be at least 6 characters");
      setPasswordMessageType("error");
      return;
    }

    try {
      setPasswordSaving(true);
      const result = await changePassword(currentUser._id || currentUser.id, current, newPass);
      setPasswordMessage(result.message || "Password changed successfully.");
      setPasswordMessageType("success");
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (err) {
      setPasswordMessage(err.message || "Failed to change password.");
      setPasswordMessageType("error");
    } finally {
      setPasswordSaving(false);
    }
  }

  function handleAvatarSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    if (!file.type.startsWith("image/")) {
      setSettingsMessage("Please choose an image file.");
      setSettingsMessageType("error");
      return;
    }
    setSettingsMessage("");

    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
      setAvatarFile(file);
    };
    reader.readAsDataURL(file);
  }

  function openServiceModal(mode, category = null, categoryRows = []) {
    if (mode === "add") {
      setServiceModal({
        mode: "add",
        category: "",
        row: {
          id: createEntityId("service"),
          category: "",
          name: "",
          details: "",
          price: "",
          technology: "",
          status: "Active",
           imageUrl: "",
          updatedAt: new Date().toISOString().slice(0, 10),
        },
      });
      return;
    }

    const rows = categoryRows.map((row) => sanitizeImageRecord({ ...row }));
    setServiceModal({ mode, category, rows });
  }

  async function saveServiceModal() {
    if (!serviceModal || serviceModalUploading) return;
    setServiceModalUploading(true);

    try {
      if (serviceModal.mode === "add") {
        const uploadedRow = await persistImageIfNeeded(serviceModal.row, notify);
        const backendRow = await createService({
          ...uploadedRow,
          _id: undefined,
          category: uploadedRow.category || "Uncategorized",
          updatedAt: new Date().toISOString().slice(0, 10),
        });
        const next = { ...backendRow };
        setServiceRows((currentRows) => [...currentRows, next]);
        notify(`Added ${next.name || next.category} to the service catalog.`);
        closeServiceModal();
        return;
      }

      if (serviceModal.mode === "edit") {
        const uploadedRows = [];
        for (const row of serviceModal.rows) {
          const draft = await persistImageIfNeeded(row, notify);
          const saved = await updateService(draft._id, draft);
          uploadedRows.push(saved);
        }
        setServiceRows((currentRows) => currentRows.map((row) => {
          const matched = uploadedRows.find(
  (saved) => String(saved._id) === String(row._id)
);
          return matched ? { ...row, ...matched, updatedAt: new Date().toISOString().slice(0, 10) } : row;
        }));
        notify(`${serviceModal.category} was updated.`);
        closeServiceModal();
        return;
      }

      if (serviceModal.mode === "duplicate") {
        const nextRows = [];
        for (const row of serviceModal.rows) {
          const uploadedRow = await persistImageIfNeeded(row, notify);
          const backendRow = await createService({
            ...uploadedRow,
            id: undefined,
            category: `${row.category || serviceModal.category} Copy`,
            name: `${row.name || "Service"} Copy`,
            updatedAt: new Date().toISOString().slice(0, 10),
          });
          nextRows.push({ ...backendRow, id: backendRow.id || createEntityId(`service-copy-${nextRows.length}`) });
        }
        setServiceRows((currentRows) => [...currentRows, ...nextRows]);
        notify(`Duplicated ${serviceModal.category}.`);
        closeServiceModal();
      }
    } catch (err) {
      console.error("saveServiceModal failed", err);
      notify(err?.message || "Save failed. Please try again.");
    } finally {
      setServiceModalUploading(false);
    }
  }

  function makeEmptyTask() {
    return { id: createEntityId("task"), title: "", pdfUrl: "", fileName: "", timeLimit: "60", description: "" };
  }
  function makeEmptyLesson() {
    return { id: createEntityId("lesson"), title: "", videoUrl: "", videoFileName: "", notesUrl: "", notesFileName: "", durationTime: "01:00:00", tasks: [] };
  }
  function makeEmptySection() {
    const section = { id: createEntityId("section"), name: "", lessons: [makeEmptyLesson()] };
    setOpenSectionIds((current) => [...current, section.id]);
    return section;
  }

  function openTrainingModal(mode, course = null, lesson = null) {
    if (mode === "add") {
      setActivePage("course-add");
      setCourseBuilderMode("manual");
      setFolderUploadState(null);
      setFocusedLessonId("");
      const firstSection = makeEmptySection();
      setOpenSectionIds([firstSection.id]);
      setTrainingModal({
        mode: "add",
        step: 1,
        item: {
          id: createEntityId("training"),
          name: "",
          duration: "",
          price: "",
          tools: "",
          lessonTitle: "",
          lesson: "",
          videoUrl: "",
          notesUrl: "",
          assignmentTitle: "",
          assignmentTime: "60",
          assignment: "",
          assignmentUrl: "",
          studentIds: [],
          sections: [firstSection],
          trainer: "",
          mode: "Hybrid",
          level: "Advanced",
          seats: "24",
          batchTiming: "Mon-Fri • 6PM-8PM",
          projects: "3 capstone projects",
          certification: "Industry certificate",
          placement: "100% interview prep",
           imageUrl: "",
          syllabus: "Introduction and environment setup\nProject sprints and collaborative modules\nAssessment, resume coaching, and portfolio review",
        },
      });
      return;
    }

    if (mode === "edit") {
      setActivePage("course-add");
      setCourseBuilderMode("manual");
      const item = course ? sanitizeImageRecord({ ...course }) : null;
      let selectedLessonId = String(lesson?.id || "");
      const selectedSectionIds = selectedLessonId
        ? (item?.sections || []).filter((section) => (section.lessons || []).some((entry) => String(entry.id) === selectedLessonId)).map((section) => section.id)
        : (item?.sections || []).map((section) => section.id);

      setFocusedLessonId(selectedLessonId);
      setOpenSectionIds(selectedSectionIds);
      setTrainingModal({ mode, step: 1, item });
      return;
    }

    if (mode === "lesson") {
      setActivePage("course-add");
      setTrainingModal({
        mode,
        step: 2,
        item: {
          courseId: course?.id || course?._raw?.id || "",
          section: "",
          lessonTitle: "",
          durationTime: "01:00:00",
          videoUrl: "",
          notesUrl: "",
          assignmentTitle: "",
          assignmentTime: "60",
          assignment: "",
          assignmentUrl: "",
        },
      });
      return;
    }

    if (mode === "edit-lesson") {
      setActivePage("course-add");
      setTrainingModal({
        mode,
        step: 2,
        item: {
          courseId: course?.id || "",
          lessonId: lesson?.id || "",
          section: lesson?.section || "General",
          lessonTitle: lesson?.title || "",
          durationTime: lesson?.durationTime || "01:00:00",
          videoUrl: lesson?.videoUrl || "",
          videoFileName: fileNameFromUrl(lesson?.videoUrl, "Existing video uploaded"),
          notesUrl: lesson?.notesUrl || "",
          notesFileName: fileNameFromUrl(lesson?.notesUrl, "Existing notes PDF uploaded"),
          assignmentTitle: lesson?.tasks?.[0]?.title || "",
          assignmentTime: lesson?.tasks?.[0]?.timeLimit || "60",
          assignment: lesson?.tasks?.[0]?.description || "",
          assignmentUrl: lesson?.tasks?.[0]?.pdfUrl || "",
          assignmentFileName: fileNameFromUrl(lesson?.tasks?.[0]?.pdfUrl, "Existing task PDF uploaded"),
        },
      });
      return;
    }

    setTrainingModal({ mode, step: 1, item: course ? sanitizeImageRecord({ ...course }) : null });
  }

  useEffect(() => {
    if (activePage === "course-add" && !trainingModal) {
      openTrainingModal("add");
    }
  }, [activePage, trainingModal]);

  useEffect(() => {
    if (!focusedLessonId || !trainingModal) return;
    const timer = window.setTimeout(() => {
      const lessonElement = document.querySelector(`[data-lesson-id="${CSS.escape(focusedLessonId)}"]`);
      if (!lessonElement) return;
      lessonElement.querySelector("[data-lesson-title]")?.focus({ preventScroll: true });
      lessonElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusedLessonId, trainingModal, openSectionIds]);

  function duplicateServiceCategory(category) {
    const rows = serviceRows.filter((row) => (row.category || "Uncategorized") === category);
    if (!rows.length) return;
    openServiceModal("duplicate", category, rows);
  }

  function deleteServiceCategory(category) {
    if (!window.confirm(`Delete ${category} and all attached services?`)) return;
    const rowsToDelete = serviceRows.filter((row) => (row.category || "Uncategorized") === category);
    rowsToDelete.forEach((row) => {
      deleteService(row._id).catch(() => {});
    });
    setServiceRows((currentRows) => currentRows.filter((row) => (row.category || "Uncategorized") !== category));
    if (selectedServiceCategory === category) setSelectedServiceCategory(null);
    notify(`${category} was removed.`);
  }

  function duplicateTraining(course) {
    const copy = {
      ...course,
      id: createEntityId("training"),
      name: `${course.name} (Copy)`,
      price: course.price,
    };
    setTrainingRows((currentRows) => [...currentRows, copy]);
    notify(`Duplicated ${course.name}.`);
  }

  async function deleteTraining(course) {
    if (!window.confirm(`Delete ${course.name}?`)) return;
    try {
      if (course?._raw?.id || course?.id) {
        await deleteCourse(String(course._raw?.id || course.id));
      }
    } catch (err) {
      console.warn("Failed deleting backend course", err);
    }
    setCourseRows((currentRows) => currentRows.filter((row) => String(row.id) !== String(course._raw?.id || course.id)));
    setTrainingRows((currentRows) => currentRows.filter((row) => String(row.id) !== String(course.id)));
    if (trainingModal?.mode === "view" && String(trainingModal.item?.id) === String(course._raw?.id || course.id)) {
      closeTrainingModal();
    }
    notify(`${course.name} was removed.`);
  }

  async function removeLessonFromCourse(course, lesson) {
    if (!window.confirm(`Delete lesson "${lesson.title || "Untitled lesson"}"?`)) return;
    try {
      const updatedCourse = await deleteCourseLesson(course.id, lesson.id);
      setCourseRows((currentRows) => currentRows.map((row) => String(row.id) === String(course.id) ? updatedCourse : row));
      setTrainingRows((currentRows) => currentRows.map((row) => String(row.id) === String(course.id) ? normalizeCourseToTraining(updatedCourse) : row));
      setTrainingModal({ mode: "view", step: 1, item: normalizeCourseToTraining(updatedCourse) });
      notify("Lesson deleted.");
    } catch (err) {
      notify(err.message || "Lesson could not be deleted.");
    }
  }

  function openStipModal(mode, program = null) {
    if (mode === "add") {
      setStipModal({
        mode: "add",
        item: {
          id: createEntityId("stip"),
          track: internshipTracks[0],
          duration: "3 months",
          focus: "",
          outcome: "",
          fee: "",
          mentor: "Project mentor",
          eligibility: "Graduate / internship-ready",
          seats: "12",
          deadline: "2026-08-20",
          applicationStatus: "Open",
           imageUrl: "",
        },
      });
      return;
    }

    setStipModal({ mode, item: program ? sanitizeImageRecord({ ...program }) : null });
  }

  async function handleServiceModalImageSelect(file, rowId = null) {
    if (!file) return;
    try {
      const pendingImage = await preparePendingImage(file);
      setServiceModal((current) => {
        if (!current) return current;
        if (rowId) {
          return {
            ...current,
            rows: current.rows.map((item) => {
              if (item.id !== rowId) return item;
              revokePreviewUrl(item._previewImage);
              return {
                ...item,
                _pendingImageFile: pendingImage.file,
                _previewImage: pendingImage.previewUrl,
              };
            }),
          };
        }
        revokePreviewUrl(current.row?._previewImage);
        return {
          ...current,
          row: {
            ...current.row,
            _pendingImageFile: pendingImage.file,
            _previewImage: pendingImage.previewUrl,
          },
        };
      });
    } catch (err) {
      notify(err.message || "Unable to process the selected image.");
    }
  }

  async function handleTrainingModalImageSelect(file) {
    if (!file) return;
    try {
      const pendingImage = await preparePendingImage(file);
      setTrainingModal((current) => {
        if (!current?.item) return current;
        revokePreviewUrl(current.item._previewImage);
        return {
          ...current,
          item: {
            ...current.item,
            _pendingImageFile: pendingImage.file,
            _previewImage: pendingImage.previewUrl,
            thumbnailName: file.name,
          },
        };
      });
    } catch (err) {
      notify(err.message || "Unable to process the selected image.");
    }
  }

  async function handleCourseAssetSelect(file, field, fileNameField) {
    if (!file) return;
    setTrainingAssetUploading(field);
    try {
      const detectedDuration = field === "videoUrl" ? await readVideoDuration(file) : null;
      const uploaded = await uploadCourseAsset(file);
      const uploadedUrl = uploaded?.url || uploaded?.filePath || "";
      if (!uploadedUrl) throw new Error("Upload finished without a file URL. Please try again.");
      setTrainingModal((current) => current ? {
        ...current,
        item: { ...current.item, [field]: uploadedUrl, [fileNameField]: file.name, ...(detectedDuration ? { durationTime: formatVideoDuration(detectedDuration) } : {}) },
      } : current);
      notify(`${field === "videoUrl" ? "Video" : field === "notesUrl" ? "Notes" : "Assignment"} uploaded.`);
    } catch (err) {
      notify(err.message || "Course file upload failed.");
    } finally {
      setTrainingAssetUploading("");
    }
  }

  function advanceTrainingStep() {
    if (!trainingModal?.item) return;
    const item = trainingModal.item;
    const step = trainingModal.step || 1;
    if (step === 1 && (!String(item.name || "").trim() || !String(item.duration || "").trim() || !String(item.price || "").trim() || !String(item.mode || "").trim() || !String(item.tools || "").trim() || !String(item.syllabus || "").trim())) {
      notify("Complete all required course fields before continuing.");
      return;
    }
    if (step === 2 && (!String(item.lessonTitle || "").trim() || !item.videoUrl || !/^\d{2}:\d{2}:\d{2}$/.test(String(item.durationTime || "")))) {
      notify("Add the lesson title, video duration, and video file before continuing.");
      return;
    }
    if (step === 3 && !item.notesUrl) {
      notify("Upload the lesson notes PDF before continuing.");
      return;
    }
    if (step === 4) {
      saveTrainingModal();
      return;
    }
    setTrainingModal((current) => ({ ...current, step: step + 1 }));
  }

  function updateCourseSections(updater) {
    setTrainingModal((current) => {
      if (!current) return current;
      const sections = updater(current.item.sections || []);
      return { ...current, item: { ...current.item, sections } };
    });
  }
  function addCourseSection() {
    const section = makeEmptySection();
    updateCourseSections((sections) => [...sections, section]);
  }
  function removeCourseSection(sectionId) {
    updateCourseSections((sections) => sections.filter((section) => section.id !== sectionId));
  }
  function renameCourseSection(sectionId, name) {
    updateCourseSections((sections) => sections.map((section) => section.id === sectionId ? { ...section, name } : section));
  }
  function addLessonToSection(sectionId) {
    const lesson = makeEmptyLesson();
    setOpenSectionIds((current) => current.includes(sectionId) ? current : [...current, sectionId]);
    setFocusedLessonId(lesson.id);
    updateCourseSections((sections) => sections.map((section) => section.id === sectionId
      ? { ...section, lessons: [...section.lessons, lesson] }
      : section));
  }
  function removeLessonFromSection(sectionId, lessonId) {
    updateCourseSections((sections) => sections.map((section) => section.id === sectionId ? { ...section, lessons: section.lessons.filter((lesson) => lesson.id !== lessonId) } : section));
  }
  function patchLesson(sectionId, lessonId, patch) {
    updateCourseSections((sections) => sections.map((section) => section.id === sectionId ? {
      ...section,
      lessons: section.lessons.map((lesson) => lesson.id === lessonId ? { ...lesson, ...patch } : lesson),
    } : section));
  }
  function addTaskToLesson(sectionId, lessonId) {
    updateCourseSections((sections) => sections.map((section) => section.id === sectionId ? {
      ...section,
      lessons: section.lessons.map((lesson) => lesson.id === lessonId ? { ...lesson, tasks: [...(lesson.tasks || []), makeEmptyTask()] } : lesson),
    } : section));
  }
  function removeTaskFromLesson(sectionId, lessonId, taskId) {
    updateCourseSections((sections) => sections.map((section) => section.id === sectionId ? {
      ...section,
      lessons: section.lessons.map((lesson) => lesson.id === lessonId ? { ...lesson, tasks: (lesson.tasks || []).filter((task) => task.id !== taskId) } : lesson),
    } : section));
  }
  function patchTask(sectionId, lessonId, taskId, patch) {
    updateCourseSections((sections) => sections.map((section) => section.id === sectionId ? {
      ...section,
      lessons: section.lessons.map((lesson) => lesson.id === lessonId ? {
        ...lesson,
        tasks: (lesson.tasks || []).map((task) => task.id === taskId ? { ...task, ...patch } : task),
      } : lesson),
    } : section));
  }
  function toggleSectionOpen(sectionId) {
    setOpenSectionIds((current) => current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId]);
  }

  function readVideoDuration(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.removeAttribute("src");
        video.load();
      };
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const duration = Number(video.duration);
        cleanup();
        if (Number.isFinite(duration) && duration > 0) resolve(Math.round(duration));
        else reject(new Error("Could not read the video duration."));
      };
      video.onerror = () => {
        cleanup();
        reject(new Error("Could not read the video duration."));
      };
      video.src = objectUrl;
    });
  }

  function formatVideoDuration(totalSeconds) {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
  }

  async function handleLessonFileUpload(sectionId, lessonId, field, fileNameField, file) {
    if (!file) return;
    const busyKey = `${lessonId}:${field}`;
    setTrainingAssetUploading(busyKey);
    try {
      const detectedDuration = field === "videoUrl" ? await readVideoDuration(file) : null;
      const uploaded = await uploadCourseAsset(file);
      const uploadedUrl = uploaded?.url || uploaded?.filePath || "";
      if (!uploadedUrl) throw new Error("Upload finished without a file URL. Please try again.");
      const assetPatch = {
        [field]: uploadedUrl,
        [fileNameField]: file.name,
        ...(detectedDuration ? {
          durationTime: formatVideoDuration(detectedDuration),
        } : {}),
      };
      patchLesson(sectionId, lessonId, assetPatch);

      // An ImageKit upload only creates the file. For an existing course, also
      // save the changed lesson immediately so Firestore gets the real video
      // length instead of retaining the previous duration.
      const courseId = String(trainingModal?.item?.id || "").trim();
      const activeSection = (trainingModal?.item?.sections || []).find((section) => String(section.id) === String(sectionId));
      const activeLesson = activeSection?.lessons?.find((lesson) => String(lesson.id) === String(lessonId));
      if (trainingModal?.mode === "edit" && courseId && activeSection && activeLesson) {
        const savedCourse = await updateCourseLesson(courseId, lessonId, {
          ...activeLesson,
          ...assetPatch,
          section: String(activeSection.name || "General").trim() || "General",
          tasks: (activeLesson.tasks || []).map((task) => ({
            ...task,
            fileName: task.fileName || fileNameFromUrl(task.pdfUrl, "Uploaded task PDF"),
          })),
        });
        if (savedCourse) {
          setCourseRows((currentRows) => currentRows.map((course) => String(course.id) === courseId ? savedCourse : course));
          setTrainingRows((currentRows) => currentRows.map((course) => String(course.id) === courseId ? normalizeCourseToTraining(savedCourse) : course));
        }
      }
    } catch (err) {
      notify(err.message || "File upload failed.");
    } finally {
      setTrainingAssetUploading("");
    }
  }

  async function handleTaskFileUpload(sectionId, lessonId, taskId, file) {
    if (!file) return;
    const busyKey = `${taskId}:pdfUrl`;
    setTrainingAssetUploading(busyKey);
    try {
      const uploaded = await uploadCourseAsset(file);
      const uploadedUrl = uploaded?.url || uploaded?.filePath || "";
      if (!uploadedUrl) throw new Error("Upload finished without a file URL. Please try again.");
      patchTask(sectionId, lessonId, taskId, { pdfUrl: uploadedUrl, fileName: file.name });
    } catch (err) {
      notify(err.message || "Task PDF upload failed.");
    } finally {
      setTrainingAssetUploading("");
    }
  }

  function buildLessonsPayloadFromSections(sections) {
    const payload = [];
    (sections || []).forEach((section) => {
      (section.lessons || []).forEach((lesson) => {
        if (!String(lesson.title || "").trim()) return;
        const tasks = (lesson.tasks || [])
          .filter((task) => String(task.title || "").trim() || task.pdfUrl)
          .map((task) => ({
            title: String(task.title || "").trim() || "Task",
            timeLimit: Number(task.timeLimit || 30),
            pdfUrl: task.pdfUrl || "",
            fileName: task.fileName || fileNameFromUrl(task.pdfUrl, "Uploaded task PDF"),
            type: "assignment",
            description: task.description || "",
          }));
        payload.push({
          section: String(section.name || "").trim() || "General",
          title: String(lesson.title).trim(),
          videoUrl: lesson.videoUrl || "",
          videoFileName: lesson.videoFileName || fileNameFromUrl(lesson.videoUrl, "Uploaded video"),
          notesUrl: lesson.notesUrl || "",
          notesFileName: lesson.notesFileName || fileNameFromUrl(lesson.notesUrl, "Uploaded notes PDF"),
          durationTime: lesson.durationTime || "00:00:00",
          tasks,
        });
      });
    });
    return payload;
  }

  async function saveCourseBuilder() {
    if (!trainingModal?.item || trainingModalUploading) return;
    const item = trainingModal.item;
    const missingFields = [
      ["title", item.name],
      ["duration", item.duration],
      ["fees", item.price],
      ["mode", item.mode],
      ["tools / technologies", item.tools],
      ["syllabus", item.syllabus],
    ].filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
    if (missingFields.length) {
      notify(`Complete: ${missingFields.join(", ")}.`);
      return;
    }
    const durationMonths = Number(String(item.duration).match(/\d+/)?.[0] || 0);
    const feeDigits = String(item.price).replace(/[^0-9]/g, "");
    if (durationMonths < 1 || durationMonths > 10) {
      notify("Duration must be between 1 and 10 months.");
      return;
    }
    if (!feeDigits) {
      notify("Fees must contain a rupee amount.");
      return;
    }
    const lessonsPayload = buildLessonsPayloadFromSections(item.sections);
    if (!lessonsPayload.length) {
      notify("Add at least one section with a titled lesson before saving.");
      return;
    }
    setTrainingModalUploading(true);
    try {
      const uploadedItem = await persistImageIfNeeded(item, notify);
      const payload = {
        title: uploadedItem.name || "Untitled course",
        duration: `${durationMonths} months`,
        fees: feeDigits,
        mode: uploadedItem.mode || "Online",
        tools: uploadedItem.tools || "",
        syllabus: uploadedItem.syllabus || "",
        thumbnail: uploadedItem.imageUrl || "",
        thumbnailName: uploadedItem.thumbnailName || "",
        status: "active",
        studentIds: Array.isArray(uploadedItem.studentIds) ? uploadedItem.studentIds : [],
        lessons: lessonsPayload,
      };
      const savedCourse = trainingModal.mode === "edit"
        ? await updateCourse(uploadedItem.id, { ...payload, id: uploadedItem.id })
        : await createCourse(payload);
      const latestCourse = savedCourse;
      const next = normalizeCourseToTraining(latestCourse);
      if (trainingModal.mode === "edit") {
        setCourseRows((currentRows) => currentRows.map((row) => String(row.id) === String(uploadedItem.id) ? latestCourse : row));
        setTrainingRows((currentRows) => currentRows.map((row) => String(row.id) === String(uploadedItem.id) ? next : row));
        notify(`${next.name} was updated with ${lessonsPayload.length} lesson(s).`);
      } else {
        setCourseRows((currentRows) => [latestCourse, ...currentRows]);
        setTrainingRows((currentRows) => [next, ...currentRows]);
        notify(`${next.name} was added with ${lessonsPayload.length} lesson(s).`);
      }
      closeTrainingModal();
    } catch (err) {
      notify(err.message || "Could not save the course.");
    } finally {
      setTrainingModalUploading(false);
    }
  }

  async function handleCourseFolderUpload(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    let courseName = "";
    const structured = new Map();
    files.forEach((file) => {
      const rel = file.webkitRelativePath || file.name;
      const parts = rel.split("/").filter(Boolean);
      if (parts.length < 3) return;
      if (!courseName) courseName = parts[0];
      const nestedLayout = parts[1].toLowerCase() === "sections"
        && parts[3]?.toLowerCase() === "lessons";
      const sectionName = nestedLayout ? parts[2] : parts[1];
      const lessonName = nestedLayout ? parts[4] : parts[2];
      const rest = parts.slice(nestedLayout ? 5 : 3);
      if (!sectionName || !lessonName) return;
      if (!structured.has(sectionName)) structured.set(sectionName, new Map());
      const lessonsMap = structured.get(sectionName);
      if (!lessonsMap.has(lessonName)) lessonsMap.set(lessonName, { videoFile: null, notesFile: null, taskFiles: [] });
      const entry = lessonsMap.get(lessonName);
      if (rest.length === 1) {
        const fname = rest[0].toLowerCase();
        if (/\.(mp4|mov|webm|mkv|avi|m4v)$/.test(fname)) entry.videoFile = file;
        else if (/\.pdf$/.test(fname)) entry.notesFile = file;
      } else if (rest.length === 2 && rest[0].toLowerCase() === "tasks" && /\.pdf$/i.test(rest[1])) {
        entry.taskFiles.push(file);
      }
    });

    const uploadJobs = [];
    structured.forEach((lessonsMap) => {
      lessonsMap.forEach((entry) => {
        if (entry.videoFile) uploadJobs.push(entry.videoFile);
        if (entry.notesFile) uploadJobs.push(entry.notesFile);
        entry.taskFiles.forEach((file) => uploadJobs.push(file));
      });
    });

    if (!uploadJobs.length) {
      notify("No matching lesson files were found. Check the folder structure and try again.");
      return;
    }

    setFolderUploadState({ status: "uploading", total: uploadJobs.length, done: 0, courseName });
    const urlByFile = new Map();
    try {
      for (const file of uploadJobs) {
        const uploaded = await uploadCourseAsset(file);
        urlByFile.set(file, uploaded?.url || uploaded?.filePath || "");
        setFolderUploadState((current) => current ? { ...current, done: current.done + 1 } : current);
      }
    } catch (err) {
      notify(err.message || "Folder upload failed partway through. Please try again.");
      setFolderUploadState(null);
      return;
    }

    const sections = [];
    const nextOpenIds = [];
    structured.forEach((lessonsMap, sectionName) => {
      const sectionId = createEntityId("section");
      nextOpenIds.push(sectionId);
      const lessons = [];
      lessonsMap.forEach((entry, lessonName) => {
        lessons.push({
          id: createEntityId("lesson"),
          title: lessonName,
          videoUrl: entry.videoFile ? urlByFile.get(entry.videoFile) : "",
          videoFileName: entry.videoFile?.name || "",
          notesUrl: entry.notesFile ? urlByFile.get(entry.notesFile) : "",
          notesFileName: entry.notesFile?.name || "",
          durationTime: "01:00:00",
          tasks: entry.taskFiles.map((file, index) => ({
            id: createEntityId("task"),
            title: file.name.replace(/\.pdf$/i, "") || `Task ${index + 1}`,
            pdfUrl: urlByFile.get(file),
            fileName: file.name,
            timeLimit: "60",
            description: "",
          })),
        });
      });
      sections.push({ id: sectionId, name: sectionName, lessons });
    });

    const lessons = sections.flatMap((section) => section.lessons.map((lesson, lessonIndex) => ({
      section: section.name,
      title: lesson.title,
      videoUrl: lesson.videoUrl || "",
      videoFileName: lesson.videoFileName || fileNameFromUrl(lesson.videoUrl, "Uploaded video"),
      notesUrl: lesson.notesUrl || "",
      notesFileName: lesson.notesFileName || fileNameFromUrl(lesson.notesUrl, "Uploaded notes PDF"),
      durationTime: lesson.durationTime || "01:00:00",
      order: lessonIndex + 1,
      tasks: lesson.tasks.map((task, taskIndex) => ({
        title: task.title,
        pdfUrl: task.pdfUrl || "",
        fileName: task.fileName || fileNameFromUrl(task.pdfUrl, "Uploaded task PDF"),
        timeLimit: task.timeLimit || "60",
        description: task.description || "",
        order: taskIndex + 1,
      })),
    })));

    try {
      const syllabus = sections
        .map((section) => `${section.name}: ${section.lessons.map((lesson) => lesson.title).join(", ")}`)
        .join(". ");
      const createdCourse = await createCourse({
        title: courseName || "Imported course",
        duration: "Self-paced",
        fees: "₹0",
        mode: "Online",
        tools: "Course materials",
        syllabus: syllabus || `Self-paced ${courseName || "course"} covering the uploaded lessons and practice tasks.`,
        thumbnail: "",
        status: "active",
        studentIds: [],
        lessons,
      });
      const nextCourse = normalizeCourseToTraining(createdCourse);
      setCourseRows((currentRows) => [createdCourse, ...currentRows]);
      setTrainingRows((currentRows) => [nextCourse, ...currentRows]);
      setFolderUploadState({ status: "done", total: uploadJobs.length, done: uploadJobs.length, courseName, sectionCount: sections.length, lessonCount: lessons.length });
      notify(`${nextCourse.name} was uploaded with ${lessons.length} lesson(s).`);
      closeTrainingModal();
    } catch (err) {
      setFolderUploadState(null);
      notify(err.message || "Folder uploaded, but the course could not be saved.");
    }
  }

  async function handleStipModalImageSelect(file) {
    if (!file) return;
    try {
      const pendingImage = await preparePendingImage(file);
      setStipModal((current) => {
        if (!current?.item) return current;
        revokePreviewUrl(current.item._previewImage);
        return {
          ...current,
          item: {
            ...current.item,
            _pendingImageFile: pendingImage.file,
            _previewImage: pendingImage.previewUrl,
          },
        };
      });
    } catch (err) {
      notify(err.message || "Unable to process the selected image.");
    }
  }

  async function saveTrainingModal(continueToNextLesson = false) {
    if (!trainingModal?.item || trainingModalUploading) return;
    setTrainingModalUploading(true);

    try {
      const uploadedItem = await persistImageIfNeeded(trainingModal.item, notify);
      const lessonTitle = String(uploadedItem.lessonTitle || "").trim();
      const section = String(uploadedItem.section || "").trim();
      const notesUrl = String(uploadedItem.notesUrl || "").trim();
      const assignmentTitle = String(uploadedItem.assignmentTitle || "").trim();
      const assignmentTime = Number(uploadedItem.assignmentTime || 0);
      const assignmentUrl = String(uploadedItem.assignmentUrl || "").trim();
      if (trainingModal.mode !== "lesson" && (!String(uploadedItem.name || "").trim() || !String(uploadedItem.duration || "").trim() || !String(uploadedItem.price || "").trim() || !String(uploadedItem.mode || "").trim() || !String(uploadedItem.tools || "").trim() || !String(uploadedItem.syllabus || "").trim())) {
        throw new Error("Course title, duration, fees, mode, tools, and syllabus are required.");
      }
      if (["add", "lesson", "edit-lesson"].includes(trainingModal.mode) && (!section || !lessonTitle || !uploadedItem.videoUrl || !notesUrl || !assignmentTitle || assignmentTime <= 0 || !assignmentUrl)) {
        throw new Error("Section, lesson title, video, notes PDF, assignment title, assignment time, and assignment PDF are required.");
      }
      const payload = {
        title: uploadedItem.name || "Untitled course",
        duration: uploadedItem.duration || "4 weeks",
        fees: uploadedItem.price || "₹0",
        mode: uploadedItem.mode || "Online",
        tools: uploadedItem.tools || "",
        syllabus: uploadedItem.syllabus || "",
        thumbnail: uploadedItem.imageUrl || "",
        status: "active",
        studentIds: Array.isArray(uploadedItem.studentIds) ? uploadedItem.studentIds : [],
        lessons: [
          {
            section,
            title: lessonTitle,
            videoUrl: uploadedItem.videoUrl || "",
            videoFileName: uploadedItem.videoFileName || fileNameFromUrl(uploadedItem.videoUrl, "Uploaded video"),
            notesUrl,
            notesFileName: uploadedItem.notesFileName || fileNameFromUrl(notesUrl, "Uploaded notes PDF"),
            durationTime: uploadedItem.durationTime || "01:00:00",
            tasks: [{
              title: assignmentTitle,
              timeLimit: assignmentTime,
              pdfUrl: assignmentUrl || "",
              fileName: uploadedItem.assignmentFileName || fileNameFromUrl(assignmentUrl, "Uploaded task PDF"),
              type: "assignment",
              description: uploadedItem.assignment || "",
            }],
          },
        ],
      };

      if (trainingModal.mode === "edit-lesson") {
        const courseId = String(uploadedItem.courseId || "");
        const lessonId = String(uploadedItem.lessonId || "");
        if (!courseId || !lessonId) throw new Error("Lesson reference is missing.");
        const updatedCourse = await updateCourseLesson(courseId, lessonId, payload.lessons[0]);
        setCourseRows((currentRows) => currentRows.map((row) => String(row.id) === courseId ? updatedCourse : row));
        setTrainingRows((currentRows) => currentRows.map((row) => String(row.id) === courseId ? normalizeCourseToTraining(updatedCourse) : row));
        notify("Lesson updated successfully.");
      } else if (trainingModal.mode === "lesson") {
        const courseId = String(uploadedItem.courseId || "");
        if (!courseId) throw new Error("Course reference is missing.");
        const updatedCourse = await addCourseLesson(courseId, payload.lessons[0]);
        setCourseRows((currentRows) => currentRows.map((row) => String(row.id) === courseId ? updatedCourse : row));
        setTrainingRows((currentRows) => currentRows.map((row) => String(row.id) === courseId ? normalizeCourseToTraining(updatedCourse) : row));
        notify("Lesson added successfully.");
      } else if (trainingModal.mode === "add") {
        const backendItem = await createCourse(payload);
        const next = normalizeCourseToTraining(backendItem);
        setCourseRows((currentRows) => [backendItem, ...currentRows]);
        setTrainingRows((currentRows) => [next, ...currentRows]);
        notify(`${next.name} was added.`);
      } else {
        const saved = await updateCourse(uploadedItem.id, { ...payload, id: uploadedItem.id, title: uploadedItem.name || payload.title });
        const next = normalizeCourseToTraining(saved || { ...payload, id: uploadedItem.id, title: payload.title });
        setCourseRows((currentRows) => currentRows.map((row) => String(row.id) === String(uploadedItem.id) ? (saved || { ...payload, id: uploadedItem.id, title: payload.title }) : row));
        setTrainingRows((currentRows) => currentRows.map((row) => String(row.id) === String(uploadedItem.id) ? next : row));
        notify(`${next.name} was updated.`);
      }
      if (trainingModal.mode === "lesson" && continueToNextLesson) {
        setTrainingModal({
          mode: "lesson",
          step: 2,
          item: {
            courseId: String(uploadedItem.courseId || ""),
            section: String(uploadedItem.section || "General"),
            lessonTitle: "",
            durationTime: "01:00:00",
            videoUrl: "",
            notesUrl: "",
            assignmentTitle: "",
            assignmentTime: "60",
            assignment: "",
            assignmentUrl: "",
          },
        });
      } else {
        closeTrainingModal();
      }
    } catch (err) {
      console.error("saveTrainingModal failed", err);
      notify(err?.message || "Save failed. Please try again.");
    } finally {
      setTrainingModalUploading(false);
    }
  }

  async function saveStipModal() {
    if (!stipModal?.item || stipModalUploading) return;
    setStipModalUploading(true);

    try {
      const uploadedItem = await persistImageIfNeeded(stipModal.item, notify);
      if (stipModal.mode === "add") {
        const backendItem = await createStipProgram({
          ...uploadedItem,
          id: undefined,
        });
        const next = { ...backendItem, id: backendItem.id || createEntityId("stip") };
        setStipPrograms((currentRows) => [...currentRows, next]);
        notify(`${next.track} was added.`);
      } else {
        const saved = await updateStipProgram(uploadedItem.id, uploadedItem);
        setStipPrograms((currentRows) => currentRows.map((row) => row.id === stipModal.item.id ? { ...saved } : row));
        notify(`${saved.track} was updated.`);
      }
      closeStipModal();
    } catch (err) {
      console.error("saveStipModal failed", err);
      notify(err?.message || "Save failed. Please try again.");
    } finally {
      setStipModalUploading(false);
    }
  }

  function duplicateStipProgram(program) {
    const copy = {
      ...program,
      id: createEntityId("stip"),
      track: `${program.track} (Copy)`,
      fee: program.fee,
    };
    createStipProgram({ ...copy, id: undefined })
      .then((saved) => {
        setStipPrograms((currentRows) => [...currentRows, { ...saved, id: saved.id || copy.id }]);
        notify(`Duplicated ${program.track}.`);
      })
      .catch((err) => notify(err?.message || "Could not duplicate the program."));
  }

  function deleteStipProgram(program) {
    if (!window.confirm(`Delete ${program.track}?`)) return;
    deleteStipProgramApi(program.id).catch(() => {});
    setStipPrograms((currentRows) => currentRows.filter((row) => row.id !== program.id));
    notify(`${program.track} was removed.`);
  }

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setAppView("auth");
  }

  async function handleLogin(event) {
    event.preventDefault();
    try {
      if (rememberLogin) {
        safeStorageSet(SAVED_LOGIN_STORAGE_KEY, JSON.stringify(loginForm));
      } else {
        safeStorageRemove(SAVED_LOGIN_STORAGE_KEY);
      }
      const user = await authLogin(loginForm.username, loginForm.password);
      setCurrentUser(user);
      if (String(user.role || "").toLowerCase() === "student") {
        localStorage.setItem("crmst-student-session", JSON.stringify(user));
        setAppView("student-dashboard");
        notify(`Welcome back, ${user.name}.`);
        return;
      }
      setAppView(isCrmExecutive(user.role) ? "crm-executive" : isItUser(user) ? "it-dashboard" : "dashboard");
      notify(`Welcome back, ${user.name}.`);
    } catch (err) {
      console.warn("API login failed", err);
      notify(err.message || "Invalid username or password.");
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    const name = signupForm.name.trim();
    const username = signupForm.username.trim();
    const password = signupForm.password.trim();
    if (!name || !username || !password) {
      notify("Please fill name, username, and password.");
      return;
    }
    try {
      const user = await authSignup(name, username, password);
      const savedUser = {
        ...user,
        password,
        phone: "",
        role: "Member",
        dept: "CRM",
        status: "Active",
        joined: new Date().toISOString().slice(0, 10),
        type: "Current",
      };
      setUsers((current) => [savedUser, ...current]);
      setCurrentUser(user);
      setSignupForm({ name: "", username: "", password: "" });
      setAppView("dashboard");
      notify("Account created and saved to backend.");
    } catch (err) {
      console.error("API signUp failed", err);
      notify(err.message || "Signup failed.");
    }
  }

  function logout() {
    try {
      logoutUser();
    } catch (e) {
      console.warn("Logout failed", e);
    }
    setCurrentUser(null);
    setAppView("home");
    setActivePage("dashboard");
    localStorage.removeItem("crmst-student-session");
    notify("You have been signed out.");
  }

  async function updateCrmLead(lead) {
    const savedLead = await updateLead(lead.id, lead);
    setLeads((current) => current.map((item) => String(item.id) === String(lead.id) ? normalizeLeadForUi(savedLead) : item));
    return normalizeLeadForUi(savedLead);
  }

  async function createCrmLead(lead) {
    const savedLead = await createLeadApi(lead);
    setLeads((current) => [normalizeLeadForUi(savedLead), ...current]);
    return savedLead;
  }

  async function assignTaskToCrmExecutive(event) {
    event.preventDefault();
    if (!adminTaskForm.title.trim() || !adminTaskForm.assigneeId) {
      notify("Enter a task title and select a CRM Executive.");
      return;
    }
    try {
      const saved = await createTask({ ...adminTaskForm, id: `task-${Date.now()}` });
      setTasks((current) => [saved, ...current]);
      setAdminTaskForm({ title: "", description: "", assigneeId: "", priority: "Medium", dueDate: new Date().toISOString().slice(0, 10) });
      notify("Task assigned and saved to the backend.");
    } catch (error) { notify(error.message || "Could not assign task."); }
  }

  async function updateLeaveRequestStatus(leave, status) {
    try {
      const saved = await updateLeave(leave.id, { status });
      setLeaves((current) => current.map((item) => item.id === saved.id ? saved : item));
      notify(`Leave request ${status.toLowerCase()}.`);
    } catch (error) {
      notify(error.message || "Could not update leave request.");
    }
  }

 async function addMember(event) {
  event.preventDefault();
  if (isCreatingUser) return;

  const name = createUserForm.name.trim();
  const email = createUserForm.email.trim();
  const phone = createUserForm.phone.trim();
  const education = createUserForm.education.trim();
  const username = createUserForm.username.trim();
  const password = createUserForm.password.trim();
  const dept = createUserForm.dept.trim();
  const position = createUserForm.position.trim();
  const role = departmentRoleMap[dept] || dept;
  const joined = createUserForm.joined.trim();
  const state = createUserForm.state.trim();
  const branch = createUserForm.branch.trim();
  const branchCode = createUserForm.branchCode.trim();
  const address = createUserForm.address.trim();

    if (!name) { notify("Full name is required."); return; }
    if (!email) { notify("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify("Enter a valid email address."); return; }
    if (!phone) { notify("Contact number is required."); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { notify("Contact number must be exactly 10 digits and start with 6, 7, 8, or 9."); return; }
    if (!education) { notify("Education is required."); return; }
    if (!dept) { notify("Department is required."); return; }
    if (!position) { notify("Position is required."); return; }
    if (!role) { notify("Role is required."); return; }
    if (!joined) { notify("Date of joining is required."); return; }
    if (!username) { notify("Username is required."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { notify("Username can only contain letters, numbers, and underscores."); return; }
    if (!editingUserId && !password) { notify("Password is required."); return; }
    if (password && password.length < 6) { notify("Password must be at least 6 characters."); return; }
    if (!state) { notify("State is required."); return; }
    if (!branch) { notify("Branch is required."); return; }
    if (!branchCode) { notify("Branch code is required."); return; }
    if (!address) { notify("Address is required."); return; }

    if (users.some((entry) => String(entry.id || entry._id) !== String(editingUserId) && String(entry.username || "").toLowerCase() === username.toLowerCase())) {
      notify("Username already exists. Please choose another username.");
      return;
    }

    setIsCreatingUser(true);
    let imageUrl = createUserForm.imageUrl || "";
    let imagePublicId = createUserForm.imagePublicId || "";

    if (createUserFile) {
      try {
        const compressed = await compressImageFile(createUserFile);
        const uploadResult = await uploadImage(compressed);
        imageUrl = uploadResult.imageUrl || "";
        imagePublicId = uploadResult.publicId || "";
      } catch (err) {
        notify(err.message || "Image upload failed.");
        setIsCreatingUser(false);
        return;
      }
    }

    const userPayload = {
      name,
      email,
      phone,
      maritalStatus: createUserForm.maritalStatus || "",
      education,
      username,
      dept,
      position,
      role,
      joined,
      state,
      branch,
      branchCode,
      address,
      imageUrl,
      imagePublicId,
      status: "Active",
      type: "Current",
    };
    if (password) userPayload.password = password;

    try {
      if (editingUserId) {
        const updatedUser = await updateUser(editingUserId, userPayload);
        setUsers((current) => current.map((item) => String(item.id || item._id) === String(editingUserId) ? { ...item, ...updatedUser } : item));
      } else {
        const createdUser = await createUser(userPayload);
        setUsers((current) => [createdUser, ...current]);
      }
      const wasEditing = Boolean(editingUserId);
      setEditingUserId(null);
      setCreateUserForm({
        name: "",
        email: "",
        phone: "",
        emergencyContact: "",
        maritalStatus: "",
        education: "",
        username: "",
        password: "",
        role: "CRM Executive",
        dept: "CRM",
        position: "",
        joined: "",
        state: "",
        branch: "",
        branchCode: "",
        address: "",
        imageUrl: "",
        imagePublicId: "",
      });
      setCreateUserPreview("");
      setCreateUserFile(null);
      notify(wasEditing ? "User updated successfully." : "New user created successfully.");
      setActivePage("user-view");
    } catch (err) {
      if (err.status === 409 && /username already exists/i.test(err.message)) {
        notify("Username already exists. Please choose another username.");
        return;
      }
      console.error("Failed to create user:", err);
      notify(err.message || "Failed to create user.");
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function addLead(event) {
    event.preventDefault();
    const name = createLead.name.trim();
    const phone = createLead.phone.trim();
    const city = createLead.city.trim();
    const leadType = createLead.type;
    const interest = createLead.interest;
    const leadSource = createLead.leadSource || createLead.source;
    const assignedTo = createLead.assignedTo;

    if (!name || /^\s+$/.test(name)) {
      notify("Full name is required.");
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      notify("Full name should not contain only numbers.");
      return;
    }
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      notify("Enter a valid 10-digit mobile number.");
      return;
    }
    if (createLead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createLead.email)) {
      notify("Enter a valid email address.");
      return;
    }
    if (!city) {
      notify("City is required.");
      return;
    }
    if (!leadType) {
      notify("Lead type is required.");
      return;
    }
    if (!interest) {
      notify("Interest is required.");
      return;
    }
    if (!leadSource) {
      notify("Lead source is required.");
      return;
    }
    if (!enteredBy) {
      notify("Unable to identify the logged-in user.");
      return;
    }
    if (!assignedTo) {
      notify("Please assign the lead to a user.");
      return;
    }

    const leadPayload = {
      ...createLead,
      value: Number(createLead.value || 0),
      assignedTo: String(createLead.assignedTo),
      assignedDate: createLead.assignedDate || new Date().toISOString().slice(0, 10),
    };
    try {
      if (editingLeadId) {
        const savedLead = await updateLead(editingLeadId, leadPayload);
        setLeads((current) => current.map((item) => String(item.id) === String(editingLeadId) ? normalizeLeadForUi(savedLead) : item));
      } else {
        const savedLead = await createLeadApi({
          id: String(Date.now()),
          ...leadPayload,
          createdAt: new Date().toISOString().slice(0, 10),
        });
        setLeads((current) => [normalizeLeadForUi(savedLead), ...current]);
        if (leadCreationSource) {
          await saveCallContact(leadCreationSource, { leadCreated: true, createdLeadId: savedLead.id, createdLeadDate: savedLead.createdAt, callLeadStatus: "Approved" });
        }
      }
    } catch (err) {
      notify(err.message || (editingLeadId ? "Lead could not be updated." : "Lead could not be saved."));
      return;
    }
    const wasEditing = Boolean(editingLeadId);
    const returnPage = editingLeadReturnPage;
    setEditingLeadId(null);
    setLeadCreationSource(null);
    setCreateLead({
      name: "",
      phone: "",
      email: "",
      alternatePhone: "",
      city: "",
      company: "",
      type: "Training",
      interest: trainingCatalog[0],
      value: "",
      status: "Pending",
      source: "Website",
      leadSource: "Website",
      enteredBy,
      assignedTo: String(leadAssignableUsers[0]?.id || leadAssignableUsers[0]?._id || ""),
      assignedDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    notify(wasEditing ? "Lead updated in the backend." : "Lead saved to the pipeline.");
    setActivePage(wasEditing ? returnPage : "crm");
  }

  async function saveCallContact(contact, patch) {
    let nextPatch = patch;
    const nextContact = { ...contact, ...patch };
    const approvalCancelled = ["Pending", "Rejected"].includes(patch.callLeadStatus);
    const noLongerQualifies = !isCallLead(nextContact);
    const qualifiesAgain = !isCallLead(contact) && isCallLead(nextContact);
    const contactPhone = String(contact.contact || contact.phone || "").replace(/\D/g, "").slice(-10);
    const linkedCreatedLeadIds = [...new Set([
      contact.createdLeadId,
      ...leads.filter((lead) => {
        const leadPhone = String(lead.phone || lead.contact || "").replace(/\D/g, "").slice(-10);
        const leadSource = String(lead.source || lead.leadSource || "").trim().toLowerCase();
        return contactPhone && leadPhone === contactPhone && leadSource === "phone call";
      }).map((lead) => lead.id),
    ].filter(Boolean).map(String))];
    const resetCreatedLead = (approvalCancelled || noLongerQualifies || qualifiesAgain)
      && Boolean(contact.leadCreated || contact.createdLeadId || contact.callLeadStatus === "Approved" || linkedCreatedLeadIds.length);
    if (resetCreatedLead) {
      for (const leadId of linkedCreatedLeadIds) {
        await deleteLead(leadId);
      }
      const removedLeadIds = new Set(linkedCreatedLeadIds);
      setLeads((current) => current.filter((lead) => !removedLeadIds.has(String(lead.id))));
      nextPatch = {
        ...patch,
        leadCreated: false,
        createdLeadId: "",
        createdLeadDate: "",
        callLeadStatus: approvalCancelled ? patch.callLeadStatus : "Pending",
      };
    }
    const saved = await saveCallListData(contact.listType, contact.id, nextPatch, contact.assignedTo);
    setCrmUploadRows((current) => current.map((row) => row.id === saved.id && row.listType === saved.listType ? saved : row));
    return saved;
  }

  useEffect(() => {
    if (!isAdminUser(currentUser)) return;
    crmUploadRows.forEach((contact) => {
      const key = `${contact.listType || "list"}:${contact.id}`;
      if (isCallLead(contact)) {
        staleCallLeadCleanup.current.delete(key);
        return;
      }
      const contactPhone = String(contact.contact || contact.phone || "").replace(/\D/g, "").slice(-10);
      const hasCreatedLead = Boolean(contact.leadCreated || contact.createdLeadId || contact.callLeadStatus === "Approved")
        || leads.some((lead) => {
          const leadPhone = String(lead.phone || lead.contact || "").replace(/\D/g, "").slice(-10);
          const leadSource = String(lead.source || lead.leadSource || "").trim().toLowerCase();
          return contactPhone && leadPhone === contactPhone && leadSource === "phone call";
        });
      if (!hasCreatedLead) {
        staleCallLeadCleanup.current.delete(key);
        return;
      }
      if (staleCallLeadCleanup.current.has(key)) return;
      staleCallLeadCleanup.current.add(key);
      saveCallContact(contact, { callLeadStatus: "Pending" })
        .catch(() => staleCallLeadCleanup.current.delete(key));
    });
  }, [crmUploadRows, leads, currentUser]);

  async function deleteCallContact(contact) {
    await removeCallListData(contact.listType, contact.id, contact.assignedTo);
    setCrmUploadRows((current) => current.filter((row) => !(row.id === contact.id && row.listType === contact.listType)));
  }

  function addLeadFromCall(contact) {
    setCreateLead({ ...callLeadForm(contact), assignedDate: new Date().toISOString().slice(0, 10) });
    setEditingLeadId(null);
    setLeadCreationSource(contact);
    setEditingLeadReturnPage(activePage);
    setActivePage("sales-add");
  }

  function editApprovedLead(lead) {
    setCreateLead({
      name: lead.name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      alternatePhone: lead.alternatePhone || "",
      city: lead.city || "",
      company: lead.company || "",
      type: lead.type || "Training",
      interest: lead.interest || trainingCatalog[0],
      value: lead.value ?? "",
      status: lead.status || "Pending",
      source: lead.source || lead.leadSource || "Website",
      leadSource: lead.leadSource || lead.source || "Website",
      enteredBy: lead.enteredBy || lead.crmExecutive || "",
      assignedTo: String(lead.assignedTo || leadAssignableUsers[0]?.id || leadAssignableUsers[0]?._id || ""),
      assignedDate: lead.assignedDate || new Date().toISOString().slice(0, 10),
      notes: lead.notes || "",
    });
    setEditingLeadId(lead.id);
    setEditingLeadReturnPage(activePage);
    setActivePage("sales-add");
  }

  function saveFrontendLead(lead) {
    setLeads((current) => current.map((item) => String(item.id) === String(lead.id) ? { ...item, ...lead } : item));
    notify("Lead saved in the frontend.");
  }

  function deleteFrontendLead(lead) {
    if (!window.confirm(`Delete lead "${lead.name || lead.clientSourceName || "this lead"}"?`)) return;
    setLeads((current) => current.filter((item) => String(item.id) !== String(lead.id)));
    notify("Lead deleted from the frontend.");
  }

  function editUser(user) {
    setCreateUserForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      emergencyContact: user.emergencyContact || "",
      maritalStatus: user.maritalStatus || "",
      education: user.education || "",
      username: user.username || "",
      password: "",
      role: user.role || departmentRoleMap[user.dept] || "CRM Executive",
      dept: user.dept || user.department || "CRM",
      position: user.position || "",
      joined: user.joined || "",
      state: user.state || "",
      branch: user.branch || "",
      branchCode: user.branchCode || "",
      address: user.address || "",
      imageUrl: user.imageUrl || "",
      imagePublicId: user.imagePublicId || "",
    });
    setCreateUserPreview(user.imageUrl || "");
    setCreateUserFile(null);
    setEditingUserId(user.id || user._id);
    setActivePage("user-create");
  }

  if (appView === "home") {
    return (
      <div className="marketing-shell">
        <MarketingNav onOpenAuth={openAuth} />
        <main className="marketing-main">
          <section className="hero-section">
            <div className="hero-copy">
              <div className="brand-chip">
                <LogoBadge />
                <div>
                  <strong>System Technologies</strong>
                  <span>A leading IT solution company</span>
                </div>
              </div>
              <p className="eyebrow">CRM platform for company members</p>
              <h1>
                One secure operating system for CRM, HR, sales, training, and
                internal execution.
              </h1>
              <p className="hero-text">
                Built for employee access, team accountability, and daily CRM
                operations. System Technologies CRM gives your company one
                professional workspace to manage leads, teams, reporting, and
                growth without switching tools.
              </p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => openAuth("login")}>
                  Open Member Login
                  <ArrowRight size={16} />
                </button>
                <button className="ghost-button marketing" onClick={() => openAuth("signup")}>
                  Create Company Account
                </button>
              </div>
              <div className="hero-metrics">
                <Metric label="Team modules" value="19+" />
                <Metric label="Enterprise visibility" value="24/7" />
                <Metric label="Internal workflows" value="Unified" />
              </div>
            </div>
            <div className="hero-visual-frame">
              <img src={crmHero} alt="Enterprise CRM workspace" />
              <div className="floating-panel panel-a">
                <span>Lead conversion</span>
                <strong>+28%</strong>
              </div>
              <div className="floating-panel panel-b">
                <span>Response time</span>
                <strong>4 mins</strong>
              </div>
            </div>
          </section>

          <section className="proof-strip">
            <ProofCard
              icon={Workflow}
              title="All company modules together"
              text="CRM, HR, sales, training, STIP, and system oversight in one access-controlled workspace."
            />
            <ProofCard
              icon={ShieldCheck}
              title="Built for internal members"
              text="Simple account access for employees with session persistence saved in browser storage for now."
            />
            <ProofCard
              icon={Target}
              title="Agency-friendly professionalism"
              text="Designed for sales operations, delivery accountability, and executive reporting across departments."
            />
          </section>

          <section className="story-grid">
            <div className="story-card dark">
              <p className="eyebrow">Why this platform</p>
              <h2>Professional enough for clients. Practical enough for daily teams.</h2>
              <p>
                The homepage is positioned like a serious CRM management company,
                while the internal panel remains optimized for real employee
                workflow. That gives your company a product-grade first impression
                without losing operational speed.
              </p>
              <ul className="feature-list">
                <li>Member login with account signup</li>
                <li>Admin panel access after authentication</li>
                <li>Role-ready CRM dashboard architecture</li>
                <li>Local browser persistence for user credentials</li>
              </ul>
            </div>
            <div className="story-image">
              <img src={crmOperations} alt="CRM operations center" />
            </div>
          </section>

          <section className="module-showcase">
            <div className="section-head">
              <p className="eyebrow">Core capabilities</p>
              <h2>Purpose-built for the way a CRM management company operates</h2>
            </div>
            <div className="showcase-grid">
              <ShowcaseCard icon={PhoneCall} title="CRM command center" text="Lead tracking, follow-ups, conversion snapshots, and executive performance reporting." />
              <ShowcaseCard icon={Users} title="Member management" text="Create accounts, manage internal access, and monitor company-wide usage." />
              <ShowcaseCard icon={CalendarCheck2} title="HR visibility" text="Attendance, leave requests, tasks, and employee profile management in one place." />
              <ShowcaseCard icon={GraduationCap} title="Training and STIP" text="Track training inventory, onboarding progress, and internship applications." />
            </div>
          </section>

          <section className="cta-banner">
            <div>
              <p className="eyebrow">Ready for internal rollout</p>
              <h2>Give your team one clean login point for the complete CRM ecosystem.</h2>
            </div>
            <button className="primary-button" onClick={() => openAuth("login")}>
              Continue to member access
              <ArrowRight size={16} />
            </button>
          </section>
        </main>
        {toast ? <div className="toast">{toast}</div> : null}
      </div>
    );
  }

  if (appView === "auth") {
    return (
      <div className="auth-shell">
        <div className="auth-visual">
          <div className="auth-topbar">
            <button className="ghost-button marketing" onClick={() => setAppView("home")}>
              Back to Home
            </button>
          </div>
          <div className="auth-brand">
            <LogoBadge />
            <div>
              <strong>System Technologies CRM</strong>
              <span>Company member access portal</span>
            </div>
          </div>
          <h1>Secure entry for your internal CRM workspace.</h1>
          <p>
            Members can sign in to continue to the dashboard, and new company
            members can create an account with name, username, and password.
          </p>
          <img src={crmHero} alt="CRM login visual" />
        </div>

        <div className="auth-panel">
          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
          </div>

          {authMode === "login" ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <p className="eyebrow">Member login</p>
              <h2>Access admin panel or dashboard</h2>
              <Field label="Username">
                <input
                  value={loginForm.username}
                  autoComplete="username"
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="Enter your username"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={loginForm.password}
                  autoComplete="current-password"
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Enter your password"
                />
              </Field>
              <label className="remember-login">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(event) => setRememberLogin(event.target.checked)}
                />
                <span>Remember credentials on this device</span>
              </label>
              <button className="primary-button full-width" type="submit">
                <LockKeyhole size={16} />
                Login and Continue
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignup}>
              <p className="eyebrow">Create member account</p>
              <h2>Save member credentials in browser storage</h2>
              <Field label="Name">
                <input
                  value={signupForm.name}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter full name"
                />
              </Field>
              <Field label="Username">
                <input
                  value={signupForm.username}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="Choose username"
                />
              </Field>
              <Field label="Password">
                <div className="password-input-wrap">
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    value={signupForm.password}
                    onChange={(event) =>
                      setSignupForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Create password"
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowSignupPassword((v) => !v)}>
                    {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <button className="primary-button full-width" type="submit">
                <UserPlus size={16} />
                Create Account and Open Dashboard
              </button>
            </form>
          )}
        </div>
        {toast ? <div className="toast">{toast}</div> : null}
      </div>
    );
  }

  if (appView === "student-dashboard" || (currentUser && String(currentUser.role || "").toLowerCase() === "student")) {
    return (
      <ErrorBoundary>
        <StudentDashboard
          user={currentUser}
          onLogout={logout}
          courses={displayTrainingRows}
          notifications={notifications}
          enrollmentRequests={studentEnrollmentRequests}
          onRefreshNotifications={async () => {
            try {
              const studentId = String(currentUser?.id || currentUser?._id || "").trim();
              if (!studentId) return;
              const result = await loadNotifications(studentId);
              if (Array.isArray(result)) {
                setNotifications(result);
                const knownNotificationIds = new Set(notifications.map((item) => String(item.id || "")));
                const hasNewCourseNotification = result.some((item) => (
                  ["assignment_evaluated", "lesson_added"].includes(item.type)
                  && !knownNotificationIds.has(String(item.id || ""))
                ));
                writeStudentNotificationsToStorage(currentUser, result);
                if (hasNewCourseNotification) {
                  invalidateCoursesCache();
                  const refreshedCourses = await loadCourses(true);
                  if (refreshedCourses.length) {
                    setCourseRows(refreshedCourses);
                    writeStudentCoursesToStorage(currentUser, refreshedCourses);
                  }
                }
              }
            } catch (err) {
              if (err?.status !== 401) console.warn("Notification refresh failed", err);
            }
          }}
          onReadNotification={handleReadNotification}
          onReadAllNotifications={handleReadAllNotifications}
          uploadStudentResource={uploadStudentCourseResource}
          saveLessonProgress={saveStudentLessonProgress}
          loadCourse={async (courseId) => {
            const loaded = await loadCourse(courseId);
            if (loaded) {
              setCourseRows((current) => current.map((course) => (
                String(course.id || course._id) === String(courseId) ? { ...course, ...loaded } : course
              )));
            }
            return loaded;
          }}
          onRequestCourseEnrollment={handleRequestCourseEnrollment}
        />
        {toast ? <div className="toast">{toast}</div> : null}
      </ErrorBoundary>
    );
  }

  if (appView === "it-dashboard" || (currentUser && isItUser(currentUser))) {
    return (
      <ErrorBoundary>
        <ITDashboard onLogout={logout} />
        {toast ? <div className="toast">{toast}</div> : null}
      </ErrorBoundary>
    );
  }

  if (appView === "crm-executive" || (currentUser && isCrmExecutive(currentUser.role))) {
    return (
      <ErrorBoundary>
        <CrmExecutiveDashboard
          user={currentUser}
          leads={leads}
          sourceContacts={crmUploadRows}
          onUpdateLead={updateCrmLead}
          onCreateLead={createCrmLead}
          onLogout={logout}
          currentUser={currentUser}
          users={leadAssignmentUsers.length ? leadAssignmentUsers : activeUsers.filter(isLeadAssignmentUser)}
          onUpdateCallListContact={saveCallContact}
          onDeleteCallContact={deleteCallContact}
          onProfileUpdated={(updatedProfile) => setCurrentUser((current) => ({ ...current, ...updatedProfile }))}

        />
        {toast ? <div className="toast">{toast}</div> : null}
      </ErrorBoundary>
    );
  }

  return (
    <div className={`shell ${activePage === "course-add" ? "course-create-shell" : ""}`}>
      <div
        className={`mobile-scrim ${mobileNavOpen ? "show" : ""}`}
        onClick={() => setMobileNavOpen(false)}
      />
      <aside
        className={`sidebar ${sidebarOpen ? "" : "collapsed"} ${
          mobileNavOpen ? "mobile-open" : ""
        }`}
      >
        <div className="brand">
          <LogoBadge compact />
          <div className="brand-copy">
            <strong>SYSTEM TECHNOLOGIES</strong>
            <span>Ajmer Admin Panel</span>
          </div>
        </div>

        <div className="sidebar-profile">
          {currentUser?.imageUrl ? (
            <img src={currentUser.imageUrl} alt={currentUser.name} className="sidebar-profile-image" />
          ) : (
            <div className="avatar soft sidebar-profile-avatar">{initials(currentUser?.name ?? "Admin User")}</div>
          )}
          <strong className="sidebar-profile-name">{currentUser?.name ?? "Admin User"}</strong>
        </div>

        <div className="sidebar-search">
          <Search size={16} />
          <input
            value={globalQuery}
            onChange={(event) => setGlobalQuery(event.target.value)}
            placeholder="Search modules..."
          />
        </div>

        <nav className="nav">
          {navResults.map((section) => (
            <div key={section.heading} className="nav-group">
              <p>{section.heading}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`nav-item nav-item-${item.id} ${activePage === item.id ? "active" : ""}`}
                    onClick={() => {
                      if (activePage === "course-add" && item.id !== "course-add") {
                        closeTrainingModal();
                      }
                      setActivePage(item.id);
                      if (contentRef.current) {
                        contentRef.current.scrollTop = 0;
                      }
                      setMobileNavOpen(false);
                    }}
                  >
                    <span className="nav-item-left">
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </span>
                    {item.id === "enrollment-requests" && pendingEnrollmentRequestCount > 0 ? (
                      <span className="nav-pill">{pendingEnrollmentRequestCount}</span>
                    ) : item.id === "hr-leaves" && leavePendingCount > 0 ? (
                      <span className="nav-pill">{leavePendingCount}</span>
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{currentUser?.imageUrl ? <img src={currentUser.imageUrl} alt={currentUser.name || "Profile"} /> : initials(currentUser?.name ?? "Admin User")}</div>
            <div>
              <strong>{currentUser?.name ?? "Admin User"}</strong>
              <span>{currentUser?.role ?? "Super Admin"}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-only" onClick={() => setMobileNavOpen(true)}>
              <Menu size={18} />
            </button>
            <button
              className="icon-button desktop-only"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <p className="eyebrow">SYSTEM TECHNOLOGIES</p>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="topbar-right">
            <div className="date-chip">
              <CalendarClock size={16} />
              <span>Wed, 29 Jul, 2026</span>
            </div>
            <button className="ghost-button">
              <Bell size={16} />
              Alerts
            </button>
            <button className="ghost-button" onClick={logout}>
              <DoorOpen size={16} />
              Logout
            </button>
            <button className="primary-button" onClick={() => setActivePage("sales-add")}>
              <CirclePlus size={16} />
              Add Lead
            </button>
          </div>
        </header>

        <section className="content" ref={contentRef}>
          {activePage === "project-create" && (
            <CreateProjectForm users={users} projects={adminPreviewProjects} onCreate={(project) => setAdminPreviewProjects((current) => [project, ...current])} />
          )}
          {activePage === "dashboard" && (
            <>
              <section className="hero-grid">
                <div className="hero-card dashboard-hero">
                  <div className="hero-card-top">
                    <div>
                      <p className="eyebrow">ADMIN DASHBOARD</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="stats-grid">
                <StatCard tone="rose" icon={Users} label="Total Leads" value={leads.length} note="Live pipeline volume" />
                <StatCard tone="green" icon={CheckCircle2} label="Enrolled / Won" value={wonLeads.length} note="Qualified outcomes" />
                <StatCard tone="blue" icon={UserRoundCheck} label="Active Users" value={activeUsers.length} note="Current staff access" />
                <StatCard tone="amber" icon={BadgeIndianRupee} label="Revenue" value={compactCurrency(revenue)} note="Closed business value" />
              </section>

              <div className="dashboard-tabs">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "pipeline", label: "Lead Pipeline" },
                  { id: "sales", label: "Sales Overview" },
                  { id: "calls", label: "Call Performance" },
                  { id: "team", label: "Team Performance" },
                  { id: "followups", label: "Follow-ups" },
                  { id: "activity", label: "Activity" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`dashboard-tab ${dashboardTab === tab.id ? "active" : ""}`}
                    onClick={() => setDashboardTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {dashboardTab === "overview" && (
                <section className="dashboard-grid">
                  <Panel title="CRM call performance (today)">
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>CRM Executive</th>
                            <th>Completed</th>
                            <th>Pending</th>
                            <th>Follow-Up</th>
                            <th>Not Attended Calls</th>
                            <th>Total Calls</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crmReportUsers.slice(0, 5).map((report) => (
                            <tr key={report.exec}>
                              <td>
                                <div className="person-cell">
                                  <div className="avatar soft">{initials(report.exec)}</div>
                                  <strong>{report.exec}</strong>
                                </div>
                              </td>
                              <td>{report.completed}</td>
                              <td>{report.pending}</td>
                              <td>{report.followUp}</td>
                              <td>{report.notAttended}</td>
                              <td>{report.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="panel-footer">
                      <button className="ghost-button compact" onClick={() => setActivePage("crm")}>
                        View Full Report <ArrowRight size={14} />
                      </button>
                    </div>
                  </Panel>

                  <Panel title="Pending follow-ups">
                    <div className="follow-up-list">
                      {followUps.slice(0, 5).map((lead, index) => (
                        <div key={`${lead.id || lead.name || "lead"}-${index}`} className="follow-up-item">
                          <span className="dot" />
                          <div>
                            <strong>{lead.name}</strong>
                            <span>{lead.interest}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="panel-footer">
                      <button className="ghost-button compact" onClick={() => setActivePage("crm")}>
                        View All <ArrowRight size={14} />
                      </button>
                    </div>
                  </Panel>

                  <Panel title="Recent activity">
                    <div className="activity-list">
                      {logs.slice(0, 5).map((log) => (
                        <div key={log.id} className={`activity-item ${log.kind}`}>
                          <span className={`log-dot ${log.kind}`} />
                          <div className="activity-body">
                            <strong>{log.user}</strong>
                            <span>{log.action}</span>
                          </div>
                          <span className="activity-time">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </section>
              )}

              {dashboardTab === "pipeline" && (
                <section className="dashboard-grid">
                  <Panel title="Lead Pipeline">
                    <div className="pipeline-stages">
                      {pipelineStages.map((stage) => (
                        <div key={stage.label} className="pipeline-stage">
                          <div className="pipeline-stage-header">
                            <span className="pipeline-dot" style={{ background: stage.color }} />
                            <strong>{stage.label}</strong>
                          </div>
                          <span className="pipeline-count">{stage.count}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Conversion Metrics">
                    <div className="summary-chips">
                      <div className="summary-chip">
                        <span>Total Leads</span>
                        <strong>{leads.length}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Won / Interested</span>
                        <strong>{wonLeads.length}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Conversion Rate</span>
                        <strong>{leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0}%</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Follow-ups Pending</span>
                        <strong>{followUps.length}</strong>
                      </div>
                    </div>
                  </Panel>
                  <Panel title="Revenue Summary">
                    <div className="summary-chips">
                      <div className="summary-chip">
                        <span>Total Revenue</span>
                        <strong>{compactCurrency(revenue)}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Avg Deal Size</span>
                        <strong>{wonLeads.length > 0 ? compactCurrency(Math.round(revenue / wonLeads.length)) : "₹0"}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Pending Value</span>
                        <strong>{compactCurrency(leads.filter((l) => l.status === "Pending").reduce((s, l) => s + Number(l.value || 0), 0))}</strong>
                      </div>
                    </div>
                  </Panel>
                </section>
              )}

              {dashboardTab === "sales" && (
                <section className="dashboard-grid">
                  <Panel title="Sales Overview">
                    <div className="summary-chips">
                      <div className="summary-chip">
                        <span>Revenue</span>
                        <strong>{compactCurrency(revenue)}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Total Leads</span>
                        <strong>{leads.length}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Conversion Rate</span>
                        <strong>{leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0}%</strong>
                      </div>
                    </div>
                    <div className="sales-chart">
                      <div className="sales-chart-header">
                        <span className="eyebrow">Sales Trend</span>
                        <strong>Last 6 months</strong>
                      </div>
                      <div className="sales-bars">
                        {salesTrend.map((item) => (
                          <div key={item.month} className="sales-bar-wrap">
                            <div
                              className="sales-bar"
                              style={{
                                height: `${Math.max((item.value / maxSalesTrend) * 100, 8)}%`,
                              }}
                            />
                            <span className="sales-bar-label">{item.month}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Panel>
                  <Panel title="Lead Sources">
                    <div className="source-list">
                      {Object.entries(sourceCounts).map(([source, count]) => (
                        <div key={source} className="source-row">
                          <span>{source}</span>
                          <div className="source-bar-wrap">
                            <div
                              className="source-bar"
                              style={{
                                width: `${(count / maxSourceCount) * 100}%`,
                              }}
                            />
                          </div>
                          <strong>{count}</strong>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Top Performing Services">
                    <div className="follow-up-list">
                      {leads
                        .filter((l) => l.type === "Service")
                        .slice(0, 5)
                        .map((lead, index) => (
                          <div key={`${lead.id || lead.name || "lead"}-${index}`} className="follow-up-item">
                            <span className="dot" />
                            <div>
                              <strong>{lead.interest}</strong>
                              <span>{lead.name}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Panel>
                </section>
              )}

              {dashboardTab === "calls" && (
                <section className="dashboard-grid two-up">
                  <Panel title="Call Performance Summary">
                    <div className="summary-chips">
                      <div className="summary-chip">
                        <span>Total Calls</span>
                        <strong>{callTotal}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Connected</span>
                        <strong>{callConnected}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Not Connected</span>
                        <strong>{callNotConnected}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Connection Rate</span>
                        <strong>{callConnectionRate}%</strong>
                      </div>
                    </div>
                  </Panel>
                  <Panel title="CRM Executive Performance">
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>CRM Executive</th>
                            <th>Completed</th>
                            <th>Pending</th>
                            <th>Follow-Up</th>
                            <th>Not Attended</th>
                            <th>Total Calls</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crmReportUsers.map((report) => (
                            <tr key={report.exec}>
                              <td>
                                <div className="person-cell">
                                  <div className="avatar soft">{initials(report.exec)}</div>
                                  <strong>{report.exec}</strong>
                                </div>
                              </td>
                              <td>{report.completed}</td>
                              <td>{report.pending}</td>
                              <td>{report.followUp}</td>
                              <td>{report.notAttended}</td>
                              <td>{report.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                </section>
              )}

              {dashboardTab === "team" && (
                <section className="dashboard-grid">
                  <Panel title="Team Performance">
                    <div className="summary-chips">
                      <div className="summary-chip">
                        <span>Active Users</span>
                        <strong>{activeUsers.length}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Total Users</span>
                        <strong>{users.length}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>CRM Executives</span>
                        <strong>{crmReportUsers.length}</strong>
                      </div>
                      <div className="summary-chip">
                        <span>Pending Leaves</span>
                        <strong>{leavePendingCount}</strong>
                      </div>
                    </div>
                  </Panel>
                  <Panel title="User Roles">
                    <div className="follow-up-list">
                      <option value="">Select Assignee</option>
                      {activeUsers.map((user) => (
                        <div key={user.id} className="follow-up-item">
                          <span className="dot" />
                          <div>
                            <strong>{user.name}</strong>
                            <span>{user.role} • {user.dept}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Recent Activity">
                    <div className="activity-list">
                      {logs.slice(0, 5).map((log) => (
                        <div key={log.id} className={`activity-item ${log.kind}`}>
                          <span className={`log-dot ${log.kind}`} />
                          <div className="activity-body">
                            <strong>{log.user}</strong>
                            <span>{log.action}</span>
                          </div>
                          <span className="activity-time">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </section>
              )}

              {dashboardTab === "followups" && (
                <section className="dashboard-grid">
                  <Panel title="Pending Follow-ups">
                    <div className="follow-up-list">
                      {followUps.map((lead, index) => (
                        <div key={`${lead.id || lead.name || "lead"}-${index}`} className="follow-up-item">
                          <span className="dot" />
                          <div>
                            <strong>{lead.name}</strong>
                            <span>{lead.interest}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {followUps.length === 0 && (
                      <div className="panel-empty">No pending follow-ups</div>
                    )}
                  </Panel>
                  <Panel title="Follow-up Tasks">
                    <div className="follow-up-list">
                      {tasks
                        .filter((task) => task.status !== "Done")
                        .slice(0, 5)
                        .map((task) => (
                          <div key={task.id} className="follow-up-item">
                            <span className="dot" />
                            <div>
                              <strong>{task.title}</strong>
                              <span>{task.emp} • Due {task.due}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Panel>
                  <Panel title="Recent Activity">
                    <div className="activity-list">
                      {logs.slice(0, 5).map((log) => (
                        <div key={log.id} className={`activity-item ${log.kind}`}>
                          <span className={`log-dot ${log.kind}`} />
                          <div className="activity-body">
                            <strong>{log.user}</strong>
                            <span>{log.action}</span>
                          </div>
                          <span className="activity-time">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </section>
              )}

              {dashboardTab === "activity" && (
                <section className="dashboard-grid">
                  <Panel title="Recent Activity">
                    <div className="activity-list">
                      {logs.map((log) => (
                        <div key={log.id} className={`activity-item ${log.kind}`}>
                          <span className={`log-dot ${log.kind}`} />
                          <div className="activity-body">
                            <strong>{log.user}</strong>
                            <span>{log.action}</span>
                          </div>
                          <span className="activity-time">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="System Logs">
                    <div className="activity-list">
                      {logs.map((log) => (
                        <div key={log.id} className={`activity-item ${log.kind}`}>
                          <span className={`log-dot ${log.kind}`} />
                          <div className="activity-body">
                            <strong>{log.user}</strong>
                            <span>{log.action}</span>
                          </div>
                          <span className="activity-time">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </section>
              )}

              <section className="quick-actions">
                <p className="eyebrow">Quick Actions</p>
                <div className="quick-actions-grid">
                  {quickActions.map((action) => (
                    <button key={action.label} className="quick-action" onClick={action.action}>
                      <action.icon size={18} />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {activePage === "crm" && (
            <AdminAllLeadsTable title={`All Leads (${leads.length})`} leads={leads} users={activeUsers} adminName={currentUser?.name || currentUser?.username || "Admin"} onEdit={editApprovedLead} onSave={updateCrmLead} onDelete={deleteFrontendLead} />
          )}

          {activePage === "crm-upload" && (
            <CrmUploadDataPage rows={crmUploadRows} setRows={setCrmUploadRows} users={users} isAdmin={isAdminUser(currentUser)}
              onCallLeadEdit={addLeadFromCall} onSaveCall={saveCallContact} onDeleteCall={deleteCallContact} />
          )}

          {activePage === "user-create" && (
            <Panel title={editingUserId ? "Edit user" : "Create new user"}>
              <form className="form-grid" onSubmit={addMember} autoComplete="off">
                <p className="form-section-title">Personal Information</p>
                <Field label="Full Name *">
                  <input
                    value={createUserForm.name}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Enter your full name here"
                  />
                </Field>
                <Field label="Email *">
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="Enter your work email here"
                  />
                </Field>
                <Field label="Contact Number *">
                  <input
                    value={createUserForm.phone}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "") }))
                    }
                    placeholder="Enter your contact number here"
                    maxLength={10}
                  />
                </Field>
                <Field label="Marital Status">
                  <select
                    value={createUserForm.maritalStatus}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, maritalStatus: event.target.value }))
                    }
                  >
                    <option value="">Select</option>
                    {["Single", "Married", "Divorced", "Widowed"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Education *">
                  <input
                    value={createUserForm.education}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, education: event.target.value }))
                    }
                    placeholder="Enter your highest qualification here"
                  />
                </Field>

                <p className="form-section-title">Employment Information</p>
                <Field label="Department *">
                  <select
                    value={createUserForm.dept}
                    onChange={(event) => {
                      const dept = event.target.value;
                      setCreateUserForm((current) => ({
                        ...current,
                        dept,
                        role: departmentRoleMap[dept] || dept,
                        position: dept === "Student" ? "Student" : (current.position === "Student" ? "" : current.position),
                      }));
                    }}
                  >
                    {backendDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Position *">
                  <input
                    value={createUserForm.position}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, position: event.target.value }))
                    }
                    placeholder="Enter your position here"
                  />
                </Field>
                <p className="form-section-title">Joining Information</p>
                <Field label="Date of Joining *">
                  <input
                    type="date"
                    value={createUserForm.joined}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, joined: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Profile Photo">
                  <div className="avatar-upload">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        event.target.value = "";
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setCreateUserPreview(e.target.result);
                          setCreateUserFile(file);
                          setCreateUserForm((current) => ({ ...current, imageUrl: e.target.result }));
                        };
                        reader.readAsDataURL(file);
                      }}
                      hidden
                      id="create-user-photo"
                    />
                    <label htmlFor="create-user-photo" className="avatar-upload-label">
                      <Upload size={16} />
                      {createUserForm.imageUrl ? "Change photo" : "Upload photo"}
                    </label>
                    {createUserPreview && (
                      <div className="avatar-preview">
                        <img src={createUserPreview} alt="Preview" />
                      </div>
                    )}
                    {!createUserPreview && createUserForm.imageUrl && (
                      <div className="avatar-preview">
                        <img src={createUserForm.imageUrl} alt="Preview" />
                      </div>
                    )}
                  </div>
                </Field>

                <p className="form-section-title">Login Information</p>
                <Field label="Username *">
                  <input
                    value={createUserForm.username}
                    autoComplete="off"
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, username: event.target.value }))
                    }
                    placeholder="Choose a username here"
                  />
                </Field>
                <Field label="Password *">
                  <input
                    type="password"
                    value={createUserForm.password}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Create a secure password here"
                  />
                </Field>

                <p className="form-section-title">Organization / Location</p>
                <Field label="State *">
                  <input
                    value={createUserForm.state}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, state: event.target.value }))
                    }
                    placeholder="Enter your state here"
                  />
                </Field>
                <Field label="Branch *">
                  <input
                    value={createUserForm.branch}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, branch: event.target.value }))
                    }
                    placeholder="Enter your branch here"
                  />
                </Field>
                <Field label="Branch Code *">
                  <input
                    value={createUserForm.branchCode}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, branchCode: event.target.value }))
                    }
                    placeholder="Enter your branch code here"
                  />
                </Field>

                <p className="form-section-title">Address</p>
                <Field label="Address *">
                  <textarea
                    value={createUserForm.address}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, address: event.target.value }))
                    }
                    placeholder="Enter your complete address here"
                    rows={3}
                  />
                </Field>

                <div className="form-actions span-full">
                  <button className="primary-button" type="submit" disabled={isCreatingUser}>
                    {isCreatingUser ? (editingUserId ? "Updating User..." : "Creating User...") : (editingUserId ? "Update User" : "Create User")}
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {activePage === "user-view" && (
            <Panel title={`All users (${visibleUsers.length})`}>
              <UsersTable users={visibleUsers} onEdit={editUser} />
            </Panel>
          )}

          {activePage === "sales-add" && (
            <Panel title={editingLeadId ? "Edit lead" : "Add new lead"}>
              <form className="form-grid add-lead-form" onSubmit={addLead}>
                <div className="form-section">
                  <p className="form-section-title">Contact Information</p>
                  <Field label="Full name *">
                    <input
                      value={createLead.name}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Enter the lead's full name here"
                    />
                  </Field>
                  <Field label="Phone *">
                    <input
                      value={createLead.phone}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))
                      }
                      placeholder="Enter the lead's phone number here"
                      maxLength={10}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      value={createLead.email}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="Enter the lead's email here"
                      type="email"
                    />
                  </Field>
                  <Field label="Alternate Phone">
                    <input
                      value={createLead.alternatePhone}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, alternatePhone: event.target.value }))
                      }
                      placeholder="Enter an alternate phone number here"
                    />
                  </Field>
                  <Field label="City *">
                    <input
                      value={createLead.city}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, city: event.target.value }))
                      }
                      placeholder="Enter the city here"
                    />
                  </Field>
                  <Field label="Company / Organization">
                    <input
                      value={createLead.company}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, company: event.target.value }))
                      }
                      placeholder="Enter the company or organization here"
                    />
                  </Field>
                </div>

                <div className="form-section">
                  <p className="form-section-title">Lead Information</p>
                  <Field label="Lead Type *">
                    <select
                      value={createLead.type}
                      onChange={(event) =>
                        setCreateLead((current) => ({
                          ...current,
                          type: event.target.value,
                          interest:
                            event.target.value === "Training"
                              ? trainingCatalog[0]
                              : event.target.value === "Service"
                                ? serviceCatalog[0]
                                : internshipTracks[0],
                        }))
                      }
                    >
                      <option>Training</option>
                      <option>Service</option>
                      <option>Internship</option>
                    </select>
                  </Field>
                  <Field label="Interest *">
                    <select
                      value={createLead.interest}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, interest: event.target.value }))
                      }
                    >
                      <option value="">Select interest</option>
                      {createLead.interest && ![...trainingCatalog, ...serviceCatalog, ...internshipTracks].includes(createLead.interest) && <option>{createLead.interest}</option>}
                      {(createLead.type === "Training"
                        ? trainingCatalog
                        : createLead.type === "Service"
                          ? serviceCatalog
                          : internshipTracks
                      ).map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Value">
                    <input
                      type="number"
                      value={createLead.value}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, value: event.target.value }))
                      }
                      placeholder="Enter the estimated value here"
                    />
                  </Field>
                  <Field label="Lead Source *">
                    <select
                      value={createLead.leadSource}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, leadSource: event.target.value, source: event.target.value }))
                      }
                    >
                      {["Website", "Referral", "Facebook", "Instagram", "Google", "Walk-in", "Phone Call", "Other"].map(
                        (source) => (
                          <option key={source}>{source}</option>
                        ),
                      )}
                    </select>
                  </Field>
                  <Field label="Status *">
                    <select
                      value={createLead.status}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, status: event.target.value }))
                      }
                    >
                      {["Pending", "Interested", "Not Interested"].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="form-section">
                  <p className="form-section-title">Assignment</p>
                  <Field label="Entered By *">
                    <input value={enteredBy} readOnly />
                  </Field>
                  <Field label="Assigned To *">
                    <select
                      value={createLead.assignedTo}
                      onChange={(event) =>
                        setCreateLead((current) => ({
                          ...current,
                          assignedTo: event.target.value,
                          assignedDate: event.target.value ? (current.assignedDate || new Date().toISOString().slice(0, 10)) : current.assignedDate,
                        }))
                      }
                    >
                      <option value="">Select Admin / Operations</option>
                      {createLead.assignedTo && !leadAssignableUsers.some((user) => String(user.id || user._id) === String(createLead.assignedTo)) && <option value={createLead.assignedTo}>{createLead.assignedTo}</option>}
                      {leadAssignableUsers.map((user) => (
                        <option key={user.id || user._id} value={user.id || user._id}>
                          {user.name || user.username}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Assigned Date">
                    <input
                      type="date"
                      value={createLead.assignedDate}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, assignedDate: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="form-section span-full">
                  <p className="form-section-title">Additional Information</p>
                  <Field label="Lead Notes / Remarks">
                    <textarea
                      value={createLead.notes}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, notes: event.target.value }))
                      }
                      placeholder="Enter lead notes or requirements here"
                      rows={4}
                    />
                  </Field>
                </div>

                <div className="form-actions span-full">
                  <button className="primary-button" type="submit">
                    {editingLeadId ? "Update lead" : "Save lead"}
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {activePage === "sales-approved" && (
            <>
              <AdminAllLeadsTable title={`Assigned Leads (${assignedLeads.length})`} leads={assignedLeads} users={activeUsers} adminName={currentUser?.name || currentUser?.username || "Admin"} onEdit={editApprovedLead} onSave={updateCrmLead} onDelete={deleteFrontendLead} hideOwnership />
              <CallLeadsPanel rows={crmUploadRows} users={activeUsers} assignedTo={currentUserId} onSave={saveCallContact} onDelete={deleteCallContact} onAdd={addLeadFromCall} lockCreatedLead allowReturnToOwner title={`Assigned Call Leads (${crmUploadRows.filter((row) => isCallLead(row) && String(row.callLeadAssignedTo || "") === currentUserId).length})`} subtitle={`Qualifying call leads assigned to ${currentUser?.name || currentUser?.username || "you"}`} />
            </>
          )}

          {activePage === "sales-report" && (
            <>
              <section className="stats-grid compact">
                <StatCard tone="blue" icon={Users} label="Total Leads" value={leads.length} note="Across sales modules" />
                <StatCard tone="green" icon={CheckCircle2} label="Assigned Leads" value={assignedLeads.length} note={`${currentUser?.name || "You"}'s locked leads`} />
                <StatCard tone="rose" icon={BadgeIndianRupee} label="Revenue" value={compactCurrency(revenue)} note="Closed pipeline value" />
                <StatCard tone="amber" icon={Sparkles} label="Conv. Rate" value={`${leads.length ? Math.round((wonLeads.length / leads.length) * 100) : 0}%`} note="Overall conversion" />
              </section>
              <Panel title="Sales performance by executive">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Executive</th>
                        <th>Leads</th>
                        <th>Converted</th>
                        <th>Revenue</th>
                        <th>Conv%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeUsers.map((user) => {
                        const myLeads = leads.filter((lead) => String(lead.assignedTo) === String(user.id || user._id));
                        const converted = myLeads.filter((lead) =>
                          ["Interested", "Converted", "Approved"].includes(lead.status),
                        );
                        const totalRevenue = converted.reduce(
                          (sum, lead) => sum + Number(lead.value || 0),
                          0,
                        );
                        return (
                          <tr key={user.id}>
                            <td>
                              <div className="person-cell">
                                <div className="avatar soft">{initials(user.name)}</div>
                                <strong>{user.name}</strong>
                              </div>
                            </td>
                            <td>{myLeads.length}</td>
                            <td>{converted.length}</td>
                            <td>{formatCurrency(totalRevenue)}</td>
                            <td>
                              {myLeads.length
                                ? `${Math.round((converted.length / myLeads.length) * 100)}%`
                                : "0%"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="CRM call performance report">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>CRM Executive</th>
                        <th>Completed</th>
                        <th>Pending</th>
                        <th>Follow-Up</th>
                        <th>Not Attended Calls</th>
                        <th>Total Calls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crmReportUsers.map((report) => (
                        <tr key={report.exec}>
                          <td>
                            <div className="person-cell">
                              <div className="avatar soft">{initials(report.exec)}</div>
                              <strong>{report.exec}</strong>
                            </div>
                          </td>
                          <td>{report.completed}</td>
                          <td>{report.pending}</td>
                          <td>{report.followUp}</td>
                          <td>{report.notAttended}</td>
                          <td>{report.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}

          {activePage === "co-approved" && (
            <>
              <AdminAllLeadsTable title={`Assigned Leads (${assignedLeads.length})`} leads={assignedLeads} users={activeUsers} adminName={currentUser?.name || currentUser?.username || "Admin"} onEdit={editApprovedLead} onSave={updateCrmLead} onDelete={deleteFrontendLead} hideOwnership />
              <CallLeadsPanel rows={crmUploadRows} users={activeUsers} assignedTo={currentUserId} onSave={saveCallContact} onDelete={deleteCallContact} onAdd={addLeadFromCall} lockCreatedLead allowReturnToOwner title={`Assigned Call Leads (${crmUploadRows.filter((row) => isCallLead(row) && String(row.callLeadAssignedTo || "") === currentUserId).length})`} subtitle={`Qualifying call leads assigned to ${currentUser?.name || currentUser?.username || "you"}`} />
            </>
          )}

          {activePage === "hr-assign" && (
            <Panel title="Assign task to CRM Executive">
              <form className="form-grid" onSubmit={assignTaskToCrmExecutive}>
                <label className="field"><span>CRM Executive *</span><select value={adminTaskForm.assigneeId} onChange={(event) => setAdminTaskForm((current) => ({ ...current, assigneeId: event.target.value }))}><option value="">Select CRM Executive</option>{activeUsers.filter((user) => isCrmExecutive(user.role)).map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}</select></label>
                <label className="field"><span>Task title *</span><input value={adminTaskForm.title} onChange={(event) => setAdminTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Follow up warm leads" /></label>
                <label className="field"><span>Priority</span><select value={adminTaskForm.priority} onChange={(event) => setAdminTaskForm((current) => ({ ...current, priority: event.target.value }))}><option>High</option><option>Medium</option><option>Low</option></select></label>
                <label className="field"><span>Due date</span><input type="date" value={adminTaskForm.dueDate} onChange={(event) => setAdminTaskForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
                <label className="field span-full"><span>Description</span><textarea rows="3" value={adminTaskForm.description} onChange={(event) => setAdminTaskForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add instructions or expected outcome" /></label>
                <div className="form-actions span-full"><button type="submit" className="primary-button"><ClipboardCheck size={16} /> Assign Task</button></div>
              </form>
            </Panel>
          )}

          {activePage === "hr-tasks" && (
            <Panel title="All tasks">
              <TaskTable tasks={tasks} />
            </Panel>
          )}

          {activePage === "hr-leaves" && (
            <Panel title="Leave requests">
              <div className="admin-leave-overview">
                <div><span>Total requests</span><strong>{leaves.length}</strong></div>
                <div className="pending"><span>Pending review</span><strong>{leaves.filter((leave) => leave.status === "Pending").length}</strong></div>
                <div className="approved"><span>Approved</span><strong>{leaves.filter((leave) => leave.status === "Approved").length}</strong></div>
                <div className="rejected"><span>Rejected</span><strong>{leaves.filter((leave) => leave.status === "Rejected").length}</strong></div>
              </div>
              <div className="table-wrap admin-leave-table-wrap">
                <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 && <tr><td colSpan="7" className="empty-cell">No leave requests yet.</td></tr>}
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <div className="person-cell">
                          <div className="avatar soft">{initials(leave.employeeName || "CRM Executive")}</div>
                          <strong>{leave.employeeName || "CRM Executive"}</strong>
                        </div>
                      </td>
                      <td>{leave.type}</td>
                      <td>{formatDateDDMMYYYY(leave.from)}</td>
                      <td>{formatDateDDMMYYYY(leave.to)}</td>
                      <td>{leave.from && leave.to ? Math.floor((new Date(`${leave.to}T00:00:00`) - new Date(`${leave.from}T00:00:00`)) / 86400000) + 1 : "-"}</td>
                      <td>{leave.reason}</td>
                      <td>
                        {leave.status === "Pending" ? (
                          <select className="leave-decision-select" value={leave.status} onChange={(event) => updateLeaveRequestStatus(leave, event.target.value)}>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approve</option>
                            <option value="Rejected">Reject</option>
                          </select>
                        ) : <span className={badgeClass(leave.status)}>{leave.status}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Panel>
          )}

          {activePage === "hr-attendance" && (
            <Panel title="Attendance report">
              <div className="table-wrap">
                <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 && <tr><td colSpan="6" className="empty-cell">No attendance records yet.</td></tr>}
                  {attendance.map((record) => (
                    <tr key={record.id}>
                      <td><strong>{record.employeeName || "CRM Executive"}</strong></td>
                      <td>{formatDateDDMMYYYY(record.date)}</td>
                      <td><span className={badgeClass(record.status)}>{record.status}</span></td>
                      <td>{record.checkIn || "-"}</td>
                      <td>{record.checkOut || "-"}</td>
                      <td>{record.remark || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Panel>
          )}

          {activePage === "hr-emp" && (
            <Panel title="Employee profiles">
              <UsersTable users={users} />
            </Panel>
          )}

          {activePage === "services" && (
            <>
              <section className="stats-grid compact four-up">
                <StatCard tone="rose" icon={BriefcaseBusiness} label="Total services" value={serviceRows.length} note="Published catalog items" />
                <StatCard tone="blue" icon={Users} label="Active services" value={serviceRows.filter((row) => (row.status || "Active") === "Active").length} note="Enabled offerings" />
                <StatCard tone="green" icon={BriefcaseBusiness} label="Service categories" value={serviceCategoryCards.length} note="Dynamic service groups" />
                <StatCard tone="amber" icon={BadgeIndianRupee} label="Entry price" value={extractCategoryPrice(serviceRows)} note="Lowest category tier" />
              </section>

              <Panel title="Service management workspace">
                <div className="module-toolbar">
                  <div className="toolbar-search">
                    <Search size={16} />
                    <input
                      value={serviceQuery}
                      onChange={(event) => {
                        setServiceQuery(event.target.value);
                        setServicePage(1);
                      }}
                      placeholder="Search categories, services, technologies, pricing"
                    />
                  </div>
                  <button type="button" className="primary-button" onClick={() => openServiceModal("add")}>
                    Add category
                  </button>
                </div>

                {serviceRows.length === 0 ? (
                  <div className="catalog-empty-state">No services available</div>
                ) : (
                  <>
                    <div className="catalog-card-list">
                      {serviceCategoryCards
                        .filter((item) => {
                          const haystack = [item.category, item.services.join(" "), item.pricing.join(" "), item.updatedAt].join(" ").toLowerCase();
                          return haystack.includes(serviceQuery.toLowerCase());
                        })
                        .slice((servicePage - 1) * 6, servicePage * 6)
                        .map((category, index) => (
                          <article key={category.category} className="admin-entity-card">
                            <div className="entity-top">
                              <span className="entity-icon"><BriefcaseBusiness size={18} /></span>
                              <div>
                                <strong>{category.category}</strong>
                                <p>{category.services.length} services</p>
                              </div>
                            </div>

                            <div className="entity-metrics">
                              <div>
                                <span>Starting price</span>
                                <strong>{category.pricing[0]}</strong>
                              </div>
                              <div>
                                <span>Status</span>
                                <strong>{category.status}</strong>
                              </div>
                              <div>
                                <span>Last updated</span>
                                <strong>{category.updatedAt}</strong>
                              </div>
                            </div>

                            <div className="entity-actions">
                              <button type="button" className="ghost-button compact" onClick={() => {
                                setSelectedServiceCategory(category.category);
                                setServiceDetailTab("overview");
                                openServiceModal("view", category.category, category.rows);
                              }}>
                                View
                              </button>
                              <button type="button" className="ghost-button compact" onClick={() => openServiceModal("edit", category.category, category.rows)}>
                                Edit
                              </button>
                              <button type="button" className="ghost-button compact" onClick={() => duplicateServiceCategory(category.category)}>
                                Duplicate
                              </button>
                              <button type="button" className="ghost-button compact danger" onClick={() => deleteServiceCategory(category.category)}>
                                Delete
                              </button>
                            </div>
                          </article>
                        ))}
                    </div>

                    <div className="pagination-row">
                      <button type="button" className="ghost-button compact" disabled={servicePage === 1} onClick={() => setServicePage((current) => Math.max(1, current - 1))}>Previous</button>
                      <span>Page {servicePage}</span>
                      <button type="button" className="ghost-button compact" disabled={servicePage * 6 >= serviceCategoryCards.filter((item) => {
                        const haystack = [item.category, item.services.join(" "), item.pricing.join(" "), item.updatedAt].join(" ").toLowerCase();
                        return haystack.includes(serviceQuery.toLowerCase());
                      }).length} onClick={() => setServicePage((current) => current + 1)}>Next</button>
                    </div>
                  </>
                )}
              </Panel>

              {selectedServiceCategory && (
                <Panel title={`${selectedServiceCategory} detail workspace`}>
                  <div className="detail-tab-row">
                    {[
                      "Overview",
                      "Packages",
                      "Features",
                      "Technologies",
                      "Pricing",
                      "Gallery",
                      "FAQs",
                      "Analytics",
                    ].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`ghost-button compact ${serviceDetailTab === tab.toLowerCase() ? "save" : ""}`}
                        onClick={() => setServiceDetailTab(tab.toLowerCase())}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="detail-workspace-grid">
                    <div className="detail-workspace-main">
                      {serviceDetailTab === "overview" && (
                        <div className="detail-stack">
                          <div className="detail-summary-grid">
                            <div className="summary-chip"><span>Services</span><strong>{selectedCategoryRows.length}</strong></div>
                            <div className="summary-chip"><span>Starting price</span><strong>{extractCategoryPrice(selectedCategoryRows)}</strong></div>
                            <div className="summary-chip"><span>Status</span><strong>{deriveServiceStatus(selectedCategoryRows)}</strong></div>
                            <div className="summary-chip"><span>Last updated</span><strong>{selectedCategoryRows[0]?.updatedAt || "2026-08-01"}</strong></div>
                          </div>
                          <div className="detail-list">
                            {selectedCategoryRows.slice(0, 4).map((row) => (
                              <div key={row.id} className="detail-list-item">
                                <strong>{row.name}</strong>
                                <span>{row.details}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {serviceDetailTab === "packages" && (
                        <div className="detail-list">
                          {selectedCategoryRows.map((row) => (
                            <div key={row.id} className="detail-list-item">
                              <strong>{row.name}</strong>
                              <span>{row.price}</span>
                              <small>{row.details}</small>
                            </div>
                          ))}
                        </div>
                      )}

                      {serviceDetailTab === "features" && (
                        <div className="detail-list">
                          {selectedCategoryRows.slice(0, 5).map((row) => (
                            <div key={row.id} className="detail-list-item">
                              <strong>{row.name}</strong>
                              <span>{row.details}</span>
                              <small>{row.features || row.technology || row.tools || "Feature set is ready for rich text editing."}</small>
                            </div>
                          ))}
                        </div>
                      )}

                      {serviceDetailTab === "technologies" && (
                        <div className="detail-list">
                          {selectedCategoryRows.map((row) => (
                            <div key={row.id} className="detail-list-item">
                              <strong>{row.name}</strong>
                              <span>{row.technology || row.tools || row.category}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {serviceDetailTab === "pricing" && (
                        <div className="detail-list">
                          {selectedCategoryRows.map((row) => (
                            <div key={row.id} className="detail-list-item">
                              <strong>{row.name}</strong>
                              <span>{row.price}</span>
                              <small>Service scope: {row.details}</small>
                            </div>
                          ))}
                        </div>
                      )}

                      {serviceDetailTab === "gallery" && (
                        <div className="gallery-grid">
                          {selectedCategoryRows.slice(0, 6).map((row, index) => (
                            <div key={row.id} className="gallery-item">
                              <img src={row.imageUrl || serviceReferenceImages[index % serviceReferenceImages.length]} alt={row.name} />
                              <strong>{row.name}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {serviceDetailTab === "faqs" && (
                        <div className="detail-list">
                          {[
                            { q: "What is included in the support model?", a: "All plans include onboarding, controlled delivery milestones, and admin review loops." },
                            { q: "Can packages be customized for enterprise scopes?", a: "Yes, each catalog item can be layered with add-ons, SLA packs, and change-control windows." },
                            { q: "How are pricing and licenses managed?", a: "Pricing is driven at the service and package level, then surfaced through the category dashboard." },
                          ].map((item) => (
                            <div key={item.q} className="detail-list-item">
                              <strong>{item.q}</strong>
                              <span>{item.a}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {serviceDetailTab === "analytics" && (
                        <div className="analytics-grid">
                          <div className="analytics-card">
                            <p>Lead interest tier</p>
                            <div className="mini-bar"><i style={{ width: "72%" }} /></div>
                            <strong>72% active demand</strong>
                          </div>
                          <div className="analytics-card">
                            <p>Package mix</p>
                            <div className="mini-bar"><i style={{ width: "58%" }} /></div>
                            <strong>58% recurring retainers</strong>
                          </div>
                          <div className="analytics-card">
                            <p>Avg. response window</p>
                            <div className="mini-bar"><i style={{ width: "84%" }} /></div>
                            <strong>4.8 hrs SLA</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    <aside className="detail-side-panel">
                      <div className="side-widget">
                        <p className="eyebrow">Category snapshot</p>
                        <strong>{selectedServiceCategory}</strong>
                        <span>{selectedCategoryRows.length} catalog items</span>
                      </div>
                      <div className="side-widget">
                        <p className="eyebrow">Technology stack</p>
                        <span>{selectedCategoryRows.map((row) => row.technology || row.tools || row.category).join(" • ")}</span>
                      </div>
                      <div className="side-widget">
                        <p className="eyebrow">SEO keywords</p>
                        <span>{selectedCategoryRows[0]?.seoKeywords || "enterprise, crm, automation, solution"}</span>
                      </div>
                    </aside>
                  </div>
                </Panel>
              )}
            </>
          )}

          {activePage === "course-view" && (
            <>
              <Panel title="Courses">
                <div className="course-library-heading">
                  <p className="eyebrow">COURSES</p>
                  <h2>Course library</h2>
                </div>
                <div className="module-toolbar course-library-toolbar">
                  <div className="toolbar-search">
                    <Search size={16} />
                    <input value={trainingQuery} onChange={(event) => { setTrainingQuery(event.target.value); setTrainingPage(1); }} placeholder="Search courses" />
                  </div>
                  <button type="button" className="primary-button" onClick={() => setActivePage("course-add")}>Add course</button>
                </div>
                {courseRows.length === 0 ? (
                  <div className="catalog-empty-state">No courses found in Firebase.</div>
                ) : (
                  <div className="course-library-grid">
                    {courseRows
                      .map((course) => normalizeCourseToTraining(course))
                      .filter((course) => [course.name, course.duration, course.mode, course.price, ...(course.lessons || []).map((lesson) => lesson.title)].join(" ").toLowerCase().includes(trainingQuery.toLowerCase()))
                      .slice((trainingPage - 1) * 6, trainingPage * 6)
                      .map((course) => {
                        const expanded = expandedCourseId === course.id;
                        const lessons = Array.isArray(course.lessons) ? course.lessons : [];
                        const backendSectionNames = Array.isArray(course.sections)
                          ? course.sections
                              .map((section) => String(section?.name || section || "").trim())
                              .filter(Boolean)
                          : [];
                        const sectionNames = backendSectionNames.length
                          ? backendSectionNames
                          : [...new Set(lessons.map((lesson) => String(lesson.section || "General").trim() || "General"))];
                        const sectionGroups = sectionNames.map((section) => ({
                          name: section,
                          lessons: lessons.filter((lesson) => String(lesson.section || "General").trim() === section),
                        }));
                        return (
                          <article key={course.id} className="course-library-card">
                            <div className="course-library-card-head">
                              <div>
                                <strong>{course.name}</strong>
                                <span>{sectionNames.join(", ") || "General"} · {course.duration} · {course.mode} · {course.price}</span>
                              </div>
                            </div>
                            <div className="course-library-section-list course-library-section-list-plain">
                              {sectionGroups.map((group) => (
                                <div key={group.name} className="course-library-section-row course-library-section-row-plain">
                                  <strong>{group.name}</strong>
                                </div>
                              ))}
                            </div>
                            {expanded ? (
                              <div className="course-library-lessons">
                                {lessons.length ? lessons.map((lesson, index) => (
                                  <div key={lesson.id || `${course.id}-lesson-${index}`} className="course-library-lesson">
                                    <div>
                                      <strong>{lesson.title || `Lesson ${index + 1}`}</strong>
                                      <span>{lesson.durationTime || "Lesson content"}</span>
                                    </div>
                                    <div className="course-library-links">
                                      {lesson.videoUrl ? <a href={lesson.videoUrl} target="_blank" rel="noreferrer">Video</a> : null}
                                      {lesson.notesUrl ? <a href={lesson.notesUrl} target="_blank" rel="noreferrer">Notes</a> : null}
                                      {(lesson.tasks || []).map((task, taskIndex) => (
                                        <a key={task.id || `${lesson.id}-task-${taskIndex}`} href={task.pdfUrl || task.url || "#"} target="_blank" rel="noreferrer">Assignment</a>
                                      ))}
                                    </div>
                                  </div>
                                )) : <span className="course-library-empty-detail">No lessons saved for this course.</span>}
                              </div>
                            ) : null}
                            <div className="course-library-actions">
                              <button type="button" className="ghost-button compact" onClick={() => openTrainingModal("view", course)}>{expanded ? "Hide course" : "View course"}</button>
                              <button type="button" className="ghost-button compact" onClick={() => openTrainingModal("edit", course)}>Edit</button>
                              <button type="button" className="ghost-button compact danger" onClick={() => deleteTraining(course)}>Delete</button>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                )}
              </Panel>
            </>
          )}

          {activePage === "course-check" && (
            <>
              <section className="stats-grid compact four-up">
                <StatCard tone="blue" icon={Users} label="Unique students" value={new Set(taskReviewRows.map((row) => row.studentId)).size} note={`${taskReviewRows.length} uploaded assignments`} />
                <StatCard tone="amber" icon={ClipboardCheck} label="Needs review" value={taskReviewRows.filter((row) => !hasTaskGrade(row.grade)).length} note="Awaiting grade" />
                <StatCard tone="green" icon={CheckCheck} label="Graded assignments" value={taskReviewRows.filter((row) => hasTaskGrade(row.grade)).length} note="Grade already added" />
                <StatCard tone="teal" icon={GraduationCap} label="Uploaded assignments" value={taskReviewRows.length} note="All student uploads" />
              </section>
              <Panel title="Check student tasks">
                <div className="module-toolbar">
                  <div className="toolbar-search"><Search size={16} /><input value={taskReviewQuery} onChange={(event) => setTaskReviewQuery(event.target.value)} placeholder="Search student, course, section, or task" /></div>
                  <button type="button" className="ghost-button compact" onClick={async () => { setTaskSubmissionLoading(true); try { setTaskSubmissions(await loadTaskSubmissions(true)); } finally { setTaskSubmissionLoading(false); } }}>Refresh submissions</button>
                </div>
                {taskSubmissionLoading ? <div className="catalog-empty-state">Loading student submissions...</div> : (
                  <div className="submission-table-wrap">
                    <div className="submission-table-meta"><span><strong>{taskReviewRows.filter((row) => [row.studentName, row.courseTitle, row.section, row.taskTitle].join(" ").toLowerCase().includes(taskReviewQuery.toLowerCase())).length}</strong> assignments shown</span><span className="submission-table-hint">Select a row to review and grade</span></div>
                    <div className="submission-table" role="table" aria-label="Student assignment submissions">
                      <div className="submission-table-head" role="row">
                        <span role="columnheader">Student</span><span role="columnheader">Course & lesson</span><span role="columnheader">Assignment</span><span role="columnheader">Status</span><span role="columnheader" aria-label="Actions"></span>
                      </div>
                      {taskReviewRows.filter((row) => [row.studentName, row.courseTitle, row.section, row.taskTitle].join(" ").toLowerCase().includes(taskReviewQuery.toLowerCase())).map((row) => (
                        <div key={row.id} className="submission-table-row" role="row">
                          <div className="submission-student" role="cell"><span className="submission-avatar">{String(row.studentName || "S").trim().charAt(0).toUpperCase()}</span><span><strong>{row.studentName}</strong><small>{row.studentEmail || row.studentId}</small></span></div>
                          <div className="submission-context" role="cell"><strong>{row.courseTitle}</strong><small>{row.section} · {row.lessonTitle}</small></div>
                          <div className="submission-task" role="cell"><strong>{row.taskTitle}</strong><small>{row.taskStudentPdfUpload ? "Work uploaded" : "No upload yet"}</small></div>
                          <div role="cell"><span className={badgeClass(hasTaskGrade(row.grade) ? "approved" : row.taskStudentPdfUpload ? "pending" : "neutral")}>{hasTaskGrade(row.grade) ? `Graded · ${row.grade}/100` : row.taskStudentPdfUpload ? "Submitted" : "Not submitted"}</span></div>
                          <div className="submission-action" role="cell"><button type="button" className="primary-button compact" onClick={() => { setTaskSubmissionModal(row); setTaskGradeForm({ grade: row.grade ?? "", feedback: row.feedback || "" }); }}>{hasTaskGrade(row.grade) ? "View grade" : "Review"}</button></div>
                        </div>
                      ))}
                    </div>
                    {!taskReviewRows.filter((row) => [row.studentName, row.courseTitle, row.section, row.taskTitle].join(" ").toLowerCase().includes(taskReviewQuery.toLowerCase())).length && <div className="catalog-empty-state">No student submissions found.</div>}
                  </div>
                )}
              </Panel>
            </>
          )}

          {activePage === "enrollment-requests" && (
            <Panel title="Enrollment requests">
              <div className="module-toolbar enrollment-request-toolbar">
                <div className="toolbar-search">
                  <Search size={16} />
                  <input value={enrollmentRequestQuery} onChange={(event) => setEnrollmentRequestQuery(event.target.value)} placeholder="Search student, phone, or course" />
                </div>
                <input type="date" value={enrollmentRequestDate} onChange={(event) => setEnrollmentRequestDate(event.target.value)} aria-label="Filter by request date" />
                <select value={enrollmentRequestStatus} onChange={(event) => setEnrollmentRequestStatus(event.target.value)} aria-label="Filter by request status">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>
                <button type="button" className="ghost-button compact" onClick={async () => { try { const result = await loadPendingEnrollmentRequests(true); if (Array.isArray(result)) setAllEnrollmentRequests(result); } catch (err) { notify(err?.message || "Unable to refresh requests."); } }}>Refresh</button>
              </div>

              {allEnrollmentRequests.length === 0 ? (
                <div className="catalog-empty-state">No enrollment requests found.</div>
              ) : (
                <>
                <div className="submission-table-wrap">
                  <h3>Pending and contacted</h3>
                  <div className="submission-table enrollment-request-table" role="table" aria-label="Pending and contacted enrollment requests">
                    <div className="submission-table-head" role="row">
                      <span role="columnheader">Student</span>
                      <span role="columnheader">Phone</span>
                      <span role="columnheader">Course</span>
                      <span role="columnheader">Requested</span>
                      <span role="columnheader">Status</span>
                      <span role="columnheader">Remark</span>
                      <span role="columnheader" aria-label="Actions"></span>
                    </div>

                    {activeEnrollmentRequests.map((request) => (
                        <div key={`${request.studentId}-${request.id}`} className="submission-table-row" role="row">
                          <div className="submission-student" role="cell">
                            <span className="submission-avatar">{String(request.studentName || "S").trim().charAt(0).toUpperCase()}</span>
                            <span>
                              <strong>{request.studentName || request.studentId || "Student"}</strong>
                            </span>
                          </div>
                          <div className="submission-context" role="cell"><strong>{request.studentPhone || "No phone provided"}</strong></div>
                          <div className="submission-context" role="cell">
                            <strong>{request.courseName || "Course request"}</strong>
                          </div>
                          <div className="submission-task" role="cell">
                            <strong>{request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : "Soon"}</strong>
                            <small>{request.requestedAt ? new Date(request.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</small>
                          </div>
                          <div role="cell"><span className={badgeClass(request.status === "contacted" ? "approved" : request.status === "approved" ? "approved" : request.status === "rejected" ? "rejected" : "pending")}>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span></div>
                          <div className="enrollment-request-remark" role="cell"><RemarkField value={request.remark || ""} onCommit={(remark) => handleUpdateEnrollmentRequestStatus(request, request.status, remark.trim())} label={`Remark for ${request.studentName || "student"}`} /></div>
                          <div className="submission-action" role="cell">
                            {request.status === "pending" ? <button type="button" className="primary-button compact" onClick={() => handleUpdateEnrollmentRequestStatus(request, "contacted")}>Contacted</button> : null}
                            {request.status === "contacted" ? <>
                              <button type="button" className="primary-button compact enrollment-approve-button" onClick={() => handleUpdateEnrollmentRequestStatus(request, "approved")}>Approve</button>
                              <button type="button" className="ghost-button compact enrollment-reject-button" onClick={() => handleUpdateEnrollmentRequestStatus(request, "rejected")}>Reject</button>
                            </> : null}
                            {request.status === "approved" ? <button type="button" className="primary-button compact" onClick={() => handleUpdateEnrollmentRequestStatus(request, "completed")}>Completed</button> : null}
                          </div>
                        </div>
                      ))}
                  </div>
                  {!activeEnrollmentRequests.length ? <div className="catalog-empty-state">No pending or contacted requests match the filters.</div> : null}
                </div>
                <div className="submission-table-wrap" style={{ marginTop: 20 }}>
                  <h3>Processed requests</h3>
                  <div className="submission-table enrollment-request-table" role="table" aria-label="Completed enrollment requests">
                    <div className="submission-table-head" role="row"><span role="columnheader">Student</span><span role="columnheader">Phone</span><span role="columnheader">Course</span><span role="columnheader">Requested</span><span role="columnheader">Status</span><span role="columnheader">Remark</span><span role="columnheader"></span></div>
                    {processedEnrollmentRequests.map((request) => (
                      <div key={`${request.studentId}-${request.id}`} className="submission-table-row" role="row">
                        <div className="submission-student" role="cell"><span className="submission-avatar">{String(request.studentName || "S").trim().charAt(0).toUpperCase()}</span><span><strong>{request.studentName || request.studentId || "Student"}</strong></span></div>
                        <div className="submission-context" role="cell"><strong>{request.studentPhone || "No phone provided"}</strong></div>
                        <div className="submission-context" role="cell"><strong>{request.courseName || "Course request"}</strong></div>
                        <div className="submission-task" role="cell"><strong>{request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : "Soon"}</strong><small>{request.requestedAt ? new Date(request.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</small></div>
                        <div role="cell"><span className={badgeClass(request.status === "rejected" ? "rejected" : "approved")}>{request.status === "completed" ? "Completed" : request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span></div>
                        <div className="enrollment-request-remark" role="cell"><RemarkField value={request.remark || ""} onCommit={(remark) => handleUpdateEnrollmentRequestStatus(request, "completed", remark.trim())} label={`Remark for ${request.studentName || "student"}`} /></div>
                        <div className="submission-action" role="cell"><button type="button" className="ghost-button compact" onClick={() => handleUpdateEnrollmentRequestStatus(request, "pending")}>Reopen</button></div>
                      </div>
                    ))}
                  </div>
                  {!processedEnrollmentRequests.length ? <div className="catalog-empty-state">No processed requests match the filters.</div> : null}
                </div>
                </>
              )}
            </Panel>
          )}

          {activePage === "trainings" && (
            <>
              <section className="stats-grid compact four-up">
                <StatCard tone="blue" icon={GraduationCap} label="Total courses" value={displayTrainingRows.length} note="Learning offerings" />
                <StatCard tone="teal" icon={CalendarClock} label="Active batches" value={Math.max(6, Math.round(displayTrainingRows.length / 2))} note="Live training cohorts" />
                <StatCard tone="green" icon={Users} label="Enrollments" value={Math.round(displayTrainingRows.length * 3.2)} note="Current enrollments" />
                <StatCard tone="amber" icon={BadgeIndianRupee} label="Revenue" value={`Rs ${Math.round(displayTrainingRows.length * 14500 / 1000)}K`} note="Monthly training value" />
              </section>

              <Panel title="Training management workspace">
                <div className="module-toolbar">
                  <div className="toolbar-search">
                    <Search size={16} />
                    <input value={trainingQuery} onChange={(event) => { setTrainingQuery(event.target.value); setTrainingPage(1); }} placeholder="Search course, trainer, mode, placement support" />
                  </div>
                  <button type="button" className="primary-button" onClick={() => openTrainingModal("add")}>Add course</button>
                </div>

                {displayTrainingRows.length === 0 ? (
                  <div className="catalog-empty-state">No training programs available</div>
                ) : (
                  <>
                    <div className="catalog-card-list training-grid">
                      {displayTrainingRows
                        .filter((row) => {
                          const haystack = [row.name, row.duration, row.price, row.tools, row.trainer, row.mode].join(" ").toLowerCase();
                          return haystack.includes(trainingQuery.toLowerCase());
                        })
                        .slice((trainingPage - 1) * 6, trainingPage * 6)
                        .map((course) => {
                          const expanded = expandedCourseId === course.id;
                          return (
                            <article key={course.id} className="admin-entity-card wide-card">
                              <div className="course-top">
                                <div className="course-thumbnail-column">
                                  <DecorativeThumbnail
                                    label={`${course.name} ${course.tools || ""}`}
                                    image={course.imageUrl}
                                    className="course-thumbnail"
                                  />
                                </div>
                                <div className="course-body">
                                  <div className="course-title-row">
                                    <strong>{course.name}</strong>
                                  </div>
                                  <div className="course-metrics-grid">
                                    <div><span>Duration</span><strong>{course.duration || "3 months"}</strong></div>
                                    <div><span>Fees</span><strong>{course.price || "Rs 12,000"}</strong></div>
                                    <div><span>Level</span><strong>{course.level || "Advanced"}</strong></div>
                                    <div><span>Seats</span><strong>{course.seats || "24"}</strong></div>
                                    <div><span>Trainer</span><strong>{course.trainer || "System Technologies Team"}</strong></div>
                                    <div><span>Batch timing</span><strong>{course.batchTiming || "Mon-Fri • 6PM-8PM"}</strong></div>
                                    <div><span>Projects</span><strong>{course.projects || "3 capstone projects"}</strong></div>
                                    <div><span>Certification</span><strong>{course.certification || "Industry certificate"}</strong></div>
                                    <div><span>Placement support</span><strong>{course.placement || "100% interview prep"}</strong></div>
                                  </div>
                                  <div className="course-actions">
                                    <button type="button" className="ghost-button compact" onClick={() => openTrainingModal("view", course)}>View</button>
                                    <button type="button" className="ghost-button compact" onClick={() => openTrainingModal("edit", course)}>Edit</button>
                                    <button type="button" className="ghost-button compact" onClick={() => duplicateTraining(course)}>Duplicate</button>
                                    <button type="button" className="ghost-button compact danger" onClick={() => deleteTraining(course)}>Delete</button>
                                  </div>
                                  {expanded && (
                                    <div className="syllabus-stack">
                                      {(Array.isArray(course?.lessons) && course.lessons.length > 0 ? course.lessons : [
                                        { title: "Course overview", notesUrl: course?.syllabus || "", tasks: [] },
                                      ]).map((lesson, idx) => (
                                        <div key={`${course.id}-lesson-${lesson.id || idx}`} className="syllabus-item">
                                          <strong>{lesson.title || `Lesson ${idx + 1}`}</strong>
                                          <span>{lesson.notesUrl ? "Notes uploaded" : lesson.tasks?.length ? `${lesson.tasks.length} assignment item(s)` : (course?.syllabus || "Course syllabus is ready.")}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                    </div>

                    <div className="pagination-row">
                      <button type="button" className="ghost-button compact" disabled={trainingPage === 1} onClick={() => setTrainingPage((current) => Math.max(1, current - 1))}>Previous</button>
                      <span>Page {trainingPage}</span>
                      <button type="button" className="ghost-button compact" disabled={trainingPage * 6 >= displayTrainingRows.filter((row) => {
                        const haystack = [row.name, row.duration, row.price, row.tools, row.trainer, row.mode].join(" ").toLowerCase();
                        return haystack.includes(trainingQuery.toLowerCase());
                      }).length} onClick={() => setTrainingPage((current) => current + 1)}>Next</button>
                    </div>
                  </>
                )}
              </Panel>
            </>
          )}

          {activePage === "stip" && (
            <>
              <section className="stats-grid compact four-up">
                <StatCard tone="teal" icon={Users} label="Total applicants" value={interns.length} note="Total submissions" />
                <StatCard tone="green" icon={CheckCircle2} label="Selected" value={interns.filter((intern) => intern.status === "Selected").length} note="Ready to onboard" />
                <StatCard tone="amber" icon={BookOpen} label="Shortlisted" value={interns.filter((intern) => intern.status === "Shortlisted").length} note="Review in progress" />
                <StatCard tone="blue" icon={Award} label="Open seats" value={stipPrograms.length * 6} note="Available internship slots" />
              </section>

              <Panel title="STIP management workspace">
                <div className="module-toolbar">
                  <div className="toolbar-search">
                    <Search size={16} />
                    <input value={stipQuery} onChange={(event) => { setStipQuery(event.target.value); setStipPage(1); }} placeholder="Search technology, mentor, stipend, deadline, status" />
                  </div>
                  <button type="button" className="primary-button" onClick={() => openStipModal("add")}>Add internship</button>
                </div>

                {stipPrograms.length === 0 ? (
                  <div className="catalog-empty-state">No STIP programs available</div>
                ) : (
                  <>
                    <div className="catalog-card-list">
                      {stipPrograms
                        .filter((row) => {
                          const haystack = [row.track, row.duration, row.focus, row.outcome, row.fee].join(" ").toLowerCase();
                          return haystack.includes(stipQuery.toLowerCase());
                        })
                        .slice((stipPage - 1) * 4, stipPage * 4)
                        .map((program) => (
                          <article key={program.id} className="admin-entity-card">
                            <div className="entity-top">
                              <span className="entity-icon"><Award size={18} /></span>
                              <div>
                                <strong>{program.track}</strong>
                                <p>{program.duration}</p>
                              </div>
                            </div>

                            <div className="entity-metrics compact-metrics">
                              <div><span>Technology</span><strong>{program.track}</strong></div>
                              <div><span>Stipend</span><strong>{program.fee || "Rs 8,000"}</strong></div>
                              <div><span>Eligibility</span><strong>Graduate / internship-ready</strong></div>
                              <div><span>Mentor</span><strong>{program.mentor || "Project mentor"}</strong></div>
                              <div><span>Projects</span><strong>{program.outcome || "Capstone delivery"}</strong></div>
                              <div><span>Seats</span><strong>{program.seats || "12"}</strong></div>
                              <div><span>Deadline</span><strong>{program.deadline || "2026-08-20"}</strong></div>
                              <div><span>Application status</span><strong>{program.applicationStatus || "Open"}</strong></div>
                            </div>

                            <div className="entity-actions">
                              <button type="button" className="ghost-button compact" onClick={() => openStipModal("view", program)}>View</button>
                              <button type="button" className="ghost-button compact" onClick={() => openStipModal("edit", program)}>Edit</button>
                              <button type="button" className="ghost-button compact" onClick={() => duplicateStipProgram(program)}>Duplicate</button>
                              <button type="button" className="ghost-button compact danger" onClick={() => deleteStipProgram(program)}>Delete</button>
                            </div>
                          </article>
                        ))}
                    </div>

                    <div className="pagination-row">
                      <button type="button" className="ghost-button compact" disabled={stipPage === 1} onClick={() => setStipPage((current) => Math.max(1, current - 1))}>Previous</button>
                      <span>Page {stipPage}</span>
                      <button type="button" className="ghost-button compact" disabled={stipPage * 4 >= stipPrograms.filter((row) => {
                        const haystack = [row.track, row.duration, row.focus, row.outcome, row.fee].join(" ").toLowerCase();
                        return haystack.includes(stipQuery.toLowerCase());
                      }).length} onClick={() => setStipPage((current) => current + 1)}>Next</button>
                    </div>
                  </>
                )}
              </Panel>

              <Panel title="STIP applications">
                <EditableCatalogSection
                  rows={interns}
                  onChange={setInterns}
                  fields={[
                    { key: "name", label: "Applicant" },
                    { key: "track", label: "Track" },
                    { key: "phone", label: "Phone" },
                    { key: "college", label: "College" },
                    { key: "status", label: "Status" },
                    { key: "date", label: "Applied" },
                  ]}
                  blankRow={{
                    name: "",
                    track: internshipTracks[0],
                    phone: "",
                    college: "",
                    status: "Applied",
                    date: "2026-07-29",
                  }}
                  notify={notify}
                />
              </Panel>
            </>
          )}

          {activePage === "logs" && (
            <Panel title="System login activity">
              <div className="log-list">
                {logs.map((log) => (
                  <div key={log.id} className="log-row">
                    <span className={`log-dot ${log.kind}`} />
                    <strong>{log.user}</strong>
                    <span>{log.action}</span>
                    <span>{log.ip}</span>
                    <span>{log.time}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

            {activePage === "settings" && (
              <Panel title="Settings">
                <div className="settings-layout">
                  <div className="settings-section">
                    <div className="settings-section-header">
                      <h3>Profile</h3>
                    </div>
                    <div className="settings-identity">
                      <div className="avatar large">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt={settingsForm.name || "Profile"} />
                        ) : (
                          initials(settingsForm.name || currentUser?.name || "Admin")
                        )}
                      </div>
                      <div>
                        <strong>{settingsForm.name || currentUser?.name || "Admin User"}</strong>
                        <span>{currentUser?.role || "Super Admin"}</span>
                      </div>
                    </div>
                    <div className="settings-form">
                      <Field label="Full Name">
                        <input value={settingsForm.name} onChange={(event) => setSettingsForm((current) => ({ ...current, name: event.target.value }))} />
                      </Field>
                      <Field label="Email">
                        <input value={settingsForm.email} onChange={(event) => setSettingsForm((current) => ({ ...current, email: event.target.value }))} />
                      </Field>
                      <Field label="Contact Number">
                        <input value={settingsForm.phone} onChange={(event) => setSettingsForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "") }))} maxLength={10} />
                      </Field>
                      <Field label="Emergency Contact">
                        <input value={settingsForm.emergencyContact} onChange={(event) => setSettingsForm((current) => ({ ...current, emergencyContact: event.target.value.replace(/\D/g, "") }))} maxLength={10} />
                      </Field>
                      <Field label="Marital Status">
                        <select value={settingsForm.maritalStatus} onChange={(event) => setSettingsForm((current) => ({ ...current, maritalStatus: event.target.value }))}>
                          <option value="">Select</option>
                          {["Single", "Married", "Divorced", "Widowed"].map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Education">
                        <input value={settingsForm.education} onChange={(event) => setSettingsForm((current) => ({ ...current, education: event.target.value }))} />
                      </Field>
                      <Field label="Department">
                        <select value={settingsForm.dept} onChange={(event) => setSettingsForm((current) => ({ ...current, dept: event.target.value }))}>
                          {["CRM", "Sales", "HR", "Technical", "Design", "Marketing"].map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Position">
                        <input value={settingsForm.position} onChange={(event) => setSettingsForm((current) => ({ ...current, position: event.target.value }))} />
                      </Field>
                      <Field label="Role">
                        <select value={settingsForm.role} onChange={(event) => setSettingsForm((current) => ({ ...current, role: event.target.value }))}>
                          {["CRM Executive", "Sales Executive", "HR", "Manager", "Admin", "Trainer", "Student"].map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Date of Joining">
                        <input type="date" value={settingsForm.joined} onChange={(event) => setSettingsForm((current) => ({ ...current, joined: event.target.value }))} />
                      </Field>
                      <Field label="State">
                        <input value={settingsForm.state} onChange={(event) => setSettingsForm((current) => ({ ...current, state: event.target.value }))} />
                      </Field>
                      <Field label="Branch">
                        <input value={settingsForm.branch} onChange={(event) => setSettingsForm((current) => ({ ...current, branch: event.target.value }))} />
                      </Field>
                      <Field label="Branch Code">
                        <input value={settingsForm.branchCode} onChange={(event) => setSettingsForm((current) => ({ ...current, branchCode: event.target.value }))} />
                      </Field>
                      <Field label="Address">
                        <textarea value={settingsForm.address} onChange={(event) => setSettingsForm((current) => ({ ...current, address: event.target.value }))} rows={3} />
                      </Field>
                      <Field label="Username">
                        <input value={settingsForm.username} onChange={(event) => setSettingsForm((current) => ({ ...current, username: event.target.value.replace(/\s/g, "") }))} />
                        {usernameError && <span className="field-error">{usernameError}</span>}
                      </Field>
                      <Field label="Profile picture">
                        <div className="avatar-upload">
                          <input type="file" accept="image/*" onChange={handleAvatarSelect} hidden id="avatar-upload" />
                          <label htmlFor="avatar-upload" className="avatar-upload-label">
                            <Upload size={16} />
                            {settingsForm.imageUrl ? "Change photo" : "Upload photo"}
                          </label>
                          <small>Select a photo, then click Save Changes to update your profile and sidebar.</small>
                          {avatarPreview && (
                            <div className="avatar-preview">
                              <img src={avatarPreview} alt="Preview" />
                            </div>
                          )}
                        </div>
                      </Field>
                      <div className="form-actions">
                        <button className="primary-button" onClick={handleSaveProfile} disabled={settingsSaving}>
                          {settingsSaving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                      {settingsMessage && (
                        <div className={`settings-message ${settingsMessageType === "error" ? "error" : "success"}`}>
                          {settingsMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="settings-section">
                    <div className="settings-section-header">
                      <h3>Change Password</h3>
                    </div>
                    <div className="settings-form">
                      <Field label="Current Password">
                        <div className="password-input-wrap">
                          <input type={showCurrentPassword ? "text" : "password"} value={passwordForm.current} onChange={(event) => setPasswordForm((current) => ({ ...current, current: event.target.value }))} />
                          <button type="button" className="password-toggle" onClick={() => setShowCurrentPassword((v) => !v)}>
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </Field>
                      <Field label="New Password">
                        <div className="password-input-wrap">
                          <input type={showNewPassword ? "text" : "password"} value={passwordForm.new} onChange={(event) => setPasswordForm((current) => ({ ...current, new: event.target.value }))} />
                          <button type="button" className="password-toggle" onClick={() => setShowNewPassword((v) => !v)}>
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </Field>
                      <Field label="Confirm New Password">
                        <div className="password-input-wrap">
                          <input type={showConfirmPassword ? "text" : "password"} value={passwordForm.confirm} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))} />
                          <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((v) => !v)}>
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </Field>
                      <div className="form-actions">
                        <button className="primary-button" onClick={handleChangePassword} disabled={passwordSaving}>
                          {passwordSaving ? "Changing..." : "Change Password"}
                        </button>
                      </div>
                      {passwordMessage && (
                        <div className={`settings-message ${passwordMessageType === "error" ? "error" : "success"}`}>
                          {passwordMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>
            )}
        </section>
      </main>

      {serviceModal ? (
        <ModalSurface title={serviceModal.mode === "add" ? "Add service item" : serviceModal.mode === "view" ? `${serviceModal.category} details` : `Edit ${serviceModal.category}`} onClose={closeServiceModal}>
          {serviceModal.mode === "view" ? (
            <div className="modal-grid"> 
              {serviceModal.rows.map((row) => (
                <div key={row.id} className="modal-detail-card">
                  <div className="modal-image-wrap">
                    <img src={row.imageUrl || serviceReferenceImages[(Number(row.id) || 1) % serviceReferenceImages.length]} alt={row.name} />
                  </div>
                  <div className="modal-detail-body">
                    <strong>{row.name}</strong>
                    <span>{row.category}</span>
                    <p>{row.details}</p>
                    <div className="modal-detail-metrics">
                      <div><span>Price</span><strong>{row.price}</strong></div>
                      <div><span>Status</span><strong>{row.status || "Active"}</strong></div>
                      <div><span>Technology</span><strong>{row.technology || row.tools || row.category}</strong></div>
                      <div><span>Updated</span><strong>{row.updatedAt || "2026-08-01"}</strong></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="modal-grid">
              {serviceModal.mode === "add" ? (
                <div className="modal-detail-card single-edit">
                  <div className="modal-image-wrap">
                    <label className="upload-trigger" htmlFor={`service-modal-image-${serviceModal.row.id}`}>
                      <img src={getDisplayImage(serviceModal.row.imageUrl, serviceReferenceImages[0], serviceModal.row._previewImage)} alt={serviceModal.row.name || "New service"} />
                      <input
                        id={`service-modal-image-${serviceModal.row.id}`}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                          handleServiceModalImageSelect(event.target.files?.[0] || null);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div className="modal-detail-body">
                    <label className="field">
                      <span>Category</span>
                      <input value={serviceModal.row.category} onChange={(event) => setServiceModal((current) => ({ ...current, row: { ...current.row, category: event.target.value } }))} />
                    </label>
                    <label className="field">
                      <span>Service name</span>
                      <input value={serviceModal.row.name} onChange={(event) => setServiceModal((current) => ({ ...current, row: { ...current.row, name: event.target.value } }))} />
                    </label>
                    <label className="field">
                      <span>Details</span>
                      <textarea value={serviceModal.row.details} onChange={(event) => setServiceModal((current) => ({ ...current, row: { ...current.row, details: event.target.value } }))} />
                    </label>
                    <label className="field">
                      <span>Pricing</span>
                      <input value={serviceModal.row.price} onChange={(event) => setServiceModal((current) => ({ ...current, row: { ...current.row, price: event.target.value } }))} />
                    </label>
                    <label className="field">
                      <span>Technology</span>
                      <input value={serviceModal.row.technology} onChange={(event) => setServiceModal((current) => ({ ...current, row: { ...current.row, technology: event.target.value } }))} />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <input value={serviceModal.row.status} onChange={(event) => setServiceModal((current) => ({ ...current, row: { ...current.row, status: event.target.value } }))} />
                    </label>
                      <label className="field">
                        <span>Image URL / data URL</span>
                      <input value={serviceModal.row.imageUrl || ""} onChange={(event) => setServiceModal((current) => ({ ...current, row: { ...current.row, imageUrl: event.target.value, _pendingImageFile: null, _previewImage: sanitizeImageReference(event.target.value) } }))} />
                      </label>
                  </div>
                </div>
              ) : (
                serviceModal.rows.map((row) => (
                  <div key={row.id} className="modal-detail-card single-edit">
                    <div className="modal-image-wrap">
                      <label className="upload-trigger" htmlFor={`service-modal-edit-${row.id}`}>
                        <img src={getDisplayImage(row.imageUrl, serviceReferenceImages[(Number(row.id) || 1) % serviceReferenceImages.length], row._previewImage)} alt={row.name} />
                        <input
                          id={`service-modal-edit-${row.id}`}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(event) => {
                            handleServiceModalImageSelect(event.target.files?.[0] || null, row.id);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <div className="modal-detail-body">
                      <label className="field">
                        <span>Category</span>
                        <input value={row.category} onChange={(event) => setServiceModal((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, category: event.target.value } : item) }))} />
                      </label>
                      <label className="field">
                        <span>Service name</span>
                        <input value={row.name} onChange={(event) => setServiceModal((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, name: event.target.value } : item) }))} />
                      </label>
                      <label className="field">
                        <span>Details</span>
                        <textarea value={row.details} onChange={(event) => setServiceModal((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, details: event.target.value } : item) }))} />
                      </label>
                      <label className="field">
                        <span>Price</span>
                        <input value={row.price} onChange={(event) => setServiceModal((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, price: event.target.value } : item) }))} />
                      </label>
                      <label className="field">
                        <span>Technology</span>
                        <input value={row.technology || row.tools || ""} onChange={(event) => setServiceModal((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, technology: event.target.value } : item) }))} />
                      </label>
                      <label className="field">
                        <span>Status</span>
                        <input value={row.status || "Active"} onChange={(event) => setServiceModal((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, status: event.target.value } : item) }))} />
                      </label>
                      <label className="field">
                        <span>Image URL / data URL</span>
                        <input value={row.imageUrl || ""} onChange={(event) => setServiceModal((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, imageUrl: event.target.value, _pendingImageFile: null, _previewImage: sanitizeImageReference(event.target.value) } : item) }))} />
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <div className="modal-actions">
            {serviceModal.mode !== "view" ? (
              <button type="button" className="primary-button" onClick={saveServiceModal} disabled={serviceModalUploading}>
                {serviceModalUploading ? "Saving..." : "Save"}
              </button>
            ) : null}
            <button type="button" className="ghost-button compact" onClick={closeServiceModal}>Close</button>
          </div>
        </ModalSurface>
      ) : null}

      {taskSubmissionModal ? (
        <ModalSurface title="Check assignment" onClose={() => setTaskSubmissionModal(null)}>
          <div className="modal-detail-card single-edit assignment-review-card">
            <div className="course-title-row"><div><strong>{taskSubmissionModal.studentName}</strong><span>{taskSubmissionModal.courseTitle} · {taskSubmissionModal.section} · {taskSubmissionModal.lessonTitle}</span></div><span className={badgeClass(hasTaskGrade(taskSubmissionModal.grade) ? "approved" : "pending")}>{hasTaskGrade(taskSubmissionModal.grade) ? `Graded · ${taskSubmissionModal.grade}/100` : "Needs review"}</span></div>
            <div className="course-actions assignment-review-files">
              {taskSubmissionModal.taskPdfUrl ? <a className="ghost-button compact" href={taskSubmissionModal.taskPdfUrl} target="_blank" rel="noreferrer">Open task PDF</a> : null}
              {taskSubmissionModal.taskStudentPdfUpload ? <a className="ghost-button compact" href={taskSubmissionModal.taskStudentPdfUpload} target="_blank" rel="noreferrer">Open student PDF</a> : <span className="course-library-empty-detail">Student has not uploaded a PDF yet.</span>}
            </div>
            <div className="course-builder-grid assignment-review-fields">
              <label className="course-builder-field"><span>Marks / grade (0-100)</span><input type="number" min="0" max="100" value={taskGradeForm.grade} onChange={(event) => setTaskGradeForm((current) => ({ ...current, grade: event.target.value }))} /></label>
              <label className="course-builder-field full"><span>Feedback and improvement points</span><textarea rows="5" value={taskGradeForm.feedback} onChange={(event) => setTaskGradeForm((current) => ({ ...current, feedback: event.target.value }))} placeholder="Tell the student what was done well and what to improve." /></label>
            </div>
          </div>
          <div className="modal-actions"><button type="button" className="primary-button" disabled={taskGradeSaving || !taskGradeForm.grade} onClick={async () => { setTaskGradeSaving(true); try { await gradeStudentTask(taskSubmissionModal.courseId, taskSubmissionModal.lessonId, taskSubmissionModal.taskId, { studentId: taskSubmissionModal.studentId, grade: taskGradeForm.grade, feedback: taskGradeForm.feedback, assignmentTitle: taskSubmissionModal.taskTitle }); setTaskSubmissions((current) => current.map((row) => row.id === taskSubmissionModal.id ? { ...row, grade: Number(taskGradeForm.grade), feedback: taskGradeForm.feedback, updatedAt: new Date().toISOString() } : row)); setTaskSubmissionModal(null); notify("Assignment graded and student notified."); } catch (err) { notify(err?.message || "Could not save grade."); } finally { setTaskGradeSaving(false); } }}>{taskGradeSaving ? "Saving..." : "Save grade"}</button><button type="button" className="ghost-button compact" onClick={() => setTaskSubmissionModal(null)}>Cancel</button></div>
        </ModalSurface>
      ) : null}

      {trainingModal?.mode === "view" ? (
        <CourseViewSurface
          course={trainingModal.item}
          onClose={closeTrainingModal}
          onEdit={() => openTrainingModal("edit", trainingModal.item)}
          onEditLesson={(lesson) => openTrainingModal("edit", trainingModal.item, lesson)}
          onDeleteCourse={() => deleteTraining(trainingModal.item)}
          onDeleteLesson={(lesson) => removeLessonFromCourse(trainingModal.item, lesson)}
        />
      ) : trainingModal && ["add", "edit"].includes(trainingModal.mode) ? (
        <>
          <CourseBuilderStyles />
          <div className="cb-page">
            <div className="cb-modehead">
              <div className="cb-modetabs">
                <button type="button" className={courseBuilderMode === "manual" ? "active" : ""} onClick={() => setCourseBuilderMode("manual")}>
                  <Layers size={15} /> Build manually
                </button>
                <button type="button" className={courseBuilderMode === "upload" ? "active" : ""} onClick={() => setCourseBuilderMode("upload")}>
                  <FolderUp size={15} /> Upload course folder
                </button>
              </div>
              <button type="button" className="cb-cancel" onClick={closeTrainingModal}>Cancel</button>
            </div>

            {courseBuilderMode === "upload" ? (
              <CourseFolderUploadPanel
                folderUploadState={folderUploadState}
                onUpload={handleCourseFolderUpload}
                onReview={() => setCourseBuilderMode("manual")}
              />
            ) : null}

            {courseBuilderMode === "manual" ? <>
            <div className="cb-card">
              <div className="cb-card-head">
                <h3>Course details</h3>
                <p>The basics students see before they enroll.</p>
              </div>
              <div className="cb-grid">
                <label className="cb-field"><span>Title *</span><input value={trainingModal.item.name || ""} placeholder="Full Stack Development" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, name: event.target.value } }))} /></label>
                <label className="cb-field"><span>Duration (months) *</span><select value={String(trainingModal.item.duration || "").replace(/\s*months?\s*/i, "")} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, duration: `${event.target.value} months` } }))}>{Array.from({ length: 10 }, (_, index) => index + 1).map((months) => <option key={months} value={months}>{months} {months === 1 ? "month" : "months"}</option>)}</select></label>
                <label className="cb-field"><span>Fees (₹) *</span><input inputMode="numeric" pattern="[0-9]*" value={String(trainingModal.item.price || "").replace(/[^0-9]/g, "")} placeholder="25000" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, price: event.target.value.replace(/[^0-9]/g, "") } }))} /></label>
                <label className="cb-field"><span>Mode *</span>
                  <select value={trainingModal.item.mode || "Hybrid"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, mode: event.target.value } }))}>
                    <option>Online</option><option>Offline</option><option>Hybrid</option>
                  </select>
                </label>
                <label className="cb-field full"><span>Tools / technologies *</span><input value={trainingModal.item.tools || ""} placeholder="React, Node.js, MongoDB" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, tools: event.target.value } }))} /></label>
                <div className="cb-field">
                  <span>Thumbnail</span>
                  <CbFileButton
                    label={trainingModal.item.imageUrl ? "Change thumbnail" : "Upload thumbnail"}
                    accept="image/*"
                    fileName={trainingModal.item.thumbnailName || trainingModal.item._pendingImageFile?.name || (trainingModal.item.imageUrl ? "Thumbnail uploaded" : "")}
                    onSelect={(file) => handleTrainingModalImageSelect(file)}
                  />
                  {(trainingModal.item._previewImage || trainingModal.item.imageUrl) ? (
                    <div className="cb-thumbnail-preview">
                      <img src={trainingModal.item._previewImage || trainingModal.item.imageUrl} alt={trainingModal.item.thumbnailName || "Course thumbnail preview"} />
                      <span>{trainingModal.item.thumbnailName || "Uploaded thumbnail"}</span>
                    </div>
                  ) : null}
                </div>
                <label className="cb-field full"><span>Syllabus *</span><textarea rows={3} value={trainingModal.item.syllabus || ""} placeholder="Modules, topics, and outcomes" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, syllabus: event.target.value } }))} /></label>
                <div className="cb-field full">
                  <span>Assign students</span>
                  {studentUsers.length === 0 ? (
                    <p className="cb-muted">No student users found.</p>
                  ) : (
                    <div className="cb-students">
                      {studentUsers.map((student) => {
                        const studentId = String(student.id || student._id || "");
                        const selected = (trainingModal.item.studentIds || []).map(String).includes(studentId);
                        return (
                          <label key={studentId} className={`cb-student ${selected ? "selected" : ""}`}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => setTrainingModal((current) => {
                                const currentIds = (current.item.studentIds || []).map(String);
                                const nextIds = currentIds.includes(studentId) ? currentIds.filter((id) => id !== studentId) : [...currentIds, studentId];
                                return { ...current, item: { ...current.item, studentIds: nextIds } };
                              })}
                            />
                            <span>
                              <strong>{student.name || student.username}</strong>
                              <small>{student.username || student.email || "Student"}</small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <small className="cb-count">{(trainingModal.item.studentIds || []).length} student(s) selected</small>
                </div>
              </div>
            </div>

            <div className="cb-card">
              <div className="cb-card-head">
                <h3>Curriculum</h3>
                <p>Group lessons into sections. Each lesson can carry a video, notes, and any number of tasks.</p>
              </div>
              <div className="cb-sections">
                {(trainingModal.item.sections || []).map((section, sectionIndex) => (
                  <div className="cb-section" key={section.id}>
                    <div className="cb-section-head">
                      <button type="button" className="cb-section-toggle" onClick={() => toggleSectionOpen(section.id)}>
                        <ChevronDown size={16} className={openSectionIds.includes(section.id) ? "cb-chev open" : "cb-chev"} />
                        <span className="cb-section-index">Section {sectionIndex + 1}</span>
                      </button>
                      <input
                        className="cb-section-name"
                        value={section.name}
                        placeholder="e.g. HTML Basics"
                        onChange={(event) => renameCourseSection(section.id, event.target.value)}
                      />
                      <span className="cb-section-meta">{section.lessons.length} lesson{section.lessons.length === 1 ? "" : "s"}</span>
                      {(trainingModal.item.sections || []).length > 1 ? (
                        <button type="button" className="cb-iconbtn danger" title="Remove section" onClick={() => removeCourseSection(section.id)}><Trash2 size={15} /></button>
                      ) : null}
                    </div>

                    {openSectionIds.includes(section.id) ? (
                      <div className="cb-lessons">
                        {section.lessons.map((lesson, lessonIndex) => (
                          <div
                            className={`cb-lesson ${String(lesson.id) === focusedLessonId ? "focused" : ""}`}
                            data-lesson-id={lesson.id}
                            key={lesson.id}
                            onPointerDown={() => setFocusedLessonId(String(lesson.id))}
                            onFocusCapture={() => setFocusedLessonId(String(lesson.id))}
                          >
                            <div className="cb-lesson-head">
                              <span className="cb-lesson-index">Lesson {lessonIndex + 1}</span>
                              <input
                                className="cb-lesson-title"
                                data-lesson-title
                                value={lesson.title}
                                placeholder="Lesson title, e.g. Intro to HTML"
                                onChange={(event) => patchLesson(section.id, lesson.id, { title: event.target.value })}
                              />
                              {section.lessons.length > 1 ? (
                                <button type="button" className="cb-iconbtn danger" title="Remove lesson" onClick={() => removeLessonFromSection(section.id, lesson.id)}><Trash2 size={14} /></button>
                              ) : null}
                            </div>

                            <div className="cb-lesson-body">
                              <div className="cb-assetrow">
                                <CbFileButton
                                  icon={<Video size={14} />}
                                  label={lesson.videoFileName || "Add video (optional)"}
                                  accept="video/*"
                                  busy={trainingAssetUploading === `${lesson.id}:videoUrl`}
                                  onSelect={(file) => handleLessonFileUpload(section.id, lesson.id, "videoUrl", "videoFileName", file)}
                                />
                                <label className="cb-inline-number">
                                  <span>Length (HH:MM:SS)</span>
                                  <input value={lesson.durationTime || "00:00:00"} readOnly />
                                </label>
                                <CbFileButton
                                  icon={<FileText size={14} />}
                                  label={lesson.notesFileName || "Add notes PDF (optional)"}
                                  accept="application/pdf"
                                  busy={trainingAssetUploading === `${lesson.id}:notesUrl`}
                                  onSelect={(file) => handleLessonFileUpload(section.id, lesson.id, "notesUrl", "notesFileName", file)}
                                />
                              </div>

                              <div className="cb-tasks">
                                <div className="cb-tasks-head">
                                  <span>Tasks</span>
                                  <button type="button" className="cb-addtask" onClick={() => addTaskToLesson(section.id, lesson.id)}><Plus size={13} /> Add task</button>
                                </div>
                                {(lesson.tasks || []).length === 0 ? (
                                  <p className="cb-muted">No tasks yet — a lesson can have zero, one, or many.</p>
                                ) : (
                                  (lesson.tasks || []).map((task, taskIndex) => (
                                    <div className="cb-task" key={task.id}>
                                      <span className="cb-task-index">{taskIndex + 1}</span>
                                      <input
                                        className="cb-task-title"
                                        value={task.title}
                                        placeholder={`Task ${taskIndex + 1} title`}
                                        onChange={(event) => patchTask(section.id, lesson.id, task.id, { title: event.target.value })}
                                      />
                                      <input
                                        className="cb-task-time"
                                        type="number"
                                        min="1"
                                        value={task.timeLimit || ""}
                                        placeholder="min"
                                        onChange={(event) => patchTask(section.id, lesson.id, task.id, { timeLimit: event.target.value })}
                                      />
                                      <CbFileButton
                                        compact
                                        icon={<FileText size={13} />}
                                        label={task.fileName || "PDF"}
                                        accept="application/pdf"
                                        busy={trainingAssetUploading === `${task.id}:pdfUrl`}
                                        onSelect={(file) => handleTaskFileUpload(section.id, lesson.id, task.id, file)}
                                      />
                                      <button type="button" className="cb-iconbtn danger" title="Remove task" onClick={() => removeTaskFromLesson(section.id, lesson.id, task.id)}><Trash2 size={13} /></button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <button type="button" className="cb-addlesson" onClick={() => addLessonToSection(section.id)}><Plus size={14} /> Add lesson</button>
                      </div>
                    ) : null}
                  </div>
                ))}
                <button type="button" className="cb-addsection" onClick={addCourseSection}><Plus size={15} /> Add section</button>
              </div>
            </div>

            <div className="cb-footer">
              <span className="cb-footer-summary">
                {(trainingModal.item.sections || []).length} section(s) · {(trainingModal.item.sections || []).reduce((sum, s) => sum + s.lessons.filter((l) => String(l.title || "").trim()).length, 0)} lesson(s)
              </span>
              <button type="button" className="cb-save" onClick={saveCourseBuilder} disabled={trainingModalUploading || Boolean(trainingAssetUploading)}>
                {trainingModalUploading ? "Saving course..." : trainingModal.mode === "edit" ? "Update course" : "Save course"}
              </button>
            </div>
            </> : null}
          </div>
        </>
      ) : trainingModal ? (
        <ModalSurface showClose={!['add', 'edit', 'lesson', 'edit-lesson'].includes(trainingModal.mode)} className={`course-builder-modal ${['add', 'edit', 'lesson', 'edit-lesson'].includes(trainingModal.mode) ? "course-builder-page" : ""}`} title={trainingModal.mode === "add" ? "Add course" : trainingModal.mode === "lesson" ? "Add lesson" : trainingModal.mode === "edit-lesson" ? "Edit lesson" : trainingModal.mode === "view" ? "Course details" : "Edit course"} onClose={closeTrainingModal}>
          <div className="course-builder-steps">
            {(trainingModal.mode === "edit" ? ["Course"] : ["Course", "Lesson Video", "Notes PDF", "Task PDF"]).map((label, index) => (
              <button key={label} type="button" className={trainingModal.step === index + 1 ? "active" : trainingModal.step > index + 1 ? "done" : ""} onClick={() => trainingModal.mode === "view" ? setTrainingModal((current) => ({ ...current, step: index + 1 })) : null}>
                {index + 1} {label}
              </button>
            ))}
          </div>
          <div className="course-builder-panel">
            {trainingModal.step === 1 ? (
              <>
                <div className="course-builder-panel-title">Course information</div>
                <div className="course-builder-grid">
                  <div className="course-builder-field"><label>Title *</label><input value={trainingModal.item.name || ""} readOnly={trainingModal.mode === "view"} placeholder="Frontend Design" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, name: event.target.value } }))} /></div>
                  <div className="course-builder-field"><label>Duration (months) *</label><select value={String(trainingModal.item.duration || "").replace(/\s*months?\s*/i, "")} disabled={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, duration: `${event.target.value} months` } }))}>{Array.from({ length: 10 }, (_, index) => index + 1).map((months) => <option key={months} value={months}>{months} {months === 1 ? "month" : "months"}</option>)}</select></div>
                  <div className="course-builder-field"><label>Fees (₹) *</label><input inputMode="numeric" pattern="[0-9]*" value={String(trainingModal.item.price || "").replace(/[^0-9]/g, "")} readOnly={trainingModal.mode === "view"} placeholder="25000" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, price: event.target.value.replace(/[^0-9]/g, "") } }))} /></div>
                  <div className="course-builder-field"><label>Mode *</label><select value={trainingModal.item.mode || "Online"} disabled={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, mode: event.target.value } }))}><option>Online</option><option>Offline</option><option>Hybrid</option></select></div>
                  <div className="course-builder-field full"><label>Tools / Technologies *</label><input value={trainingModal.item.tools || ""} readOnly={trainingModal.mode === "view"} placeholder="React, Node.js, MongoDB" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, tools: event.target.value } }))} /></div>
                  <div className="course-builder-field full"><label>Syllabus *</label><textarea value={trainingModal.item.syllabus || ""} readOnly={trainingModal.mode === "view"} placeholder="Modules, topics, and outcomes" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, syllabus: event.target.value } }))} /></div>
                  <div className="course-builder-field full">
                    <label>Assign students</label>
                    {studentUsers.length === 0 ? (
                      <small className="course-builder-empty-students">No student users found.</small>
                    ) : (
                      <div className="course-student-picker">
                        {studentUsers.map((student) => {
                          const studentId = String(student.id || student._id || "");
                          const selected = (trainingModal.item.studentIds || []).map(String).includes(studentId);
                          return (
                            <label key={studentId} className={`course-student-option ${selected ? "selected" : ""}`}>
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={trainingModal.mode === "view"}
                                onChange={() => setTrainingModal((current) => {
                                  const currentIds = (current.item.studentIds || []).map(String);
                                  const nextIds = currentIds.includes(studentId)
                                    ? currentIds.filter((id) => id !== studentId)
                                    : [...currentIds, studentId];
                                  return { ...current, item: { ...current.item, studentIds: nextIds } };
                                })}
                              />
                              <span>
                                <strong>{student.name || student.username}</strong>
                                <small>{student.username || student.email || "Student"}</small>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <small>{(trainingModal.item.studentIds || []).length} student(s) selected</small>
                  </div>
                </div>
              </>
            ) : null}
            {trainingModal.step === 2 ? (
              <>
                <div className="course-builder-panel-title">{trainingModal.mode === "edit-lesson" ? "Edit" : "Add"} {trainingModal.item.section || "General"} lesson {currentLessonNumber}</div>
                <div className="course-builder-grid">
                  <div className="course-builder-field">
                    <label>Section *</label>
                    <select
                      value={lessonSectionOptions.includes(trainingModal.item.section) ? trainingModal.item.section : "__new__"}
                      disabled={trainingModal.mode === "view"}
                      onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, section: event.target.value === "__new__" ? "" : event.target.value } }))}
                    >
                      {lessonSectionOptions.map((section) => <option key={section} value={section}>{section}</option>)}
                      <option value="__new__">New section...</option>
                    </select>
                    {!lessonSectionOptions.includes(trainingModal.item.section) ? <input value={trainingModal.item.section || ""} readOnly={trainingModal.mode === "view"} placeholder="Enter new section name" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, section: event.target.value } }))} /> : null}
                  </div>
                  <div className="course-builder-field"><label>Lesson title *</label><input value={trainingModal.item.lessonTitle || ""} readOnly={trainingModal.mode === "view"} placeholder="Intro to HTML" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, lessonTitle: event.target.value } }))} /></div>
                  <div className="course-builder-field"><label>Video duration (HH:MM:SS) *</label><input value={trainingModal.item.durationTime || ""} readOnly /></div>
                  <div className="course-builder-field full"><label>Video file *</label><input className="course-asset-input" type="file" accept="video/*" disabled={trainingModal.mode === "view"} onChange={(event) => { handleCourseAssetSelect(event.target.files?.[0], "videoUrl", "videoFileName"); }} /><small>{trainingAssetUploading === "videoUrl" ? "Uploading video..." : trainingModal.item.videoFileName || (trainingModal.item.videoUrl ? "Video uploaded." : "Choose a video file")}</small></div>
                </div>
              </>
            ) : null}
            {trainingModal.step === 3 ? (
              <>
                <div className="course-builder-panel-title">Add lesson notes</div>
                <div className="course-builder-grid">
                  <div className="course-builder-field full"><label>Notes PDF *</label><input className="course-asset-input" type="file" accept="application/pdf" disabled={trainingModal.mode === "view"} onChange={(event) => { handleCourseAssetSelect(event.target.files?.[0], "notesUrl", "notesFileName"); }} /><small>{trainingAssetUploading === "notesUrl" ? "Uploading notes..." : trainingModal.item.notesFileName || (trainingModal.item.notesUrl ? "Notes uploaded." : "Choose a PDF file")}</small></div>
                </div>
              </>
            ) : null}
            {trainingModal.step === 4 ? (
              <>
                <div className="course-builder-panel-title">Add assignment</div>
                <div className="course-builder-grid">
                  <div className="course-builder-field"><label>Assignment title *</label><input value={trainingModal.item.assignmentTitle || ""} readOnly={trainingModal.mode === "view"} placeholder="Build a landing page" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, assignmentTitle: event.target.value } }))} /></div>
                  <div className="course-builder-field"><label>Time (minutes) *</label><input type="number" min="1" value={trainingModal.item.assignmentTime || ""} readOnly={trainingModal.mode === "view"} placeholder="60" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, assignmentTime: event.target.value } }))} /></div>
                  <div className="course-builder-field full"><label>Description</label><input value={trainingModal.item.assignment || ""} readOnly={trainingModal.mode === "view"} placeholder="Assignment instructions" onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, assignment: event.target.value } }))} /></div>
                  <div className="course-builder-field full"><label>Task PDF *</label><input className="course-asset-input" type="file" accept="application/pdf" disabled={trainingModal.mode === "view"} onChange={(event) => { handleCourseAssetSelect(event.target.files?.[0], "assignmentUrl", "assignmentFileName"); }} /><small>{trainingAssetUploading === "assignmentUrl" ? "Uploading assignment..." : trainingModal.item.assignmentFileName || (trainingModal.item.assignmentUrl ? "Assignment uploaded." : "Choose a PDF file")}</small></div>
                </div>
              </>
            ) : null}
          </div>
          <div className="modal-actions">
            {trainingModal.mode !== "edit" && trainingModal.step > 1 ? <button type="button" className="ghost-button compact" onClick={() => setTrainingModal((current) => ({ ...current, step: current.step - 1 }))}>Back</button> : null}
            {trainingModal.mode !== "view" ? (
              trainingModal.mode === "edit" ? (
                <button type="button" className="primary-button" onClick={() => saveTrainingModal(false)} disabled={trainingModalUploading || Boolean(trainingAssetUploading)}>{trainingModalUploading ? "Updating..." : "Update course"}</button>
              ) : trainingModal.step === 4 && trainingModal.mode === "lesson" ? (
                <button type="button" className="primary-button" onClick={() => saveTrainingModal(false)} disabled={trainingModalUploading || Boolean(trainingAssetUploading)}>{trainingModalUploading ? "Saving..." : "Update lesson"}</button>
              ) : (
                <button type="button" className="primary-button" onClick={advanceTrainingStep} disabled={trainingModalUploading || Boolean(trainingAssetUploading)}>{trainingModal.step === 4 ? (trainingModalUploading ? "Saving..." : trainingModal.mode === "edit" ? "Update course" : "Save course") : "Next"}</button>
              )
            ) : null}
            {!['add', 'edit', 'lesson', 'edit-lesson'].includes(trainingModal.mode) ? <button type="button" className="ghost-button compact" onClick={closeTrainingModal}>Close</button> : null}
          </div>
        </ModalSurface>
      ) : null}

      {stipModal ? (
        <ModalSurface title={stipModal.mode === "add" ? "Add internship" : stipModal.mode === "view" ? "Internship details" : "Edit internship"} onClose={closeStipModal}>
          <div className="modal-grid">
            <div className="modal-detail-card single-edit">
              <div className="modal-image-wrap">
                <label className="upload-trigger" htmlFor={`stip-modal-image-${stipModal.item.id}`}>
                  <img src={getDisplayImage(stipModal.item.imageUrl, stipReferenceImages[(Number(stipModal.item.id) || 1) % stipReferenceImages.length], stipModal.item._previewImage)} alt={stipModal.item.track} />
                  <input
                    id={`stip-modal-image-${stipModal.item.id}`}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      handleStipModalImageSelect(event.target.files?.[0] || null);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="modal-detail-body">
                <label className="field"><span>Technology</span><input value={stipModal.item.track || ""} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, track: event.target.value } }))} /></label>
                <label className="field"><span>Duration</span><input value={stipModal.item.duration || ""} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, duration: event.target.value } }))} /></label>
                <label className="field"><span>Focus</span><textarea value={stipModal.item.focus || ""} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, focus: event.target.value } }))} /></label>
                <label className="field"><span>Outcome</span><textarea value={stipModal.item.outcome || ""} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, outcome: event.target.value } }))} /></label>
                <label className="field"><span>Stipend</span><input value={stipModal.item.fee || ""} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, fee: event.target.value } }))} /></label>
                <label className="field"><span>Mentor</span><input value={stipModal.item.mentor || ""} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, mentor: event.target.value } }))} /></label>
                <label className="field"><span>Eligibility</span><input value={stipModal.item.eligibility || "Graduate / internship-ready"} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, eligibility: event.target.value } }))} /></label>
                <label className="field"><span>Seats</span><input value={stipModal.item.seats || ""} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, seats: event.target.value } }))} /></label>
                <label className="field"><span>Deadline</span><input value={stipModal.item.deadline || ""} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, deadline: event.target.value } }))} /></label>
                <label className="field"><span>Status</span><input value={stipModal.item.applicationStatus || "Open"} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, applicationStatus: event.target.value } }))} /></label>
                <label className="field"><span>Image URL / data URL</span><input value={stipModal.item.imageUrl || ""} readOnly={stipModal.mode === "view"} onChange={(event) => setStipModal((current) => ({ ...current, item: { ...current.item, imageUrl: event.target.value, _pendingImageFile: null, _previewImage: sanitizeImageReference(event.target.value) } }))} /></label>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            {stipModal.mode !== "view" ? (
              <button type="button" className="primary-button" onClick={saveStipModal} disabled={stipModalUploading}>
                {stipModalUploading ? "Saving..." : "Save"}
              </button>
            ) : null}
            <button type="button" className="ghost-button compact" onClick={closeStipModal}>Close</button>
          </div>
        </ModalSurface>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function MarketingNav({ onOpenAuth }) {
  return (
    <header className="marketing-nav">
      <div className="marketing-brand">
        <LogoBadge />
        <div>
          <strong>System Technologies</strong>
          <span>CRM Management Platform</span>
        </div>
      </div>
      <div className="marketing-actions">
        <button className="ghost-button marketing" onClick={() => onOpenAuth("login")}>
          Member Login
        </button>
        <button className="primary-button" onClick={() => onOpenAuth("signup")}>
          Create Account
        </button>
      </div>
    </header>
  );
}

function LogoBadge({ compact = false }) {
  return (
    <div className={`logo-badge ${compact ? "compact" : ""}`}>
      <span>S</span>
      <i />
      <span>T</span>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProofCard({ icon: Icon, title, text }) {
  return (
    <article className="proof-card">
      <span className="proof-icon">
        <Icon size={18} />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function ShowcaseCard({ icon: Icon, title, text }) {
  return (
    <article className="showcase-card">
      <span className="showcase-icon">
        <Icon size={18} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function SignalCard({ icon: Icon, tone, title, value, detail }) {
  return (
    <div className="signal-card">
      <span className={`signal-icon ${tone}`}>
        <Icon size={16} />
      </span>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function CrmUploadDataPage({ rows, setRows, users, isAdmin, onCallLeadEdit, onSaveCall, onDeleteCall }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [listType, setListType] = useState("services");
  const [uploading, setUploading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [listTypeFilter, setListTypeFilter] = useState("All");
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [callStatusFilter, setCallStatusFilter] = useState("All");
  const [programFilter, setProgramFilter] = useState("All");
  const [interestFilter, setInterestFilter] = useState("All");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [formatOpen, setFormatOpen] = useState(false);
  const assignableUsers = users.filter((user) => {
    const role = String(user?.role || "").trim().toLowerCase();
    const department = String(user?.dept || user?.department || "").trim().toLowerCase();
    const position = String(user?.position || "").trim().toLowerCase();
    const status = String(user?.status || "Active").trim().toLowerCase();
    return status === "active" && (role === "admin" || role.includes("crm") || department.includes("crm") || position.includes("crm"));
  });

  const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSelectedFile(file);
    setUploadError("");
    setUploadSuccess("");
  };

  const handleUpload = async () => {
    setUploadSuccess("");
    setUploadError("");
    if (!selectedEmployee) {
      setUploadError("Please select an employee.");
      return;
    }
    if (!selectedFile) {
      setUploadError("Please choose an Excel or CSV file.");
      return;
    }
    try {
      setUploading(true);
      const workbook = XLSX.read(await selectedFile.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sourceRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      if (!sourceRows.length) throw new Error("The selected file does not contain any rows.");

      const headers = Object.keys(sourceRows[0]);
      const nameHeader = headers.find((header) => normalizeHeader(header) === "name");
      const numberHeader = headers.find((header) => ["number", "contact", "phone", "mobile", "phonenumber"].includes(normalizeHeader(header)));
      if (!nameHeader || !numberHeader) throw new Error("The Excel file must contain name and number fields.");

      const importedRows = sourceRows
        .map((row) => ({
          name: String(row[nameHeader] || "").trim(),
          contact: String(row[numberHeader] || "").trim(),
        }))
        .filter((row) => {
          const digits = row.contact.replace(/\D/g, "");
          const normalized = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
          return row.name && /^[6-9]\d{9}$/.test(normalized);
        });

      if (!importedRows.length) throw new Error("No usable name and number rows were found.");
      const employee = users.find((user) => String(user.id || user._id) === String(selectedEmployee));
      const result = await uploadCallListData({ listType, assignedTo: selectedEmployee, assignedToName: employee?.name || employee?.username || "", rows: importedRows });
      setRows((currentRows) => mergeCallListRows(result.rows, currentRows));
      const created = result.created ?? result.rows.length;
      const duplicateMessage = result.duplicates?.length
        ? ` Skipped ${result.duplicates.length} duplicate contact(s).`
        : "";
      setUploadSuccess((created > 0
        ? `Data uploaded successfully. ${created} contact(s) uploaded.`
        : "No new contacts uploaded.") + duplicateMessage);
      setSelectedFile(null);
      setSelectedEmployee("");
      setUploadError("");
    } catch (error) {
      setUploadError(error.message || "Unable to read this Excel file.");
    } finally { setUploading(false); }
  };

  const filteredRows = rows.filter((row) => matchesCallListFilters(row, {
    search: searchQuery, program: programFilter, callStatus: callStatusFilter,
    interest: interestFilter, employee: employeeFilter, listType: listTypeFilter,
  })).filter((row) => {
    const date = String(row.createdAt || row.date || "").slice(0, 10);
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  });
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [searchQuery, programFilter, callStatusFilter, interestFilter, employeeFilter, listTypeFilter, fromDate, toDate]);
  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);
  const showListType = listTypeFilter === "All";
  const directoryTitle = listTypeFilter === "services"
    ? "Daily Service Contacts / Call List"
    : listTypeFilter === "training"
      ? "Daily Training Contacts / Call List"
      : "All Contacts / Call List";
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedIds.includes(row.id));
  const serialByRow = new Map();
  const serialCounts = new Map();
  filteredRows.forEach((row) => {
    const listKey = listTypeFilter === "All" ? "all" : (row.listType || "list");
    const serial = (serialCounts.get(listKey) || 0) + 1;
    serialCounts.set(listKey, serial);
    serialByRow.set(row, serial);
  });

  const updateRow = (id, patch) => {
    const currentRow = rows.find((item) => item.id === id);
    if (!currentRow || Object.entries(patch).every(([key, value]) => String(currentRow[key] ?? "") === String(value ?? ""))) return;
    if (patch.callStatus === "Completed" && !normalizeCallProgram(currentRow?.program)) {
      setUploadError(`Please select a ${currentRow?.listType === "training" ? "program" : "service"} before marking this contact Completed.`);
      return;
    }
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    const row = currentRow;
    if (row?.listType) Promise.resolve(onSaveCall ? onSaveCall(row, patch) : saveCallListData(row.listType, id, patch, row.assignedTo))
      .then((saved) => {
        setRows((currentRows) => currentRows.map((item) => item.id === saved.id ? saved : item));

      })
      .catch((error) => setUploadError(error.message));
  };

  const stageRow = (id, patch) => {
    setRows((currentRows) => currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const editRow = (row) => {
    const name = window.prompt("Name", row.name);
    if (name === null) return;
    const number = window.prompt("Contact number", row.contact || row.number || "");
    if (number === null) return;
    updateRow(row.id, { name: name.trim(), contact: number.trim() });
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`Delete ${row.name || "this contact"}?`)) return;
    try { if (row.listType) await removeCallListData(row.listType, row.id, row.assignedTo); } catch (error) { setUploadError(error.message); return; }
    setRows((currentRows) => currentRows.filter((item) => item.id !== row.id));
    setSelectedIds((currentIds) => currentIds.filter((id) => id !== row.id));
  };

  const toggleSelected = (id) => {
    setSelectedIds((currentIds) => currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds((currentIds) => {
      if (allVisibleSelected) return currentIds.filter((id) => !visibleRows.some((row) => row.id === id));
      return [...new Set([...currentIds, ...visibleRows.map((row) => row.id)])];
    });
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected record${selectedIds.length === 1 ? "" : "s"}?`)) return;
    try {
      await Promise.all(rows.filter((row) => selectedIds.includes(row.id) && row.listType).map((row) => removeCallListData(row.listType, row.id, row.assignedTo)));
      setRows((currentRows) => currentRows.filter((row) => !selectedIds.includes(row.id)));
      setSelectedIds([]);
    } catch (error) { setUploadError(error.message || "Could not delete selected records."); }
  };

  const exportCallListPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16); pdf.text(directoryTitle, 14, 14);
    pdf.setFontSize(9); pdf.setTextColor(100); pdf.text(`${filteredRows.length} filtered contact(s)`, 14, 20);
    autoTable(pdf, {
      startY: 25,
      head: [["S. No.", "Date", "Name", "Contact", "Call Status", "Interest", "Service / Program", "Remark", "Assigned To"]],
      body: filteredRows.map((row, index) => [index + 1, formatAdminDate(row.createdAt || row.date), row.name || "-", row.contact || row.number || "-", normalizeCallStatus(row.callStatus), normalizeInterestStatus(row.interestStatus), normalizeCallProgram(row.program) || "-", row.remark || "-", row.assignedToName || users.find((user) => String(user.id || user._id) === String(row.assignedTo))?.name || "Unassigned"]),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [127, 78, 43] },
    });
    pdf.save(`call-list-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="crm-upload-page">
      <section className="panel">
        <div className="panel-head crm-upload-section-title">
          <div><span className="crm-upload-eyebrow">CALL LIST IMPORT</span><h3>Upload contacts</h3><p>Assign a service or training contact list to a CRM employee.</p></div>
          <button type="button" className="ghost-button crm-format-button" onClick={() => setFormatOpen(true)}>View file format</button>
        </div>
        <div className="crm-upload-form">
          <label className="field">
            <span>List type</span>
            <select value={listType} onChange={(event) => setListType(event.target.value)}>
              <option value="services">Service</option>
              <option value="training">Training</option>
            </select>
          </label>
          <label className="field">
            <span>Assign to employee</span>
            <select value={selectedEmployee} onChange={(event) => setSelectedEmployee(event.target.value)}>
              <option value="">Select Employee</option>
              {assignableUsers.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Excel or CSV file</span>
            <span className="crm-file-picker"><FileText size={18} /><span>{selectedFile?.name || "Choose .xlsx, .xls or .csv file"}</span><input type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={handleFileChange} /></span>
          </label>
          <button type="button" className="primary-button crm-upload-button" onClick={handleUpload} disabled={uploading}>
            <Upload size={17} /> {uploading ? "Uploading…" : "Upload list"}
          </button>
          {uploadError && <p className="field-error crm-upload-error">{uploadError}</p>}
          {uploadSuccess && <p className="crm-upload-success" role="status">{uploadSuccess}</p>}
        </div>
      </section>

      {formatOpen && (
        <div className="crm-format-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormatOpen(false); }}>
          <div className="crm-format-card" role="dialog" aria-modal="true" aria-labelledby="crm-format-title">
            <div className="crm-format-head">
              <div><span className="crm-upload-eyebrow">EXCEL / CSV FORMAT</span><h3 id="crm-format-title">Use only two columns</h3></div>
              <button type="button" className="icon-button" aria-label="Close file format" onClick={() => setFormatOpen(false)}><X size={18} /></button>
            </div>
            <p>Your first row must contain these exact headings. Every contact row needs both values.</p>
            <div className="crm-format-sheet" aria-label="File format example">
              <strong>Name</strong><strong>Number</strong>
              <span>Rohit Malhotra</span><span>9820011223</span>
            </div>
            <p className="crm-format-note">Date, call status, interest, source and all other fields are added automatically with default values.</p>
          </div>
        </div>
      )}

      <section className="panel crm-directory-panel">
        <div className="panel-head crm-directory-head">
          <div>
            <h3>{directoryTitle}</h3>
            <p>{showListType ? "Service and training contacts" : listTypeFilter === "services" ? "Daily contacts for services" : "Daily contacts for training programs"}</p>
          </div>
          <div className="crm-directory-head-actions">
            <button type="button" className="primary-button" onClick={exportCallListPdf} disabled={!filteredRows.length}><FileText size={15} /> Export PDF ({filteredRows.length})</button>
            {selectedIds.length > 0 && <button type="button" className="crm-upload-delete-selected" onClick={deleteSelected}><Trash2 size={15} /> Delete Selected ({selectedIds.length})</button>}
          </div>
        </div>
        <div className="crm-list-type-switch" aria-label="Choose call list">
          <button type="button" className={listTypeFilter === "services" ? "active" : ""} onClick={() => { setListTypeFilter((current) => current === "services" ? "All" : "services"); setProgramFilter("All"); }}>
            <span className="crm-list-type-icon"><PhoneCall size={19} /></span>
            <span><strong>Service Call List</strong><small>{rows.filter((row) => row.listType === "services").length} contacts</small></span>
          </button>
          <button type="button" className={listTypeFilter === "training" ? "active" : ""} onClick={() => { setListTypeFilter((current) => current === "training" ? "All" : "training"); setProgramFilter("All"); }}>
            <span className="crm-list-type-icon"><ContactRound size={19} /></span>
            <span><strong>Training Call List</strong><small>{rows.filter((row) => row.listType === "training").length} contacts</small></span>
          </button>
        </div>
        <div className="crm-directory-toolbar">
          <form className="crm-directory-search" onSubmit={(event) => { event.preventDefault(); setSearchQuery(searchDraft.trim()); }}>
            <label><Search size={16} /><input value={searchDraft} onChange={(event) => { setSearchDraft(event.target.value); setSearchQuery(event.target.value.trim()); }} placeholder="Search by name or contact number" /></label>
            <button type="submit">Search</button>
          </form>
          <select aria-label="Service or training program" value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}>
            <option value="All">{listTypeFilter === "training" ? "All Training Programs" : listTypeFilter === "services" ? "All Services" : "All Services / Programs"}</option>
            <option value="">Unspecified</option>
            {[...new Set([...callListPrograms(listTypeFilter), ...rows.filter((row) => listTypeFilter === "All" || row.listType === listTypeFilter).map((row) => normalizeCallProgram(row.program)).filter(Boolean)])].map((program) => <option key={program}>{program}</option>)}
          </select>
          <select aria-label="Call status" value={callStatusFilter} onChange={(event) => setCallStatusFilter(event.target.value)}>
            <option value="All">All Call Status</option>
            {CALL_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select aria-label="Interest status" value={interestFilter} onChange={(event) => setInterestFilter(event.target.value)}>
            <option value="All">All Interest</option>
            {CALL_LIST_INTEREST_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select aria-label="CRM employee" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
            <option value="All">All Employees</option>
            {users.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}
          </select>
        </div>
        <div className="crm-directory-date-row">
          <span>Lead creation date</span>
          <label className="table-date-filter"><span>From</span><input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label className="table-date-filter"><span>To</span><input aria-label="To date" type="date" min={fromDate} value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          <button type="button" className="crm-directory-reset" onClick={() => { setSearchDraft(""); setSearchQuery(""); setProgramFilter("All"); setListTypeFilter("All"); setCallStatusFilter("All"); setInterestFilter("All"); setEmployeeFilter("All"); setFromDate(""); setToDate(""); }}>Reset</button>
        </div>
        <div className="table-wrap crm-call-list-table-wrap">
          <table className="table crm-call-list-table">
            <thead>
              <tr>
                <th className="crm-upload-selection-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="Select all records" />
                </th>
                <th>Sr No</th>
                <th>Date</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Call / WhatsApp</th>
                <th>Call Status</th>
                <th>Interest Status</th>
                <th>{listTypeFilter === "training" ? "Program" : listTypeFilter === "services" ? "Service" : "Service / Program"}</th>
                <th>Remark</th>
                <th>Assigned To</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!visibleRows.length && (
                <tr><td colSpan={12} className="panel-empty">No call list records found.</td></tr>
              )}
              {visibleRows.map((row) => (
                <tr key={`${row.listType || "list"}:${row.id}`}>
                  <td className="crm-upload-selection-cell">
                    <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelected(row.id)} aria-label={`Select ${row.name || "record"}`} />
                  </td>
                  <td>{serialByRow.get(row)}</td>
                  <td>{formatAdminDate(row.createdAt)}</td>
                  <td><div className="crm-contact-name"><strong>{row.name || "-"}</strong></div></td>
                  <td>{row.contact || row.number || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className={`row-icon-btn call ${row.callClicked ? "contacted" : ""}`} title="Call" onClick={() => { updateRow(row.id, { callClicked: true }); window.location.href = `tel:${row.contact || row.number}`; }}><PhoneCall size={16} /></button>
                      <button type="button" className={`row-icon-btn whatsapp ${row.whatsappClicked ? "contacted" : ""}`} title="WhatsApp" onClick={() => { updateRow(row.id, { whatsappClicked: true }); window.open(`https://wa.me/91${String(row.contact || row.number || "").replace(/\D/g, "").slice(-10)}`, "_blank", "noopener,noreferrer"); }}><MessageCircle size={16} /></button>
                    </div>
                  </td>
                  <td>
                    <select className="inline-select" value={normalizeCallStatus(row.callStatus)} onChange={(event) => updateRow(row.id, { callStatus: event.target.value })}>
                      {CALL_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="inline-select" value={normalizeInterestStatus(row.interestStatus)} onChange={(event) => updateRow(row.id, { interestStatus: event.target.value })}>
                      {CALL_LIST_INTEREST_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="inline-select crm-program-select" value={normalizeCallProgram(row.program)} onChange={(event) => updateRow(row.id, { program: event.target.value })}>
                      <option value="">{row.listType === "training" ? "Select Program" : "Select Service"}</option>
                      {normalizeCallProgram(row.program) && !callListPrograms(row.listType).includes(normalizeCallProgram(row.program)) && <option value={normalizeCallProgram(row.program)}>{normalizeCallProgram(row.program)}</option>}
                      {callListPrograms(row.listType).map((program) => <option key={program}>{program}</option>)}
                    </select>
                  </td>
                  <td><RemarkField value={row.remark || ""} onChange={(value) => stageRow(row.id, { remark: value })} onCommit={(value) => updateRow(row.id, { remark: value })} label={`Remark for ${row.name || "contact"}`} /></td>
                  <td><select className="inline-select" aria-label={`Assign call list contact ${row.name || "record"}`} value={row.assignedTo || ""} onChange={(event) => updateRow(row.id, { assignedTo: event.target.value, assignedToName: assignableUsers.find((user) => String(user.id || user._id) === String(event.target.value))?.name || "" })}><option value="">Unassigned</option>{row.assignedTo && !assignableUsers.some((user) => String(user.id || user._id) === String(row.assignedTo)) && <option value={row.assignedTo}>{row.assignedToName || row.assignedTo}</option>}{assignableUsers.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}</select></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="row-icon-btn edit" title="Edit" onClick={() => editRow(row)}><Edit3 size={16} /></button>
                      <button type="button" className="row-icon-btn delete" title="Delete" onClick={() => deleteRow(row)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-leads-pagination">
          <span>Showing {filteredRows.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}</span>
          <div className="admin-leads-pagination-actions">
            <button type="button" className="ghost-button compact" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" className="ghost-button compact" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      </section>
      <CallLeadsPanel canDelete={isAdmin} rows={rows} users={users} onSave={onSaveCall} onDelete={onDeleteCall} onAdd={onCallLeadEdit} showSourceOwner={isAdmin} />
    </div>
  );
}

function formatAdminDate(value) {
  if (!value) return "-";
  const datePart = String(value).slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function CourseViewSurface({ course, onClose, onEdit, onEditLesson, onNextLesson, onDeleteCourse, onDeleteLesson }) {
  const lessons = Array.isArray(course?.lessons) ? course.lessons : [];
  const backendSectionNames = Array.isArray(course?.sections)
    ? course.sections
        .map((section) => String(section?.name || section || "").trim())
        .filter(Boolean)
    : [];
  const sectionNames = backendSectionNames.length
    ? backendSectionNames
    : [...new Set(lessons.map((lesson) => String(lesson.section || "General").trim() || "General"))];
  const lessonsBySection = sectionNames.reduce((groups, section) => {
    groups[section] = lessons.filter((lesson) => String(lesson.section || "General").trim() === section);
    return groups;
  }, {});

  return (
    <ModalSurface title={course?.name || course?.title || "Course lessons"} onClose={onClose}>
      <div className="course-view-surface">
        <div className="course-view-summary">
          <div>
            <span>{course?.duration || "Course"} · {course?.mode || "Hybrid"} · {course?.price || course?.fees || ""}</span>
            <strong>{lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}</strong>
          </div>
          <div className="course-view-actions">
            <button type="button" className="ghost-button compact" onClick={onEdit}>Edit course</button>
            <button type="button" className="ghost-button compact danger" onClick={onDeleteCourse}>Delete course</button>
          </div>
        </div>
        <div className="course-view-lesson-list">
          {sectionNames.length ? sectionNames.map((section) => {
            const sectionLessons = lessonsBySection[section] || [];
            return (
              <div key={section}>
                <h3 className="course-view-section-title">{section}</h3>
                {sectionLessons.length ? sectionLessons.map((lesson, index) => (
                  <article key={lesson.id || `${section}-lesson-${index}`} className="course-view-lesson">
                    <div>
                      <span>{section} · Lesson {index + 1}</span>
                      <strong>{lesson.title || `Lesson ${index + 1}`}</strong>
                      <small>{lesson.durationTime ? `${lesson.durationTime} video` : "Lesson content"}</small>
                    </div>
                    <div className="course-view-lesson-links">
                      <button type="button" className="ghost-button compact" onClick={() => onEditLesson(lesson)}>Edit lesson</button>
                      <button type="button" className="ghost-button compact danger" onClick={() => onDeleteLesson(lesson)}>Delete</button>
                    </div>
                  </article>
                )) : (
                  <div className="course-view-empty-section">No lessons in this section</div>
                )}
              </div>
            );
          }) : <div className="course-library-empty-detail">No lessons saved for this course.</div>}
        </div>
      </div>
    </ModalSurface>
  );
}

function CbFileButton({ label, accept, onSelect, busy, icon, compact, fileName }) {
  const inputRef = useRef(null);
  return (
    <div className={`cb-filebtn ${compact ? "compact" : ""} ${busy ? "busy" : ""}`}>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
        {icon || <Upload size={14} />}
        <span>{busy ? "Uploading..." : label}</span>
      </button>
      {fileName ? <small className="cb-filebtn-name" title={fileName}>{fileName}</small> : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          onSelect(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function CourseFolderUploadPanel({ folderUploadState, onUpload, onReview }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const uploading = folderUploadState?.status === "uploading";
  const done = folderUploadState?.status === "done";

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (!uploading) onUpload(event.dataTransfer.files);
  };

  return (
    <div className="cb-card cb-upload-card">
      <div className="cb-upload-layout">
        <div
          className={`cb-upload-dropzone ${dragging ? "dragging" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Upload course folder"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!uploading) setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setDragging(false);
          }}
          onDrop={handleDrop}
        >
          <div className="cb-upload-copy">
            <h3>Upload a course folder</h3>
            <p>Drop a folder here or click the icon.</p>
          </div>
          <button
            type="button"
            className="cb-upload-button"
            disabled={uploading}
            aria-label="Choose course folder"
            title="Choose course folder"
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <FolderUp size={32} />
          </button>
          <input
            ref={inputRef}
            type="file"
            webkitdirectory=""
            directory=""
            multiple
            style={{ display: "none" }}
            onChange={(event) => onUpload(event.target.files)}
          />
        </div>

        <div className="cb-upload-structure">
          <div className="cb-structure-heading"><Info size={14} /> Folder structure to upload</div>
          <div className="cb-structure">
            <pre>{`Course name/
└── Section name/
    └── Lesson name/
        ├── video.mp4
        ├── notes.pdf
        └── tasks/
            ├── task-1.pdf
            ├── task-2.pdf
            └── task-3.pdf`}</pre>
            <p>Repeat the section and lesson folders as needed. Video, notes, and task PDFs are optional.</p>
          </div>
        </div>
      </div>

      {uploading ? (
        <div className="cb-upload-progress" aria-live="polite">
          <div className="cb-upload-progress-head">
            <strong>Uploading course files</strong>
            <span>{Math.round((folderUploadState.done / folderUploadState.total) * 100)}%</span>
          </div>
          <div className="cb-upload-bar">
            <span style={{ width: `${Math.round((folderUploadState.done / folderUploadState.total) * 100)}%` }} />
          </div>
          <small>{folderUploadState.done} of {folderUploadState.total} files uploaded</small>
        </div>
      ) : null}

      {done ? (
        <div className="cb-upload-result">
          <CheckCircle2 size={16} />
          <span>Parsed <strong>{folderUploadState.sectionCount}</strong> section(s) and <strong>{folderUploadState.lessonCount}</strong> lesson(s) from "{folderUploadState.courseName}".</span>
          <button type="button" onClick={onReview}>Review &amp; save</button>
        </div>
      ) : null}

    </div>
  );
}

function CourseBuilderStyles() {
  return (
    <style>{`
      .cb-page { display: flex; flex-direction: column; gap: 20px; padding: 24px; background: #faf7f2; border-radius: 16px; }
      .cb-modehead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .cb-modetabs { display: inline-flex; background: #efe9df; border-radius: 999px; padding: 4px; gap: 4px; }
      .cb-modetabs button { display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent; padding: 9px 18px; border-radius: 999px; font-size: 13.5px; font-weight: 600; color: #6b6255; cursor: pointer; transition: background .15s, color .15s; }
      .cb-modetabs button.active { background: #ffffff; color: #3a2a1c; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
      .cb-cancel { border: 1px solid #e2dacb; background: #fff; color: #6b6255; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
      .cb-cancel:hover { background: #f3ede1; }

      .cb-card { background: #ffffff; border: 1px solid #ece5d8; border-radius: 14px; padding: 22px 24px; }
      .cb-card-head h3 { margin: 0 0 2px; font-size: 16px; font-weight: 700; color: #2c2318; }
      .cb-card-head p { margin: 0 0 16px; font-size: 12.5px; color: #8a8072; }

      .cb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
      .cb-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: #4a4033; }
      .cb-field.full { grid-column: 1 / -1; }
      .cb-field input, .cb-field select, .cb-field textarea { border: 1px solid #e2dacb; border-radius: 9px; padding: 10px 12px; font-size: 13.5px; font-weight: 400; color: #2c2318; background: #fffdfa; }
      .cb-field input:focus, .cb-field select:focus, .cb-field textarea:focus { outline: none; border-color: #a8734c; box-shadow: 0 0 0 3px rgba(168,115,76,.15); }
      .cb-field textarea { resize: vertical; font-family: inherit; }
      .cb-muted { margin: 4px 0 0; font-size: 12px; color: #9a8f7f; }
      .cb-count { color: #9a8f7f; font-weight: 500; }

      .cb-students { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; border: 1px solid #eee6d8; border-radius: 10px; padding: 8px; }
      .cb-student { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-radius: 8px; cursor: pointer; font-weight: 400; }
      .cb-student:hover { background: #faf5ea; }
      .cb-student.selected { background: #f6ecdd; }
      .cb-student span { display: flex; flex-direction: column; }
      .cb-student strong { font-size: 12.5px; color: #2c2318; font-weight: 600; }
      .cb-student small { font-size: 11px; color: #9a8f7f; }

      .cb-filebtn button { display: inline-flex; align-items: center; gap: 7px; border: 1px dashed #d6cbb6; background: #fbf8f2; border-radius: 9px; padding: 9px 13px; font-size: 12.5px; font-weight: 600; color: #6b5b45; cursor: pointer; white-space: nowrap; max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
      .cb-filebtn button:hover { border-color: #a8734c; color: #a8734c; }
      .cb-filebtn.busy button { color: #a8734c; border-color: #a8734c; }
      .cb-filebtn input { display: none; }
      .cb-filebtn.compact button { padding: 6px 10px; max-width: 120px; font-size: 11.5px; }

      .cb-sections { display: flex; flex-direction: column; gap: 12px; }
      .cb-section { border: 1px solid #ece5d8; border-radius: 12px; overflow: hidden; background: #fffdfa; }
      .cb-section-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #f8f4ec; }
      .cb-section-toggle { display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent; cursor: pointer; padding: 0; font-size: 12px; font-weight: 700; color: #6b5b45; }
      .cb-chev { transition: transform .15s; color: #9a8f7f; }
      .cb-chev.open { transform: rotate(180deg); }
      .cb-section-index { white-space: nowrap; }
      .cb-section-name { flex: 1; border: 1px solid transparent; background: transparent; font-size: 14px; font-weight: 700; color: #2c2318; padding: 6px 8px; border-radius: 7px; }
      .cb-section-name:focus { outline: none; border-color: #d6cbb6; background: #fff; }
      .cb-section-meta { font-size: 11.5px; color: #9a8f7f; white-space: nowrap; }
      .cb-iconbtn { border: none; background: transparent; color: #9a8f7f; cursor: pointer; padding: 6px; border-radius: 7px; display: inline-flex; }
      .cb-iconbtn:hover { background: #f3e6e0; color: #b2452f; }
      .cb-iconbtn.danger:hover { color: #b2452f; }

      .cb-lessons { display: flex; flex-direction: column; gap: 10px; padding: 14px; }
      .cb-lesson { border: 1px solid #eee6d8; border-radius: 10px; padding: 12px 14px; background: #ffffff; transition: border-color .2s, box-shadow .2s, background .2s; }
      .cb-lesson.focused { position: relative; z-index: 1; border-color: #a8734c; background: #fffaf3; box-shadow: inset 0 0 0 2px rgba(168, 115, 76, .9), 0 6px 16px rgba(138, 59, 31, .1); }
      .cb-lesson-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      .cb-lesson-index { font-size: 11px; font-weight: 700; color: #a8734c; white-space: nowrap; }
      .cb-lesson-title { flex: 1; border: 1px solid #e2dacb; border-radius: 8px; padding: 8px 10px; font-size: 13px; font-weight: 600; color: #2c2318; }
      .cb-lesson-title:focus { outline: none; border-color: #a8734c; }
      .cb-lesson-body { display: flex; flex-direction: column; gap: 12px; }
      .cb-assetrow { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
      .cb-inline-number { display: flex; flex-direction: column; gap: 4px; font-size: 11px; font-weight: 600; color: #6b6255; }
      .cb-inline-number input { width: 90px; border: 1px solid #e2dacb; border-radius: 8px; padding: 8px 9px; font-size: 12.5px; }

      .cb-tasks { border-top: 1px dashed #ece5d8; padding-top: 10px; }
      .cb-tasks-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .cb-tasks-head span { font-size: 11.5px; font-weight: 700; color: #6b6255; text-transform: uppercase; letter-spacing: .03em; }
      .cb-addtask { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: #a8734c; font-size: 12px; font-weight: 700; cursor: pointer; padding: 3px 6px; border-radius: 6px; }
      .cb-addtask:hover { background: #f6ecdd; }
      .cb-task { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .cb-task-index { font-size: 11px; color: #9a8f7f; width: 14px; text-align: right; }
      .cb-task-title { flex: 1; border: 1px solid #e2dacb; border-radius: 8px; padding: 7px 9px; font-size: 12.5px; }
      .cb-task-time { width: 56px; border: 1px solid #e2dacb; border-radius: 8px; padding: 7px 6px; font-size: 12.5px; text-align: center; }
      .cb-task-title:focus, .cb-task-time:focus { outline: none; border-color: #a8734c; }

      .cb-addlesson, .cb-addsection { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; border: 1px dashed #d6cbb6; background: #fbf8f2; color: #6b5b45; font-size: 12.5px; font-weight: 700; padding: 9px 14px; border-radius: 9px; cursor: pointer; }
      .cb-addlesson:hover, .cb-addsection:hover { border-color: #a8734c; color: #a8734c; }
      .cb-addsection { margin-top: 2px; }

      .cb-footer { display: flex; align-items: center; justify-content: space-between; background: #fffdfa; border: 1px solid #ece5d8; border-radius: 14px; padding: 14px 20px; margin-top: 4px; }
      .cb-footer-summary { font-size: 12.5px; color: #8a8072; font-weight: 600; }
      .cb-save { border: none; background: #8a3b1f; color: #fff; font-size: 13.5px; font-weight: 700; padding: 11px 24px; border-radius: 10px; cursor: pointer; transition: background .15s; }
      .cb-save:hover { background: #6e2f18; }
      .cb-save:disabled { background: #d6cbb6; cursor: not-allowed; }

      .cb-upload-card { display: flex; flex-direction: column; gap: 14px; }
      .cb-upload-layout { display: grid; grid-template-columns: minmax(280px, 420px) minmax(0, 1fr); align-items: center; gap: 28px; }
      .cb-upload-dropzone { width: min(100%, 420px); aspect-ratio: 1; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 28px; border: 2px dashed #d6cbb6; border-radius: 20px; background: #fffdfa; cursor: pointer; transition: border-color .15s, background .15s, transform .15s; }
      .cb-upload-dropzone:hover, .cb-upload-dropzone.dragging { border-color: #a8734c; background: #fcf4e8; }
      .cb-upload-dropzone.dragging { transform: scale(1.01); }
      .cb-upload-copy { text-align: center; }
      .cb-upload-copy h3 { margin: 0 0 5px; font-size: 16px; font-weight: 700; color: #2c2318; }
      .cb-upload-copy p { margin: 0; font-size: 12px; color: #8a8072; }
      .cb-upload-button { width: 160px; height: 160px; display: inline-flex; align-items: center; justify-content: center; border: none; background: #8a3b1f; color: #fff; border-radius: 18px; cursor: pointer; flex-shrink: 0; }
      .cb-upload-button:hover { background: #6e2f18; }
      .cb-upload-button:disabled { background: #d6cbb6; cursor: not-allowed; }

      .cb-upload-progress { display: grid; gap: 7px; background: #f8f2e8; border: 1px solid #ece5d8; border-radius: 12px; padding: 12px 14px; }
      .cb-upload-progress-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #6b4a32; font-size: 12px; }
      .cb-upload-progress-head span { color: #8a3b1f; font-size: 13px; font-weight: 800; }
      .cb-upload-bar { display: block; height: 10px; background: #eadfce; border-radius: 999px; overflow: hidden; }
      .cb-upload-bar span { display: block; height: 100%; background: linear-gradient(90deg, #a8734c, #8a3b1f); border-radius: inherit; transition: width .25s ease; position: relative; overflow: hidden; }
      .cb-upload-bar span::after { content: ""; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,.45) 45%, transparent 70%); animation: cb-upload-shimmer 1.2s linear infinite; }
      .cb-upload-progress small { color: #8a8072; font-size: 11px; }
      @keyframes cb-upload-shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }

      .cb-upload-result { display: flex; align-items: center; gap: 8px; background: #eef5ea; color: #366b3f; border-radius: 10px; padding: 10px 14px; font-size: 12.5px; }
      .cb-upload-result strong { font-weight: 700; }
      .cb-upload-result button { margin-left: auto; border: 1px solid #366b3f; background: #fff; color: #366b3f; font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 8px; cursor: pointer; }

      .cb-structure-heading { display: inline-flex; align-items: center; gap: 6px; color: #a8734c; font-size: 12px; font-weight: 700; }
      .cb-structure { background: #faf6ee; border: 1px solid #ece5d8; border-radius: 10px; padding: 16px 18px; }
      .cb-structure pre { margin: 0; overflow-x: auto; color: #4a4033; font: 12px/1.65 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre; }
      .cb-structure p { margin: 4px 0 0; font-size: 11.5px; color: #8a8072; }

      @media (max-width: 720px) {
        .cb-grid { grid-template-columns: 1fr; }
        .cb-page { padding: 16px; }
        .cb-upload-layout { grid-template-columns: 1fr; }
        .cb-upload-button { width: 132px; height: 132px; }
        .cb-upload-dropzone { width: min(100%, 360px); }
      }
    `}</style>
  );
}

function ModalSurface({ title, onClose, children, className = "", showClose = true }) {
  return (
    <div className="modal-surface">
      <div className="modal-backdrop" onClick={onClose} />
      <section className={`modal-shell ${className}`.trim()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <strong>{title}</strong>
          {showClose ? <button type="button" className="ghost-button compact" onClick={onClose}>Close</button> : null}
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

function CategorySelectorCard({
  category,
  rows,
  onChange,
  fallbackImage,
  selectLabel,
  displayFields = [],
  emptyMessage = "No services available",
}) {
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? null);
  const [draft, setDraft] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0]?.id ?? null);
      setDraft(null);
    }
  }, [rows, selectedId]);

  const selectedRow = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const editing = Boolean(draft);
  const cardImage = selectedRow?.imageUrl || rows[0]?.imageUrl || fallbackImage;

  const startEditing = () => {
    if (!selectedRow) return;
    setDraft({ ...selectedRow });
  };

  const updateDraft = (key, value) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const saveRow = () => {
    if (!draft) return;
    onChange((currentRows) =>
      currentRows.map((row) => (row.id === draft.id ? { ...draft } : row)),
    );
    setDraft(null);
  };

  const removeRow = () => {
    if (!selectedRow) return;
    onChange((currentRows) => currentRows.filter((row) => row.id !== selectedRow.id));
    setDraft(null);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedRow) return;
    event.target.value = "";

    try {
      setUploading(true);
      const compressed = await compressImageFile(file);
      const result = await uploadImage(compressed);
      const imageUrl = result.imageUrl;

      const currentImage = draft?.imageUrl || selectedRow?.imageUrl;
      if (currentImage && currentImage !== imageUrl) {
        const oldPublicId = draft?.imagePublicId || selectedRow?.imagePublicId;
        if (oldPublicId) {
          await deleteImage(oldPublicId).catch(() => {});
        }
      }

      setDraft((current) => {
        if (!current || current.id !== selectedRow.id) return current;
        return { ...current, imageUrl, imagePublicId: result.publicId };
      });
      onChange((currentRows) =>
        currentRows.map((row) => (row.id === selectedRow.id ? { ...row, imageUrl, imagePublicId: result.publicId } : row)),
      );
      if (notify) notify("Image uploaded.");
    } catch (err) {
      if (notify) notify(err.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (!rows.length) {
    return <div className="catalog-empty-state">{emptyMessage}</div>;
  }

  return (
    <article className={`catalog-card service-category-card ${editing ? "editing" : ""}`}>
      <div className="service-category-identity">
        <label className="catalog-card-thumb upload-trigger" htmlFor={`catalog-category-image-${selectedRow?.id ?? category}`}>
          {cardImage ? (
            <img src={cardImage} alt={`${category} category`} />
          ) : (
            <span className="catalog-thumb-placeholder">Upload image</span>
          )}
          <input
            id={`catalog-category-image-${selectedRow?.id ?? category}`}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageUpload}
            disabled={uploading}
          />
        </label>
        <div className="service-category-name-wrap">
          <strong>{category}</strong>
        </div>
      </div>

      <div className="service-category-column">
        <div className="catalog-field">
          <span>{selectLabel}</span>
          <select value={selectedRow?.id ?? ""} onChange={(event) => setSelectedId(Number(event.target.value))}>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name || row.track || row.title || "Unnamed item"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {displayFields.map((field) => (
        <div className="service-category-column" key={`${selectedRow?.id ?? "row"}-${field.key}`}>
          <div className="catalog-field">
            <span>{field.label}</span>
            {editing ? (
              field.type === "textarea" ? (
                <textarea
                  value={draft?.[field.key] ?? ""}
                  onChange={(event) => updateDraft(field.key, event.target.value)}
                />
              ) : (
                <input
                  value={draft?.[field.key] ?? ""}
                  onChange={(event) => updateDraft(field.key, event.target.value)}
                />
              )
            ) : (
              <strong>{selectedRow?.[field.key] || "-"}</strong>
            )}
          </div>
        </div>
      ))}

      <div className="catalog-actions-cell service-actions-cell">
        <button
          type="button"
          className={`ghost-button compact ${editing ? "save" : ""}`}
          onClick={() => (editing ? saveRow() : startEditing())}
        >
          {editing ? <><Edit3 size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
        </button>
        <button
          type="button"
          className="ghost-button compact danger"
          onClick={removeRow}
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function EditableCatalogSection({ rows, onChange, fields, blankRow, assets = [], notify }) {
  const [drafts, setDrafts] = useState(() => new Map());
  const rowsSafe = Array.isArray(rows) ? rows : [];
  const assetsSafe = Array.isArray(assets) ? assets : [];
  const [uploadingIds, setUploadingIds] = useState({});

  const startEditing = (row) => {
    setDrafts((current) => {
      const next = new Map(current);
      next.set(row.id, { ...row });
      return next;
    });
  };

  const updateDraft = (rowId, key, value) => {
    setDrafts((current) => {
      const next = new Map(current);
      const draft = next.get(rowId);
      if (!draft) return current;
      next.set(rowId, { ...draft, [key]: value });
      return next;
    });
  };

  const saveRow = (rowId) => {
    const draft = drafts.get(rowId);
    if (!draft) return;
    onChange((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? draft : row)),
    );
    setDrafts((current) => {
      const next = new Map(current);
      next.delete(rowId);
      return next;
    });
  };

  const updateRowImage = (rowId, image, publicId) => {
    setDrafts((current) => {
      const next = new Map(current);
      const draft = next.get(rowId);
      if (draft) {
        next.set(rowId, { ...draft, imageUrl: image, imagePublicId: publicId || "" });
      }
      return next;
    });

    onChange((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, imageUrl: image, imagePublicId: publicId || "" } : row)),
    );
  };

  const handleImageUpload = async (rowId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    try {
      setUploadingIds((current) => ({ ...current, [rowId]: true }));
      const compressed = await compressImageFile(file);
      const result = await uploadImage(compressed);
      const imageUrl = result.imageUrl;

      const draft = drafts.get(rowId);
      const currentImage = draft?.imageUrl || rowsSafe.find((r) => r.id === rowId)?.imageUrl;
      if (currentImage && currentImage !== imageUrl) {
        const oldPublicId = draft?.imagePublicId || rowsSafe.find((r) => r.id === rowId)?.imagePublicId;
        if (oldPublicId) {
          await deleteImage(oldPublicId).catch(() => {});
        }
      }

      updateRowImage(rowId, imageUrl, result.publicId);
      if (notify) notify("Image uploaded.");
    } catch (err) {
      if (notify) notify(err.message || "Image upload failed.");
    } finally {
      setUploadingIds((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
    }
  };

  const addRow = () => {
    const newRow = { id: Date.now() + Math.random(), ...blankRow };
    onChange((currentRows) => [...currentRows, newRow]);
    setDrafts((current) => {
      const next = new Map(current);
      next.set(newRow.id, { ...newRow });
      return next;
    });
  };

  const removeRow = (rowId) => {
    setDrafts((current) => {
      const next = new Map(current);
      next.delete(rowId);
      return next;
    });
    onChange((currentRows) => currentRows.filter((row) => row.id !== rowId));
  };

  return (
    <div className="catalog-editor premium-editor">
      <div className="catalog-card-list">
        {rowsSafe.map((row, index) => {
          const draft = drafts.get(row.id);
          const editing = Boolean(draft);
          const asset = assetsSafe[index % assetsSafe.length] || null;
          const cardImage = draft?.imageUrl || row.imageUrl || asset;

          return (
            <article key={row.id} className={`catalog-card ${editing ? "editing" : ""}`}>
              <label className="catalog-card-thumb upload-trigger" htmlFor={`catalog-image-${row.id}`}>
                {cardImage ? (
                  <img src={cardImage} alt={`${row.name || row.track || "Program"} badge`} />
                ) : (
                  <span className="catalog-thumb-placeholder">Upload image</span>
                )}
                <input
                  id={`catalog-image-${row.id}`}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => handleImageUpload(row.id, event)}
                  disabled={Boolean(uploadingIds[row.id])}
                />
              </label>

              <div className="catalog-card-main">
                <div className="catalog-field-grid">
                  {fields.map((field) => {
                    const value = editing ? draft[field.key] : row[field.key];
                    const displayValue = value ?? "-";
                    return (
                      <div key={`${row.id}-${field.key}`} className="catalog-field">
                        <span>{field.label}</span>
                        {editing ? (
                          field.key === "details" || field.key === "focus" || field.key === "outcome" || field.key === "tools" ? (
                            <textarea
                              value={displayValue}
                              onChange={(event) => updateDraft(row.id, field.key, event.target.value)}
                            />
                          ) : (
                            <input
                              value={displayValue}
                              onChange={(event) => updateDraft(row.id, field.key, event.target.value)}
                            />
                          )
                        ) : (
                          <strong>{displayValue}</strong>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="catalog-actions-cell">
                <button
                  type="button"
                  className={`ghost-button compact ${editing ? "save" : ""}`}
                  onClick={() => (editing ? saveRow(row.id) : startEditing(row))}
                >
                  {editing ? <><Edit3 size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
                </button>
                <button
                  type="button"
                  className="ghost-button compact danger"
                  onClick={() => removeRow(row.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="catalog-actions">
        <button type="button" className="primary-button" onClick={addRow}>
          Add item
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note, tone }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${tone}`}>
        <Icon size={18} />
      </span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <span>{note}</span>
      </div>
    </article>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function LeadsTable({ leads, users, onEdit, onSave, onDelete, wrapperClassName = "" }) {
  const [operationDrafts, setOperationDrafts] = useState({});
  const leadTime = (lead) => {
    const raw = lead.createdAt || lead.createdDate || lead.assignedDate || lead.date || "";
    const parsed = Date.parse(String(raw));
    if (!Number.isNaN(parsed)) return parsed;
    const match = String(raw).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime() : 0;
  };
  const orderedLeads = [...leads].sort((left, right) => leadTime(right) - leadTime(left));
  const getAssignedName = (lead) => users.find((user) => String(user.id || user._id) === String(lead.assignedTo))?.name ?? lead.assignedTo ?? "-";
  const getCrmExecutiveName = (lead) => lead.crmExecutiveName || lead.createdByName || lead.createdBy || lead.generatedBy || "-";
  return (
    <div className={`table-wrap ${wrapperClassName}`.trim()}>
      <table className="table">
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Lead</th>
            <th>Contact</th>
            <th>Client/Source Name</th>
            <th>Executive Name</th>
            <th>Remark</th>
            <th>Lead Name</th>
            <th>Lead Status</th>
            <th>Operation/Remarks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orderedLeads.map((lead, index) => (
            <tr key={`${lead.id || lead.name || "lead"}-${index}`}>
              <td>{index + 1}</td>
              <td><strong>{lead.name || lead.clientSourceName || "-"}</strong></td>
              <td>
                <div className="row-actions admin-lead-contact-actions">
                  <button type="button" className="row-icon-btn call" title="Call" onClick={() => { window.location.href = `tel:${lead.phone || lead.contact || ""}`; }}>
                    <PhoneCall size={15} />
                  </button>
                  <button type="button" className="row-icon-btn whatsapp" title="WhatsApp" onClick={() => window.open(`https://wa.me/91${lead.phone || lead.contact || ""}`, "_blank", "noopener,noreferrer")}>
                    <MessageCircle size={15} />
                  </button>
                </div>
              </td>
              <td>{lead.clientSourceName || lead.source || lead.leadSource || lead.name || "-"}</td>
              <td>{lead.executiveName || getCrmExecutiveName(lead) || getAssignedName(lead)}</td>
              <td><RemarkField value={lead.remark || lead.notes || ""} readOnly label={`Remark for ${lead.name || "lead"}`} /></td>
              <td>{lead.leadName || lead.program || lead.interest || lead.type || "-"}</td>
              <td><span className={badgeClass(lead.leadStatus || lead.status || "Select Status")}>{lead.leadStatus || lead.status || "Select Status"}</span></td>
              <td>
                <RemarkField value={operationDrafts[lead.id] ?? lead.operationRemarks ?? ""} placeholder="Add operation remark" label={`Operation remark for ${lead.name || "lead"}`} onChange={(value) => setOperationDrafts((current) => ({ ...current, [lead.id]: value }))} onCommit={(value) => onSave?.({ ...lead, operationRemarks: value })} />
              </td>
              <td>
                <div className="row-actions">
                  {onEdit && <button type="button" className="row-icon-btn edit" title="Edit" onClick={() => onEdit(lead)}><Edit3 size={14} /></button>}
                  {onSave && <button type="button" className="row-icon-btn" title="Save" onClick={() => onSave({ ...lead, operationRemarks: operationDrafts[lead.id] ?? lead.operationRemarks ?? "" })}><CheckCheck size={14} /></button>}
                  {onDelete && <button type="button" className="row-icon-btn delete" title="Delete" onClick={() => onDelete(lead)}><Trash2 size={14} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminAllLeadsTable({ title = "All Leads", leads, users, adminName = "Admin", onEdit, onSave, onDelete, hideOwnership = false }) {
  const [remarkDrafts, setRemarkDrafts] = useState({});
  const [filters, setFilters] = useState({ search: "", fromDate: "", toDate: "", type: "All", enteredBy: "All", assignedTo: "All", status: "All" });
  const assignableUsers = users.filter(isLeadAssignmentUser);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const leadTime = (lead) => {
    const raw = lead.updatedAt || lead.createdAt || lead.createdDate || lead.assignedDate || lead.date || "";
    const parsed = Date.parse(String(raw));
    if (!Number.isNaN(parsed)) return parsed;
    const match = String(raw).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime() : 0;
  };
  const typeLabel = (lead) => {
    const type = String(lead.listType || lead.type || "").trim().toLowerCase();
    if (type === "training") return "Training";
    if (type === "service" || type === "services") return "Service";
    if (type === "internship") return "Internship";
    const interest = String(lead.interest || lead.program || "").toLowerCase();
    if (trainingCatalog.some((item) => item.toLowerCase() === interest)) return "Training";
    if (serviceCatalog.some((item) => item.toLowerCase() === interest)) return "Service";
    return lead.type || "-";
  };
  const statusValue = (lead) => /follow[ -]?up/i.test(String(lead.status || "")) ? "Pending" : (lead.status || "Pending");
  const enteredByValue = (lead) => lead.enteredBy || lead.enteredByName || lead.crmExecutiveName || lead.createdByName || adminName;
  const assignedName = (lead) => assignableUsers.find((user) => String(user.id || user._id) === String(lead.assignedTo))?.name || lead.assignedToName || "Unassigned";
  const uniqueOptions = (values) => [...new Map(values
    .map((value) => String(value || "").trim()).filter(Boolean)
    .map((value) => [value.toLowerCase(), value])).values()].sort((a, b) => a.localeCompare(b));
  const enteredByOptions = uniqueOptions(leads.map(enteredByValue));
  const orderedLeads = [...leads].sort((left, right) => leadTime(right) - leadTime(left));
  const filteredLeads = orderedLeads.filter((lead) => {
    const search = filters.search.trim().toLowerCase();
    const rawDate = lead.createdAt || lead.createdDate || lead.assignedDate || lead.date || "";
    const parsedDate = new Date(rawDate);
    const dateKey = /^\d{4}-\d{2}-\d{2}/.test(String(rawDate))
      ? String(rawDate).slice(0, 10)
      : Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString().slice(0, 10);
    const searchable = [lead.name, lead.phone, lead.contact, lead.city, lead.interest, lead.program, typeLabel(lead), enteredByValue(lead), assignedName(lead), lead.remark, lead.notes, statusValue(lead)]
      .map((value) => String(value || "").toLowerCase()).join(" ");
    return (!search || searchable.includes(search))
      && (!filters.fromDate || dateKey >= filters.fromDate)
      && (!filters.toDate || dateKey <= filters.toDate)
      && (filters.type === "All" || typeLabel(lead) === filters.type)
      && (filters.enteredBy === "All" || String(enteredByValue(lead)).toLowerCase() === filters.enteredBy.toLowerCase())
      && (filters.assignedTo === "All" || (filters.assignedTo === "Unassigned" ? !lead.assignedTo : String(lead.assignedTo) === filters.assignedTo))
      && (filters.status === "All" || statusValue(lead) === filters.status);
  });
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const visibleLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.fromDate, filters.toDate, filters.type, filters.enteredBy, filters.assignedTo, filters.status]);
  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);
  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
  const resetFilters = () => setFilters({ search: "", fromDate: "", toDate: "", type: "All", enteredBy: "All", assignedTo: "All", status: "All" });
  const exportFilteredPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.text("All Leads Report", 14, 14);
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`Exported ${new Date().toLocaleString()} | ${filteredLeads.length} filtered lead(s)`, 14, 20);
    autoTable(pdf, {
      startY: 25,
      head: [hideOwnership
        ? ["S. No.", "Date", "Name", "Phone", "City", "Lead Type", "Interest", "Remark", "Status"]
        : ["S. No.", "Date", "Name", "Phone", "City", "Lead Type", "Interest", "Entered By", "Assigned To", "Remark", "Status"]],
      body: filteredLeads.map((lead, index) => hideOwnership ? [
        index + 1,
        formatAdminDate(lead.createdAt || lead.createdDate || lead.assignedDate || lead.date),
        lead.name || "-", lead.phone || lead.contact || "-", lead.city || "-", typeLabel(lead),
        lead.interest || lead.program || "-", lead.remark || lead.notes || "-", statusValue(lead),
      ] : [
        index + 1,
        formatAdminDate(lead.createdAt || lead.createdDate || lead.assignedDate || lead.date),
        lead.name || "-", lead.phone || lead.contact || "-", lead.city || "-", typeLabel(lead),
        lead.interest || lead.program || "-", enteredByValue(lead), assignedName(lead),
        lead.remark || lead.notes || "-", statusValue(lead),
      ]),
      styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
      headStyles: { fillColor: [127, 78, 43] },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 18 }, 3: { cellWidth: 22 }, 9: { cellWidth: 30 } },
    });
    pdf.save(`all-leads-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  return <section className="panel admin-all-leads-panel">
    <div className="panel-head admin-all-leads-head">
      <div className="admin-leads-title-group">
        <h3>{title}</h3>
        {!hideOwnership && <div className="admin-lead-type-tabs" role="group" aria-label="Quick filter by lead type">
          <button type="button" className={filters.type === "Training" ? "active" : ""} aria-pressed={filters.type === "Training"} onClick={() => updateFilter("type", filters.type === "Training" ? "All" : "Training")}>Training</button>
          <button type="button" className={filters.type === "Service" ? "active" : ""} aria-pressed={filters.type === "Service"} onClick={() => updateFilter("type", filters.type === "Service" ? "All" : "Service")}>Service</button>
          <button type="button" className={filters.type === "Internship" ? "active" : ""} aria-pressed={filters.type === "Internship"} onClick={() => updateFilter("type", filters.type === "Internship" ? "All" : "Internship")}>Internship</button>
        </div>}
      </div>
      <button type="button" className="primary-button admin-leads-export" onClick={exportFilteredPdf} disabled={!filteredLeads.length}><FileText size={16} /> Export PDF ({filteredLeads.length})</button>
    </div>
    <div className="panel-body">
      <div className="admin-all-leads-directory">
        <div className={`admin-leads-toolbar ${hideOwnership ? "ownership-hidden" : ""}`}>
      <div className="admin-leads-main-filters">
      <div className="admin-leads-search"><Search size={17} /><input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search name, phone, city, interest..." /></div>
      <select aria-label="Filter by lead type" value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}><option value="All">All Lead Types</option>{["Service", "Training", "Internship"].map((type) => <option key={type}>{type}</option>)}</select>
      {!hideOwnership && <select aria-label="Filter by entered by" value={filters.enteredBy} onChange={(event) => updateFilter("enteredBy", event.target.value)}><option value="All">All Entered By</option>{enteredByOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select>}
      {!hideOwnership && <select aria-label="Filter by assigned user" value={filters.assignedTo} onChange={(event) => updateFilter("assignedTo", event.target.value)}><option value="All">All Assigned Users</option><option value="Unassigned">Unassigned</option>{assignableUsers.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}</select>}
      <select aria-label="Filter by status" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="All">All Statuses</option>{["Pending", "Interested", "Not Interested", "Converted", "Lost"].map((status) => <option key={status}>{status}</option>)}</select>
      </div>
      <div className="admin-leads-date-row">
      <span className="admin-leads-date-caption">Lead creation date</span>
      <label className="table-date-filter"><span>From</span><input aria-label="From date" type="date" max={filters.toDate || undefined} value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} /></label>
      <label className="table-date-filter"><span>To</span><input aria-label="To date" type="date" min={filters.fromDate} value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} /></label>
      <button type="button" className="ghost-button admin-leads-reset" onClick={resetFilters}>Reset</button>
      </div>
        </div>
        <div className={`table-wrap admin-all-leads-table ${hideOwnership ? "ownership-hidden" : ""}`}>
    <table className="table">
      <thead><tr><th>S. No.</th><th>Lead Create Date</th><th>Name</th><th>Phone</th><th>City</th><th>Lead Type</th><th>Interest</th>{!hideOwnership && <th>Entered By</th>}{!hideOwnership && <th>Assigned To</th>}<th>Remark</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        {!filteredLeads.length && <tr><td className="panel-empty" colSpan={hideOwnership ? 10 : 12}>{leads.length ? "No leads match the selected filters." : "No leads have been created yet."}</td></tr>}
        {visibleLeads.map((lead, index) => <tr key={`${lead.id || lead._id || lead.name || "lead"}:${lead.listType || "list"}:${lead.phone || lead.contact || "contact"}:${index}`}>
          <td>{(page - 1) * pageSize + index + 1}</td><td>{formatAdminDate(lead.createdAt || lead.createdDate || lead.assignedDate || lead.date)}</td><td><strong>{lead.name || "-"}</strong></td><td>{lead.phone || lead.contact || "-"}</td><td>{lead.city || "-"}</td><td><span className="lead-type-label">{typeLabel(lead)}</span></td><td title={lead.interest}>{lead.interest || lead.program || "-"}</td>{!hideOwnership && <td>{lead.enteredBy || lead.enteredByName || lead.crmExecutiveName || lead.createdByName || adminName}</td>}
          {!hideOwnership && <td><select className="inline-select" aria-label={`Assign ${lead.name}`} value={lead.assignedTo || ""} onChange={(event) => onSave?.({ ...lead, assignedTo: event.target.value, assignedToName: assignableUsers.find((user) => String(user.id || user._id) === event.target.value)?.name || "" })}><option value="">Unassigned</option>{lead.assignedTo && !assignableUsers.some((user) => String(user.id || user._id) === String(lead.assignedTo)) && <option value={lead.assignedTo}>{lead.assignedToName || lead.assignedTo}</option>}{assignableUsers.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}</select></td>}
          <td><RemarkField value={remarkDrafts[lead.id] ?? lead.remark ?? lead.notes ?? ""} onChange={(value) => setRemarkDrafts((current) => ({ ...current, [lead.id]: value }))} onCommit={(value) => onSave?.({ ...lead, remark: value, notes: value })} label={`Remark for ${lead.name || "lead"}`} /></td>
          <td><select className={`inline-select lead-status-select ${statusValue(lead).toLowerCase().replace(/\s+/g, "-")}`} aria-label={`Status for ${lead.name}`} value={statusValue(lead)} onChange={(event) => onSave?.({ ...lead, status: event.target.value })}>{["Pending", "Interested", "Not Interested", "Converted", "Lost"].map((status) => <option key={status}>{status}</option>)}</select></td>
          <td><div className="row-actions"><button type="button" className="row-icon-btn edit" title="Edit" onClick={() => onEdit?.(lead)}><Edit3 size={14} /></button><button type="button" className="row-icon-btn delete" title="Delete" onClick={() => onDelete?.(lead)}><Trash2 size={14} /></button></div></td>
        </tr>)}
      </tbody>
    </table>
    <div className="admin-leads-pagination">
      <span>Showing {filteredLeads.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filteredLeads.length)} of {filteredLeads.length} filtered lead(s)</span>
      <div className="admin-leads-pagination-actions">
        <button type="button" className="ghost-button compact" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" className="ghost-button compact" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
      </div>
    </div>
        </div>
      </div>
    </div>
  </section>;
}

function TaskTable({ tasks }) {
  return (
    <div className="table-wrap">
      <table className="table">
      <thead>
        <tr>
          <th>Employee</th>
          <th>Task</th>
          <th>Priority</th>
          <th>Due date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>
              <div className="person-cell">
                <div className="avatar soft">{initials(task.emp || task.assignee || "CRM")}</div>
                <strong>{task.emp || task.assignee || "Unassigned"}</strong>
              </div>
            </td>
            <td>{task.title}</td>
            <td>
              <span className={badgeClass(task.priority)}>{task.priority}</span>
            </td>
            <td>{task.due || task.dueDate || "-"}</td>
            <td>
              <span className={badgeClass(task.status)}>{task.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}

function UsersTable({ users, onEdit }) {
  return (
    <div className="table-wrap">
      <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Username</th>
          <th>Role</th>
          <th>Department</th>
          <th>Status</th>
          <th>Joined</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td>
              <div className="person-cell">
                <div className="avatar soft">{initials(user.name)}</div>
                <strong>{user.name}</strong>
              </div>
            </td>
            <td>{user.username}</td>
            <td>{user.role}</td>
            <td>{user.dept}</td>
            <td>
              <span className={badgeClass(user.status)}>{user.status}</span>
            </td>
            <td>{user.joined}</td>
            <td>
              <button type="button" className="ghost-button compact" onClick={() => onEdit?.(user)}>
                <Edit3 size={14} /> Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}

function SimpleTable({ columns, rows }) {
  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row[0]}-${index}`}>
            {row.map((cell, cellIndex) => (
              <td key={`${cellIndex}-${String(cell)}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default App;

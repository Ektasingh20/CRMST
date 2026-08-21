import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
  Upload,
  User,
  UserPlus,
  UserRoundCheck,
  Users,
  Workflow,
  X,
  Eye,
  EyeOff,
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
  saveUsersToBackend,
  loadLeads,
  saveLeadsToBackend,
  loadServices,
  saveServicesToBackend,
  loadTrainings,
  saveTrainingsToBackend,
  loadStipPrograms,
  saveStipProgramsToBackend,
  loadStipApplications,
  saveStipApplicationsToBackend,
  loadTasks,
  saveTasksToBackend,
  loadLeaves,
  saveLeavesToBackend,
  loadAttendance,
  saveAttendanceToBackend,
  loadEmployees,
  saveEmployeesToBackend,
  createUser,
  updateUser,
  deleteUser,
  createLead,
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
  getCurrentUser,
  logoutUser,
} from "./backendClient";
import ErrorBoundary from "./ErrorBoundary";
import StudentDashboard from "./src/student-dashboard/StudentDashboard";
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
const SESSION_STORAGE_KEY = "crmst-current-user";
const SERVICES_STORAGE_KEY = "crmst-services.txt";
const TRAININGS_STORAGE_KEY = "crmst-trainings.txt";
const STIP_PROGRAMS_STORAGE_KEY = "crmst-stip-programs.txt";
const STIP_APPLICATIONS_STORAGE_KEY = "crmst-stip-applications.txt";

const sidebarSections = [
  {
    heading: "CRM",
    items: [
      { id: "dashboard", label: "CRM Dashboard", icon: LayoutDashboard },
      { id: "crm", label: "All Leads", icon: PhoneCall },
      { id: "co-approved", label: "Approved Leads", icon: CheckCheck },
      { id: "sales-report", label: "CRM Reports", icon: Activity },
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
      { id: "sales-approved", label: "Approved Leads", icon: CheckCircle2 },
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
    heading: "SYSTEM",
    items: [
      { id: "logs", label: "System Logs", icon: ShieldCheck },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

const trainingCatalog = [
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

const serviceCatalog = [
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
    city: "Ajmer",
    company: "",
    type: "Training",
    interest: "Digital Marketing",
    value: 45000,
    status: "Pending",
    source: "WhatsApp",
    leadSource: "WhatsApp",
    assignedTo: "1",
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

function App() {
  const [appView, setAppView] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const deferredQuery = useDeferredValue(globalQuery);
  const [toast, setToast] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [trainingQuery, setTrainingQuery] = useState("");
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
  const [stipModalUploading, setStipModalUploading] = useState(false);

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
  const [leads, setLeads] = useState(initialLeads);
  const [crmReports] = useState(initialCrmReports);
  const [tasks] = useState(initialTasks);
  const [leaves] = useState(initialLeaves);
  const [interns, setInterns] = useState(initialInterns);
  const [logs] = useState(initialLogs);
  const [serviceRows, setServiceRows] = useState(initialServiceRows);
  const [trainingRows, setTrainingRows] = useState(initialTrainingRows);
  const [stipPrograms, setStipPrograms] = useState(initialStipPrograms);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
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
  const [createUser, setCreateUser] = useState({
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
    assignedTo: "1",
    assignedDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  useEffect(() => {
    // load local fallback immediately
    const savedUsers = readUsersFromStorage();
    const savedSession = readSessionFromStorage();
    const savedServices = readCollectionFromStorage(SERVICES_STORAGE_KEY, initialServiceRows);
    const savedTrainings = readCollectionFromStorage(TRAININGS_STORAGE_KEY, initialTrainingRows);
    const savedStipPrograms = readCollectionFromStorage(STIP_PROGRAMS_STORAGE_KEY, initialStipPrograms);
    const savedInterns = readCollectionFromStorage(STIP_APPLICATIONS_STORAGE_KEY, initialInterns);
    setUsers(savedUsers);
    setServiceRows(savedServices);
    setTrainingRows(savedTrainings);
    setStipPrograms(savedStipPrograms);
    setInterns(savedInterns);
    if (savedSession) {
      setCurrentUser(savedSession);
      if (String(savedSession.role || "").toLowerCase() === "student") {
        localStorage.setItem("crmst-student-session", JSON.stringify(savedSession));
        setAppView("student-dashboard");
      } else {
        setAppView("dashboard");
      }
    }

    const session = savedSession || getCurrentUser();
    if (!session) return;

    (async () => {
      try {
        const [remoteUsers, remoteServices, remoteTrainings, remoteStip, remoteInterns] = await Promise.all([
          loadUsers(),
          loadServices(),
          loadTrainings(),
          loadStipPrograms(),
          loadStipApplications(),
        ]);
        if (remoteUsers.length) setUsers(remoteUsers);
        if (remoteServices.length) setServiceRows(remoteServices);
        else if (savedServices.length) saveServicesToBackend(savedServices).catch(() => {});
        if (remoteTrainings.length) setTrainingRows(remoteTrainings);
        else if (savedTrainings.length) saveTrainingsToBackend(savedTrainings).catch(() => {});
        if (remoteStip.length) setStipPrograms(remoteStip);
        else if (savedStipPrograms.length) saveStipProgramsToBackend(savedStipPrograms).catch(() => {});
        if (remoteInterns.length) setInterns(remoteInterns);
        else if (savedInterns.length) saveStipApplicationsToBackend(savedInterns).catch(() => {});
      } catch (err) {
        console.warn("Initial load failed", err);
      }
    })();
  }, []);

  useEffect(() => {
    const sanitizedUsers = sanitizeImageCollection(users);
    if (!safeStorageSet(USERS_STORAGE_KEY, JSON.stringify(sanitizedUsers))) {
      notify("Browser storage is full. Continuing without caching large local data.");
    }
    saveUsersToBackend(sanitizedUsers);
  }, [users]);

  useEffect(() => {
    const sanitizedServices = sanitizeImageCollection(serviceRows);
    if (!safeStorageSet(SERVICES_STORAGE_KEY, JSON.stringify(sanitizedServices))) {
      notify("Browser storage is full. Service changes are still kept in memory.");
    }
  }, [serviceRows]);

  useEffect(() => {
    const sanitizedTrainings = sanitizeImageCollection(trainingRows);
    if (!safeStorageSet(TRAININGS_STORAGE_KEY, JSON.stringify(sanitizedTrainings))) {
      notify("Browser storage is full. Training changes are still kept in memory.");
    }
    saveTrainingsToBackend(sanitizedTrainings);
  }, [trainingRows]);

  useEffect(() => {
    const sanitizedPrograms = sanitizeImageCollection(stipPrograms);
    if (!safeStorageSet(STIP_PROGRAMS_STORAGE_KEY, JSON.stringify(sanitizedPrograms))) {
      notify("Browser storage is full. Internship changes are still kept in memory.");
    }
    saveStipProgramsToBackend(sanitizedPrograms);
  }, [stipPrograms]);

  useEffect(() => {
    const sanitizedInterns = sanitizeImageCollection(interns);
    if (!safeStorageSet(STIP_APPLICATIONS_STORAGE_KEY, JSON.stringify(sanitizedInterns))) {
      notify("Browser storage is full. Application changes are still kept in memory.");
    }
    saveStipApplicationsToBackend(sanitizedInterns);
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
    if (currentUser && String(currentUser.role || "").toLowerCase() === "student") {
      localStorage.setItem("crmst-student-session", JSON.stringify(currentUser));
      setAppView("student-dashboard");
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

  const activeUsers = users.filter((user) => user.status === "Active");
  const wonLeads = leads.filter((lead) => ["Interested"].includes(lead.status));
  const followUps = leads.filter((lead) => lead.status === "Follow-up");
  const revenue = wonLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const leavePendingCount = leaves.filter((leave) => leave.status === "Pending").length;
  const sourceCounts = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {});
  const maxSourceCount = Math.max(...Object.values(sourceCounts), 1);

  function getCrmReportForUser(userName) {
    const userLeads = leads.filter((lead) => {
      const assignedUser = users.find((u) => String(u.id) === String(lead.assignedTo));
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
    cleanupModalStateImages(trainingModal);
    setTrainingModal(null);
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
  }, [currentUser?._id]);

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
      const { password: _password, ...updatedUser } = { ...currentUser, name, email, phone, emergencyContact, maritalStatus, education, dept, position, role, joined, state, branch, branchCode, address, username };

      if (avatarFile) {
        const compressed = await compressImageFile(avatarFile);
        const uploadResult = await uploadImage(compressed);
        updatedUser.imageUrl = uploadResult.imageUrl;
        updatedUser.imagePublicId = uploadResult.publicId;
      } else {
        updatedUser.imageUrl = settingsForm.imageUrl;
        updatedUser.imagePublicId = settingsForm.imagePublicId;
      }

      const allUsers = await loadUsers();
      const duplicate = allUsers.find((u) => u._id !== currentUser._id && u.username.toLowerCase() === username.toLowerCase());
      if (duplicate) {
        setUsernameError("Username already exists");
        setSettingsSaving(false);
        return;
      }

      await updateUser(currentUser._id, updatedUser);
      setCurrentUser(updatedUser);
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
      const result = await changePassword(currentUser._id, current, newPass);
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

  function openTrainingModal(mode, course = null) {
    if (mode === "add") {
      setTrainingModal({
        mode: "add",
        item: {
          id: createEntityId("training"),
          name: "",
          duration: "",
          price: "",
          tools: "",
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

    setTrainingModal({ mode, item: course ? sanitizeImageRecord({ ...course }) : null });
  }

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

  function deleteTraining(course) {
    if (!window.confirm(`Delete ${course.name}?`)) return;
    deleteTrainingApi(course.id).catch(() => {});
    setTrainingRows((currentRows) => currentRows.filter((row) => row.id !== course.id));
    notify(`${course.name} was removed.`);
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
          },
        };
      });
    } catch (err) {
      notify(err.message || "Unable to process the selected image.");
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

  async function saveTrainingModal() {
    if (!trainingModal?.item || trainingModalUploading) return;
    setTrainingModalUploading(true);

    try {
      const uploadedItem = await persistImageIfNeeded(trainingModal.item, notify);
      if (trainingModal.mode === "add") {
        const backendItem = await createTraining({
          ...uploadedItem,
          id: undefined,
        });
        const next = { ...backendItem };
        setTrainingRows((currentRows) => [...currentRows, next]);
        notify(`${next.name} was added.`);
      } else {
        const saved = await updateTraining(uploadedItem.id, uploadedItem);
        setTrainingRows((currentRows) => currentRows.map((row) => row.id === trainingModal.item.id ? { ...saved } : row));
        notify(`${saved.name} was updated.`);
      }
      closeTrainingModal();
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
    setStipPrograms((currentRows) => [...currentRows, copy]);
    notify(`Duplicated ${program.track}.`);
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
      const user = await authLogin(loginForm.username, loginForm.password);
      setCurrentUser(user);
      if (String(user.role || "").toLowerCase() === "student") {
        localStorage.setItem("crmst-student-session", JSON.stringify(user));
        setAppView("student-dashboard");
        setLoginForm({ username: "", password: "" });
        notify(`Welcome back, ${user.name}.`);
        return;
      }
      setAppView("dashboard");
      setLoginForm({ username: "", password: "" });
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

  async function addMember(event) {
    event.preventDefault();
    const name = createUser.name.trim();
    const email = createUser.email.trim();
    const phone = createUser.phone.trim();
    const emergencyContact = createUser.emergencyContact.trim();
    const education = createUser.education.trim();
    const username = createUser.username.trim();
    const password = createUser.password.trim();
    const dept = createUser.dept.trim();
    const position = createUser.position.trim();
    const role = createUser.role.trim();
    const joined = createUser.joined.trim();
    const state = createUser.state.trim();
    const branch = createUser.branch.trim();
    const branchCode = createUser.branchCode.trim();
    const address = createUser.address.trim();

    if (!name) { notify("Full name is required."); return; }
    if (!email) { notify("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify("Enter a valid email address."); return; }
    if (!phone) { notify("Contact number is required."); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { notify("Contact number must be exactly 10 digits and start with 6, 7, 8, or 9."); return; }
    if (!emergencyContact) { notify("Emergency contact is required."); return; }
    if (!/^[6-9]\d{9}$/.test(emergencyContact)) { notify("Emergency contact must be exactly 10 digits and start with 6, 7, 8, or 9."); return; }
    if (!education) { notify("Education is required."); return; }
    if (!dept) { notify("Department is required."); return; }
    if (!position) { notify("Position is required."); return; }
    if (!role) { notify("Role is required."); return; }
    if (!joined) { notify("Date of joining is required."); return; }
    if (!username) { notify("Username is required."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { notify("Username can only contain letters, numbers, and underscores."); return; }
    if (!password) { notify("Password is required."); return; }
    if (password.length < 6) { notify("Password must be at least 6 characters."); return; }
    if (!state) { notify("State is required."); return; }
    if (!branch) { notify("Branch is required."); return; }
    if (!branchCode) { notify("Branch code is required."); return; }
    if (!address) { notify("Address is required."); return; }

    if (users.some((entry) => entry.username.toLowerCase() === username.toLowerCase())) {
      notify("That username already exists.");
      return;
    }

    let imageUrl = createUser.imageUrl || "";
    let imagePublicId = createUser.imagePublicId || "";

    if (createUserFile) {
      try {
        const compressed = await compressImageFile(createUserFile);
        const uploadResult = await uploadImage(compressed);
        imageUrl = uploadResult.imageUrl || "";
        imagePublicId = uploadResult.publicId || "";
      } catch (err) {
        notify(err.message || "Image upload failed.");
        return;
      }
    }

    const newUserPayload = {
      name,
      email,
      phone,
      emergencyContact,
      maritalStatus: createUser.maritalStatus || "",
      education,
      username,
      password,
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

    try {
      const createdUser = await createUser(newUserPayload);
      setUsers((current) => [createdUser, ...current]);
      setCreateUser({
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
      notify("New user created successfully.");
      setActivePage("user-view");
    } catch (err) {
      console.error("Failed to create user:", err);
      notify(err.message || "Failed to create user.");
    }
  }

  function addLead(event) {
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
    if (!assignedTo) {
      notify("Please assign the lead to a user.");
      return;
    }

    setLeads((current) => [
      {
        id: current.length + 1,
        ...createLead,
        value: Number(createLead.value || 0),
        assignedTo: String(createLead.assignedTo),
        assignedDate: createLead.assignedDate || new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...current,
    ]);
    setCreateLead({
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
      assignedTo: String(activeUsers[0]?.id ?? 1),
      assignedDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    notify("Lead saved to the pipeline.");
    setActivePage("co-leads");
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
            <button
              className={authMode === "signup" ? "active" : ""}
              onClick={() => setAuthMode("signup")}
            >
              Sign Up
            </button>
          </div>

          {authMode === "login" ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <p className="eyebrow">Member login</p>
              <h2>Access admin panel or dashboard</h2>
              <Field label="Username">
                <input
                  value={loginForm.username}
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
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Enter your password"
                />
              </Field>
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
        <StudentDashboard user={currentUser} onLogout={logout} courses={trainingRows} />
        {toast ? <div className="toast">{toast}</div> : null}
      </ErrorBoundary>
    );
  }

  return (
    <div className="shell">
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
                    className={`nav-item ${activePage === item.id ? "active" : ""}`}
                    onClick={() => {
                      setActivePage(item.id);
                      setMobileNavOpen(false);
                    }}
                  >
                    <span className="nav-item-left">
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </span>
                    {item.id === "hr-leaves" && leavePendingCount > 0 ? (
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
            <div className="avatar">{initials(currentUser?.name ?? "Admin User")}</div>
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

        <section className="content">
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
                      {followUps.slice(0, 5).map((lead) => (
                        <div key={lead.id} className="follow-up-item">
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
                        .map((lead) => (
                          <div key={lead.id} className="follow-up-item">
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
                      {followUps.map((lead) => (
                        <div key={lead.id} className="follow-up-item">
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
            <Panel title={`All company leads (${leads.length})`}>
              <LeadsTable leads={leads} users={users} />
            </Panel>
          )}

          {activePage === "user-create" && (
            <Panel title="Create new user">
              <form className="form-grid" onSubmit={addMember}>
                <p className="form-section-title">Personal Information</p>
                <Field label="Full Name *">
                  <input
                    value={createUser.name}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Ravi Sharma"
                  />
                </Field>
                <Field label="Email *">
                  <input
                    type="email"
                    value={createUser.email}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="rahul@systemtechnologies.in"
                  />
                </Field>
                <Field label="Contact Number *">
                  <input
                    value={createUser.phone}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "") }))
                    }
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </Field>
                <Field label="Emergency Contact *">
                  <input
                    value={createUser.emergencyContact}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, emergencyContact: event.target.value.replace(/\D/g, "") }))
                    }
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </Field>
                <Field label="Marital Status">
                  <select
                    value={createUser.maritalStatus}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, maritalStatus: event.target.value }))
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
                    value={createUser.education}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, education: event.target.value }))
                    }
                    placeholder="B.Tech, MBA, B.Com"
                  />
                </Field>

                <p className="form-section-title">Employment Information</p>
                <Field label="Department *">
                  <select
                    value={createUser.dept}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, dept: event.target.value }))
                    }
                  >
                    {["CRM", "Sales", "HR", "Technical", "Design", "Marketing"].map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Position *">
                  <input
                    value={createUser.position}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, position: event.target.value }))
                    }
                    placeholder="CRM Executive"
                  />
                </Field>
                <Field label="Role *">
                  <select
                    value={createUser.role}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, role: event.target.value }))
                    }
                  >
                    {["CRM Executive", "Sales Executive", "HR", "Manager", "Admin", "Trainer", "Student"].map(
                      (role) => (
                        <option key={role} value={role}>{role}</option>
                      ),
                    )}
                  </select>
                </Field>

                <p className="form-section-title">Joining Information</p>
                <Field label="Date of Joining *">
                  <input
                    type="date"
                    value={createUser.joined}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, joined: event.target.value }))
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
                          setCreateUser((current) => ({ ...current, imageUrl: e.target.result }));
                        };
                        reader.readAsDataURL(file);
                      }}
                      hidden
                      id="create-user-photo"
                    />
                    <label htmlFor="create-user-photo" className="avatar-upload-label">
                      <Upload size={16} />
                      {createUser.imageUrl ? "Change photo" : "Upload photo"}
                    </label>
                    {createUserPreview && (
                      <div className="avatar-preview">
                        <img src={createUserPreview} alt="Preview" />
                      </div>
                    )}
                    {!createUserPreview && createUser.imageUrl && (
                      <div className="avatar-preview">
                        <img src={createUser.imageUrl} alt="Preview" />
                      </div>
                    )}
                  </div>
                </Field>

                <p className="form-section-title">Login Information</p>
                <Field label="Username *">
                  <input
                    value={createUser.username}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, username: event.target.value }))
                    }
                    placeholder="ravi"
                  />
                </Field>
                <Field label="Password *">
                  <input
                    type="password"
                    value={createUser.password}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Create password"
                  />
                </Field>

                <p className="form-section-title">Organization / Location</p>
                <Field label="State *">
                  <input
                    value={createUser.state}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, state: event.target.value }))
                    }
                    placeholder="Rajasthan"
                  />
                </Field>
                <Field label="Branch *">
                  <input
                    value={createUser.branch}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, branch: event.target.value }))
                    }
                    placeholder="Ajmer"
                  />
                </Field>
                <Field label="Branch Code *">
                  <input
                    value={createUser.branchCode}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, branchCode: event.target.value }))
                    }
                    placeholder="AJ-01"
                  />
                </Field>

                <p className="form-section-title">Address</p>
                <Field label="Address *">
                  <textarea
                    value={createUser.address}
                    onChange={(event) =>
                      setCreateUser((current) => ({ ...current, address: event.target.value }))
                    }
                    placeholder="123 Main Road, Ajmer, Rajasthan"
                    rows={3}
                  />
                </Field>

                <div className="form-actions span-full">
                  <button className="primary-button" type="submit">
                    Create User
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {activePage === "user-view" && (
            <Panel title={`All users (${users.length})`}>
              <UsersTable users={users} />
            </Panel>
          )}

          {activePage === "sales-add" && (
            <Panel title="Add new lead">
              <form className="form-grid" onSubmit={addLead}>
                <div className="form-section">
                  <p className="form-section-title">Contact Information</p>
                  <Field label="Full name *">
                    <input
                      value={createLead.name}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Priya Verma"
                    />
                  </Field>
                  <Field label="Phone *">
                    <input
                      value={createLead.phone}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))
                      }
                      placeholder="9876543210"
                      maxLength={10}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      value={createLead.email}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="priya@example.com"
                      type="email"
                    />
                  </Field>
                  <Field label="Alternate Phone">
                    <input
                      value={createLead.alternatePhone}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, alternatePhone: event.target.value }))
                      }
                      placeholder="9876543210"
                    />
                  </Field>
                  <Field label="City *">
                    <input
                      value={createLead.city}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, city: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Company / Organization">
                    <input
                      value={createLead.company}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, company: event.target.value }))
                      }
                      placeholder="System Technologies"
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
                      placeholder="15000"
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
                  <Field label="Assigned To *">
                    <select
                      value={createLead.assignedTo}
                      onChange={(event) =>
                        setCreateLead((current) => ({ ...current, assignedTo: event.target.value }))
                      }
                    >
                      {activeUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
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
                      placeholder="Interested in Front End Development and requested fee details. Will confirm after discussion."
                      rows={4}
                    />
                  </Field>
                </div>

                <div className="form-actions span-full">
                  <button className="primary-button" type="submit">
                    Save lead
                  </button>
                </div>
              </form>
            </Panel>
          )}

          {activePage === "sales-approved" && (
            <Panel title="Approved leads">
              <LeadsTable leads={wonLeads} users={users} />
            </Panel>
          )}

          {activePage === "sales-report" && (
            <>
              <section className="stats-grid compact">
                <StatCard tone="blue" icon={Users} label="Total Leads" value={leads.length} note="Across sales modules" />
                <StatCard tone="green" icon={CheckCircle2} label="Converted" value={wonLeads.length} note="Approved outcomes" />
                <StatCard tone="rose" icon={BadgeIndianRupee} label="Revenue" value={compactCurrency(revenue)} note="Closed pipeline value" />
                <StatCard tone="amber" icon={Sparkles} label="Conv. Rate" value={`${Math.round((wonLeads.length / leads.length) * 100)}%`} note="Overall conversion" />
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
                        const myLeads = leads.filter((lead) => lead.assignedTo === user.id);
                        const converted = myLeads.filter((lead) =>
                          ["Interested"].includes(lead.status),
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

          {activePage === "co-leads" && (
            <Panel title={`All company leads (${leads.length})`}>
              <LeadsTable leads={leads} users={users} />
            </Panel>
          )}

          {activePage === "co-approved" && (
            <Panel title="All approved leads">
              <LeadsTable leads={wonLeads} users={users} />
            </Panel>
          )}

          {activePage === "hr-assign" && (
            <Panel title="Assigned tasks">
              <TaskTable tasks={tasks} />
            </Panel>
          )}

          {activePage === "hr-tasks" && (
            <Panel title="All tasks">
              <TaskTable tasks={tasks} />
            </Panel>
          )}

          {activePage === "hr-leaves" && (
            <Panel title="Leave requests">
              <div className="table-wrap">
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
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <div className="person-cell">
                          <div className="avatar soft">{initials(leave.emp)}</div>
                          <strong>{leave.emp}</strong>
                        </div>
                      </td>
                      <td>{leave.type}</td>
                      <td>{leave.from}</td>
                      <td>{leave.to}</td>
                      <td>{leave.days}</td>
                      <td>{leave.reason}</td>
                      <td>
                        <span className={badgeClass(leave.status)}>{leave.status}</span>
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
                    <th>Role</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Leave</th>
                    <th>Attendance%</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map((user, index) => {
                    const present = 19 + index;
                    const absent = index % 2;
                    const late = (index + 1) % 2;
                    const leave = leaves.filter(
                      (entry) => entry.emp === user.name && entry.status === "Approved",
                    ).length;
                    const total = present + absent + late;
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="person-cell">
                            <div className="avatar soft">{initials(user.name)}</div>
                            <strong>{user.name}</strong>
                          </div>
                        </td>
                        <td>{user.role}</td>
                        <td>{present}</td>
                        <td>{absent}</td>
                        <td>{late}</td>
                        <td>{leave}</td>
                        <td>{Math.round((present / total) * 100)}%</td>
                      </tr>
                    );
                  })}
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

          {activePage === "trainings" && (
            <>
              <section className="stats-grid compact four-up">
                <StatCard tone="blue" icon={GraduationCap} label="Total courses" value={trainingRows.length} note="Learning offerings" />
                <StatCard tone="teal" icon={CalendarClock} label="Active batches" value={Math.max(6, Math.round(trainingRows.length / 2))} note="Live training cohorts" />
                <StatCard tone="green" icon={Users} label="Enrollments" value={Math.round(trainingRows.length * 3.2)} note="Current enrollments" />
                <StatCard tone="amber" icon={BadgeIndianRupee} label="Revenue" value={`Rs ${Math.round(trainingRows.length * 14500 / 1000)}K`} note="Monthly training value" />
              </section>

              <Panel title="Training management workspace">
                <div className="module-toolbar">
                  <div className="toolbar-search">
                    <Search size={16} />
                    <input value={trainingQuery} onChange={(event) => { setTrainingQuery(event.target.value); setTrainingPage(1); }} placeholder="Search course, trainer, mode, placement support" />
                  </div>
                  <button type="button" className="primary-button" onClick={() => openTrainingModal("add")}>Add course</button>
                </div>

                {trainingRows.length === 0 ? (
                  <div className="catalog-empty-state">No training programs available</div>
                ) : (
                  <>
                    <div className="catalog-card-list training-grid">
                      {trainingRows
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
                                    <span className="badge success">{course.mode || "Hybrid"}</span>
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
                                      {[
                                        "Introduction and environment setup",
                                        "Project sprints and collaborative modules",
                                        "Assessment, resume coaching, and portfolio review",
                                      ].map((module, idx) => (
                                        <div key={module} className="syllabus-item">
                                          <strong>Module {idx + 1}</strong>
                                          <span>{module}</span>
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
                      <button type="button" className="ghost-button compact" disabled={trainingPage * 6 >= trainingRows.filter((row) => {
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
                        {settingsForm.imageUrl ? (
                          <img src={settingsForm.imageUrl} alt={settingsForm.name} />
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

      {trainingModal ? (
        <ModalSurface title={trainingModal.mode === "add" ? "Add course" : trainingModal.mode === "view" ? "Course details" : "Edit course"} onClose={closeTrainingModal}>
          <div className="modal-grid">
            <div className="modal-detail-card single-edit">
              <div className="modal-image-wrap">
                <label className="upload-trigger" htmlFor={`training-modal-image-${trainingModal.item.id}`}>
                  <DecorativeThumbnail
                    label={`${trainingModal.item.name || ""} ${trainingModal.item.tools || ""}`}
                    image={getDisplayImage(trainingModal.item.imageUrl, "", trainingModal.item._previewImage)}
                    className="modal-thumbnail"
                  />
                  <input
                    id={`training-modal-image-${trainingModal.item.id}`}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      handleTrainingModalImageSelect(event.target.files?.[0] || null);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="modal-detail-body">
                <label className="field"><span>Name</span><input value={trainingModal.item.name} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, name: event.target.value } }))} /></label>
                <label className="field"><span>Duration</span><input value={trainingModal.item.duration || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, duration: event.target.value } }))} /></label>
                <label className="field"><span>Fees</span><input value={trainingModal.item.price || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, price: event.target.value } }))} /></label>
                <label className="field"><span>Mode</span><input value={trainingModal.item.mode || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, mode: event.target.value } }))} /></label>
                <label className="field"><span>Level</span><input value={trainingModal.item.level || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, level: event.target.value } }))} /></label>
                <label className="field"><span>Seats</span><input value={trainingModal.item.seats || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, seats: event.target.value } }))} /></label>
                <label className="field"><span>Trainer</span><input value={trainingModal.item.trainer || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, trainer: event.target.value } }))} /></label>
                <label className="field"><span>Batch timing</span><input value={trainingModal.item.batchTiming || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, batchTiming: event.target.value } }))} /></label>
                <label className="field"><span>Projects</span><input value={trainingModal.item.projects || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, projects: event.target.value } }))} /></label>
                <label className="field"><span>Certification</span><input value={trainingModal.item.certification || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, certification: event.target.value } }))} /></label>
                <label className="field"><span>Placement support</span><input value={trainingModal.item.placement || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, placement: event.target.value } }))} /></label>
                <label className="field"><span>Tools / technologies</span><textarea value={trainingModal.item.tools || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, tools: event.target.value } }))} /></label>
                <label className="field"><span>Syllabus</span><textarea value={trainingModal.item.syllabus || "Introduction and environment setup\nProject sprints and collaborative modules\nAssessment, resume coaching, and portfolio review"} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, syllabus: event.target.value } }))} /></label>
                <label className="field"><span>Image URL / data URL</span><input value={trainingModal.item.imageUrl || ""} readOnly={trainingModal.mode === "view"} onChange={(event) => setTrainingModal((current) => ({ ...current, item: { ...current.item, imageUrl: event.target.value, _pendingImageFile: null, _previewImage: sanitizeImageReference(event.target.value) } }))} /></label>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            {trainingModal.mode !== "view" ? (
              <button type="button" className="primary-button" onClick={saveTrainingModal} disabled={trainingModalUploading}>
                {trainingModalUploading ? "Saving..." : "Save"}
              </button>
            ) : null}
            <button type="button" className="ghost-button compact" onClick={closeTrainingModal}>Close</button>
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

function ModalSurface({ title, onClose, children }) {
  return (
    <div className="modal-surface">
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-shell" role="dialog" aria-modal="true">
        <div className="modal-head">
          <strong>{title}</strong>
          <button type="button" className="ghost-button compact" onClick={onClose}>Close</button>
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

function LeadsTable({ leads, users }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Interest</th>
            <th>Value</th>
            <th>Source</th>
            <th>Status</th>
            <th>Assigned to</th>
            <th>Assigned Date</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <div className="person-cell">
                  <div className="avatar soft">{initials(lead.name)}</div>
                  <strong>{lead.name}</strong>
                </div>
              </td>
              <td>{lead.type}</td>
              <td>{lead.interest}</td>
              <td>{formatCurrency(lead.value)}</td>
              <td>{lead.source || lead.leadSource || "-"}</td>
              <td>
                <span className={badgeClass(lead.status)}>{lead.status}</span>
              </td>
              <td>{users.find((user) => user.id === lead.assignedTo)?.name ?? "-"}</td>
              <td>{formatDateDDMMYYYY(lead.assignedDate)}</td>
              <td>{lead.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
                <div className="avatar soft">{initials(task.emp)}</div>
                <strong>{task.emp}</strong>
              </div>
            </td>
            <td>{task.title}</td>
            <td>
              <span className={badgeClass(task.priority)}>{task.priority}</span>
            </td>
            <td>{task.due}</td>
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

function UsersTable({ users }) {
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

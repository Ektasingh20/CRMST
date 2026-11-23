import { TEAM_DEMO_MODE, dashboardProjects } from "./team/teamData.js";
import { useTeamState, saveDemoProject } from "./team/teamStore.js";
import { ProjectTeamProvider, ProjectTeamButton, ProjectTeamAvatars, AssignedTeamCard } from "./team/ProjectTeam.jsx";
import { canManageTeam, teamNavigation, teamTitles } from "./team/teamRegistration.js";
import TeamOverview from "./team/TeamOverview.jsx";
import AssignProjects from "./team/AssignProjects.jsx";
import TeamProgress from "./team/TeamProgress.jsx";
import {
  checkInAttendance,
  checkOutAttendance,
  fetchAttendanceCalendar,
  fetchAttendanceMonth,
  fetchAppNotifications,
  fetchITProjects,
  fetchLeaves,
  fetchProjects,
  fetchTodayAttendance,
  markAppNotificationRead,
  syncAttendanceHistory,
  updateProject,
} from "../../backendApi.js";
import TasksPage from "./TasksPage.jsx";
import ITLeaveRequestPage from "./LeaveRequestPage.jsx";
import NotificationsPage from "./NotificationsPage.jsx";
import { filterITNotifications, notificationDestination, notificationId } from "./workPageModel.js";
import "./workPages.css";
import PasswordResetLink from "../PasswordResetLink.jsx";
import CallListDatePicker from "../../CallListDatePicker.jsx";
import SalesTableHead from "../crm-executive/SalesTableHead.jsx";
import { SettingsTab as SharedAccountSettings } from "../crm-executive/CrmExecutiveDashboard.jsx";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { withDemoProjectPresentation } from "./demoProjectPresentation";
import { demoProjects } from "./demoProjects";
import OpenBugsPage from "./OpenBugsPage";
import DailyOverview from "./DailyOverview.jsx";
import MyWorkPage from "./MyWorkPage.jsx";
import ClarificationPage from "./ClarificationPage";
import HelpdeskChat, { HelpdeskIncomingToast } from "../shared/HelpdeskChat.jsx";
import LogoutConfirmDialog from "../shared/LogoutConfirmDialog.jsx";
import ProjectStatusSection from "./ProjectStatusSection";
import { applyProjectStatus, projectStatusSummary } from "./projectStatus";
import { getUploadedProjectFiles, requirementSections } from "./projectFiles";
import {
  attendanceReportStatusLabel,
  buildAttendanceReportRows,
  filterAttendanceReportRows,
  getAttendanceReportDateRange,
  getAttendanceReportMonths,
  pendingLeaveRequestForDate,
} from "../crm-executive/attendanceReport.js";
import {
  attendanceCutoffPassed,
  attendanceDateInIndia,
  attendanceHolidayForDate,
} from "../../../shared/attendanceClassification.js";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  Settings as SettingsIcon,
  CheckSquare,
  ListChecks,
  UserCircle2,
  LogOut,
  Search,
  Moon,
  Sun,
  Download,
  FileText,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  X,
  Menu,
  FolderKanban,
  ClipboardCheck,
  Bug,
  MessageSquare,
  CircleCheck,
  AlertCircle,
  FileSearch,
  BellRing,
  Clock3,
  CalendarDays,
  MessageSquareText,
  Check,
  CircleX,
  Hourglass,
  UserCircle,
  ChevronDown,
  RefreshCw,
  LoaderCircle,
} from "lucide-react";

/* ============================================================
   THEME — pasted stylesheet, verbatim, plus a small supplemental
   block at the end for the pieces this dashboard needs that the
   original sheet didn't name (info strip, filter row, badges for
   a couple of extra statuses, document-upload cards, etc).
   ============================================================ */

export const THEME_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap");

:root {
  color-scheme: light;
  --bg: #ebe7e2;
  --surface: rgba(255, 255, 255, 0.92);
  --surface-strong: #ffffff;
  --surface-deep: #0e1215;
  --surface-muted: #f5efe8;
  --line: rgba(178, 147, 118, 0.18);
  --line-soft: rgba(178, 147, 118, 0.12);
  --text: #1f1a17;
  --text-soft: #675d55;
  --text-faint: #9c8f86;
  --brand: #8d5e38;
  --brand-deep: #643e23;
  --brand-soft: #f5e5d3;
  --success: #1f6f58;
  --success-soft: #dceee5;
  --warning: #a17835;
  --warning-soft: #f6ead7;
  --danger: #a74539;
  --danger-soft: #f7d8d3;
  --blue: #2f5c98;
  --blue-soft: #dce4f3;
  --teal: #0f7f73;
  --teal-soft: #d9efed;
  --violet: #6f4d96;
  --violet-soft: #e8e0f4;
  --shadow: 0 30px 60px rgba(41, 31, 24, 0.14);
  --radius-xl: 32px;
  --radius-lg: 24px;
  --radius-md: 18px;
  --radius-sm: 14px;
  font-family: "Manrope", sans-serif;
}

* { box-sizing: border-box; }
html, body, #root { min-height: 100%; }
body {
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(207, 98, 57, 0.12), transparent 26%),
    radial-gradient(circle at 85% 10%, rgba(42, 102, 200, 0.08), transparent 22%),
    linear-gradient(180deg, #f8f5f0 0%, #f0ebe4 100%);
  color: var(--text);
}
button, input, select, textarea { font: inherit; }
img { display: block; max-width: 100%; }

.eyebrow {
  margin: 0 0 6px;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 800;
}

.primary-button, .ghost-button, .icon-button {
  border: 1px solid transparent;
  border-radius: 14px;
  min-height: 46px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}
.primary-button:hover, .ghost-button:hover, .icon-button:hover { transform: translateY(-1px); }
.primary-button {
  background: linear-gradient(135deg, var(--brand), var(--brand-deep));
  color: white;
  box-shadow: 0 18px 30px rgba(140, 85, 43, 0.22);
}
.primary-button:disabled { opacity: 0.55; cursor: not-allowed; transform:none; }
.crm-upload-button {
  background: linear-gradient(135deg, #2c9b70, #17634b);
  box-shadow: 0 16px 28px rgba(31, 111, 88, 0.22);
}
.ghost-button {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(178, 147, 118, 0.22);
  color: var(--text);
}
.ghost-button:hover { background: rgba(255, 255, 255, 1); }
.icon-button { width: 44px; padding: 0; background: white; border-color: var(--line); }
.full-width { width: 100%; }

.logo-badge {
  width: 64px; height: 64px; border-radius: 18px; background: #050607; color: white;
  display: grid; place-items: center; position: relative; flex-shrink: 0; overflow: hidden;
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.22);
}
.logo-badge span { position: absolute; font-weight: 800; font-size: 2rem; line-height: 1; }
.logo-badge span:first-child { left: 10px; top: 10px; }
.logo-badge span:last-child { right: 12px; bottom: 8px; }
.logo-badge i { position: absolute; width: 10px; height: 120%; background: white; transform: rotate(24deg); border-radius: 999px; }
.logo-badge.compact { width: 42px; height: 42px; border-radius: 14px; }
.logo-badge.compact span { font-size: 1.25rem; }
.logo-badge.compact span:first-child { left: 6px; top: 6px; }
.logo-badge.compact span:last-child { right: 7px; bottom: 5px; }

.shell { height: 100vh; display: grid; grid-template-columns: 302px minmax(0, 1fr); padding: 16px; gap: 16px; }

.sidebar {
  background: linear-gradient(180deg, rgba(18, 18, 20, 0.98), rgba(12, 12, 14, 0.98));
  border: 1px solid rgba(208, 72, 50, 0.42);
  border-radius: 30px;
  color: white;
  padding: 18px 14px 14px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px);
  max-height: calc(100vh - 32px);
  overflow: hidden;
  transition: width 220ms ease, transform 220ms ease;
  box-shadow: 0 24px 50px rgba(8, 9, 10, 0.22);
}

.brand { display: flex; align-items: center; gap: 12px; padding: 4px 8px 16px; border-bottom: 1px solid var(--line-soft); }
.it-brand-logo { width: 52px !important; height: 52px !important; border-radius: 15px !important; }
.it-brand-logo span:first-child { left: 8px !important; top: 6px !important; }
.it-brand-logo span:last-child { right: 8px !important; bottom: 5px !important; }
.sidebar-profile { display: flex; flex-direction: column; align-items: center; gap: 12px; width: calc(100% - 24px); max-width: 288px; margin: 14px auto 0; padding: 16px 12px 18px; }
.sidebar-profile-avatar,
.sidebar-profile-image { width: 150px; height: 150px; flex: 0 0 150px; border: 3px solid rgba(255,255,255,0.8); border-radius: 8px; }
.sidebar-profile-avatar { font-size: 3.5rem; display:grid; place-items:center; background: linear-gradient(135deg,#df684b,#ad3e2d); color: #fff; }
.sidebar-profile-avatar svg { width: 54px; height: 54px; }
.sidebar-profile-image { display: block; object-fit: cover; }
.sidebar-profile-name { font-size: 1rem; font-weight: 700; color: white; text-align: center; overflow-wrap: anywhere; }
.brand-copy strong { display: block; font-size: 0.98rem; color: white; }
.brand-copy span, .user-chip span { color: rgba(255, 255, 255, 0.66); font-size: 0.82rem; }

.sidebar-search {
  margin: 14px 6px 8px; height: 42px; border-radius: 14px; background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(225, 86, 54, 0.4); display: flex; align-items: center; gap: 10px; padding: 0 14px;
  color: rgba(255, 255, 255, 0.62);
}
.sidebar-search input { width: 100%; background: transparent; border: 0; color: white; outline: none; }

.nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 6px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.3) transparent; }
.nav-group { margin-bottom: 10px; }
.nav-group p { margin: 12px 10px 6px; font-size: 0.68rem; color: rgba(255, 255, 255, 0.52); letter-spacing: 0.16em; text-transform: uppercase; font-weight: 800; }
.nav-item {
  width: 100%; border: 1px solid transparent; background: transparent; color: rgba(255, 255, 255, 0.88);
  display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 12px;
  border-radius: 14px; font-weight: 700; letter-spacing: 0.01em; cursor: pointer;
}
.nav-item:hover, .nav-item.active {
  background: linear-gradient(135deg, rgba(41, 41, 44, 0.92), rgba(28, 28, 31, 0.95));
  color: white; border-color: rgba(215, 86, 56, 0.48);
}
.nav-item.active { box-shadow: inset 3px 0 0 #d55c41; }
.nav-item-left, .user-chip { display: flex; align-items: center; gap: 10px; }
.sidebar .nav { min-height: 0; }
.sidebar .nav-item-left { min-width: 0; text-align: left; }
.sidebar .nav-item-left svg { flex-shrink: 0; }
.sidebar .nav-item-left > span { white-space: normal; overflow-wrap: anywhere; }
.sidebar > .brand, .sidebar > .sidebar-profile, .sidebar > .sidebar-search, .sidebar > .sidebar-footer { flex-shrink: 0; }
.nav-pill {
  min-width: 26px; height: 26px; border-radius: 999px; background: linear-gradient(135deg, #d26147, #9a3828);
  color: white; display: grid; place-items: center; font-size: 0.76rem; font-weight: 800; padding: 0 6px;
  box-shadow: 0 8px 18px rgba(173, 63, 42, 0.3);
}
.sidebar-footer { padding: 12px 8px 2px; border-top: 1px solid rgba(216, 82, 53, 0.28); }

.workspace {
  min-width: 0; height: calc(100vh - 32px); background: rgba(255, 255, 255, 0.58); backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.72); border-radius: 32px; overflow: hidden; display: flex; flex-direction: column;
  box-shadow: var(--shadow);
}
.topbar {
  padding: 24px 26px; display: flex; align-items: center; justify-content: space-between; gap: 18px;
  border-bottom: 1px solid rgba(178, 147, 118, 0.14); background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(10px);
}
.topbar-left, .topbar-right { display: flex; align-items: center; gap: 14px; }
.topbar h1 { margin: 0; font-size: 1.28rem; color: var(--text); }
.topbar-subtitle { margin: 2px 0 0; color: var(--text-soft); font-size: max(16px, .84rem); }
.it-topbar-popover { position: relative; }
.it-notification-button { position: relative; background: #fff; }
.it-notification-button.has-unread > svg { transform-origin: 50% 15%; animation: it-notification-bell-ring 2.5s ease-in-out infinite; }
.it-notification-button.has-incoming > svg { transform-origin: 50% 15%; animation: it-notification-bell-ring .9s ease-in-out 2; }
@keyframes it-notification-bell-ring {
  0%, 63%, 100% { transform: rotate(0); }
  7%, 21% { transform: rotate(15deg); }
  14%, 28% { transform: rotate(-13deg); }
  35% { transform: rotate(12deg); }
  42% { transform: rotate(-10deg); }
  49% { transform: rotate(8deg); }
  56% { transform: rotate(-6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .it-notification-button.has-unread > svg,
  .it-notification-button.has-incoming > svg { animation: none; }
}
.it-bell-badge { position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; padding: 0 5px; display: grid; place-items: center; border: 2px solid #fff; border-radius: 999px; background: #d55c41; color: #fff; font-size: 9px; font-weight: 800; }
.it-user-chip {
  padding: 7px 11px; display: flex; align-items: center; gap: 10px;
  border: 1px solid var(--line); border-radius: 16px; background: #fff; color: var(--text);
  cursor: pointer; text-align: left;
}
.it-user-chip:hover, .it-user-chip[aria-expanded="true"] { border-color: rgba(141,94,56,.5); box-shadow: 0 7px 18px rgba(91,56,27,.1); }
.it-user-avatar { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; overflow: hidden; border-radius: 12px; background: var(--brand-soft); color: var(--brand-deep); font-weight: 800; }
.it-user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.it-user-chip-copy { min-width: 0; }
.it-user-chip-copy strong, .it-user-chip-copy span { display: block; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.it-user-chip-copy strong { font-size: 16px; }
.it-user-chip-copy span { margin-top: 2px; color: var(--text-soft); font-size: 16px; }
.it-topbar-menu {
  position: absolute; top: calc(100% + 10px); right: 0; z-index: 50; width: min(330px, calc(100vw - 32px));
  overflow: hidden; border: 1px solid var(--line); border-radius: 16px; background: #fff;
  box-shadow: 0 18px 42px rgba(51,38,25,.18);
}
.it-topbar-menu-head { padding: 15px 16px; border-bottom: 1px solid var(--line-soft); font-size: .9rem; }
.it-topbar-menu-empty { margin: 0; padding: 24px 16px; color: var(--text-soft); text-align: center; font-size: .82rem; }
.it-topbar-notification-list { max-height: 330px; overflow-y: auto; }
.it-topbar-notification { width: 100%; padding: 13px 16px; border: 0; border-bottom: 1px solid var(--line-soft); background: #fff; color: var(--text); text-align: left; line-height: 1.45; cursor: pointer; }
.it-topbar-notification.unread { background: #fff7ec; font-weight: 700; }
.it-topbar-notification:hover { background: #faf4ed; }
.it-profile-menu { padding: 16px; }
.it-profile-menu-identity { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--line-soft); }
.it-profile-menu-avatar { width: 46px; height: 46px; flex: 0 0 46px; display: grid; place-items: center; overflow: hidden; border-radius: 13px; background: var(--brand-soft); color: var(--brand-deep); font-weight: 800; }
.it-profile-menu-avatar img { width: 100%; height: 100%; object-fit: cover; }
.it-profile-menu-identity strong, .it-profile-menu-identity span { display: block; }
.it-profile-menu-identity span { margin-top: 3px; color: var(--text-soft); font-size: .76rem; }
.it-profile-menu-data { display: grid; gap: 10px; padding: 14px 0; font-size: .78rem; }
.it-profile-menu-data div { display: flex; justify-content: space-between; gap: 12px; }
.it-profile-menu-data span { color: var(--text-soft); }
.it-profile-menu-data b { max-width: 68%; overflow-wrap: anywhere; text-align: right; }
.it-profile-menu-link { width: 100%; min-height: 40px; border: 0; border-radius: 10px; background: var(--surface-muted); color: var(--brand-deep); font-weight: 800; cursor: pointer; }
.content { padding: 24px; overflow-y: auto; overflow-x: hidden; flex: 1; scroll-behavior: smooth; }
.content.it-helpdesk-content { display: flex; min-height: 0; overflow: hidden; }
.content.it-settings-content { padding: 14px; }
.it-settings-sales-layout { width: 100%; min-width: 0; }
.it-helpdesk-content > .it-helpdesk-sales-layout { flex: 1; width: 100%; min-height: 0; }
.it-helpdesk-sales-layout .eh-helpdesk { width: 100%; min-height: 0; }
.it-helpdesk-sales-layout .eh-chat-app { height: calc(100dvh - 190px); min-height: 650px; max-height: none; }
@media (max-width: 760px) {
  .content.it-helpdesk-content { display: block; overflow-y: auto; }
  .it-helpdesk-sales-layout .eh-chat-app { height: auto; min-height: 650px; }
}

.panel {
  border-radius: 22px; overflow: hidden;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 243, 238, 0.98));
  border: 1px solid rgba(178, 147, 118, 0.18); box-shadow: 0 24px 48px rgba(62, 43, 28, 0.08);
}
.panel-head { padding: 18px 20px; border-bottom: 1px solid rgba(178, 147, 118, 0.12); background: rgba(255, 255, 255, 0.98); }
.panel-head h3 { margin: 0; font-size: 1.02rem; color: var(--text); }
.panel-subtitle { margin: 4px 0 0; color: var(--text-soft); font-size: 0.82rem; }
.panel-body { padding: 8px 0; background: rgba(255, 255, 255, 0.78); }
.panel-footer { padding: 12px 20px 18px; display: flex; justify-content: flex-end; }
.panel-empty { padding: 40px 20px; text-align: center; color: var(--text-faint); font-size: 0.9rem; }

.hero-card, .signal-card, .stat-card {
  background: var(--surface); border: 1px solid rgba(255, 255, 255, 0.7); box-shadow: 0 18px 38px rgba(90, 63, 39, 0.06);
}
.hero-card { padding: 26px 28px 28px; border-radius: 28px; }
.dashboard-hero {
  background: radial-gradient(circle at top right, rgba(207, 98, 57, 0.12), transparent 22%), linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.86));
}
.hero-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.hero-tag {
  height: fit-content; border-radius: 999px; padding: 10px 14px; display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255, 255, 255, 0.82); color: var(--brand-deep); border: 1px solid rgba(207, 98, 57, 0.14);
  font-size: 0.82rem; font-weight: 700;
}
.hero-card h2 { margin: 6px 0 0; font-size: 1.8rem; }
.hero-copy { margin: 14px 0 20px; line-height: 1.75; color: var(--text-soft); }

.field { display: flex; flex-direction: column; gap: 8px; }
.field span { font-size: 0.85rem; font-weight: 700; color: var(--text-soft); }
.field input, .field select, .field textarea {
  min-height: 48px; border-radius: 14px; border: 1px solid var(--line); padding: 12px 14px;
  background: rgba(255, 255, 255, 0.88); color: var(--text); outline: none; width: 100%;
}
.field input:focus, .field select:focus, .field textarea:focus {
  border-color: rgba(207, 98, 57, 0.55); box-shadow: 0 0 0 4px rgba(207, 98, 57, 0.12);
}
.field input:disabled { color: var(--text-faint); background: var(--surface-muted); }

.form-grid, .settings-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.form-grid .span-full, .settings-layout .span-full { grid-column: 1 / -1; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; min-width: 900px; }
.table th, .table td { padding: 14px 20px; text-align: left; border-bottom: 1px solid rgba(178, 147, 118, 0.12); vertical-align: middle; color: var(--text); }
.table th { color: var(--text-soft); font-size: 0.74rem; letter-spacing: 0.12em; text-transform: uppercase; background: rgba(245, 237, 228, 0.96); }
.table tbody tr:hover { background: rgba(245, 240, 236, 0.9); }
.table tbody tr:last-child td { border-bottom: 0; }
.it-attendance-report-panel {
  width: 100%; border: 1px solid rgba(178,147,118,.22); border-radius: 18px;
  background: #fff; box-shadow: 0 12px 28px rgba(90,63,39,.07);
}
.it-attendance-report-panel .panel-head {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 15px 18px; background: #fff;
}
.it-attendance-report-panel .panel-subtitle { margin: 5px 0 0; color: var(--text-soft); font-size: 16px; }
.it-attendance-report-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.it-attendance-report-actions button {
  min-height: 38px; height: 38px; padding: 0 15px; border-radius: 11px; gap: 7px; font-size: 16px;
}
.it-attendance-sync-button {
  border-color: #dfc5ae; background: linear-gradient(180deg,#fffaf5 0%,#fff2e7 100%);
  color: #704229; font-weight: 750; box-shadow: 0 5px 14px rgba(112,66,41,.08);
}
.it-attendance-sync-button:hover:not(:disabled) { border-color: #c99a75; background: #ffead9; box-shadow: 0 8px 18px rgba(112,66,41,.14); }
.it-attendance-sync-button.syncing svg { animation: it-attendance-sync-spin .8s linear infinite; }
@keyframes it-attendance-sync-spin { to { transform: rotate(360deg); } }
.it-attendance-report-summary {
  display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 10px; padding: 14px 16px;
}
.it-attendance-report-summary > div {
  display: grid; gap: 4px; min-height: 80px; padding: 12px 15px;
  border: 1px solid #ead9c9; border-radius: 9px; background: #fffdfa;
}
.it-attendance-report-summary span { color: #776b60; font-size: 16px; }
.it-attendance-report-summary strong { color: var(--text); font-size: 1.3rem; }
.it-attendance-report-toolbar {
  display: grid; grid-template-columns: repeat(4,minmax(0,1fr)) auto; align-items: end;
  gap: 10px; padding: 0 16px 14px;
}
.it-attendance-report-toolbar label { display: grid; gap: 5px; min-width: 0; color: #776b60; font-size: 16px; font-weight: 650; }
.it-attendance-filter-select { width: 100%; min-width: 0; }
.it-attendance-filter-trigger {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  width: 100%; min-width: 0; height: 38px; padding: 0 11px;
  border: 1px solid #e5d6c9; border-radius: 7px; outline: 0;
  background: #fffdfb; color: #402d20; box-shadow: 0 1px 2px rgba(62,43,28,.04);
  font: inherit; font-size: 15px; font-weight: 600; text-align: left; cursor: pointer;
}
.it-attendance-filter-trigger span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.it-attendance-filter-trigger svg { flex: 0 0 auto; color: #7b6b60; }
.it-attendance-filter-trigger:hover { border-color: #c9ab91; }
.it-attendance-filter-trigger:focus-visible { border-color: #b8875e; box-shadow: 0 0 0 3px rgba(184,135,94,.13); }
.it-attendance-filter-menu {
  z-index: 2200; display: grid; gap: 1px; max-height: min(320px,calc(100vh - 16px)); overflow-y: auto;
  padding: 3px; border: 1px solid #e5d8cb; border-radius: 9px; background: #fff;
  box-shadow: 0 10px 24px rgba(41,31,24,.2); font-family: "Manrope",sans-serif; font-size: 14px;
}
.it-attendance-filter-menu button {
  display: flex; align-items: center; width: 100%; min-height: 36px; padding: 0 10px;
  border: 0; border-radius: 5px; background: transparent; color: #4a4038;
  font: inherit; text-align: left; cursor: pointer;
}
.it-attendance-filter-menu button:hover,
.it-attendance-filter-menu button[aria-selected="true"] { background: #f3ede4; }
.it-attendance-filter-menu button:focus-visible { outline: 2px solid #b8875e; outline-offset: -2px; }
.it-attendance-report-toolbar > button { min-height: 38px; height: 38px; border-radius: 7px; font-size: 16px; }
.it-attendance-report-panel .call-list-date-picker {
  width: 100%; min-width: 0; height: 38px; flex: initial; padding: 0 10px;
  border: 1px solid #e5d6c9; border-radius: 7px; background: #fffdfb; color: #704229;
  display: flex; align-items: center; gap: 9px; box-shadow: 0 1px 2px rgba(62,43,28,.04);
  font-size: 13px; font-weight: 650;
}
.it-attendance-report-panel .call-list-date-picker:hover { border-color: #c9ab91; }
.it-attendance-report-panel .call-list-date-picker:focus-within { border-color: #b8875e; box-shadow: 0 0 0 3px rgba(184,135,94,.13); }
.it-attendance-report-panel .call-list-date-picker > span {
  flex: 0 0 auto; padding-right: 8px; border-right: 1px solid #eee4da;
  color: #8a796b; font-size: 11px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase;
}
.it-attendance-report-panel .call-list-date-trigger {
  display: flex; align-items: center; justify-content: space-between; flex: 1; min-width: 0;
  height: 32px; padding: 0 2px; border: 0; background: transparent; color: #302923;
  font: inherit; font-size: 13px; font-weight: 600; text-align: left; cursor: pointer;
}
.it-attendance-report-panel .call-list-date-trigger svg { flex: 0 0 auto; width: 15px; height: 15px; color: #8d5e38; }
.it-attendance-report-panel .table-wrap { padding: 0 16px 10px; overflow-x: auto; }
.it-attendance-report-panel .attendance-report-table {
  width: 100%; min-width: 780px; table-layout: fixed; border-collapse: separate; border-spacing: 0;
  overflow: hidden; border: 1px solid #eddfd3; border-radius: 8px 8px 0 0;
}
.it-attendance-report-panel .attendance-report-table th,
.it-attendance-report-panel .attendance-report-table td { padding: 9px 12px; overflow-wrap: normal; }
.it-attendance-report-panel .attendance-report-table th {
  line-height: 1.35; white-space: nowrap; font-size: 14px; background: linear-gradient(180deg,#a65d2d 0%,#7b3f20 100%);
  color: #fff; text-transform: uppercase; border: 0; letter-spacing: .02em; box-shadow: inset 0 -1px rgba(255,255,255,.1);
}
.it-attendance-report-panel .attendance-report-table td { height: 41px; border-bottom: 1px solid #f1e5dc; color: #2f2925; font-size: 13px; vertical-align: middle; }
.it-attendance-report-panel .attendance-report-table th:nth-child(1) { width: 8%; text-align: center; }
.it-attendance-report-panel .attendance-report-table th:nth-child(2) { width: 17%; }
.it-attendance-report-panel .attendance-report-table th:nth-child(3) { width: 16%; }
.it-attendance-report-panel .attendance-report-table th:nth-child(4),
.it-attendance-report-panel .attendance-report-table th:nth-child(5) { width: 20%; }
.it-attendance-report-panel .attendance-report-table th:nth-child(6) { width: 19%; text-align: center; }
.it-attendance-report-panel .attendance-report-table tbody tr:nth-child(odd) td { background: #fff; }
.it-attendance-report-panel .attendance-report-table tbody tr:nth-child(even) td { background: #fdf1ea; }
.it-attendance-report-panel .attendance-report-table tbody tr:hover td { background: #f8e7de; box-shadow: none; }
.it-attendance-report-panel .attendance-report-heading,
.it-attendance-report-panel .sales-table-heading { display: inline-flex; align-items: center; gap: 7px; vertical-align: middle; white-space: nowrap; }
.it-attendance-report-panel .attendance-report-heading svg,
.it-attendance-report-panel .sales-table-heading svg { flex: 0 0 14px; }
.it-attendance-report-panel .attendance-report-serial { color: #3f342d; text-align: center; font-weight: 600; }
.it-attendance-report-panel .attendance-report-date { font-weight: 650; }
.it-attendance-report-panel td.attendance-report-status-cell { padding: 6px 12px; text-align: center; }
.it-attendance-report-status-pill {
  display: inline-flex; align-items: center; justify-content: center; width: min(100%,116px); min-height: 25px;
  gap: 7px; padding: 4px 12px; border: 0; border-radius: 999px; font-size: 13px; font-weight: 750;
  line-height: 1; white-space: nowrap;
}
.it-attendance-report-status-pill.is-present { background: #6b3e2b; color: #fff; }
.it-attendance-report-status-pill.is-absent { background: #ffddbd; color: #9a3f08; }
.it-attendance-report-status-pill.is-holiday { background: #f1d7c3; color: #6b3e2b; }
.it-attendance-report-status-pill.is-leave,
.it-attendance-report-status-pill.is-leave-applied { background: #f2dfad; color: #72520b; }
 .it-attendance-report-status-pill.is-pending,
 .it-attendance-report-status-pill.is-pending-sync,
.it-attendance-report-status-pill.is-upcoming,
.it-attendance-report-status-pill.is-unknown { background: #eee9e4; color: #5f554d; }
.it-attendance-report-status-pill.is-apply-leave { border: 1px solid #e9b47e; background: #fff0df; color: #9a3f08; cursor: pointer; }
.it-attendance-report-status-pill.is-apply-leave:hover { background: #ffe3c4; box-shadow: 0 4px 12px rgba(154,63,8,.16); transform: translateY(-1px); }
.it-attendance-report-status-pill.is-apply-leave:focus-visible { outline: 2px solid #9a3f08; outline-offset: 2px; }
.it-attendance-report-empty { padding: 34px 20px !important; color: var(--text-faint) !important; text-align: center; }

/* CallListDatePicker renders its calendar in a portal, so these shared Sales styles stay global. */
.call-list-calendar-popover { z-index: 2200; width: 280px; padding: 10px; border: 1px solid #e5d6c9; border-radius: 12px; background: #fffdfb; color: #302923; box-shadow: 0 12px 30px rgba(62,43,28,.2); font-family: "Manrope",sans-serif; }
.call-list-calendar-header { display: grid; grid-template-columns: 32px 1fr 32px; align-items: center; gap: 4px; margin-bottom: 8px; color: #704229; }
.call-list-calendar-header strong { text-align: center; font-size: 13px; font-weight: 750; }
.call-list-calendar-header button,.call-list-calendar-footer button { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 0 7px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: #704229; font: inherit; cursor: pointer; }
.call-list-calendar-header button:hover,.call-list-calendar-footer button:hover { border-color: #e5d6c9; background: #f3ede4; }
.call-list-calendar-header button:disabled { color: #c8bdb4; cursor: not-allowed; }
.call-list-calendar-grid { display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); gap: 3px; }
.call-list-calendar-weekday { display: grid; place-items: center; height: 25px; color: #8b796a; font-size: 11px; font-weight: 700; }
.call-list-calendar-day,.call-list-calendar-empty { display: grid; place-items: center; width: 100%; height: 30px; }
.call-list-calendar-day { border: 1px solid transparent; border-radius: 7px; background: transparent; color: #403832; font: inherit; font-size: 12px; cursor: pointer; }
.call-list-calendar-day:hover:not(:disabled) { background: #f3ede4; }
.call-list-calendar-day.today { border-color: #b8875e; color: #704229; font-weight: 750; }
.call-list-calendar-day.selected { border-color: #704229; background: #804727; color: #fff; font-weight: 750; }
.call-list-calendar-day:disabled { color: #c4b8ad; cursor: not-allowed; }
.call-list-calendar-footer { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 7px; border-top: 1px solid #eee6dc; }
.call-list-calendar-footer button { min-width: 48px; font-size: 12px; font-weight: 700; }
@media (max-width: 900px) {
  .it-attendance-report-summary { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .it-attendance-report-toolbar { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .it-attendance-report-toolbar > button { width: 100%; }
}
@media (max-width: 620px) {
  .it-attendance-report-panel .panel-head { align-items: flex-start; flex-direction: column; }
  .it-attendance-report-actions { width: 100%; }
  .it-attendance-report-actions button { flex: 1; }
  .it-attendance-report-toolbar { grid-template-columns: 1fr; }
}

.badge { display: inline-flex; align-items: center; justify-content: center; height: 30px; padding: 0 12px; border-radius: 999px; font-size: 0.82rem; font-weight: 700; }
.badge.success { color: var(--success); background: var(--success-soft); }
.badge.warning { color: var(--warning); background: var(--warning-soft); }
.badge.danger { color: var(--danger); background: var(--danger-soft); }
.badge.info { color: var(--blue); background: var(--blue-soft); }
.badge.neutral { color: var(--text-soft); background: #efe7e0; }

.module-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 20px 6px; flex-wrap: wrap; }
.toolbar-search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.92); border: 1px solid var(--line); border-radius: 14px; padding: 0 14px; min-height: 48px; }
.toolbar-search input { width: 100%; border: none; background: transparent; outline: none; color: var(--text); }

.settings-section { background: var(--surface); border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 24px; padding: 24px; box-shadow: 0 18px 38px rgba(90, 63, 39, 0.06); }
.settings-section-header { margin-bottom: 18px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.settings-section-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.08em; }
.settings-identity { display: flex; align-items: center; gap: 18px; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid var(--line-soft); flex-wrap: wrap; }
.settings-identity strong { display: block; font-size: 1.05rem; font-weight: 700; color: var(--text); }
.settings-identity span { display: block; font-size: 0.82rem; color: var(--text-soft); margin-top: 4px; }
.settings-form { display: grid; gap: 14px; }

.avatar-upload { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.avatar-upload-label {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 12px; border: 1px solid var(--line);
  background: #ffffffc2; color: var(--text); font-size: 0.82rem; font-weight: 600; cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.avatar-upload-label:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(90, 63, 39, 0.08); }
.avatar-preview { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; border: 2px solid var(--line); display:grid; place-items:center; background: var(--surface-muted); color: var(--text-faint); }

.password-input-wrap { position: relative; display: flex; align-items: center; }
.password-input-wrap input { width: 100%; padding-right: 44px; }
.password-toggle { position: absolute; right: 10px; background: transparent; border: none; color: var(--text-soft); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 8px; }
.password-toggle:hover { color: var(--text); }

.modal-surface { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 18px; }
.modal-backdrop { position: absolute; inset: 0; background: rgba(20, 12, 9, 0.42); backdrop-filter: blur(3px); }
.modal-shell { position: relative; width: min(560px, 100%); max-height: 88vh; overflow: auto; background: #f8f5ef; border: 1px solid rgba(190, 165, 128, 0.9); border-radius: 18px; box-shadow: 0 20px 60px rgba(54, 28, 5, 0.28); }
.modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid rgba(186, 160, 122, 0.55); background: linear-gradient(180deg, rgba(255, 251, 246, 0.96), rgba(245, 238, 225, 0.96)); }
.modal-head strong { font-size: 1rem; color: #37281b; }
.modal-body { padding: 20px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }

.toast { position: fixed; right: 30px; bottom: 30px; border-radius: 16px; background: #14110f; color: white; padding: 14px 16px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.22); z-index: 60; display:flex; align-items:center; gap:12px; }

.mobile-only { display: none; }
.mobile-scrim { display: none; }

@media (max-width: 980px) {
  .shell { grid-template-columns: 1fr; padding: 12px; }
  .sidebar { position: fixed; top: 12px; bottom: 12px; left: 12px; width: min(320px, calc(100vw - 24px)); transform: translateX(-110%); z-index: 40; }
  .sidebar.mobile-open { transform: translateX(0); }
  .mobile-scrim.show { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); z-index: 30; }
  .mobile-only { display: inline-flex; }
  .topbar { flex-wrap: wrap; }
}

@media (max-width: 760px) {
  .content, .topbar { padding: 16px; }
  .form-grid, .settings-layout, .info-strip, .mark-attendance-form, .leave-request-form, .doc-upload-grid { grid-template-columns: 1fr; }
  .table { display: block; overflow-x: auto; }
}

/* ---- supplemental classes for this dashboard build ---- */
.info-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
.info-chip { background: var(--surface-muted); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 14px 16px; }
.info-chip span { display: block; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-faint); margin-bottom: 4px; }
.info-chip strong { font-size: 0.95rem; color: var(--text); }

.it-attendance-page { max-width: 1220px; margin: 18px auto; padding: 0 20px; }
.it-attendance-panel { overflow: hidden; border-radius: 16px; border: 1px solid rgba(178,106,60,.2); background: #fff; box-shadow: 0 16px 40px rgba(58,35,26,.08); }
.it-attendance-success { display: flex; align-items: center; gap: 9px; margin: 20px 22px 0; padding: 13px 15px; border: 1px solid #ddc1a8; border-radius: 9px; background: #f6e8dc; color: #67351f; font-size: .82rem; font-weight: 700; }
.it-attendance-holiday, .it-attendance-auto-absent { margin: 20px 22px 0; padding: 13px 15px; border-radius: 8px; font-size: .82rem; font-weight: 700; }
.it-attendance-holiday { border: 1px solid #ddc1a8; background: #f6e8dc; color: #67351f; }
.it-attendance-auto-absent { border: 1px solid #f0c99d; background: #fff3e7; color: #844322; }
.it-attendance-form { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)) minmax(160px,.9fr); align-items: end; gap: 16px; padding: 21px 22px; background: #fffdfb; }
.it-attendance-field { display: grid; min-width: 0; gap: 7px; color: var(--text); font-size: max(15px,.82rem); font-weight: 700; }
.it-attendance-label { display: inline-flex; align-items: center; gap: 6px; }
.it-attendance-label svg { color: #9a5c35; }
.it-attendance-field input, .it-attendance-field select { width: 100%; min-height: 42px; padding: 0 12px; border: 1px solid #e5d6c9; border-radius: 8px; background: #fffdfb; color: var(--text); font: inherit; outline: none; }
.it-attendance-select-wrap { position: relative; min-width: 0; }
.it-attendance-select-wrap > svg { position: absolute; left: 12px; top: 50%; z-index: 1; transform: translateY(-50%); color: #806b5a; pointer-events: none; }
.it-attendance-select-wrap select { padding-left: 38px; }
.it-attendance-field input:focus, .it-attendance-field select:focus { border-color: #bd8865; box-shadow: 0 0 0 3px rgba(141,94,56,.12); }
.it-attendance-field input:read-only, .it-attendance-field input:disabled, .it-attendance-field select:disabled { background: #f3ede7; color: var(--text-soft); cursor: not-allowed; }
.it-attendance-action { display: grid; min-width: 0; gap: 8px; }
.it-attendance-clock { min-height: 18px; display: flex; align-items: center; justify-content: flex-end; gap: 7px; color: var(--text-soft); font-size: max(13px,.72rem); }
.it-attendance-clock strong { color: var(--text); }
.it-attendance-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #b26a3c; box-shadow: 0 0 0 3px rgba(178,106,60,.12); }
.it-attendance-worked-time { color: #6b3e2b; font-weight: 700; white-space: nowrap; }
.it-attendance-submit { width: 100%; min-height: 42px; padding: 0 16px; border: 0; border-radius: 8px; background: linear-gradient(135deg,#9a5c35,#7d4729); color: #fff; font: inherit; font-weight: 700; cursor: pointer; transition: filter .16s ease,transform .16s ease; }
.it-attendance-submit:hover:not(:disabled) { filter: brightness(1.05); transform: translateY(-1px); }
.it-attendance-submit.checkout { background: linear-gradient(135deg,#b85b37,#963d2a); }
.it-attendance-submit.completed { background: #94877d; }
.it-attendance-submit:disabled { cursor: not-allowed; opacity: .62; transform: none; }
.it-attendance-policy { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); margin: 0 22px 20px; overflow: hidden; border: 1px solid #ead8c9; border-radius: 12px; background: #fffaf6; }
.it-attendance-policy-item { display: flex; align-items: center; min-width: 0; gap: 11px; padding: 14px 16px; }
.it-attendance-policy-item + .it-attendance-policy-item { border-left: 1px solid #ead8c9; }
.it-attendance-policy-icon { width: 32px; height: 32px; flex: 0 0 32px; align-self: center; display: grid; place-items: center; border-radius: 9px; background: #f1d7c3; color: #6b3e2b; line-height: 0; }
.it-attendance-policy-icon svg { display: block; }
.it-attendance-policy-item strong, .it-attendance-policy-item span { display: block; }
.it-attendance-policy-item > .it-attendance-policy-icon { display: grid; align-self: center; place-items: center; line-height: 0; }
.it-attendance-policy-item strong { margin-bottom: 3px; color: #3a231a; font-size: .78rem; line-height: 1.25; }
.it-attendance-policy-item > div > span { color: #7b685c; font-size: .7rem; line-height: 1.35; }
.it-attendance-closed { margin: 0 22px 20px; padding: 12px 14px; border-radius: 10px; background: #fff3e7; color: #844322; font-size: .8rem; font-weight: 700; }
@media (max-width: 1050px) {
  .it-attendance-form { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .it-attendance-policy { grid-template-columns: 1fr; }
  .it-attendance-policy-item + .it-attendance-policy-item { border-left: 0; border-top: 1px solid #ead8c9; }
}
@media (max-width: 620px) {
  .it-attendance-page { padding: 0; margin-top: 0; }
  .it-attendance-form { grid-template-columns: 1fr; padding: 18px; }
  .it-attendance-policy { margin: 0 18px 18px; }
  .it-user-chip-copy { display: none; }
  .it-user-chip { padding: 5px; }
  .topbar-right { gap: 8px; }
}
.leave-request-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; align-items: end; padding: 22px 24px; }

.filters-row { display: flex; flex-wrap: wrap; gap: 14px; align-items: end; padding: 18px 20px; }
.filters-row .field { width: 160px; }
.filters-row .field-grow { flex: 1; min-width: 220px; }

.danger-button { background: linear-gradient(135deg, var(--danger), #7d2f24); color: white; box-shadow: 0 16px 28px rgba(167, 69, 57, 0.24); }

.settings-page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
.settings-page-head h1 { margin: 0; display: flex; align-items: center; gap: 10px; font-size: 1.3rem; }
.settings-stack { display: grid; gap: 18px; margin-top: 18px; }

.doc-upload-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.doc-upload-card { border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface-muted); padding: 14px; display: grid; gap: 10px; }
.doc-upload-card strong { font-size: 0.88rem; color: var(--text); }
.doc-upload-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.78rem; }
.doc-choose { border: 1px solid var(--line); border-radius: 10px; background: white; padding: 7px 12px; font-weight: 700; font-size: 0.76rem; cursor: pointer; }
.doc-status { border: none; border-radius: 10px; padding: 7px 12px; font-weight: 700; font-size: 0.76rem; display: inline-flex; align-items: center; gap: 6px; }
.doc-status.uploaded { background: var(--blue-soft); color: var(--blue); cursor: pointer; }
.doc-status.missing { background: #efe7e0; color: var(--text-faint); cursor: not-allowed; }

.task-list { display: grid; gap: 10px; padding: 14px 20px 20px; }
.task-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border: 1px solid var(--line); border-radius: var(--radius-md); padding: 14px; background: var(--surface-strong); }
.task-item label { display: flex; align-items: flex-start; gap: 10px; flex: 1; cursor: pointer; }
.task-item input[type="checkbox"] { width: 17px; height: 17px; margin-top: 2px; accent-color: var(--brand); }
.task-item strong { display: block; font-size: 0.92rem; color: var(--text); }
.task-item small { color: var(--text-soft); }
.task-item.done strong { color: var(--text-faint); text-decoration: line-through; }
.icon-button.danger:hover { color: var(--danger); border-color: rgba(167, 69, 57, 0.3); }

.dark-toggle { display: flex; align-items: center; gap: 8px; }
.project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 16px; padding: 18px 20px 20px; }
.project-card { padding: 18px; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface-strong); display: grid; gap: 14px; }
.project-card h4 { margin: 0; font-size: 1rem; }
.project-card p { margin: 0; color: var(--text-soft); font-size: 0.84rem; line-height: 1.6; }
.project-meta { display: flex; flex-wrap: wrap; gap: 8px; color: var(--text-soft); font-size: 0.78rem; }
.project-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.project-actions button { min-height: 38px; padding: 0 12px; font-size: 0.8rem; }
.detail-list { display: grid; gap: 12px; padding: 18px 20px 20px; }
.detail-row { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--line-soft); }
.detail-row strong { color: var(--text-soft); font-size: 0.8rem; }
.detail-row span { color: var(--text); line-height: 1.55; }
/* Requirement rows with inline documents and native modal previews. */
.brief-requirements { overflow: hidden; }
.brief-sample-badge { padding: 7px 11px; border-radius: 20px; background: var(--brand-soft); color: var(--brand-deep) !important; font-weight: 700; }
.brief-sections { margin-top: 24px; }
.brief-section { display: grid; grid-template-columns: minmax(180px, .7fr) minmax(0, 1.6fr); gap: 28px; padding: 24px 0; border-top: 1px solid var(--line); }
.brief-section-title { display: grid; grid-template-columns: 28px 1fr; align-content: start; gap: 8px; padding-top: 4px; }
.brief-section-title > span { font-size: .72rem; color: var(--brand); font-weight: 800; padding-top: 3px; }
.brief-section-title h4 { margin: 0; font-size: .91rem; }
.brief-section-title small { grid-column: 2; font-size: .6rem; letter-spacing: .1em; color: var(--text-faint); }
.brief-section-content { display: grid; gap: 12px; min-width: 0; }
.brief-section-content > p { margin: 0; font-size: .86rem; color: var(--text-soft); line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
.brief-file-button { width: 100%; display: flex; align-items: center; gap: 14px; text-align: left; padding: 15px 17px; border: 1px solid var(--line); border-radius: 12px; color: var(--text); background: var(--surface-strong); text-decoration: none; cursor: pointer; font-family: inherit; transition: border-color .2s, background .2s, box-shadow .2s; }
.brief-file-button:hover { background: var(--surface-muted); border-color: var(--brand); box-shadow: 0 4px 14px #643e230b; }
.brief-file-button:focus-visible { outline: 3px solid var(--brand); outline-offset: 3px; }
.brief-file-button > svg { color: var(--brand); flex-shrink: 0; }
.brief-pdf-icon { display: grid; place-items: center; width: 43px; height: 49px; border-radius: 9px; background: #fff0ed; color: #b24c3c; flex-shrink: 0; }
.brief-file-label { display: grid; gap: 5px; flex: 1; min-width: 0; }
.brief-file-label strong { font-size: .84rem; overflow-wrap: anywhere; }
.brief-file-label small { color: var(--text-soft); font-size: .71rem; }
.brief-file-unavailable { opacity: .7; cursor: default; }
.brief-shared-files { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 16px; }
.brief-file-modal { width: min(1120px, 94vw); max-width: 94vw; height: 90vh; max-height: 90vh; padding: 0; border: 1px solid var(--line); border-radius: 20px; background: var(--surface-strong, white); color: var(--text, #27221e); box-shadow: 0 30px 100px #0005; }
.brief-file-modal::backdrop { background: #15110dcc; backdrop-filter: blur(5px); }
.brief-modal-inner { height: 100%; display: flex; flex-direction: column; }
.brief-modal-inner header { display: flex; align-items: center; gap: 14px; padding: 18px 22px; border-bottom: 1px solid var(--line); }
.brief-modal-inner header > div { flex: 1; min-width: 0; }
.brief-modal-inner header p { font-size: .65rem; letter-spacing: .12em; color: var(--text-soft); margin: 0 0 5px; }
.brief-modal-inner header h3 { margin: 0; font-size: 1rem; overflow-wrap: anywhere; }
.brief-modal-inner header a { text-decoration: none; }
.brief-modal-inner object { width: 100%; flex: 1; min-height: 0; border: none; background: #e6e2dc; }
.brief-modal-image { width: 100%; flex: 1; min-height: 0; object-fit: contain; background: #e6e2dc; }
.brief-modal-inner footer { display: flex; justify-content: space-between; padding: 12px 22px; font-size: .7rem; color: var(--text-soft); gap: 12px; }
.brief-preview-fallback { text-align: center; padding: 60px 20px; }
@media (max-width: 650px) { .brief-section { grid-template-columns: 1fr; gap: 14px; } .brief-modal-inner header { flex-wrap: wrap; padding: 12px; } .brief-modal-inner header .brief-pdf-icon { display: none; } .brief-modal-inner footer { padding: 10px; } }
/* Project brief and document library */
.project-workspace { display: grid; gap: 22px; }
.project-overview { padding: 26px; border-top: 4px solid var(--brand); }
.project-overview-top, .project-overview-bottom, .project-overview-badges, .project-section-heading, .project-file-top, .project-file-actions, .project-requirement-heading { display: flex; align-items: center; gap: 12px; }
.project-overview-top { align-items: flex-start; flex-wrap: wrap; }
.project-overview-icon, .project-file-symbol { display: grid; place-items: center; background: var(--brand-soft); color: var(--brand-deep); border-radius: 14px; width: 52px; height: 52px; flex-shrink: 0; }
.project-overview-title { flex: 1; min-width: 180px; }
.project-overview-title h2 { font-size: clamp(1.35rem, 2.5vw, 2rem); margin: 6px 0; overflow-wrap: anywhere; }
.project-overview-title > p:last-child, .project-section-help { color: var(--text-soft); font-size: .85rem; margin: 8px 0 0; }
.project-overview-bottom { justify-content: space-between; flex-wrap: wrap; border-top: 1px solid var(--line); margin-top: 22px; padding-top: 18px; }
.project-overview-badges { flex-wrap: wrap; }
.project-overview-badges > span { display: inline-flex; align-items: center; gap: 7px; font-size: .8rem; }
.project-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; }
.project-facts > div { padding: 19px 22px; background: var(--surface-strong); display: grid; gap: 8px; }
.project-facts span { font-size: .73rem; color: var(--text-soft); }
.project-facts strong { font-size: .9rem; overflow-wrap: anywhere; }
.project-library-panel, .project-requirements { padding: 24px; }
.project-section-heading { justify-content: space-between; flex-wrap: wrap; }
.project-section-heading h3, .project-section-heading h4 { margin: 4px 0; overflow-wrap: anywhere; }
.project-section-heading > span { color: var(--text-soft); font-size: .8rem; }
.project-count { display: inline-block; padding: 3px 9px; border-radius: 8px; background: var(--brand-soft); color: var(--brand-deep); font-size: .8rem; vertical-align: middle; margin-left: 6px; }
.project-file-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 20px; }
.project-file-card { min-width: 0; border: 1px solid var(--line); border-radius: 16px; padding: 18px; background: var(--surface-strong); display: flex; flex-direction: column; transition: box-shadow .2s, border-color .2s; }
.project-file-card:hover { border-color: var(--brand); box-shadow: 0 6px 20px rgba(100,62,35,.08); }
.project-file-top { justify-content: space-between; }
.project-file-symbol { width: 42px; height: 46px; border-radius: 10px; }
.project-file-type { font-size: .65rem; letter-spacing: .08em; font-weight: 800; color: var(--brand-deep); }
.project-file-card h4 { font-size: .88rem; margin: 16px 0 6px; overflow-wrap: anywhere; }
.project-file-card p, .project-file-card small { color: var(--text-soft); font-size: .75rem; margin: 0 0 8px; }
.project-file-actions { margin-top: auto; padding-top: 12px; flex-wrap: wrap; }
.project-file-actions .ghost-button { padding: 8px 10px; font-size: .73rem; text-decoration: none; }
.project-file-missing { font-size: .72rem; color: var(--text-soft); }
.project-preview { margin-top: 20px; border: 1px solid var(--line); padding: 16px; border-radius: 14px; }
.project-preview object { display: block; width: 100%; height: 65vh; margin-top: 16px; border: 0; }
.project-preview img { display: block; max-width: 100%; max-height: 65vh; margin: 16px auto 0; object-fit: contain; }
.project-requirement-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
.project-requirement { padding: 20px; background: var(--surface-muted); border: 1px solid var(--line); border-radius: 14px; min-width: 0; }
.project-requirement-wide { grid-column: 1 / -1; }
.project-requirement-heading span { font-size: .7rem; color: var(--brand); font-weight: 800; }
.project-requirement-heading h4 { margin: 0; font-size: .86rem; }
.project-requirement p { margin: 12px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.75; color: var(--text-soft); font-size: .86rem; }
.project-requirement small { display: flex; align-items: center; gap: 6px; margin-top: 14px; color: var(--brand-deep); font-size: .72rem; }
@media (max-width: 1100px) { .project-file-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 650px) { .project-file-grid, .project-requirement-grid, .project-facts { grid-template-columns: 1fr; } .project-overview, .project-library-panel, .project-requirements { padding: 18px; } .project-overview-icon { display: none; } }
.uploaded-project-files { display: grid; gap: 10px; padding: 14px 0 2px; border-top: 1px solid var(--line-soft); }
.uploaded-project-files > strong { display: inline-flex; align-items: center; gap: 8px; color: var(--text-soft); font-size: 0.8rem; }
.uploaded-project-files > div { display: flex; flex-wrap: wrap; gap: 8px; }
.uploaded-project-files > div span { display: inline-flex; align-items: center; gap: 7px; padding: 8px 11px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-muted); color: var(--text); font-size: 0.82rem; }
.uploaded-project-file img { width: 28px; height: 28px; object-fit: cover; border-radius: 5px; }
.uploaded-project-file a { color: var(--brand-deep); text-decoration: underline; text-underline-offset: 2px; }
.queue-list { display: grid; gap: 10px; padding: 16px 20px 20px; }
.queue-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 15px; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface-strong); }
.queue-item h4 { margin: 0 0 5px; font-size: 0.92rem; }
.queue-item p { margin: 0; color: var(--text-soft); font-size: 0.82rem; line-height: 1.5; }
@media (max-width: 760px) { .detail-row { grid-template-columns: 1fr; gap: 4px; } .queue-item { flex-direction: column; } }

@media (min-width: 981px) {
  .it-dashboard-shell { zoom: .8; width: 125vw; height: 125vh; }
  .it-dashboard-shell > .sidebar,
  .it-dashboard-shell > .workspace { height: calc(125vh - 32px); }
  .it-dashboard-shell > .sidebar { max-height: calc(125vh - 32px); }
  .it-dashboard-toast { zoom: .8; max-width: min(440px, calc(125vw - 60px)); }
  .it-compact-modal { zoom: .8; }
  .it-compact-modal.brief-file-modal { width: min(1120px, 117.5vw); max-width: 117.5vw; height: 112.5vh; max-height: 112.5vh; }
  .it-compact-modal.clar-dialog { width: min(740px, calc(125vw - 40px)); max-height: 112.5vh; }
  .it-compact-modal.bugs-dialog { width: min(760px, calc(125vw - 40px)); max-height: 112.5vh; }
  .it-compact-modal.tm-drawer { width: min(570px, 125vw); max-width: 125vw; height: 125dvh; max-height: 125dvh; }
}
`;

/* ============================================================
   DATA
   ============================================================ */

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "tasks", label: "Tasks", icon: ListChecks, group: "Work" },
  { key: "mark-attendance", label: "Mark Attendance", icon: CalendarCheck, group: "Work" },
  { key: "attendance-report", label: "Attendance Report", icon: ClipboardList, group: "Work" },
  { key: "leave-request", label: "Leave Request", icon: UserCircle2, group: "Work" },
  { key: "new-projects", label: "New Projects", icon: FolderKanban, group: "Projects" },
  { key: "active-projects", label: "Active Projects", icon: ClipboardCheck, group: "Projects" },
  { key: "completed-projects", label: "Completed Projects", icon: CircleCheck, group: "Projects" },
  ...teamNavigation,
  { key: "my-work", label: "My Work", icon: ClipboardList, group: "My Work" },
  { key: "open-bugs", label: "Open Bugs", icon: Bug, group: "Support" },
  { key: "clarification", label: "Clarification", icon: MessageSquare, group: "Support" },
  { key: "hr-helpdesk", label: "HR Helpdesk", icon: MessageSquare, group: "Support" },
  { key: "notifications", label: "Notifications", icon: BellRing, group: "Account" },
  { key: "settings", label: "Settings", icon: SettingsIcon, group: "Account" },
];

const NAV_GROUPS = ["Overview", "Work", "Projects", ...(canManageTeam ? ["Team"] : []), "My Work", "Support", "Account"];
const TITLES = {
  ...teamTitles,
  dashboard: "Dashboard",
  tasks: "Tasks",
  "mark-attendance": "Mark Attendance",
  "attendance-report": "Attendance Report",
  "new-projects": "New Projects",
  "active-projects": "Active Projects",
  "my-work": "My Work",
  "my-tasks": "My Work",
  "pending-tasks": "My Work",
  "overdue-tasks": "My Work",
  "open-bugs": "Open Bugs",
  clarification: "Clarification",
  "hr-helpdesk": "HR Helpdesk",
  "completed-projects": "Completed Projects",
  "project-details": "Project Details",
  "project-review": "Project Review",
  notifications: "Notifications",
  settings: "Account Settings",
  "leave-request": "Leave Request",
};

const EMPLOYEE = { name: "Ekta Singh", crmId: 60, branch: "Ajmer", designation: "Full Stack Developer", department: "IT" };

const INITIAL_PROJECTS = [
  ...demoProjects,
  { id: "local-project-1753873866000", projectId: "PRJ-2026-750666", name: "monu crane service", projectName: "monu crane service", client: "System Technologies", service: "Web Application Development", priority: "Medium", due: "30 Oct 2026", owner: "IT Team", description: "Frontend project created from the Admin dashboard.", requiredFeatures: "Project requirements from the Admin create-project form.", pagesModules: "Project pages and modules", technologyRequirements: "React, responsive CSS", designRequirements: "Professional responsive dashboard", referenceWebsites: "", specialInstructions: "Review the project brief before starting development.", documents: ["Ekta Singh final_Resume.pdf"], assignedEmployeeName: "Ekta Singh", assignedEmployeeId: "60", status: "New" },
  { id: "demo-project-8", projectId: "PRJ-2026-008", name: "System Technologies Client Portal", projectName: "System Technologies Client Portal", client: "System Technologies", service: "Web Application Development", priority: "High", due: "30 Oct 2026", owner: "IT Team", description: "Build a secure client portal for project updates, documents, and delivery communication.", requiredFeatures: "Project timeline, document sharing, progress updates, and notifications", pagesModules: "Dashboard, project details, documents, messages", technologyRequirements: "React, Node.js, responsive CSS", designRequirements: "Clean professional dashboard with accessible forms", structure: "Requirements > UI Design > Development > QA", specialInstructions: "Demo project for the IT dashboard frontend workspace.", assignedEmployeeId: "60", status: "New" },
  { id: 1, name: "CRM Lead Workflow", projectName: "CRM Lead Workflow", client: "System Technologies", priority: "High", due: "30 Sep 2026", owner: "Operation Team", description: "Improve lead assignment, follow-up visibility, and conversion reporting.", structure: "Discovery > UI review > API integration > QA", assignedEmployeeId: "60", status: "New" },
  { id: 2, name: "Employee Self Service", projectName: "Employee Self Service", client: "Internal Platform", priority: "Medium", due: "12 Oct 2026", owner: "HR Team", description: "Create a self-service workspace for attendance, leave, and employee documents.", structure: "Requirements > Prototype > Development > UAT", assignedEmployeeId: "60", status: "New" },
  { id: 3, name: "Student Progress Portal", projectName: "Student Progress Portal", client: "Learning Program", priority: "Medium", due: "18 Oct 2026", owner: "Education Team", description: "Add progress tracking, task submissions, and certificate readiness views.", structure: "Planning > Frontend > Testing > Release", assignedEmployeeId: "60", status: "New" },
];

const PROJECTS_STORAGE_KEY = "crmst-projects-v1";

function getStoredProjects() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return INITIAL_PROJECTS;
    const storedIds = new Set(stored.map((project) => String(project.id)));
    return [...stored, ...INITIAL_PROJECTS.filter((project) => !storedIds.has(String(project.id)))];
  } catch {
    return INITIAL_PROJECTS;
  }
}

const WORK_ITEMS = {
  "pending-tasks": { title: "Pending Tasks", subtitle: "Tasks waiting for your next action.", icon: ListChecks, items: [{ title: "Review CRM lead form fields", detail: "Confirm validation and mobile layout before the next release.", meta: "Due 24 Sep 2026", status: "Pending" }, { title: "Prepare product demo", detail: "Collect the latest workflow screenshots for stakeholders.", meta: "Due 26 Sep 2026", status: "Pending" }] },
  "overdue-tasks": { title: "Overdue Tasks", subtitle: "Work items that need immediate attention.", icon: AlertCircle, items: [{ title: "Testing by Developer", detail: "Complete regression checks from the operation panel.", meta: "Due 18 Sep 2026", status: "Overdue" }] },
  "open-bugs": { title: "Open Bugs", subtitle: "Reported issues assigned to the IT team.", icon: Bug, items: [{ title: "Lead filter resets on refresh", detail: "Saved filters are lost when returning to the leads screen.", meta: "Reported by Operations", status: "Open" }, { title: "Attendance export column width", detail: "Long employee names overlap the final status column in PDF export.", meta: "Reported by HR", status: "Open" }] },
  clarification: { title: "Clarification", subtitle: "Missing requirements and questions awaiting an answer.", icon: MessageSquare, items: [{ title: "Project access levels", detail: "Confirm which roles can approve a project review and edit its milestones.", meta: "Waiting for Admin", status: "Needs clarification" }, { title: "Portal notification rules", detail: "Should completed task notifications be sent by email or only in-app?", meta: "Waiting for Product", status: "Needs clarification" }] },
  "completed-projects": { title: "Completed Projects", subtitle: "Projects delivered by the IT team.", icon: CircleCheck, items: [{ title: "Attendance Reporting Refresh", detail: "Monthly filters and export actions are available to employees.", meta: "Completed 12 Sep 2026", status: "Completed" }, { title: "Profile Documents", detail: "Employee KYC and document upload cards are now available.", meta: "Completed 05 Sep 2026", status: "Completed" }] },
};

const INITIAL_ALL_TASKS = [
  { name: "Task Test", desc: "Client onboarding checklist", by: "Admin", to: "Testing@CRM", status: "Completed" },
  { name: "Fast", desc: "Review CRM lead form fields", by: "Admin", to: "IT", status: "Pending" },
  { name: "Change Loan Category", desc: "Business loan to personal loan, testing fields", by: "Admin", to: "Testing@CRM", status: "Completed" },
  { name: "Attendance Report", desc: "Provide attendance record for every employee this month", by: "Operation", to: "prerna@hr", status: "Completed" },
  { name: "Demo", desc: "Prepare product demo for stakeholders", by: "Operation", to: "Pradeep Choudhary@Sales", status: "Pending" },
  { name: "Submit Today Sales Report", desc: "Daily sales report submission", by: "HR", to: "Operation", status: "Completed" },
  { name: "Testing by Developer", desc: "Testing by developer from operation panel", by: "Operation", to: "Unassigned", status: "Pending" },
  { name: "New List Updated", desc: "Speed up the release", by: "Admin", to: "Unassigned", status: "In Progress" },
].map((t, i) => ({ id: i + 1, ...t }));

/* ============================================================
   HELPERS
   ============================================================ */

function Badge({ status }) {
  const map = {
    Present: "success", Completed: "success", Approved: "success",
    Leave: "warning", Pending: "warning", "In Progress": "warning", "Apply Leave": "warning", "Leave Applied": "warning",
    Holiday: "info", Rejected: "danger", Absent: "danger",
  };
  return <span className={`badge ${map[status] || "neutral"}`}>{status}</span>;
}

function Field({ label, required, children }) {
  return (
    <div className="field">
      <span>{label} {required && <span style={{ color: "var(--danger)" }}>*</span>}</span>
      {children}
    </div>
  );
}

function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="toast it-dashboard-toast">
      {message}
      <button onClick={onClose} className="icon-button" style={{ width: 26, height: 26, minHeight: 26, background: "transparent", borderColor: "rgba(255,255,255,0.2)", color: "white" }}>
        <X size={13} />
      </button>
    </div>
  );
}

/* ============================================================
   SIDEBAR
   ============================================================ */

function Sidebar({ page, setPage, mobileOpen, setMobileOpen, onLogout, identity, unreadNotificationCount }) {
  const profileName = identity?.name || EMPLOYEE.name;
  const profileImage = identity?.imageUrl || identity?.photo || "";
  return (
    <>
      <div className={`mobile-scrim${mobileOpen ? " show" : ""}`} onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
        <div className="brand">
          <div className="logo-badge compact it-brand-logo" aria-hidden="true"><span>S</span><span>T</span></div>
          <div className="brand-copy">
            <strong>System Technologies</strong>
            <span>IT Department</span>
          </div>
        </div>

        <div className="sidebar-profile">
          {profileImage
            ? <img className="sidebar-profile-image" src={profileImage} alt={`${profileName} profile`} />
            : <div className="sidebar-profile-avatar"><UserCircle2 size={30} /></div>}
          <div className="sidebar-profile-name">{profileName}</div>
        </div>

        <div className="sidebar-search">
          <Search size={16} />
          <input placeholder="Search menu..." />
        </div>

        <nav className="nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group}>
              <p>{group}</p>
              {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon;
                const active = page === item.key;
                return (
                  <button
                    key={item.key}
                    className={`nav-item${active ? " active" : ""}`}
                    onClick={() => { setPage(item.key); setMobileOpen(false); }}
                  >
                    <span className="nav-item-left">
                      <Icon size={17} />
                      <span>{item.label}</span>
                    </span>
                    {item.key === "notifications" && unreadNotificationCount > 0 && <span className="nav-pill">{unreadNotificationCount}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={onLogout}>
            <span className="nav-item-left"><LogOut size={17} /><span>Logout</span></span>
          </button>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   PAGE: DASHBOARD
   ============================================================ */

function DashboardPage({ projects, person, identity = EMPLOYEE, onNavigate, onProject }) {
  return <DailyOverview projects={projects} person={person} identity={identity} onNavigate={onNavigate} onProject={onProject} />;
}

function ProjectCard({ project, onView, onReview, showTeam = false }) {
  const progress = projectStatusSummary(project);
  return (
    <article className="project-card">
      <div className="hero-card-top">
        <div><p className="eyebrow">{project.client}</p><h4>{project.name}</h4></div>
        <Badge status={project.status} />
      </div>
      <p>{project.description}</p>
      {project.status === "Active" && <div className="project-card-progress"><div><span>{progress.status}</span><strong>{progress.progress}%</strong></div><progress max="100" value={progress.progress} aria-label={`${project.name} progress`} /></div>}
      <div className="project-meta"><span>Priority: {project.priority}</span><span>Due: {project.due}</span></div>
      {showTeam && <ProjectTeamAvatars project={project} />}
      <div className="project-actions">
        <button className="ghost-button" onClick={() => onView(project)}><Eye size={14} /> View</button>
        {showTeam && <ProjectTeamButton project={project} />}
        {project.status === "New" && <button className="primary-button" onClick={() => onReview(project)}><FileSearch size={14} /> Review</button>}
      </div>
    </article>
  );
}

function ProjectsPage({ title, subtitle, projects, onView, onReview, showTeam = false }) {
  return (
    <div className="panel">
      <div className="panel-head"><h3>{title}</h3><p className="panel-subtitle">{subtitle}</p></div>
      {projects.length === 0 ? <p className="panel-empty">No projects in this workspace yet.</p> : <div className="project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} onView={onView} onReview={onReview} showTeam={showTeam} />)}</div>}
    </div>
  );
}

function ProjectFileModal({ file, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previousFocus?.focus(); };
  }, []);
  return createPortal(<dialog ref={dialogRef} className="brief-file-modal it-compact-modal" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="brief-preview-title">
    <div className="brief-modal-inner">
      <header><span className="brief-pdf-icon"><FileText size={24} /></span><div><p>{file.sample ? "SAMPLE DOCUMENT" : "PROJECT DOCUMENT"}</p><h3 id="brief-preview-title">{file.name}</h3></div><a className="ghost-button" href={file.dataUrl} download={file.name}><Download size={16} /> Download</a><button autoFocus type="button" className="icon-button" aria-label="Close document preview" onClick={onClose}><X size={22} /></button></header>
      {file.type?.startsWith("image/") ? <img className="brief-modal-image" src={file.dataUrl} alt={file.name} /> : <object data={file.dataUrl} type="application/pdf" aria-label={`Preview of ${file.name}`}><div className="brief-preview-fallback"><FileText size={40} /><p>Your browser cannot display this PDF here.</p><a className="primary-button" href={file.dataUrl} download={file.name}>Download PDF</a></div></object>}
      <footer><span>{file.category}{file.sample ? " / Demonstration only" : ""}</span><span>Press Esc to close</span></footer>
    </div>
  </dialog>, document.body);
}

function ProjectFileButton({ file }) {
  const [open, setOpen] = useState(false);
  const canPreview = file.dataUrl && (file.type === "application/pdf" || /\.pdf$/i.test(file.name) || /^image\/(png|jpeg|gif|webp)$/.test(file.type || ""));
  const content = <><span className="brief-pdf-icon"><FileText size={23} /></span><span className="brief-file-label"><strong>{file.name}</strong><small>{file.sample ? "Sample PDF" : file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? "PDF document" : "Attachment"}{file.dataUrl ? " / Click to open" : " / File unavailable"}</small></span>{canPreview ? <Eye size={18} /> : <Download size={18} />}</>;
  return <>{canPreview ? <button type="button" className="brief-file-button" onClick={() => setOpen(true)}>{content}</button> : file.dataUrl ? <a className="brief-file-button" href={file.dataUrl} download={file.name}>{content}</a> : <div className="brief-file-button brief-file-unavailable">{content}</div>}{open && <ProjectFileModal file={file} onClose={() => setOpen(false)} />}</>;
}

function UploadedProjectFiles({ project }) {
  const files = getUploadedProjectFiles(project);
  if (!files.length) return null;
  return <section className="project-library" aria-label="Project documents"><div className="project-section-heading"><div><p className="eyebrow">SHARED FILES</p><h3>Project documents <span className="project-count">{files.length}</span></h3></div></div><div className="brief-shared-files">{files.map((file) => <ProjectFileButton key={file.id} file={file} />)}</div></section>;
}

export function ProjectDetailsPage({ project: sourceProject, onBack, onReview, onAccept, onReject, onStatusUpdate, readOnly = false }) {
  const project = sourceProject ? withDemoProjectPresentation(sourceProject) : null;
  if (!project) return <p className="panel-empty">Project not found.</p>;
  const teamRoles = Array.isArray(sourceProject.team) ? sourceProject.team.reduce((counts, member) => {
    const role = member.role || member.teamRole || "Team member";
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {}) : {};
  const statusSection = readOnly
    ? <><ProjectStatusSection key={sourceProject.id} project={sourceProject} readOnly />{Object.keys(teamRoles).length > 0 && <section className="panel pt-card"><header><div><p className="eyebrow">PROJECT TEAM</p><h3>Assigned Team <span className="project-count">{sourceProject.team.length}</span></h3></div></header><ul>{Object.entries(teamRoles).map(([role, count]) => <li key={role}><span><strong>{role}</strong><small>{count} assigned</small></span></li>)}</ul></section>}</>
    : <><ProjectStatusSection key={sourceProject.id} project={sourceProject} onUpdate={onStatusUpdate} /><AssignedTeamCard project={sourceProject} /></>;
  if (project.demoReview && !readOnly) return <ProjectReviewPage project={sourceProject} onBack={onBack} onReview={onReview} onAccept={onAccept} onReject={onReject} statusSection={statusSection} />;
  const files = getUploadedProjectFiles(project);
  const metadata = [['Client / company', project.client], ['Service', project.service], ['Assigned to', project.assignedEmployeeName || project.assignedTo], ['Priority', project.priority], ['Start date', project.startDate], ['Expected delivery', project.expectedDelivery || project.due]];
  return (
    <div className="project-workspace">
      <section className="panel project-overview">
        <div className="project-overview-top"><span className="project-overview-icon"><FolderKanban size={26} /></span><div className="project-overview-title"><p className="eyebrow">PROJECT WORKSPACE / {project.projectId || project.id}</p><h2>{project.name || project.projectName}</h2><p>Project brief, requirements and shared documents</p></div><button className="ghost-button" onClick={onBack}>Back to projects</button></div>
        <div className="project-overview-bottom"><div className="project-overview-badges"><Badge status={project.status} /><span><FileText size={15} /> {files.length} attachments</span></div>{project.status === "New" && !readOnly && <button className="primary-button" onClick={() => onReview(project)}><FileSearch size={16} /> Review project</button>}</div>
      </section>
      {statusSection}
      <section className="project-facts">{metadata.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || "Not provided"}</strong></div>)}</section>
      <section className="panel project-requirements brief-requirements"><div className="project-section-heading"><div><p className="eyebrow">PROJECT DETAILS</p><h3>Scope & requirements</h3><p className="project-section-help">Everything you need to get started. Open a document to read the full brief.</p></div>{project.sampleDocuments && <span className="brief-sample-badge">6 sample PDFs</span>}</div>
        <div className="brief-sections">{requirementSections.map(([key, label], index) => {
          const attached = files.filter((file) => file.section === key);
          const content = project[key];
          if (!content && !attached.length) return null;
          return <article className="brief-section" key={key}><div className="brief-section-title"><span>{String(index + 1).padStart(2, "0")}</span><h4>{label}</h4><small>{attached.length ? `${attached.length} DOCUMENT${attached.length === 1 ? "" : "S"}` : "TEXT"}</small></div><div className="brief-section-content">{content && <p>{content}</p>}{attached.map((file) => <ProjectFileButton key={file.id} file={file} />)}</div></article>;
        })}</div>
      </section>
      {files.some((file) => file.section === "documents") && <div className="panel project-library-panel"><UploadedProjectFiles project={{ documents: project.documents }} /></div>}

    </div>
  );
}

function ProjectReviewPage({ project: sourceProject, onBack, onAccept, onReject, onReview, statusSection }) {
  const project = sourceProject ? withDemoProjectPresentation(sourceProject) : null;
  if (!project) return <p className="panel-empty">Project not found.</p>;
  return (
    <div className="panel">
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div><p className="eyebrow">Project Review</p><h3>{project.name}</h3></div>
        <button className="ghost-button" onClick={onBack}>Back</button>
      </div>
      <div className="detail-list">
        {statusSection}
        <p style={{ margin: 0, color: "var(--text-soft)", lineHeight: 1.7 }}>Review the proposed project structure before accepting it into your active workspace.</p>
        {[['Project ID', project.projectId || project.id], ['Client', project.client], ['Service', project.service], ['Assigned To', project.assignedEmployeeName || project.assignedTo], ['Priority', project.priority], ['Start date', project.startDate], ['Target date', project.expectedDelivery || project.due], ['Required features', project.requiredFeatures], ['Pages / modules', project.pagesModules], ['Technology', project.technologyRequirements], ['Design', project.designRequirements], ['Client budget', project.clientBudget], ['Reference websites', project.referenceWebsites], ['Scope', project.description], ['Special instructions', project.specialInstructions]].filter(([label, value]) => value && (!project.demoReview || !["Start date", "Required features", "Pages / modules", "Technology", "Design", "Client budget", "Reference websites"].includes(label))).map(([label, value]) => <div className="detail-row" key={label}><strong>{label}</strong><span>{value}</span></div>)}
        <UploadedProjectFiles project={project} />
        {project.status === "New" && <div className="project-actions">{onAccept ? <><button className="primary-button crm-upload-button" onClick={() => onAccept(sourceProject)}><CircleCheck size={15} /> Accept</button><button className="primary-button danger-button" onClick={() => onReject(sourceProject)}><X size={15} /> Reject</button></> : <button className="primary-button" onClick={() => onReview(sourceProject)}><FileSearch size={15} /> Review project</button>}</div>}
      </div>
    </div>
  );
}

function WorkQueuePage({ type, projects = [] }) {
  const config = WORK_ITEMS[type];
  const Icon = config.icon;
  const projectItems = projects.flatMap((project) => {
    const taskItems = Array.isArray(project.tasks) ? project.tasks : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const values = type === "open-bugs"
      ? project.bugs
      : type === "clarification"
        ? project.clarifications
        : type === "pending-tasks" || type === "overdue-tasks"
          ? taskItems.filter((task) => !["completed", "done"].includes(String(task.status || "pending").toLowerCase()) && (type !== "overdue-tasks" || (task.dueDate || task.due) && new Date(`${task.dueDate || task.due}T00:00:00`) < today))
          : [];
    return (Array.isArray(values) ? values : []).map((item, index) => ({
      title: item.title || item.name || `${type === "open-bugs" ? "Bug" : "Question"} ${index + 1}`,
      detail: item.detail || item.description || String(item),
      meta: project.projectName || project.name,
      status: type === "overdue-tasks" ? "Overdue" : item.status || (type === "open-bugs" ? "Open" : type === "pending-tasks" ? "Pending" : "Needs clarification"),
    }));
  });
  const items = projectItems;
  return (
    <div className="panel">
      <div className="panel-head"><h3><Icon size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />{config.title}</h3><p className="panel-subtitle">{config.subtitle}</p></div>
      <div className="queue-list">{items.map((item, index) => <div className="queue-item" key={`${item.title}-${index}`}><div><h4>{item.title}</h4><p>{item.detail}</p><p style={{ marginTop: 7, color: "var(--text-faint)" }}>{item.meta}</p></div><Badge status={item.status} /></div>)}</div>
      {!items.length && <p className="panel-empty">No items assigned to your active projects.</p>}
    </div>
  );
}

function ProjectTasksPage({ projects }) {
  const tasks = projects.flatMap((project) => (Array.isArray(project.tasks) ? project.tasks : []).map((task) => ({ ...task, projectName: project.projectName || project.name })));
  return <div className="panel"><div className="panel-head"><h3>My Tasks</h3><p className="panel-subtitle">Tasks belonging to your active projects.</p></div><div className="queue-list">{tasks.map((task, index) => <div className="queue-item" key={`${task.id || task.title}-${index}`}><div><h4>{task.title || task.name || "Project task"}</h4><p>{task.description || task.detail || "Assigned project work"}</p><p style={{ marginTop: 7, color: "var(--text-faint)" }}>{task.projectName} {task.dueDate || task.due ? `· Due ${task.dueDate || task.due}` : ""}</p></div><Badge status={task.status || "Pending"} /></div>)}{!tasks.length && <p className="panel-empty">No tasks assigned to your active projects.</p>}</div></div>;
}

/* ============================================================
   PAGE: MARK ATTENDANCE
   ============================================================ */

export function MarkAttendancePage({
  notify,
  employee,
  attendance = [],
  setAttendance,
  calendar,
  loading = false,
  authenticated = false,
  onRefreshToday,
}) {
  const today = attendanceDateInIndia();
  const todaysRecord = attendance.find((record) => String(record.date || record.workDate || "") === today) || null;
  const [status, setStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const refreshedAttendanceDate = useRef("");

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setStatus(todaysRecord?.status || "");
    setRemark(todaysRecord?.remark || "");
  }, [todaysRecord?.id, todaysRecord?.remark, todaysRecord?.status]);

  const attendanceCalendar = calendar || {};
  const holiday = attendanceHolidayForDate(today, attendanceCalendar);
  const isHoliday = Boolean(holiday);
  const isCheckInClosed = attendanceCutoffPassed(today, currentTime, attendanceCalendar);
  const indiaTime = currentTime.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  const employeeName = employee?.name || EMPLOYEE.name;
  const checkIn = todaysRecord?.checkIn && todaysRecord.checkIn !== "-" ? todaysRecord.checkIn : "";
  const checkOut = todaysRecord?.checkOut && todaysRecord.checkOut !== "-" ? todaysRecord.checkOut : "";
  const isAutoAbsent = Boolean(todaysRecord?.autoMarked && !todaysRecord?.correctedAt && todaysRecord?.status === "Absent");
  const canCheckOut = Boolean(checkIn && !checkOut && todaysRecord?.status === "Present");
  const checkInTimestamp = Date.parse(todaysRecord?.checkInAt || "");
  const liveWorkedMinutes = todaysRecord?.workedMinutes !== null
    && todaysRecord?.workedMinutes !== undefined
    && Number.isFinite(Number(todaysRecord.workedMinutes))
    && checkOut
    ? Number(todaysRecord.workedMinutes)
    : Number.isFinite(checkInTimestamp) && todaysRecord?.status === "Present"
      ? Math.max(0, Math.floor((currentTime.getTime() - checkInTimestamp) / 60_000))
      : null;
  const workedTime = liveWorkedMinutes === null
    ? "Not recorded"
    : `${Math.floor(liveWorkedMinutes / 60)}h ${String(liveWorkedMinutes % 60).padStart(2, "0")}m`;

  useEffect(() => {
    if (!authenticated || !isCheckInClosed || refreshedAttendanceDate.current === today) return;
    refreshedAttendanceDate.current = today;
    Promise.resolve(onRefreshToday?.())
      .catch((error) => {
        refreshedAttendanceDate.current = "";
        notify(error.message || "Could not refresh attendance after the cutoff.");
      });
  }, [authenticated, isCheckInClosed, notify, onRefreshToday, today]);

  const storeAttendanceRecord = (saved) => {
    if (!saved) return;
    setAttendance?.((records) => [saved, ...records.filter((record) => (
      String(record.id || "") !== String(saved.id || "")
      && String(record.date || record.workDate || "") !== String(saved.date || saved.workDate || "")
    ))]);
  };

  const handleCheckIn = async () => {
    if (!authenticated) { notify("Sign in to mark attendance."); return; }
    if (isHoliday) { notify(`${holiday.label || "Holiday"}. Attendance cannot be marked today.`); return; }
    if (isCheckInClosed) { notify("The check-in window closed at 12:00 PM IST."); return; }
    if (!status) { notify("Please select a status before checking in."); return; }
    if (todaysRecord) { notify("Attendance is already marked for today."); return; }
    setSubmitting(true);
    try {
      const saved = await checkInAttendance({ status, remark });
      storeAttendanceRecord(saved);
      notify(saved?.status === "Absent" ? "Attendance marked Absent." : "Checked in successfully.");
    } catch (error) {
      notify(error.message || "Could not mark attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!authenticated || !canCheckOut || submitting) return;
    setSubmitting(true);
    try {
      const saved = await checkOutAttendance();
      storeAttendanceRecord(saved);
      notify("Checked out successfully.");
    } catch (error) {
      notify(error.message || "Could not check out.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="it-attendance-page">
      <div className="it-attendance-panel">
        {isHoliday && (
          <div className="it-attendance-holiday" role="status">
            {holiday.label || "Today is a holiday"}. Attendance cannot be marked today.
          </div>
        )}
        {isAutoAbsent && (
          <div className="it-attendance-auto-absent" role="status" aria-live="polite">
            Attendance was automatically marked Absent.
          </div>
        )}
        {checkIn && todaysRecord?.status === "Present" && (
          <div className="it-attendance-success" role="status">
            <CircleCheck size={17} />
            <span>{checkOut ? `Attendance complete: ${checkIn} - ${checkOut} (${workedTime})` : `Checked in at ${checkIn} · Worked ${workedTime}`}</span>
          </div>
        )}
        <div className="it-attendance-form">
          <label className="it-attendance-field">
            <span className="it-attendance-label"><UserCircle2 size={15} />Employee Name</span>
            <input value={employeeName} readOnly />
          </label>
          <label className="it-attendance-field">
            <span className="it-attendance-label"><ListChecks size={15} />Select Status</span>
            <div className="it-attendance-select-wrap">
              <AlertCircle size={15} aria-hidden="true" />
              <select value={isHoliday ? "Holiday" : status} onChange={(e) => setStatus(e.target.value)} disabled={loading || submitting || isHoliday || isCheckInClosed || Boolean(todaysRecord)}>
                <option value="">Select Status</option>
                <option>Present</option>
                <option>Absent</option>
                {isHoliday && <option>Holiday</option>}
              </select>
            </div>
          </label>
          <label className="it-attendance-field">
            <span className="it-attendance-label"><MessageSquareText size={15} />Remark</span>
            <input maxLength={500} placeholder="Remark (optional)" value={remark} onChange={(e) => setRemark(e.target.value)} disabled={loading || submitting || isHoliday || isCheckInClosed || Boolean(todaysRecord)} />
          </label>
          <div className="it-attendance-action">
            <div className="it-attendance-clock" aria-label={`Current India time ${indiaTime} IST`}>
              <span className="it-attendance-live-dot" />
              <span>India time</span>
              <strong>{indiaTime} IST</strong>
              {checkIn && <span className="it-attendance-worked-time">· {workedTime}</span>}
            </div>
            <button
              type="button"
              onClick={!todaysRecord ? handleCheckIn : canCheckOut ? handleCheckOut : undefined}
              disabled={loading || submitting || isHoliday || (todaysRecord ? !canCheckOut || Boolean(checkOut) : isCheckInClosed || !status)}
              className={`it-attendance-submit${canCheckOut ? " checkout" : ""}${checkOut || (todaysRecord && !canCheckOut) ? " completed" : ""}`}
            >
              {loading ? "Loading..." : submitting ? "Saving..." : isHoliday ? "Holiday" : isAutoAbsent ? "Marked Absent" : checkOut ? "Completed" : canCheckOut ? "Check Out" : todaysRecord ? "Marked" : isCheckInClosed ? "Check-in Closed" : "Check In"}
            </button>
          </div>
        </div>
        <div className="it-attendance-policy" role="note">
          <div className="it-attendance-policy-item">
            <span className="it-attendance-policy-icon"><Clock3 size={17} /></span>
            <div><strong>Check-in window</strong><span>Monday–Saturday, before 12:00 PM IST</span></div>
          </div>
          <div className="it-attendance-policy-item">
            <span className="it-attendance-policy-icon"><AlertCircle size={17} /></span>
            <div><strong>After 12:00 PM</strong><span>Unmarked attendance becomes Absent; approved leave stays unchanged</span></div>
          </div>
          <div className="it-attendance-policy-item">
            <span className="it-attendance-policy-icon"><CalendarDays size={17} /></span>
            <div><strong>Sunday &amp; checkout</strong><span>Sunday holiday · Checkout until midnight</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: ATTENDANCE REPORT
   ============================================================ */

function AttendanceReportSelect({ value, onChange, options, ariaLabel }) {
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
    const selectedIndex = options.findIndex((option) => option.value === value);
    optionRefs.current[Math.max(0, selectedIndex)]?.focus();
  }, [open, options, value]);

  const close = () => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); };
  const moveFocus = (event, index) => {
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % options.length;
    else if (event.key === "ArrowUp") nextIndex = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else if (event.key === "Escape") { event.preventDefault(); close(); return; }
    else return;
    event.preventDefault();
    optionRefs.current[nextIndex]?.focus();
  };

  return <div className="it-attendance-filter-select">
    <button ref={triggerRef} type="button" className="it-attendance-filter-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{selected?.label || "Select"}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && position && createPortal(<div ref={menuRef} className="it-attendance-filter-menu" role="listbox" aria-label={`${ariaLabel} options`} style={{ ...position, position: "fixed" }}>
      {options.map((option, index) => <button key={option.value} ref={(element) => { optionRefs.current[index] = element; }} type="button" role="option" aria-selected={option.value === value} onKeyDown={(event) => moveFocus(event, index)} onClick={() => { onChange(option.value); close(); }}>{option.label}</button>)}
    </div>, document.body)}
  </div>;
}

export function AttendanceReportPage({
  notify,
  attendance = [],
  leaveRequests = [],
  calendar,
  employee,
  loading = false,
  onMonthRequested,
  onApplyLeave,
  onSyncAttendance,
}) {
  const today = attendanceDateInIndia();
  const currentMonth = today.slice(0, 7);
  const joinedDate = employee?.joined || employee?.joinedDate || employee?.joiningDate || `${currentMonth}-01`;
  const employeeId = employee?.id || employee?._id || employee?.crmId || "";
  const monthOptions = useMemo(() => {
    const values = getAttendanceReportMonths(joinedDate, today);
    return values.length ? values : [currentMonth];
  }, [currentMonth, joinedDate, today]);
  const [month, setMonth] = useState(currentMonth);
  const [status, setStatus] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [syncing, setSyncing] = useState(false);
  const monthSelectOptions = useMemo(() => monthOptions.map((value) => ({
    value,
    label: new Date(`${value}-01T00:00:00.000Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  })), [monthOptions]);
  const statusSelectOptions = useMemo(() => [
    { value: "All", label: "All statuses" },
    { value: "Present", label: "Present" },
    { value: "Absent", label: "Absent" },
    { value: "Leave", label: "Leave" },
    { value: "Holiday", label: "Holiday" },
    { value: "Pending", label: "Leave action" },
  ], []);

  useEffect(() => {
    if (!monthOptions.includes(month)) setMonth(monthOptions[0]);
  }, [month, monthOptions]);

  useEffect(() => {
    let active = true;
    Promise.resolve(onMonthRequested?.(month)).catch((error) => {
      if (active) notify(error.message || "Could not load monthly attendance.");
    });
    return () => { active = false; };
  }, [month, notify, onMonthRequested]);

  const rows = useMemo(() => buildAttendanceReportRows({
    attendance,
    leaves: leaveRequests,
    month,
    joinedDate,
    today,
    calendar: calendar || {},
    employeeId,
  }), [attendance, calendar, employeeId, joinedDate, leaveRequests, month, today]);
  const filtered = useMemo(() => filterAttendanceReportRows(rows, { status, dateFrom, dateTo }), [dateFrom, dateTo, rows, status]);
  const reportRange = getAttendanceReportDateRange(month, today);
  const formatDate = (date) => new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  const formatDay = (date) => new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const formatWorkedTime = (minutes) => {
    if (minutes === null || minutes === undefined || !Number.isFinite(Number(minutes))) return "Not recorded";
    const value = Math.max(0, Math.floor(Number(minutes)));
    return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
  };
  const displayStatus = (row) => attendanceReportStatusLabel(row, leaveRequests, employeeId);
  const statusIcons = { Present: Check, Absent: CircleX, Leave: Hourglass, Holiday: CalendarDays, Pending: Clock3 };

  const exportCsv = () => {
    if (!filtered.length) { notify("No records for the selected month."); return; }
    const values = filtered.map((row, index) => [index + 1, formatDate(row.date), formatDay(row.date), row.checkIn || "Not recorded", row.checkOut || "Not recorded", formatWorkedTime(row.workedMinutes), displayStatus(row), row.reason || "-"]);
    const csv = [["Sr. No.", "Date", "Day", "Punch In Time", "Punch Out Time", "Worked Time", "Status", "Classification"], ...values]
      .map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify("Attendance report exported.");
  };

  const exportPdf = () => {
    if (!filtered.length) { notify("No records for the selected month."); return; }
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.text("Attendance Report", 14, 17);
    pdf.setFontSize(9);
    pdf.setTextColor(110);
    pdf.text(`${filtered.length} record${filtered.length === 1 ? "" : "s"} - Generated ${formatDate(today)}`, 14, 24);
    autoTable(pdf, {
      startY: 30,
      head: [["Sr. No.", "Date", "Day", "Punch In", "Punch Out", "Worked", "Status", "Classification"]],
      body: filtered.map((row, index) => [index + 1, formatDate(row.date), formatDay(row.date), row.checkIn || "Not recorded", row.checkOut || "Not recorded", formatWorkedTime(row.workedMinutes), displayStatus(row), row.reason || "-"]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [127, 78, 43] },
    });
    pdf.save(`attendance-${month}.pdf`);
  };
  const handleSyncAttendance = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await onSyncAttendance?.(month);
      notify(result?.message || "Attendance synchronized.");
    } catch (error) {
      notify(error.message || "Could not synchronize attendance.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="panel it-attendance-report-panel">
      <div className="panel-head">
        <div><h3>Attendance History</h3><p className="panel-subtitle">Review your punch times and attendance history</p></div>
        <div className="it-attendance-report-actions">
          <button type="button" className={`ghost-button it-attendance-sync-button${syncing ? " syncing" : ""}`} onClick={handleSyncAttendance} disabled={syncing} title="Synchronize completed attendance since your joining date">{syncing ? <LoaderCircle size={16} /> : <RefreshCw size={16} />} {syncing ? "Syncing..." : "Sync Attendance"}</button>
          <button type="button" className="ghost-button" onClick={exportCsv} disabled={!filtered.length}><Download size={16} /> Export CSV</button>
          <button type="button" className="primary-button" onClick={exportPdf} disabled={!filtered.length}><Download size={16} /> Export PDF ({filtered.length})</button>
        </div>
      </div>
      <div className="it-attendance-report-summary">
        <div><span>Present</span><strong>{filtered.filter((row) => row.status === "Present").length}</strong></div>
        <div><span>Absent</span><strong>{filtered.filter((row) => row.status === "Absent").length}</strong></div>
        <div><span>Leave</span><strong>{filtered.filter((row) => row.status === "Leave").length}</strong></div>
        <div><span>Holiday</span><strong>{filtered.filter((row) => row.status === "Holiday").length}</strong></div>
        <div><span>Leave Action</span><strong>{filtered.filter((row) => row.status === "Pending").length}</strong></div>
      </div>
      <div className="it-attendance-report-toolbar">
        <label><span>Month</span><AttendanceReportSelect value={month} onChange={setMonth} options={monthSelectOptions} ariaLabel="Filter attendance by month" /></label>
        <label><span>Status</span><AttendanceReportSelect value={status} onChange={setStatus} options={statusSelectOptions} ariaLabel="Filter attendance by status" /></label>
        <CallListDatePicker label="From" value={dateFrom} min={reportRange.start || undefined} max={dateTo && dateTo < (reportRange.end || today) ? dateTo : reportRange.end || today} onChange={(value) => { setDateFrom(value); if (value && dateTo && value > dateTo) setDateTo(""); }} />
        <CallListDatePicker label="To" value={dateTo} min={dateFrom && dateFrom > reportRange.start ? dateFrom : reportRange.start || undefined} max={reportRange.end || today} onChange={setDateTo} />
        <button type="button" className="ghost-button" onClick={() => { setMonth(monthOptions[0] || currentMonth); setStatus("All"); setDateFrom(""); setDateTo(""); }}>Reset</button>
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
              {filtered.map((row, index) => {
                const pendingLeave = row.status === "Pending" ? pendingLeaveRequestForDate(leaveRequests, row.date, employeeId) : null;
                const rowStatus = displayStatus(row);
                const canApplyLeave = row.status === "Pending" && !pendingLeave && row.date >= today;
                const StatusIcon = row.status === "Pending" ? (pendingLeave ? Hourglass : canApplyLeave ? CalendarDays : RefreshCw) : statusIcons[row.status] || AlertCircle;
                const statusClass = row.status === "Pending" ? (pendingLeave ? "leave-applied" : canApplyLeave ? "apply-leave" : "pending-sync") : String(row.status || "unknown").toLowerCase();
                const commonStatusProps = { title: pendingLeave ? "Leave request submitted and awaiting approval" : rowStatus === "Pending Sync" ? "Use Sync Attendance to finalize this completed date" : `${row.reason || "Attendance"} - ${row.payable ? "payable" : "non-payable"}`, className: `it-attendance-report-status-pill is-${statusClass}` };
                return <tr key={row.id || row.date}>
                  <td className="attendance-report-serial">{index + 1}</td>
                  <td className="attendance-report-date">{formatDate(row.date)}</td>
                  <td>{formatDay(row.date)}</td>
                  <td>{row.checkIn || "Not recorded"}</td>
                  <td>{row.checkOut || "Not recorded"}</td>
                  <td className="attendance-report-status-cell">
                    {canApplyLeave
                      ? <button type="button" {...commonStatusProps} onClick={() => onApplyLeave?.(row.date)}><StatusIcon size={13} strokeWidth={2.5} aria-hidden="true" />{rowStatus}</button>
                      : <span {...commonStatusProps}><StatusIcon size={13} strokeWidth={2.5} aria-hidden="true" />{rowStatus}</span>}
                  </td>
                </tr>;
              })}
              {loading && !filtered.length && <tr><td colSpan={6} className="it-attendance-report-empty">Loading attendance...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={6} className="it-attendance-report-empty">{reportRange.isFutureMonth ? "Attendance is not available for a future month." : "No attendance records match these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
    </div>
  );
}

/* ============================================================
   PAGE: SETTINGS
   ============================================================ */

function SettingsPage({ notify, user }) {
  const [dark, setDark] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "Ekta Singh", dob: "2004-10-20", gender: "Female",
    personalEmail: "ekta•••••@gmail.com", workEmail: "ekta•••••@gmail.com",
    mobile: "88901•••53", marital: "Single", education: "B.Tech",
    address: "Laxmi Nagar Colony, Bhawani Mandi, Rajasthan",
  });
  const [emergency, setEmergency] = useState({ name: "Ekta Singh", relation: "Sibling", number: "73000•••94" });
  const [kyc, setKyc] = useState({ pan: "XXXXX9489X", aadhaar: "XXXX XXXX 3249" });
  const [bank, setBank] = useState({ bankName: "Central Bank of India", holder: "Ekta Singh", account: "XXXXXX3185", ifsc: "CBIN0280463", branch: "Bhawani Mandi" });

  const docs = [
    { label: "Aadhaar Card", uploaded: true },
    { label: "PAN Card", uploaded: true },
    { label: "Bank Passbook / Cheque", uploaded: false },
    { label: "Resume / CV", uploaded: true },
    { label: "Offer Letter", uploaded: false },
    { label: "Appointment Letter", uploaded: false },
    { label: "Other Documents", uploaded: false },
  ];

  const set = (setter, key) => (e) => setter((s) => ({ ...s, [key]: e.target.value }));


  return (
    <div>
      <div className="settings-page-head">
        <h1><UserCircle2 size={20} /> Account Settings</h1>
        <button className="ghost-button dark-toggle" onClick={() => setDark((d) => !d)}>
          {dark ? <Sun size={15} /> : <Moon size={15} />} Toggle Dark Mode
        </button>
      </div>

      <div className="settings-layout" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div className="settings-section">
          <div className="settings-section-header"><h3>1. Personal Details</h3></div>

          <div className="settings-identity">
            <div className="avatar-preview"><UserCircle2 size={26} /></div>
            <div>
              <strong>Profile Picture</strong>
              <div className="avatar-upload" style={{ marginTop: 6 }}>
                <label className="avatar-upload-label">
                  Choose file
                  <input type="file" style={{ display: "none" }} />
                </label>
                <span style={{ color: "var(--text-faint)", fontSize: "0.78rem" }}>No file chosen</span>
              </div>
              <span style={{ display: "block", marginTop: 4 }}>JPG, PNG, GIF, WEBP up to 5MB</span>
            </div>
          </div>

          <div className="settings-form form-grid">
            <Field label="Full Name" required><input value={profile.fullName} onChange={set(setProfile, "fullName")} /></Field>
            <Field label="Date of Birth"><input type="date" value={profile.dob} onChange={set(setProfile, "dob")} /></Field>
            <Field label="Gender">
              <select value={profile.gender} onChange={set(setProfile, "gender")}>
                <option>Female</option><option>Male</option><option>Other</option>
              </select>
            </Field>
            <Field label="Personal Email"><input value={profile.personalEmail} onChange={set(setProfile, "personalEmail")} /></Field>
            <Field label="Work / Official Email" required><input value={profile.workEmail} onChange={set(setProfile, "workEmail")} /></Field>
            <Field label="Personal Mobile Number"><input value={profile.mobile} onChange={set(setProfile, "mobile")} /></Field>
            <Field label="Marital Status">
              <select value={profile.marital} onChange={set(setProfile, "marital")}>
                <option>Single</option><option>Married</option>
              </select>
            </Field>
            <Field label="Education / Qualification"><input value={profile.education} onChange={set(setProfile, "education")} /></Field>
            <div className="span-full">
              <Field label="Residential Address">
                <textarea rows={3} value={profile.address} onChange={set(setProfile, "address")} />
              </Field>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header"><h3>Change Password</h3></div>
          <div className="settings-form">
            <PasswordResetLink userId={user?._id || user?.id} email={user?.email || profile.workEmail} />
          </div>
        </div>
      </div>

      <div className="settings-stack">
        <div className="settings-section">
          <div className="settings-section-header"><h3>2. Emergency Contact</h3></div>
          <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            <Field label="Emergency Contact Name"><input value={emergency.name} onChange={set(setEmergency, "name")} /></Field>
            <Field label="Relationship"><input value={emergency.relation} onChange={set(setEmergency, "relation")} /></Field>
            <Field label="Emergency Contact Number"><input value={emergency.number} onChange={set(setEmergency, "number")} /></Field>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header"><h3>3. Identity & KYC Details</h3></div>
          <div className="form-grid">
            <Field label="PAN Card Number"><input value={kyc.pan} onChange={set(setKyc, "pan")} /></Field>
            <Field label="Aadhaar Card Number"><input value={kyc.aadhaar} onChange={set(setKyc, "aadhaar")} /></Field>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header"><h3>4. Bank Details</h3></div>
          <div className="form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            <Field label="Bank Name"><input value={bank.bankName} onChange={set(setBank, "bankName")} /></Field>
            <Field label="Account Holder Name"><input value={bank.holder} onChange={set(setBank, "holder")} /></Field>
            <Field label="Account Number"><input value={bank.account} onChange={set(setBank, "account")} /></Field>
            <Field label="IFSC Code"><input value={bank.ifsc} onChange={set(setBank, "ifsc")} /></Field>
            <Field label="Bank Branch"><input value={bank.branch} onChange={set(setBank, "branch")} /></Field>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header"><h3>5. Document Attachments & Uploads</h3></div>
          <div className="doc-upload-grid">
            {docs.map((d) => (
              <div key={d.label} className="doc-upload-card">
                <strong>{d.label}</strong>
                <div className="doc-upload-row">
                  <label className="doc-choose">
                    Choose file
                    <input type="file" style={{ display: "none" }} />
                  </label>
                  <span style={{ color: "var(--text-faint)" }}>No file chosen</span>
                </div>
                <button
                  disabled={!d.uploaded}
                  onClick={() => notify(`Viewing ${d.label}.`)}
                  className={`doc-status ${d.uploaded ? "uploaded" : "missing"}`}
                >
                  <Eye size={13} /> {d.uploaded ? `View ${d.label.split(" ")[0]}` : "Not Uploaded"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="primary-button" onClick={() => notify("Profile changes saved.")}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: MY TASK
   ============================================================ */

function MyTaskPage({ notify }) {
  const [tasks, setTasks] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", desc: "" });

  const addTask = () => {
    if (!form.title.trim()) return notify("Give the task a title first.");
    setTasks((t) => [...t, { id: Date.now(), title: form.title, desc: form.desc, done: false }]);
    setForm({ title: "", desc: "" });
    setOpen(false);
  };
  const toggle = (id) => setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id) => setTasks((t) => t.filter((x) => x.id !== id));

  return (
    <div className="panel">
      <div className="panel-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3>My Task</h3>
        <button className="primary-button" onClick={() => setOpen(true)}><Plus size={15} /> Add Task</button>
      </div>

      {tasks.length === 0 ? (
        <p className="panel-empty">No tasks available. Start adding tasks to manage your work efficiently!</p>
      ) : (
        <div className="task-list">
          {tasks.map((t) => (
            <div key={t.id} className={`task-item${t.done ? " done" : ""}`}>
              <label>
                <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                <span>
                  <strong>{t.title}</strong>
                  {t.desc && <small>{t.desc}</small>}
                </span>
              </label>
              <button className="icon-button danger" onClick={() => remove(t.id)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="modal-surface">
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <div className="modal-shell">
            <div className="modal-head">
              <strong>New Task</strong>
              <button className="icon-button" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: "grid", gap: 14 }}>
              <Field label="Task Title" required>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </Field>
              <Field label="Description">
                <textarea rows={3} value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />
              </Field>
              <div className="modal-actions">
                <button className="ghost-button" onClick={() => setOpen(false)}>Cancel</button>
                <button className="primary-button" onClick={addTask}>Add Task</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PAGE: ALL TASK
   ============================================================ */

function AllTaskPage({ notify }) {
  const [tasks, setTasks] = useState(INITIAL_ALL_TASKS);
  const [exec, setExec] = useState("");
  const executives = [...new Set(tasks.map((t) => t.by))];
  const filtered = exec ? tasks.filter((t) => t.by === exec) : tasks;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="hero-card dashboard-hero" style={{ padding: "18px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.15rem" }}>Tasks Assigned to Employees</h2>
      </div>

      <div className="panel">
        <div className="module-toolbar">
          <Field label="">
            <select value={exec} onChange={(e) => setExec(e.target.value)} style={{ minWidth: 220 }}>
              <option value="">-- Select Executive --</option>
              {executives.map((e) => <option key={e}>{e}</option>)}
            </select>
          </Field>
          <button className="primary-button danger-button" onClick={() => notify("Exported tasks to PDF.")}>
            <FileText size={15} /> Export PDF
          </button>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>{["Task Name", "Description", "Assigned Executive Name", "Assigned To", "Status", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, color: "var(--brand-deep)" }}>{t.name}</td>
                  <td style={{ color: "var(--text-soft)" }}>{t.desc}</td>
                  <td>{t.by}</td>
                  <td>{t.to}</td>
                  <td><Badge status={t.status} /></td>
                  <td>
                    <button className="ghost-button" style={{ minHeight: 36, color: "var(--danger)" }} onClick={() => setTasks((cur) => cur.filter((x) => x.id !== t.id))}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="panel-empty">No tasks for this executive.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */

export default function App(props) {
  return <ProjectTeamProvider authenticated={Boolean(props.user)} key={props.user?.id || props.user?._id || 'demo'} person={props.user?.name || EMPLOYEE.name}><ITWorkspace {...props}/></ProjectTeamProvider>;
}
function ITWorkspace({ user, projects, onProjectsChange, onLogout }) {
  const teamState = useTeamState();
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [topMenu, setTopMenu] = useState("");
  const [localProjects, setLocalProjects] = useState(user ? [] : projects === undefined ? getStoredProjects() : projects);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceCalendar, setAttendanceCalendar] = useState(null);
  const [attendanceLeaves, setAttendanceLeaves] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(Boolean(user));
  const [appNotifications, setAppNotifications] = useState([]);
  const [incomingNotifications, setIncomingNotifications] = useState(false);
  const [leaveRequestDate, setLeaveRequestDate] = useState("");
  const [accountProfile, setAccountProfile] = useState(() => ({
    ...(user || {}),
    avatarUrl: user?.imageUrl || user?.photo || "",
  }));
  const topbarMenusRef = useRef(null);
  const toastTimerRef = useRef(null);
  const knownNotificationIdsRef = useRef(null);
  const incomingNotificationTimerRef = useRef(null);
  const attendanceMonthsLoaded = useRef(new Set());
  const attendanceMonthRequests = useRef(new Map());
  const attendanceCalendarLoaded = useRef(false);
  const attendanceTodayRefreshed = useRef(new Set());
  const profileIdentity = {
    ...EMPLOYEE,
    ...(user || {}),
    ...accountProfile,
    name: accountProfile?.name || user?.name || EMPLOYEE.name,
    imageUrl: accountProfile?.imageUrl || accountProfile?.avatarUrl || user?.imageUrl || user?.photo || "",
  };
  const employeeRole = accountProfile?.position || accountProfile?.designation || accountProfile?.role || user?.position || user?.designation || user?.role || EMPLOYEE.designation;

  useEffect(() => {
    setAccountProfile((current) => ({
      ...current,
      ...(user || {}),
      avatarUrl: user?.imageUrl || user?.photo || current.avatarUrl || "",
    }));
  }, [user]);

  useEffect(() => {
    const closeTopMenu = (event) => {
      if (!topbarMenusRef.current?.contains(event.target)) setTopMenu("");
    };
    document.addEventListener("pointerdown", closeTopMenu);
    return () => document.removeEventListener("pointerdown", closeTopMenu);
  }, []);

  useEffect(() => setTopMenu(""), [page]);

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
    window.clearTimeout(incomingNotificationTimerRef.current);
  }, []);

  useEffect(() => {
    if (projects !== undefined) setLocalProjects(Array.isArray(projects) ? projects : []);
  }, [projects]);

  useEffect(() => {
    if (user || projects !== undefined) return;
    const handleStoredProjects = (event) => {
      if (event.key !== PROJECTS_STORAGE_KEY) return;
      setLocalProjects(getStoredProjects());
    };
    window.addEventListener("storage", handleStoredProjects);
    return () => window.removeEventListener("storage", handleStoredProjects);
  }, [user, projects]);

  useEffect(() => {
    if (TEAM_DEMO_MODE || !user) return;
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const [rows, teamProjects] = await Promise.all([fetchProjects(), fetchITProjects().catch(() => [])]);
        if (active) {
          const teamById = new Map(teamProjects.map(project => [String(project.id), project]));
          setLocalProjects(rows.map(project => {
            const teamProject = teamById.get(String(project.id));
            return teamProject ? { ...project, team: teamProject.team || [], priority: teamProject.priority || project.priority, startDate: teamProject.startDate || project.startDate, dueDate: teamProject.dueDate || project.dueDate, notes: teamProject.notes ?? project.notes } : project;
          }));
        }
      }
      catch (error) { if (active) setToast(error.message); }
      finally { pending = false; }
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [user]);

  const employeeIdentity = new Set([
    user?.id,
    user?._id,
    user?.crmId,
    user?.username,
    user?.email,
    user?.name,
    ...(!user ? [EMPLOYEE.crmId, EMPLOYEE.name] : []),
  ].filter(Boolean).map((value) => String(value).trim().toLowerCase()));
  const employeeProjects = TEAM_DEMO_MODE ? dashboardProjects(teamState) : localProjects
    .filter((project) => user ? String(project.assignedEmployeeId) === String(user.id || user._id) : [
      project.assignedEmployeeId,
      project.assignedTo,
      project.assignedEmployeeUsername,
      project.assignedEmployeeEmail,
      project.assignedEmployeeName,
    ].filter(Boolean).some((value) => employeeIdentity.has(String(value).trim().toLowerCase())))
    .map((project) => ({
      ...project,
      name: project.name || project.projectName || "Untitled project",
      due: project.due || project.expectedDelivery || "No delivery date",
    }));
  const updateProjects = (updater) => {
    setLocalProjects((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      if (projects !== undefined) onProjectsChange?.(next);
      if (projects !== undefined && !onProjectsChange) {
        try { window.localStorage.setItem("crmst-projects-v1", JSON.stringify(next)); } catch {}
      }
      return next;
    });
  };

  const notify = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 5000);
  }, []);

  const loadAttendanceMonth = useCallback(async (month, { force = false } = {}) => {
    const monthKey = String(month || "");
    if (!user || !/^\d{4}-\d{2}$/.test(monthKey)) return;
    const needsRecords = force || !attendanceMonthsLoaded.current.has(monthKey);
    const needsCalendar = !attendanceCalendarLoaded.current;
    if (!needsRecords && !needsCalendar) return;
    if (!force && attendanceMonthRequests.current.has(monthKey)) {
      return attendanceMonthRequests.current.get(monthKey);
    }

    const request = Promise.all([
      needsRecords ? fetchAttendanceMonth(monthKey) : Promise.resolve(null),
      needsCalendar ? fetchAttendanceCalendar() : Promise.resolve(null),
    ]).then(([records, calendar]) => {
      if (records !== null) {
        if (!Array.isArray(records)) throw new Error("Attendance returned an invalid response.");
        attendanceMonthsLoaded.current.add(monthKey);
        setAttendanceRecords((current) => {
          const outsideMonth = current.filter((record) => String(record.date || record.workDate || "").slice(0, 7) !== monthKey);
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
    }).finally(() => {
      if (attendanceMonthRequests.current.get(monthKey) === request) attendanceMonthRequests.current.delete(monthKey);
    });

    attendanceMonthRequests.current.set(monthKey, request);
    return request;
  }, [user]);

  const synchronizeAttendance = useCallback(async (month) => {
    const result = await syncAttendanceHistory();
    attendanceMonthsLoaded.current.clear();
    attendanceMonthRequests.current.clear();
    attendanceTodayRefreshed.current.clear();
    setAttendanceRecords([]);
    await loadAttendanceMonth(month || attendanceDateInIndia().slice(0, 7), { force: true });
    return result;
  }, [loadAttendanceMonth]);

  const refreshTodayAttendance = useCallback(async () => {
    if (!user) return null;
    const today = attendanceDateInIndia();
    if (attendanceTodayRefreshed.current.has(today)) return null;
    attendanceTodayRefreshed.current.add(today);
    try {
      const record = await fetchTodayAttendance();
      if (record) {
        setAttendanceRecords((current) => [record, ...current.filter((item) => (
          String(item.id || "") !== String(record.id || "")
          && String(item.date || item.workDate || "") !== String(record.date || record.workDate || "")
        ))]);
      }
      return record;
    } catch (error) {
      attendanceTodayRefreshed.current.delete(today);
      throw error;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAttendanceLoading(false);
      return undefined;
    }
    let active = true;
    setAttendanceLoading(true);
    loadAttendanceMonth(attendanceDateInIndia().slice(0, 7))
      .catch((error) => { if (active) notify(error.message || "Could not load attendance."); })
      .finally(() => { if (active) setAttendanceLoading(false); });
    return () => { active = false; };
  }, [loadAttendanceMonth, notify, user]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    fetchLeaves()
      .then((records) => { if (active && Array.isArray(records)) setAttendanceLeaves(records); })
      .catch((error) => { if (active) notify(error.message || "Could not load leave requests."); });
    return () => { active = false; };
  }, [notify, user]);

  useEffect(() => {
    if (!user || !["attendance-report", "leave-request"].includes(page)) return undefined;
    let active = true;
    let pending = false;
    const refresh = () => {
      if (!active || pending) return;
      pending = true;
      fetchLeaves()
        .then((records) => { if (active && Array.isArray(records)) setAttendanceLeaves(records); })
        .catch((error) => { if (active) notify(error.message || "Could not refresh leave requests."); })
        .finally(() => { pending = false; });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [notify, page, user]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    let pending = false;
    const refresh = () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      fetchAppNotifications()
        .then((records) => {
          if (!active || !Array.isArray(records)) return;
          const relevantRecords = filterITNotifications(records, user);
          const previousIds = knownNotificationIdsRef.current;
          const nextIds = new Set(relevantRecords.map(notificationId));
          const hasNewUnread = previousIds !== null && relevantRecords.some((item) => (
            !item.read && !previousIds.has(notificationId(item))
          ));
          knownNotificationIdsRef.current = nextIds;
          setAppNotifications(relevantRecords);
          if (hasNewUnread) {
            setIncomingNotifications(true);
            window.clearTimeout(incomingNotificationTimerRef.current);
            incomingNotificationTimerRef.current = window.setTimeout(() => setIncomingNotifications(false), 1800);
          }
        })
        .catch((error) => { if (active) notify(error.message || "Could not load notifications."); })
        .finally(() => { pending = false; });
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [notify, user]);

  const markNotificationRead = useCallback(async (id) => {
    try {
      const saved = await markAppNotificationRead(id);
      setAppNotifications((records) => records.map((record) => notificationId(record) === String(id) ? { ...record, ...saved, read: true } : record));
      return true;
    } catch (error) {
      notify(error.message || "Could not update notification.");
      return false;
    }
  }, [notify]);

  const markAllNotificationsRead = useCallback(async () => {
    const unread = appNotifications.filter((item) => !item.read && notificationId(item));
    if (!unread.length) return;
    const results = await Promise.allSettled(unread.map((item) => markAppNotificationRead(notificationId(item))));
    const succeededIds = new Set(unread.filter((_, index) => results[index].status === "fulfilled").map(notificationId));
    setAppNotifications((records) => records.map((record) => succeededIds.has(notificationId(record)) ? { ...record, read: true } : record));
    const failure = results.find((result) => result.status === "rejected");
    if (failure) notify(failure.reason?.message || "Some notifications could not be marked as read.");
  }, [appNotifications, notify]);

  const openNotification = useCallback(async (item) => {
    if (!item.read) await markNotificationRead(notificationId(item));
    setTopMenu("");
    setPage(notificationDestination(item));
  }, [markNotificationRead]);

  const unreadNotificationCount = appNotifications.filter((item) => !item.read).length;
  const selectedProject = employeeProjects.find((project) => String(project.id) === String(selectedProjectId));
  const openProject = (project, destination) => {
    setSelectedProjectId(project.id);
    setPage(destination);
  };
  const reviewProject = async (project, action) => {
    try {
      const saved = user && !TEAM_DEMO_MODE ? await updateProject(project, { action }) : { ...project, status: action === 'accept' ? 'Active' : 'Rejected' };
      if (TEAM_DEMO_MODE) saveDemoProject(saved);
      else updateProjects(current => current.map(item => item.id === saved.id ? saved : item));
      setPage(action === 'accept' ? 'active-projects' : 'new-projects');
      notify(action === 'accept' ? `${project.name} moved to Active Projects.` : `${project.name} was rejected.`);
    } catch (error) { notify(error.message); }
  };
  const acceptProject = project => reviewProject(project, 'accept');
  const rejectProject = project => reviewProject(project, 'reject');

  const updateProjectStatus = async (update) => {
    const saved = user && !TEAM_DEMO_MODE ? await updateProject(selectedProject, { update }) : applyProjectStatus(selectedProject, update);
    if (TEAM_DEMO_MODE) saveDemoProject(saved);
    else setLocalProjects(current => current.map(project => project.id === saved.id ? saved : project));
  };

  const renderPage = () => {
    switch (page) {
      case "team-overview": return canManageTeam ? <TeamOverview /> : null;
      case "team-assign": return canManageTeam ? <AssignProjects /> : null;
      case "team-progress": return canManageTeam ? <TeamProgress /> : null;
      case "dashboard": return <DashboardPage projects={employeeProjects} person={user?.name || EMPLOYEE.name} identity={user || EMPLOYEE} onNavigate={setPage} onProject={(project) => openProject(project, "project-details")} />;
      case "tasks": return <TasksPage user={user} notify={notify} />;
      case "mark-attendance": return <MarkAttendancePage notify={notify} employee={profileIdentity} attendance={attendanceRecords} setAttendance={setAttendanceRecords} calendar={attendanceCalendar} loading={attendanceLoading} authenticated={Boolean(user)} onRefreshToday={refreshTodayAttendance} />;
      case "attendance-report": return <AttendanceReportPage notify={notify} employee={profileIdentity} attendance={attendanceRecords} leaveRequests={attendanceLeaves} calendar={attendanceCalendar} loading={attendanceLoading} onMonthRequested={loadAttendanceMonth} onApplyLeave={(date) => { setLeaveRequestDate(date); setPage("leave-request"); }} onSyncAttendance={synchronizeAttendance} />;
      case "new-projects": return <ProjectsPage title="New Projects" subtitle="Review proposed projects before they enter your active workspace." projects={employeeProjects.filter((project) => project.status === "New")} onView={(project) => openProject(project, "project-details")} onReview={(project) => openProject(project, "project-review")} />;
      case "active-projects": return <ProjectsPage showTeam title="Active Projects" subtitle="Projects accepted and ready for execution." projects={employeeProjects.filter((project) => project.status === "Active")} onView={(project) => openProject(project, "project-details")} onReview={(project) => openProject(project, "project-review")} />;
      case "project-details": return <ProjectDetailsPage project={selectedProject} onStatusUpdate={updateProjectStatus} onAccept={acceptProject} onReject={rejectProject} onBack={() => setPage(selectedProject?.status === "Completed" ? "completed-projects" : selectedProject?.status === "Active" ? "active-projects" : "new-projects")} onReview={(project) => openProject(project, "project-review")} />;
      case "project-review": return <ProjectReviewPage project={selectedProject} onBack={() => setPage("new-projects")} onAccept={acceptProject} onReject={rejectProject} />;
      case "my-tasks":
      case "pending-tasks":
      case "overdue-tasks":
      case "my-work": return <MyWorkPage projects={employeeProjects} person={user?.name || EMPLOYEE.name} onNavigate={setPage} onProject={(project) => openProject(project, "project-details")} />;
      case "open-bugs": return <OpenBugsPage key={user?.name || EMPLOYEE.name} projects={employeeProjects} person={user?.name || EMPLOYEE.name} />;
      case "clarification": return <ClarificationPage key={user?.name || EMPLOYEE.name} person={user?.name || EMPLOYEE.name} projects={employeeProjects.filter((project) => project.status !== "Rejected")} />;
      case "hr-helpdesk": return <div className="crm-root it-helpdesk-sales-layout"><HelpdeskChat user={user} displayName={user?.name || EMPLOYEE.name} /></div>;
      case "completed-projects": return <ProjectsPage title="Completed Projects" subtitle="Projects marked completed by the project team." projects={employeeProjects.filter((project) => project.status === "Completed")} onView={(project) => openProject(project, "project-details")} onReview={() => {}} />;
      case "settings": return <div className="crm-root it-settings-sales-layout"><SharedAccountSettings
        profile={accountProfile}
        setProfile={setAccountProfile}
        showToast={notify}
        currentUser={{ ...(user || {}), ...accountProfile }}
        onProfileUpdated={(saved) => setAccountProfile((current) => ({ ...current, ...saved }))}
      /></div>;
      case "leave-request": return <ITLeaveRequestPage notify={notify} leaves={attendanceLeaves} setLeaves={setAttendanceLeaves} authenticated={Boolean(user)} initialDate={leaveRequestDate} onSubmitted={() => setLeaveRequestDate("")} today={attendanceDateInIndia()} />;
      case "notifications": return <NotificationsPage notifications={appNotifications} unreadCount={unreadNotificationCount} onOpen={openNotification} onMarkAllRead={markAllNotificationsRead} />;
      default: return null;
    }
  };

  return (
    <>
      <style>{THEME_CSS}</style>
      <div className="shell it-dashboard-shell">
        <Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onLogout={() => setLogoutConfirmOpen(true)} identity={profileIdentity} unreadNotificationCount={unreadNotificationCount} />
        <div className="workspace">
          <div className="topbar">
            <div className="topbar-left">
              <button className="icon-button mobile-only" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
              <div>
                <h1>{TITLES[page]}</h1>
                <p className="topbar-subtitle">{page === "mark-attendance" ? "Log today’s attendance" : page === "attendance-report" ? "Monthly attendance history" : page === "tasks" ? "Create, assign and track work" : page === "notifications" ? "Updates about your work" : page === "hr-helpdesk" ? "Chat directly with the HR team" : page === "settings" ? "Profile, preferences and security" : `${profileIdentity.branch || EMPLOYEE.branch} · ${profileIdentity.department || profileIdentity.dept || EMPLOYEE.department}`}</p>
              </div>
            </div>
            <div className="topbar-right" ref={topbarMenusRef}>
              <div className="it-topbar-popover">
                <button type="button" className={`icon-button it-notification-button${appNotifications.some((item) => !item.read) ? " has-unread" : ""}${incomingNotifications ? " has-incoming" : ""}`} title="Notifications" aria-label="Notifications" aria-expanded={topMenu === "notifications"} onClick={() => setTopMenu((current) => current === "notifications" ? "" : "notifications")}>
                  <BellRing size={18} />
                  {unreadNotificationCount > 0 && <span className="it-bell-badge">{unreadNotificationCount}</span>}
                </button>
                {topMenu === "notifications" && (
                  <div className="it-topbar-menu" role="dialog" aria-label="Notifications">
                    <div className="it-topbar-menu-head"><strong>Notifications</strong><button type="button" onClick={markAllNotificationsRead} disabled={!unreadNotificationCount}>Mark all read</button></div>
                    <div className="it-topbar-notification-list">
                      {appNotifications.slice(0, 6).map((item) => (
                        <button key={notificationId(item)} type="button" className={`it-topbar-notification${item.read ? "" : " unread"}`} onClick={() => openNotification(item)}>
                          {item.message}
                        </button>
                      ))}
                      {!appNotifications.length && <p className="it-topbar-menu-empty">No notifications yet.</p>}
                    </div>
                    <button type="button" className="it-topbar-menu-link" onClick={() => { setTopMenu(""); setPage("notifications"); }}>View all notifications</button>
                  </div>
                )}
              </div>
              <div className="it-topbar-popover">
                <button type="button" className="it-user-chip" aria-expanded={topMenu === "profile"} onClick={() => setTopMenu((current) => current === "profile" ? "" : "profile")}>
                  <span className="it-user-avatar">
                    {profileIdentity.imageUrl ? <img src={profileIdentity.imageUrl} alt="" /> : profileIdentity.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="it-user-chip-copy">
                    <strong>{profileIdentity.name}</strong>
                    <span>{employeeRole}</span>
                  </span>
                </button>
                {topMenu === "profile" && (
                  <div className="it-topbar-menu it-profile-menu" role="dialog" aria-label="Profile details">
                    <div className="it-profile-menu-identity">
                      <span className="it-profile-menu-avatar">
                        {profileIdentity.imageUrl ? <img src={profileIdentity.imageUrl} alt="" /> : profileIdentity.name.charAt(0).toUpperCase()}
                      </span>
                      <div><strong>{profileIdentity.name}</strong><span>{employeeRole}</span></div>
                    </div>
                    <div className="it-profile-menu-data">
                      <div><span>Email</span><b>{profileIdentity.email || "Not provided"}</b></div>
                      <div><span>Branch</span><b>{profileIdentity.branch || EMPLOYEE.branch}</b></div>
                    </div>
                    <button type="button" className="it-profile-menu-link" onClick={() => { setTopMenu(""); setPage("settings"); }}>View settings</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`content${page === "hr-helpdesk" ? " it-helpdesk-content" : page === "settings" ? " it-settings-content" : ""}`}>
            {!user && projects === undefined && <p className="eyebrow" style={{ marginBottom: 16 }}>Demo workspace · Sample data only</p>}
            {renderPage()}
          </div>
        </div>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
      <HelpdeskIncomingToast user={user} onOpen={() => setPage("hr-helpdesk")} />
      <LogoutConfirmDialog open={logoutConfirmOpen} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={() => { setLogoutConfirmOpen(false); onLogout?.(); }} />
    </>
  );
}

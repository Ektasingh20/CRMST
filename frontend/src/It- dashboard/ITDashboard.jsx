import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { withDemoProjectPresentation } from "./demoProjectPresentation";
import { demoProjects } from "./demoProjects";
import OpenBugsPage from "./OpenBugsPage";
import DailyOverview from "./DailyOverview.jsx";
import MyWorkPage from "./MyWorkPage.jsx";
import ClarificationPage from "./ClarificationPage";
import ProjectStatusSection from "./ProjectStatusSection";
import { applyProjectStatus, projectStatusSummary } from "./projectStatus";
import { getUploadedProjectFiles, requirementSections } from "./projectFiles";
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
} from "lucide-react";

/* ============================================================
   THEME — pasted stylesheet, verbatim, plus a small supplemental
   block at the end for the pieces this dashboard needs that the
   original sheet didn't name (info strip, filter row, badges for
   a couple of extra statuses, document-upload cards, etc).
   ============================================================ */

const THEME_CSS = `
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
.sidebar-profile { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 8px 8px; }
.sidebar-profile-avatar { width: 56px; height: 56px; border-radius: 16px; font-size: 1.1rem; display:grid; place-items:center; background: rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.2); }
.sidebar-profile-name { font-size: 0.88rem; font-weight: 700; color: white; text-align: center; }
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
.content { padding: 24px; overflow-y: auto; overflow-x: hidden; flex: 1; scroll-behavior: smooth; }

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
.attendance-report-table { min-width: 0; table-layout: fixed; font-size: 0.78rem; }
.attendance-report-table th, .attendance-report-table td { padding: 11px 8px; overflow-wrap: anywhere; }
.attendance-report-table th { font-size: 0.66rem; letter-spacing: 0.08em; }
.attendance-report-table .badge { padding: 0 8px; font-size: 0.72rem; }

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

.mark-attendance-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; align-items: end; padding: 20px 24px 28px; }
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
`;

/* ============================================================
   DATA
   ============================================================ */

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "new-projects", label: "New Projects", icon: FolderKanban, group: "Projects" },
  { key: "active-projects", label: "Active Projects", icon: ClipboardCheck, group: "Projects" },
  { key: "completed-projects", label: "Completed Projects", icon: CircleCheck, group: "Projects" },
  { key: "my-work", label: "My Work", icon: ClipboardList, group: "Work" },
  { key: "open-bugs", label: "Open Bugs", icon: Bug, group: "Support" },
  { key: "clarification", label: "Clarification", icon: MessageSquare, group: "Support" },
  { key: "settings", label: "Settings", icon: SettingsIcon, group: "Account" },
  { key: "leave-request", label: "Leave Request", icon: UserCircle2, group: "Account" },
];

const NAV_GROUPS = ["Overview", "Projects", "Work", "Support", "Account"];
const TITLES = {
  dashboard: "Dashboard",
  "mark-attendance": "Mark Attendance",
  "attendance-report": "Attendance Reports",
  "new-projects": "New Projects",
  "active-projects": "Active Projects",
  "my-work": "My Work",
  "my-tasks": "My Work",
  "pending-tasks": "My Work",
  "overdue-tasks": "My Work",
  "open-bugs": "Open Bugs",
  clarification: "Clarification",
  "completed-projects": "Completed Projects",
  "project-details": "Project Details",
  "project-review": "Project Review",
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

const INITIAL_ATTENDANCE = [
  { sn: 1, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "15-09-2026", day: "Tuesday", checkin: "12:20:00", checkout: "00:00:00", hours: "00:00:00", remark: "", status: "Present" },
  { sn: 2, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "14-09-2026", day: "Monday", checkin: "15:03:00", checkout: "00:00:00", hours: "00:00:00", remark: "", status: "Present" },
  { sn: 3, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "12-09-2026", day: "Saturday", checkin: "00:00:00", checkout: "00:00:00", hours: "00:00:00", remark: "", status: "Leave" },
  { sn: 4, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "10-09-2026", day: "Thursday", checkin: "00:00:00", checkout: "00:00:00", hours: "00:00:00", remark: "", status: "Leave" },
  { sn: 5, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "05-09-2026", day: "Saturday", checkin: "00:00:00", checkout: "12:29:00", hours: "12:29:00", remark: "", status: "Present" },
  { sn: 6, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "04-09-2026", day: "Friday", checkin: "00:00:00", checkout: "11:02:00", hours: "11:02:00", remark: "", status: "Present" },
  { sn: 7, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "03-09-2026", day: "Thursday", checkin: "00:00:00", checkout: "00:00:00", hours: "00:00:00", remark: "", status: "Present" },
  { sn: 8, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "02-09-2026", day: "Wednesday", checkin: "11:10:00", checkout: "00:00:00", hours: "00:00:00", remark: "", status: "Present" },
  { sn: 9, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "01-09-2026", day: "Tuesday", checkin: "00:00:00", checkout: "00:00:00", hours: "00:00:00", remark: "", status: "Leave" },
  { sn: 10, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "31-08-2026", day: "Monday", checkin: "00:00:00", checkout: "00:00:00", hours: "00:00:00", remark: "rakhi", status: "Leave" },
  { sn: 11, id: 60, name: "Ekta Singh", dept: "IT", branch: "Ajmer", date: "30-08-2026", day: "Sunday", checkin: "00:00:00", checkout: "00:00:00", hours: "00:00:00", remark: "", status: "Holiday" },
];

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

const INITIAL_LEAVES = [
  { sn: 1, name: "Ekta Singh", type: "Casual Leave", start: "31-08-2026", end: "31-08-2026", reason: "Family function", status: "Approved", appliedAt: "25-08-2026 12:02 PM", approvedBy: "HR", approvedAt: "26-08-2026 10:40 AM" },
  { sn: 2, name: "Ekta Singh", type: "Casual Leave", start: "29-08-2026", end: "29-08-2026", reason: "Personal work", status: "Approved", appliedAt: "25-08-2026 12:01 PM", approvedBy: "HR", approvedAt: "26-08-2026 10:39 AM" },
  { sn: 3, name: "Ekta Singh", type: "Casual Leave", start: "26-08-2026", end: "27-08-2026", reason: "Family function", status: "Approved", appliedAt: "25-08-2026 11:59 AM", approvedBy: "HR", approvedAt: "26-08-2026 10:38 AM" },
  { sn: 4, name: "Ekta Singh", type: "Sick Leave", start: "12-08-2026", end: "12-08-2026", reason: "High fever", status: "Approved", appliedAt: "12-08-2026 09:14 AM", approvedBy: "HR", approvedAt: "12-08-2026 04:04 PM" },
  { sn: 5, name: "Ekta Singh", type: "Sick Leave", start: "11-08-2026", end: "11-08-2026", reason: "High fever", status: "Approved", appliedAt: "11-08-2026 02:28 PM", approvedBy: "HR", approvedAt: "11-08-2026 03:09 PM" },
  { sn: 6, name: "Ekta Singh", type: "Sick Leave", start: "06-08-2026", end: "06-08-2026", reason: "High fever", status: "Approved", appliedAt: "06-08-2026 05:05 PM", approvedBy: "HR", approvedAt: "06-08-2026 05:08 PM" },
  { sn: 7, name: "Ekta Singh", type: "Casual Leave", start: "13-07-2026", end: "18-07-2026", reason: "Family engagement", status: "Approved", appliedAt: "09-07-2026 03:04 PM", approvedBy: "Admin", approvedAt: "09-07-2026 03:05 PM" },
];

/* ============================================================
   HELPERS
   ============================================================ */

function Badge({ status }) {
  const map = {
    Present: "success", Completed: "success", Approved: "success",
    Leave: "warning", Pending: "warning", "In Progress": "warning",
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
    <div className="toast">
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

function Sidebar({ page, setPage, mobileOpen, setMobileOpen, onLogout }) {
  return (
    <>
      <div className={`mobile-scrim${mobileOpen ? " show" : ""}`} onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
        <div className="brand">
          <div className="logo-badge compact"><LayoutDashboard size={20} /></div>
          <div className="brand-copy">
            <strong>IT Dashboard</strong>
            <span>System Technologies</span>
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="sidebar-profile-avatar"><UserCircle2 size={30} /></div>
          <div className="sidebar-profile-name">{EMPLOYEE.name}</div>
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

function DashboardPage({ projects, person, onNavigate, onProject }) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="hero-card dashboard-hero">
        <div className="hero-card-top">
          <div>
            <p className="eyebrow">IT Department</p>
            <h2>Welcome, {EMPLOYEE.name}</h2>
          </div>
          <span className="hero-tag"><UserCircle2 size={16} /> CRM ID {EMPLOYEE.crmId}</span>
        </div>
        <p className="hero-copy">Here's a quick snapshot of your workspace today.</p>
        <div className="info-strip">
          <div className="info-chip"><span>CRM ID</span><strong>{EMPLOYEE.crmId}</strong></div>
          <div className="info-chip"><span>Branch</span><strong>{EMPLOYEE.branch}</strong></div>
          <div className="info-chip"><span>Designation</span><strong>{EMPLOYEE.designation}</strong></div>
          <div className="info-chip"><span>Department</span><strong>{EMPLOYEE.department}</strong></div>
        </div>
      </div>

      <DailyOverview projects={projects} person={person} onNavigate={onNavigate} onProject={onProject} />
    </div>
  );
}

function ProjectCard({ project, onView, onReview }) {
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
      <div className="project-actions">
        <button className="ghost-button" onClick={() => onView(project)}><Eye size={14} /> View</button>
        {project.status === "New" && <button className="primary-button" onClick={() => onReview(project)}><FileSearch size={14} /> Review</button>}
      </div>
    </article>
  );
}

function ProjectsPage({ title, subtitle, projects, onView, onReview }) {
  return (
    <div className="panel">
      <div className="panel-head"><h3>{title}</h3><p className="panel-subtitle">{subtitle}</p></div>
      {projects.length === 0 ? <p className="panel-empty">No projects in this workspace yet.</p> : <div className="project-grid">{projects.map((project) => <ProjectCard key={project.id} project={project} onView={onView} onReview={onReview} />)}</div>}
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
  return createPortal(<dialog ref={dialogRef} className="brief-file-modal" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="brief-preview-title">
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

function ProjectDetailsPage({ project: sourceProject, onBack, onReview, onAccept, onReject, onStatusUpdate }) {
  const project = sourceProject ? withDemoProjectPresentation(sourceProject) : null;
  if (!project) return <p className="panel-empty">Project not found.</p>;
  const statusSection = <ProjectStatusSection key={sourceProject.id} project={sourceProject} onUpdate={onStatusUpdate} />;
  if (project.demoReview) return <ProjectReviewPage project={sourceProject} onBack={onBack} onReview={onReview} onAccept={onAccept} onReject={onReject} statusSection={statusSection} />;
  const files = getUploadedProjectFiles(project);
  const metadata = [['Client / company', project.client], ['Service', project.service], ['Assigned to', project.assignedEmployeeName || project.assignedTo], ['Priority', project.priority], ['Start date', project.startDate], ['Expected delivery', project.expectedDelivery || project.due]];
  return (
    <div className="project-workspace">
      <section className="panel project-overview">
        <div className="project-overview-top"><span className="project-overview-icon"><FolderKanban size={26} /></span><div className="project-overview-title"><p className="eyebrow">PROJECT WORKSPACE / {project.projectId || project.id}</p><h2>{project.name || project.projectName}</h2><p>Project brief, requirements and shared documents</p></div><button className="ghost-button" onClick={onBack}>Back to projects</button></div>
        <div className="project-overview-bottom"><div className="project-overview-badges"><Badge status={project.status} /><span><FileText size={15} /> {files.length} attachments</span></div>{project.status === "New" && <button className="primary-button" onClick={() => onReview(project)}><FileSearch size={16} /> Review project</button>}</div>
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

function MarkAttendancePage({ notify }) {
  const [status, setStatus] = useState("Present");
  const [remark, setRemark] = useState("Working on support tickets and course progress updates.");
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);

  const handleCheckIn = () => {
    if (!status) { notify("Please select a status before checking in."); return; }
    setCheckedIn(true);
    notify("Checked in successfully.");
  };

  const handleCheckOut = () => {
    if (!checkedIn) return;
    setCheckedOut(true);
    notify("Checked out successfully.");
  };

  return (
    <div className="panel">
      <div className="panel-head"><h3>Mark Attendance</h3></div>
      <div className="mark-attendance-form">
        <Field label="Employee Name">
          <input value={EMPLOYEE.name} disabled />
        </Field>
        <Field label="Select Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Select Status</option>
            <option>Present</option>
            <option>Absent</option>
            <option>Leave</option>
          </select>
        </Field>
        <Field label="Remark">
          <input placeholder="Remark (optional)" value={remark} onChange={(e) => setRemark(e.target.value)} />
        </Field>
        <Field label={checkedOut ? "Attendance Complete" : checkedIn ? "Check Out" : "Check In"}>
          <button
            onClick={checkedOut ? undefined : checkedIn ? handleCheckOut : handleCheckIn}
            disabled={checkedOut}
            className="primary-button full-width danger-button"
          >
            {checkedOut ? "Checked Out" : checkedIn ? "Check Out" : "Check In"}
          </button>
        </Field>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: ATTENDANCE REPORT
   ============================================================ */

function AttendanceReportPage({ notify }) {
  const [rows] = useState(INITIAL_ATTENDANCE);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("2026-09");
  const [status, setStatus] = useState("");

  const filtered = rows.filter((r) => {
    if (status && r.status !== status) return false;
    if (day && r.day !== day) return false;
    return true;
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="panel">
        <div className="panel-head">
          <h3><ClipboardList size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Attendance Report</h3>
        </div>
        <div className="filters-row">
          <Field label="Day">
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="">Select Day</option>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Month">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Select Status</option>
              <option>Present</option>
              <option>Leave</option>
              <option>Holiday</option>
            </select>
          </Field>
          <button className="primary-button">Apply</button>
          <button className="ghost-button" onClick={() => { setDay(""); setStatus(""); }}>Reset</button>
          <div style={{ flex: 1 }} />
          <button className="primary-button crm-upload-button" onClick={() => notify("Exported attendance to Excel.")}>
            <Download size={15} /> Export to Excel
          </button>
          <button className="primary-button danger-button" onClick={() => notify("Exported attendance to PDF.")}>
            <FileText size={15} /> Export to PDF
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="table attendance-report-table">
            <thead>
              <tr>
                {["S.N", "Emp ID", "Emp Name", "Department", "Branch", "Date", "Day", "Check-in", "Check-out", "Total Hours", "Remarks", "Status"].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.sn}>
                  <td>{r.sn}</td><td>{r.id}</td>
                  <td style={{ fontWeight: 700 }}>{r.name}</td>
                  <td>{r.dept}</td><td>{r.branch}</td><td>{r.date}</td><td>{r.day}</td>
                  <td>{r.checkin}</td><td>{r.checkout}</td><td>{r.hours}</td>
                  <td style={{ color: "var(--text-soft)" }}>{r.remark}</td>
                  <td><Badge status={r.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="panel-empty">No records match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: SETTINGS
   ============================================================ */

function SettingsPage({ notify }) {
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
  const [pwd, setPwd] = useState({ old: "", next: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);

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

  const handleUpdatePassword = () => {
    if (!pwd.old || !pwd.next || !pwd.confirm) return notify("Fill in all password fields.");
    if (pwd.next !== pwd.confirm) return notify("New passwords don't match.");
    setPwd({ old: "", next: "", confirm: "" });
    notify("Password updated successfully.");
  };

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
            <Field label="Old Password" required>
              <div className="password-input-wrap">
                <input type={showPwd ? "text" : "password"} value={pwd.old} onChange={(e) => setPwd((s) => ({ ...s, old: e.target.value }))} placeholder="Enter current password" />
                <button type="button" className="password-toggle" onClick={() => setShowPwd((s) => !s)}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
            <Field label="New Password" required>
              <input type={showPwd ? "text" : "password"} value={pwd.next} onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))} placeholder="Enter new password" />
            </Field>
            <Field label="Confirm New Password" required>
              <input type={showPwd ? "text" : "password"} value={pwd.confirm} onChange={(e) => setPwd((s) => ({ ...s, confirm: e.target.value }))} placeholder="Confirm new password" />
            </Field>
            <button className="primary-button full-width" onClick={handleUpdatePassword}>Update Password</button>
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
   PAGE: LEAVE REQUEST
   ============================================================ */

function LeaveRequestPage({ notify }) {
  const [leaves, setLeaves] = useState(INITIAL_LEAVES);
  const [form, setForm] = useState({ type: "Sick Leave", start: "", end: "", reason: "" });

  const applyLeave = () => {
    if (!form.start || !form.end || !form.reason.trim()) { notify("Fill in the leave dates and reason."); return; }
    const fmt = (iso) => { const [y, m, d] = iso.split("-"); return `${d}-${m}-${y}`; };
    setLeaves((l) => [
      { sn: l.length + 1, name: EMPLOYEE.name, type: form.type, start: fmt(form.start), end: fmt(form.end), reason: form.reason, status: "Pending", appliedAt: "Just now", approvedBy: "—", approvedAt: "—" },
      ...l,
    ]);
    setForm({ type: "Sick Leave", start: "", end: "", reason: "" });
    notify("Leave request submitted.");
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="panel">
        <div className="panel-head"><h3 style={{ textAlign: "center", width: "100%" }}>Leave Request</h3></div>
        <div className="leave-request-form">
          <Field label="Leave Type">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option>Sick Leave</option><option>Casual Leave</option><option>Earned Leave</option>
            </select>
          </Field>
          <Field label="Start Date"><input type="date" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} /></Field>
          <Field label="End Date"><input type="date" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} /></Field>
          <Field label="Reason"><input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></Field>
        </div>
        <div style={{ padding: "0 24px 24px" }}>
          <button className="primary-button crm-upload-button" onClick={applyLeave}>Apply Leave</button>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>{["S.N", "Name", "Leave Type", "Start Date", "End Date", "Reason", "Status", "Applied At", "Approved By", "Approved At"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {leaves.map((l, i) => (
                <tr key={i}>
                  <td>{l.sn}</td>
                  <td style={{ fontWeight: 700 }}>{l.name}</td>
                  <td>{l.type}</td><td>{l.start}</td><td>{l.end}</td>
                  <td style={{ color: "var(--text-soft)" }}>{l.reason}</td>
                  <td><Badge status={l.status} /></td>
                  <td style={{ color: "var(--text-faint)" }}>{l.appliedAt}</td>
                  <td style={{ color: "var(--text-faint)" }}>{l.approvedBy}</td>
                  <td style={{ color: "var(--text-faint)" }}>{l.approvedAt}</td>
                </tr>
              ))}
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

export default function App({ user, projects, onProjectsChange, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [localProjects, setLocalProjects] = useState(projects === undefined ? getStoredProjects() : projects);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  useEffect(() => {
    if (projects !== undefined) setLocalProjects(Array.isArray(projects) ? projects : []);
  }, [projects]);

  useEffect(() => {
    const handleStoredProjects = (event) => {
      if (event.key !== PROJECTS_STORAGE_KEY) return;
      setLocalProjects(getStoredProjects());
    };
    window.addEventListener("storage", handleStoredProjects);
    return () => window.removeEventListener("storage", handleStoredProjects);
  }, []);

  const employeeIdentity = new Set([
    user?.id,
    user?._id,
    user?.crmId,
    user?.username,
    user?.email,
    user?.name,
    EMPLOYEE.crmId,
    EMPLOYEE.name,
  ].filter(Boolean).map((value) => String(value).trim().toLowerCase()));
  const employeeProjects = localProjects
    .filter((project) => [
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

  const notify = (msg) => {
    setToast(msg);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(""), 2600);
  };

  const selectedProject = employeeProjects.find((project) => String(project.id) === String(selectedProjectId));
  const openProject = (project, destination) => {
    setSelectedProjectId(project.id);
    setPage(destination);
  };
  const acceptProject = (project) => {
    updateProjects((current) => current.map((item) => String(item.id) === String(project.id) ? { ...item, status: "Active" } : item));
    setPage("active-projects");
    notify(`${project.name || project.projectName} moved to Active Projects.`);
  };
  const rejectProject = (project) => {
    updateProjects((current) => current.map((item) => String(item.id) === String(project.id) ? { ...item, status: "Rejected" } : item));
    setPage("new-projects");
    notify(`${project.name || project.projectName} was rejected.`);
  };

  const updateProjectStatus = (update) => {
    setLocalProjects((current) => current.map((project) => String(project.id) === String(selectedProjectId) ? applyProjectStatus(project, update) : project));
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage projects={employeeProjects} person={user?.name || EMPLOYEE.name} onNavigate={setPage} onProject={(project) => openProject(project, "project-details")} />;
      case "mark-attendance": return <MarkAttendancePage notify={notify} />;
      case "attendance-report": return <AttendanceReportPage notify={notify} />;
      case "new-projects": return <ProjectsPage title="New Projects" subtitle="Review proposed projects before they enter your active workspace." projects={employeeProjects.filter((project) => project.status === "New")} onView={(project) => openProject(project, "project-details")} onReview={(project) => openProject(project, "project-review")} />;
      case "active-projects": return <ProjectsPage title="Active Projects" subtitle="Projects accepted and ready for execution." projects={employeeProjects.filter((project) => project.status === "Active")} onView={(project) => openProject(project, "project-details")} onReview={(project) => openProject(project, "project-review")} />;
      case "project-details": return <ProjectDetailsPage project={selectedProject} onStatusUpdate={updateProjectStatus} onAccept={acceptProject} onReject={rejectProject} onBack={() => setPage(selectedProject?.status === "Completed" ? "completed-projects" : selectedProject?.status === "Active" ? "active-projects" : "new-projects")} onReview={(project) => openProject(project, "project-review")} />;
      case "project-review": return <ProjectReviewPage project={selectedProject} onBack={() => setPage("new-projects")} onAccept={acceptProject} onReject={rejectProject} />;
      case "my-tasks":
      case "pending-tasks":
      case "overdue-tasks":
      case "my-work": return <MyWorkPage projects={employeeProjects} person={user?.name || EMPLOYEE.name} onNavigate={setPage} onProject={(project) => openProject(project, "project-details")} />;
      case "open-bugs": return <OpenBugsPage key={user?.name || EMPLOYEE.name} projects={employeeProjects} person={user?.name || EMPLOYEE.name} />;
      case "clarification": return <ClarificationPage key={user?.name || EMPLOYEE.name} person={user?.name || EMPLOYEE.name} projects={employeeProjects.filter((project) => project.status !== "Rejected")} />;
      case "completed-projects": return <ProjectsPage title="Completed Projects" subtitle="Projects marked completed by the project team." projects={employeeProjects.filter((project) => project.status === "Completed")} onView={(project) => openProject(project, "project-details")} onReview={() => {}} />;
      case "settings": return <SettingsPage notify={notify} />;
      case "leave-request": return <LeaveRequestPage notify={notify} />;
      default: return null;
    }
  };

  return (
    <>
      <style>{THEME_CSS}</style>
      <div className="shell">
        <Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onLogout={onLogout} />
        <div className="workspace">
          <div className="topbar">
            <div className="topbar-left">
              <button className="icon-button mobile-only" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
              <h1>{TITLES[page]}</h1>
            </div>
            <div className="topbar-right">
              <span className="eyebrow" style={{ margin: 0 }}>{EMPLOYEE.branch} · {EMPLOYEE.department}</span>
            </div>
          </div>
          <div className="content">
            {projects === undefined && <p className="eyebrow" style={{ marginBottom: 16 }}>Demo workspace · Sample data only</p>}
            {renderPage()}
          </div>
        </div>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </>
  );
}

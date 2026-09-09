import React, { useState } from "react";
import "./itEmployeeDashboard.css";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import DashboardHome from "./pages/DashboardHome";
import MarkAttendance from "./pages/MarkAttendance";
import AttendanceReport from "./pages/AttendanceReport";
import SettingsPage from "./pages/SettingsPage";
import AllTasks from "./pages/AllTasks";
import LeaveRequest from "./pages/LeaveRequest";

const PAGES = {
  dashboard: DashboardHome,
  attendance: MarkAttendance,
  report: AttendanceReport,
  settings: SettingsPage,
  tasks: AllTasks,
  leave: LeaveRequest,
};

export default function ItEmployeeDashboard() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ActivePage = PAGES[page] || DashboardHome;

  const handleNavigate = (key) => {
    setPage(key);
    setSidebarOpen(false);
  };

  return (
    <div className="itd-root">
      <Sidebar
        active={page}
        onNavigate={handleNavigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="itd-main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <ActivePage />
      </div>
    </div>
  );
}

import React from "react";
import {
  IconGrid,
  IconClock,
  IconReport,
  IconGear,
  IconTasks,
  IconUser,
  IconLogout,
  IconClose,
} from "./Icons";
import { employee } from "./data";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: IconGrid },
  { key: "attendance", label: "Mark Attendance", icon: IconClock },
  { key: "report", label: "Attendance Report", icon: IconReport },
  { key: "settings", label: "Settings", icon: IconGear },
  { key: "tasks", label: "All Task", icon: IconTasks },
  { key: "leave", label: "Leave Request", icon: IconUser, badge: 1 },
];

export default function Sidebar({ active, onNavigate, open, onClose }) {
  return (
    <>
      {open && <div className="itd-sidebar-backdrop" onClick={onClose} />}
      <aside className={`itd-sidebar${open ? " open" : ""}`}>
        <button className="itd-sidebar-close" onClick={onClose} aria-label="Close menu">
          <IconClose width={16} height={16} />
        </button>

        <div className="itd-sidebar-brand">
          <IconGrid width={18} height={18} />
          IT Dashboard
        </div>

        <div className="itd-sidebar-user">
          <div className="itd-avatar" style={{ background: "#3a2415" }}>
            {employee.name.charAt(0)}
          </div>
          <div className="name">{employee.name}</div>
          <div className="role">{employee.role}</div>
        </div>

        <nav className="itd-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`itd-nav-item${active === item.key ? " active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <item.icon />
              {item.label}
              {item.badge ? <span className="badge">{item.badge}</span> : null}
            </button>
          ))}
        </nav>

        <button className="itd-sidebar-logout">
          <IconLogout />
          Logout
        </button>
      </aside>
    </>
  );
}

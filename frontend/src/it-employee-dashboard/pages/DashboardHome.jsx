import React from "react";
import { IconPlus, IconClock, IconTasks, IconCheck, IconWallet } from "../Icons";
import { employee, dashboardStats, assignedTasks, teamOverview } from "../data";

const priorityClass = {
  High: "itd-pill-high",
  Medium: "itd-pill-medium",
  Normal: "itd-pill-normal",
};

const statusClass = {
  "In Progress": "itd-pill-amber",
  "Pending Review": "itd-pill-blue",
  "To Do": "itd-pill-gray",
};

export default function DashboardHome() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="itd-page">
      <div className="itd-page-header">
        <div>
          <h1>
            Welcome back, {employee.name} <span className="itd-dot" /> <span style={{ fontSize: 13, color: "#1c9a5b", fontWeight: 600 }}>Shift Active</span>
          </h1>
          <p>Overview for Today • {dateStr} • {employee.department}</p>
        </div>
        <div className="itd-header-actions">
          <button className="itd-btn itd-btn-primary">
            <IconPlus width={14} height={14} /> Create Task
          </button>
          <button className="itd-btn">Request Leave</button>
        </div>
      </div>

      <div className="itd-stats-grid">
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">My Pending Tasks</span>
            <span className="itd-stat-icon"><IconClock width={14} height={14} /></span>
          </div>
          <div className="itd-stat-value">{dashboardStats.pendingTasks.total}</div>
          <div className="itd-stat-sub">
            <span className="accent">{dashboardStats.pendingTasks.highPriority} High Priority</span> · {dashboardStats.pendingTasks.dueToday} due today
          </div>
        </div>

        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">All Team Tasks</span>
            <span className="itd-stat-icon"><IconTasks width={14} height={14} /></span>
          </div>
          <div className="itd-stat-value">{dashboardStats.teamTasks.total}</div>
          <div className="itd-stat-sub">
            <span className="accent">{dashboardStats.teamTasks.inProgress} In Progress</span> · {dashboardStats.teamTasks.completedThisWeek} completed this week
          </div>
        </div>

        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Today's Attendance</span>
            <span className="itd-stat-icon"><IconCheck width={14} height={14} /></span>
          </div>
          <div className="itd-stat-value green">{dashboardStats.attendance.status} <span style={{ fontSize: 13, color: "#8b8598", fontWeight: 500 }}>{dashboardStats.attendance.time}</span></div>
          <div className="itd-stat-sub">{dashboardStats.attendance.note}</div>
        </div>

        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Leave Balance</span>
            <span className="itd-stat-icon"><IconWallet width={14} height={14} /></span>
          </div>
          <div className="itd-stat-value">{dashboardStats.leaveBalance.days} <span style={{ fontSize: 13, color: "#8b8598", fontWeight: 500 }}>Days Remaining</span></div>
          <div className="itd-stat-sub">{dashboardStats.leaveBalance.note}</div>
        </div>
      </div>

      <div className="itd-two-col">
        <div className="itd-panel">
          <div className="itd-panel-head">
            <h3>My Assigned Tasks <span className="count">{assignedTasks.length}</span></h3>
            <button className="link">View all</button>
          </div>
          <div className="itd-panel-body">
            {assignedTasks.map((task) => (
              <div className="itd-task-row" key={task.id}>
                <div>
                  <div className="itd-task-title-row">
                    <span className="title">{task.title}</span>
                    <span className={`itd-pill ${priorityClass[task.priority] || "itd-pill-normal"}`}>{task.priority}</span>
                  </div>
                  <div className="itd-task-desc">{task.description}</div>
                </div>
                <div className="itd-task-right">
                  <span className={`itd-pill ${statusClass[task.status] || "itd-pill-gray"}`}>{task.status}</span>
                  <span className="due">{task.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="itd-panel">
          <div className="itd-panel-head">
            <h3>Team Overview • IT Dept</h3>
            <span className="tag">Aajmer Unit</span>
          </div>
          <div className="itd-panel-body">
            {teamOverview.map((item) => (
              <div className="itd-team-row" key={item.id}>
                <div className="itd-team-row-top">
                  <span className="title">{item.title}</span>
                  <span className={`itd-pill ${item.status === "Completed" ? "itd-pill-green" : item.status === "Testing" ? "itd-pill-medium" : "itd-pill-blue"}`}>
                    {item.status}
                  </span>
                </div>
                <div className="lead">{item.lead}</div>
              </div>
            ))}
          </div>
          <div className="itd-panel-footer">
            <div className="itd-footer-row">
              <span>Active Team Members</span>
              <span>8 / 8 Online</span>
            </div>
            <div className="itd-progress-track">
              <div className="itd-progress-fill" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

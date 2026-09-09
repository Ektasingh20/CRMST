import React, { useState } from "react";
import { IconDownload, IconPlus, IconSearch, IconChevron } from "../Icons";
import { allTasks, employee } from "../data";

const priorityClass = {
  Critical: "itd-pill-critical",
  High: "itd-pill-high",
  Medium: "itd-pill-medium",
  Low: "itd-pill-low",
};

const statusClass = {
  "In Progress": "itd-pill-amber",
  Completed: "itd-pill-green",
  "Under Review": "itd-pill-blue",
};

const TABS = [
  { key: "all", label: "All Tasks", count: 8 },
  { key: "progress", label: "In Progress", count: 3 },
  { key: "review", label: "Code Review", count: 2 },
  { key: "done", label: "Completed", count: 3 },
];

export default function AllTasks() {
  const [tab, setTab] = useState("all");
  const [view, setView] = useState("table");

  return (
    <div className="itd-page">
      <div className="itd-page-header">
        <div>
          <h1 style={{ display: "block" }}>All Tasks</h1>
          <p>IT Department task backlog and active sprint queue assigned to {employee.fullName}.</p>
        </div>
        <div className="itd-header-actions">
          <select className="itd-btn" style={{ paddingRight: 10 }} defaultValue="sprint24">
            <option value="sprint24">Sprint 24 (Active)</option>
            <option value="sprint23">Sprint 23 (Closed)</option>
          </select>
          <button className="itd-btn">
            <IconDownload width={14} height={14} /> Export Tasks
          </button>
          <button className="itd-btn itd-btn-primary">
            <IconPlus width={14} height={14} /> Create New Task
          </button>
        </div>
      </div>

      <div className="itd-stats-grid">
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top"><span className="label">My Assigned Tasks</span></div>
          <div className="itd-stat-value">08</div>
          <div className="itd-stat-sub"><span className="accent">3 Done</span> · 3 In Prog · 2 Review</div>
        </div>
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top"><span className="label">Critical / High Priority</span></div>
          <div className="itd-stat-value" style={{ color: "#d13c3c" }}>02</div>
          <div className="itd-stat-sub">Today 05:00 PM SLA deadline</div>
        </div>
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top"><span className="label">Assigned Role</span></div>
          <div className="itd-stat-value" style={{ fontSize: 18 }}>{employee.name}</div>
          <div className="itd-stat-sub">{employee.role} • Sprint 24 Active</div>
        </div>
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top"><span className="label">Sprint Velocity</span></div>
          <div className="itd-stat-value green">92%</div>
          <div className="itd-progress-track" style={{ marginTop: 6 }}>
            <div className="itd-progress-fill" style={{ width: "92%" }} />
          </div>
        </div>
      </div>

      <div className="itd-toolbar">
        <div className="itd-tabs" style={{ marginBottom: 0 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`itd-tab${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label} <span className="n">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="itd-search" style={{ marginLeft: 8 }}>
          <IconSearch width={14} height={14} />
          Search all tasks, ticket ID, module, assignee...
        </div>
        <div className="itd-view-toggle">
          <button className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Table View</button>
          <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>Kanban</button>
        </div>
      </div>

      <div className="itd-table-wrap">
        <table className="itd-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Task Details &amp; Module</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Due Date &amp; SLA</th>
              <th>Logged Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {allTasks.map((task) => (
              <tr key={task.id}>
                <td style={{ fontWeight: 700, color: "#2f5fd6" }}>{task.id}</td>
                <td>
                  <div className="itd-task-title-cell">{task.title}</div>
                  <div className="itd-task-tags">
                    {task.tags.map((tag) => (
                      <span className="itd-task-tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="itd-assignee-cell">
                    <span className="mini-avatar">GS</span> {task.assignee}
                  </div>
                </td>
                <td><span className={`itd-pill ${priorityClass[task.priority]}`}>{task.priority}</span></td>
                <td>
                  {task.due}
                  <div className="note">{task.dueNote}</div>
                </td>
                <td>
                  <div className="itd-progress-cell">
                    <span className="nums">{task.logged} / {task.total}</span>
                    <div className="itd-progress-track">
                      <div className="itd-progress-fill" style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                </td>
                <td><span className={`itd-pill ${statusClass[task.status]}`}>{task.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

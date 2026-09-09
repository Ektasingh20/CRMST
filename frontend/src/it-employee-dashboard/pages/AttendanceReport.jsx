import React, { useState } from "react";
import { IconDownload, IconPlus, IconSearch, IconChevron } from "../Icons";
import { attendanceLogs, employee } from "../data";

const TABS = [
  { key: "all", label: "All", count: 23 },
  { key: "present", label: "Present", count: 20 },
  { key: "wfh", label: "Work From Home", count: 1 },
  { key: "leave", label: "Approved Leave", count: 1 },
  { key: "half", label: "Half Day", count: 0 },
  { key: "reg", label: "Regularized", count: 1 },
];

export default function AttendanceReport() {
  const [tab, setTab] = useState("all");

  return (
    <div className="itd-page">
      <div className="itd-page-header">
        <div>
          <h1 style={{ display: "block" }}>Attendance Report</h1>
          <p>
            Detailed shift records, overtime calculation, regularization requests, and monthly export for{" "}
            {employee.name} ({employee.role} • {employee.dept})
          </p>
        </div>
        <div className="itd-header-actions">
          <button className="itd-btn">
            <IconChevron width={14} height={14} style={{ transform: "rotate(180deg)" }} /> October 2023 <IconChevron width={14} height={14} />
          </button>
          <button className="itd-btn">
            <IconPlus width={14} height={14} /> Request Regularization
          </button>
          <button className="itd-btn itd-btn-primary">
            <IconDownload width={14} height={14} /> Export CSV / PDF
          </button>
        </div>
      </div>

      <div className="itd-stats-grid">
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Total Working Days</span>
            <span className="itd-pill itd-pill-green">91.3% Present</span>
          </div>
          <div className="itd-stat-value">21 <span style={{ fontSize: 14, color: "#8b8598", fontWeight: 500 }}>/ 23 Days</span></div>
          <div className="itd-stat-sub">21 Present • 1 Casual Leave • 1 Holiday</div>
        </div>
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Avg. Daily Hours</span>
            <span className="itd-pill itd-pill-blue">Target: 08h 30m</span>
          </div>
          <div className="itd-stat-value">08h 42m <span style={{ fontSize: 12, color: "#1c9a5b", fontWeight: 700 }}>+12m surplus</span></div>
          <div className="itd-stat-sub">Compliant with Aajmer IT Tech Unit benchmark</div>
        </div>
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Total Overtime</span>
            <span className="itd-pill itd-pill-purple">Payroll Eligible</span>
          </div>
          <div className="itd-stat-value">+04h 15m</div>
          <div className="itd-stat-sub">Approved overtime banked for comp-off / stipend</div>
        </div>
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Late Marks / Grace</span>
            <span className="itd-pill itd-pill-green">Healthy</span>
          </div>
          <div className="itd-stat-value">1 <span style={{ fontSize: 14, color: "#8b8598", fontWeight: 500 }}>/ 3 Allowed</span></div>
          <div className="itd-stat-sub">2 grace marks remaining • Resets on Nov 1</div>
        </div>
      </div>

      <div className="itd-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`itd-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="n">{t.count}</span>
          </button>
        ))}
        <div className="itd-search-row">
          <div className="itd-search">
            <IconSearch width={14} height={14} />
            Search date or shift notes...
          </div>
          <button className="itd-btn itd-btn-sm">Oct 01 - Oct 31, 2023</button>
          <button className="itd-btn itd-btn-sm">Reset</button>
        </div>
      </div>

      <div className="itd-table-wrap">
        <div className="itd-table-header-strip">
          <span>ATTENDANCE LOGS BREAKDOWN • Terminal Sync: #AJM-IT-02 Live</span>
          <span>
            Official Hours: 09:30 AM – 06:30 PM &nbsp;
            <span className="itd-pill itd-pill-green">15m Grace Buffer Active</span>
          </span>
        </div>
        <table className="itd-table">
          <thead>
            <tr>
              <th>Date &amp; Day</th>
              <th>Shift Schedule</th>
              <th>First Punch-in</th>
              <th>Last Punch-out</th>
              <th>Work Hours</th>
              <th>Break Time</th>
              <th>Work Location</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {attendanceLogs.map((log) => (
              <tr key={log.id}>
                <td className="day-cell">
                  <div className="date">
                    {log.today && <span className="itd-dot" />} {log.date}
                    {log.today && <span className="itd-today-tag">TODAY</span>}
                  </div>
                </td>
                <td>{log.shift}</td>
                <td>
                  {log.punchIn}
                  <div className={`note ${log.punchInNote?.includes("On-Time") ? "on-time" : ""}`}>{log.punchInNote}</div>
                </td>
                <td>
                  {log.punchOut === "In Progress" ? (
                    <span className="itd-pill itd-pill-amber">In Progress</span>
                  ) : (
                    <>
                      {log.punchOut}
                      {log.punchOutNote && <div className="note overtime">{log.punchOutNote}</div>}
                    </>
                  )}
                </td>
                <td>
                  <span className="hours">{log.workHours}</span>
                  {log.workHoursNote && <div className="note">{log.workHoursNote}</div>}
                </td>
                <td>{log.breakTime}</td>
                <td>{log.location}</td>
                <td><span className="itd-pill itd-pill-green">{log.status}</span></td>
                <td style={{ color: "#2f5fd6", fontWeight: 600, cursor: "pointer" }}>{log.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { IconDownload, IconPlus, IconHeart, IconWallet, IconClock, IconCheck } from "../Icons";
import { leaveBalances, leaveHistory } from "../data";

const statusClass = {
  "Under Review": "itd-pill-amber",
  Approved: "itd-pill-green",
  Rejected: "itd-pill-high",
};

export default function LeaveRequest() {
  const [form, setForm] = useState({
    classification: "Casual Leave (CL) - (6 Remaining)",
    reliever: "Rahul Verma (DevOps & Cloud)",
    fromDate: "",
    toDate: "",
    duration: "full",
    reason: "",
    emergencyContact: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="itd-page">
      <div className="itd-page-header">
        <div>
          <h1 style={{ display: "block" }}>Leave Request</h1>
          <p>Apply for leaves, track approval workflows, and monitor remaining balance quotas.</p>
        </div>
        <div className="itd-header-actions">
          <button className="itd-btn">
            <IconDownload width={14} height={14} /> Download Leave Policy / Slip
          </button>
          <button className="itd-btn itd-btn-primary">
            <IconPlus width={14} height={14} /> Apply for Leave
          </button>
        </div>
      </div>

      <div className="itd-stats-grid">
        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Casual Leave (CL)</span>
            <span className="itd-stat-icon"><IconClock width={14} height={14} /></span>
          </div>
          <div className="itd-stat-value">{leaveBalances.casual.left} <span style={{ fontSize: 13, color: "#8b8598", fontWeight: 500 }}>days left</span></div>
          <div className="itd-progress-track" style={{ margin: "8px 0" }}>
            <div className="itd-progress-fill" style={{ width: `${(leaveBalances.casual.left / leaveBalances.casual.total) * 100}%`, background: "#2f5fd6" }} />
          </div>
          <div className="itd-stat-sub">{leaveBalances.casual.used} Used • {leaveBalances.casual.left} Available (Total {leaveBalances.casual.total})</div>
        </div>

        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Sick / Medical</span>
            <span className="itd-stat-icon"><IconHeart width={14} height={14} /></span>
          </div>
          <div className="itd-stat-value">{leaveBalances.sick.left} <span style={{ fontSize: 13, color: "#8b8598", fontWeight: 500 }}>days left</span></div>
          <div className="itd-progress-track" style={{ margin: "8px 0" }}>
            <div className="itd-progress-fill" style={{ width: `${(leaveBalances.sick.left / leaveBalances.sick.total) * 100}%` }} />
          </div>
          <div className="itd-stat-sub">{leaveBalances.sick.used} Used • {leaveBalances.sick.left} Available (Total {leaveBalances.sick.total})</div>
        </div>

        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Earned / Privileged</span>
            <span className="itd-stat-icon"><IconWallet width={14} height={14} /></span>
          </div>
          <div className="itd-stat-value">{leaveBalances.earned.accrued} <span style={{ fontSize: 13, color: "#8b8598", fontWeight: 500 }}>days accrued</span></div>
          <div className="itd-stat-sub" style={{ marginTop: 20 }}>{leaveBalances.earned.note}</div>
        </div>

        <div className="itd-card itd-stat-card">
          <div className="itd-stat-top">
            <span className="label">Pending Requests</span>
            <span className="itd-stat-icon"><IconClock width={14} height={14} /></span>
          </div>
          <div className="itd-stat-value" style={{ color: "#b8790b" }}>{leaveBalances.pending.count} <span style={{ fontSize: 13, color: "#8b8598", fontWeight: 500 }}>awaiting</span></div>
          <div className="itd-stat-sub">
            <span className="itd-dot" style={{ background: "#b8790b" }} /> {leaveBalances.pending.note}
          </div>
        </div>
      </div>

      <form className="itd-leave-form" onSubmit={handleSubmit}>
        <div className="itd-leave-form-head">
          <span><span className="dot" />Apply for Leave</span>
          <span className="hint">All applications are subject to lead authorization</span>
        </div>
        <div className="itd-leave-form-body">
          <div className="itd-field">
            <label>Leave Classification *</label>
            <select value={form.classification} onChange={update("classification")}>
              <option>Casual Leave (CL) - (6 Remaining)</option>
              <option>Sick / Medical Leave - (8 Remaining)</option>
              <option>Earned / Privileged Leave - (14 Remaining)</option>
              <option>Comp-Off</option>
            </select>
          </div>
          <div className="itd-field">
            <label>Handover / Reliever Engineer *</label>
            <select value={form.reliever} onChange={update("reliever")}>
              <option>Rahul Verma (DevOps &amp; Cloud)</option>
              <option>Priya Patel (QA)</option>
              <option>Devendra Rao (Backend)</option>
            </select>
            <div className="hint" style={{ fontSize: 11, color: "#8b8598", marginTop: 4 }}>
              Reliever will handle your assigned sprint alerts.
            </div>
          </div>
          <div className="itd-field full">
            <label>Reason for Absence * <span className="locked">Max 250 chars</span></label>
            <textarea
              maxLength={250}
              value={form.reason}
              onChange={update("reason")}
              placeholder="Briefly describe the reason for your leave..."
            />
          </div>

          <div className="itd-field">
            <label>From Date *</label>
            <input type="date" value={form.fromDate} onChange={update("fromDate")} />
          </div>
          <div className="itd-field">
            <label>To Date *</label>
            <input type="date" value={form.toDate} onChange={update("toDate")} />
          </div>
          <div className="itd-field">
            <label>Emergency Contact Number *</label>
            <input
              type="tel"
              placeholder="+91 00000 00000"
              value={form.emergencyContact}
              onChange={update("emergencyContact")}
            />
          </div>

          <div className="itd-field">
            <label>Shift Duration</label>
            <div className="itd-radio-row">
              <label className="itd-radio-opt">
                <input
                  type="radio"
                  name="duration"
                  checked={form.duration === "full"}
                  onChange={() => setForm((f) => ({ ...f, duration: "full" }))}
                />
                Full Day
              </label>
              <label className="itd-radio-opt">
                <input
                  type="radio"
                  name="duration"
                  checked={form.duration === "half"}
                  onChange={() => setForm((f) => ({ ...f, duration: "half" }))}
                />
                Half Day (First)
              </label>
            </div>
          </div>
          <div className="itd-field" style={{ display: "flex", alignItems: "flex-end" }}>
            <div className="itd-computed-absence" style={{ width: "100%" }}>
              Computed Absence: <span>2 Working Days</span>
            </div>
          </div>
          <div className="itd-field full">
            <div className="itd-sla-box">
              <span className="green-dot" />
              <div>
                <b>Sprint SLA Continuity Check</b>
                Active tickets (TCK-2049, TCK-2045) will be temporarily shadowed by the selected reliever during your off-days.
              </div>
            </div>
          </div>
        </div>
        <div className="itd-leave-form-footer">
          <button type="button" className="itd-btn">Save as Draft</button>
          <button type="submit" className="itd-btn itd-btn-primary">
            <IconCheck width={14} height={14} /> {submitted ? "Submitted!" : "Submit Leave Request"}
          </button>
        </div>
      </form>

      <div className="itd-table-wrap">
        <div className="itd-table-header-strip" style={{ display: "block" }}>
          <div style={{ fontWeight: 700, color: "#221c33", fontSize: 14, marginBottom: 2 }}>Recent Leave Applications &amp; History</div>
          <div>Audit log of your submissions, supervisor sign-offs, and historical deductions.</div>
        </div>
        <table className="itd-table">
          <thead>
            <tr>
              <th>Application ID</th>
              <th>Leave Type</th>
              <th>Dates &amp; Duration</th>
              <th>Reason / Notes</th>
              <th>Reliever / Backup</th>
              <th>Applied On</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leaveHistory.map((lv) => (
              <tr key={lv.id}>
                <td style={{ fontWeight: 700 }}>{lv.id}</td>
                <td><span className="itd-pill itd-pill-blue">{lv.type}</span></td>
                <td>
                  {lv.dates}
                  <div className="note">{lv.duration}</div>
                </td>
                <td style={{ whiteSpace: "normal", maxWidth: 260 }}>{lv.reason}</td>
                <td>{lv.reliever}</td>
                <td>{lv.appliedOn}</td>
                <td><span className={`itd-pill ${statusClass[lv.status]}`}>{lv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

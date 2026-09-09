import React, { useState } from "react";
import { IconUser, IconLock, IconBell, IconClock, IconCheck } from "../Icons";
import { employee } from "../data";

const TABS = [
  { key: "profile", label: "Profile & Account", icon: IconUser },
  { key: "security", label: "Security & Biometrics", icon: IconLock },
  { key: "notifications", label: "Notifications & Alerts", icon: IconBell },
  { key: "workstation", label: "Workstation & Shifts", icon: IconClock },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [fullName, setFullName] = useState(employee.fullName);
  const [email, setEmail] = useState(employee.email);
  const [phone, setPhone] = useState(employee.phone);

  return (
    <div className="itd-page">
      <div className="itd-page-header">
        <div>
          <h1 style={{ display: "block" }}>Settings</h1>
          <p>Manage your account credentials, IT workstation preferences, and notifications.</p>
        </div>
        <div className="itd-header-actions">
          <button className="itd-btn">Cancel / Reset</button>
          <button className="itd-btn itd-btn-primary">
            <IconCheck width={14} height={14} /> Save Changes
          </button>
        </div>
      </div>

      <div className="itd-settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`itd-settings-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <t.icon width={15} height={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="itd-form-card">
          <div className="itd-form-card-head">
            <div>
              <h3>Personal &amp; Organization Details</h3>
              <p>Update your contact info and review locked organization roles.</p>
            </div>
            <span className="itd-pill itd-pill-green">{employee.status}</span>
          </div>

          <div className="itd-profile-row">
            <div className="itd-avatar">{employee.name.charAt(0)}</div>
            <div className="info">
              <div className="pname">{employee.fullName}</div>
              <div className="prole">{employee.role} • {employee.department}</div>
              <div className="actions">
                <button className="itd-btn itd-btn-primary itd-btn-sm">Upload New Photo</button>
                <button className="itd-btn itd-btn-sm">Remove</button>
                <span className="hint">JPG, GIF or PNG. Max 2MB.</span>
              </div>
            </div>
          </div>

          <div className="itd-field-grid">
            <div className="itd-field">
              <label>FULL NAME</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="itd-field">
              <label>WORK EMAIL ADDRESS</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="itd-field">
              <label>PHONE NUMBER</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="itd-field locked">
              <label>CRM ID (EMPLOYEE ID) <span className="locked">locked</span></label>
              <input value={employee.crmId} disabled />
            </div>
            <div className="itd-field locked">
              <label>ASSIGNED BRANCH <span className="locked">locked</span></label>
              <input value={`${employee.branch} HQ (Terminal AJM-IT-02)`} disabled />
            </div>
            <div className="itd-field locked">
              <label>ROLE &amp; DEPARTMENT <span className="locked">locked</span></label>
              <input value={`${employee.role} — IT Tech Unit`} disabled />
            </div>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="itd-form-card">
          <div className="itd-form-card-head">
            <div>
              <h3>Security &amp; Biometrics</h3>
              <p>Manage your password, two-factor authentication, and registered biometric devices.</p>
            </div>
          </div>
          <div className="itd-field-grid">
            <div className="itd-field">
              <label>CURRENT PASSWORD</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <div className="itd-field">
              <label>NEW PASSWORD</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <div className="itd-field locked">
              <label>BIOMETRIC DEVICE <span className="locked">locked</span></label>
              <input value="Terminal AJM-IT-02 • Bio #02" disabled />
            </div>
            <div className="itd-field">
              <label>TWO-FACTOR AUTHENTICATION</label>
              <select defaultValue="enabled">
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="itd-form-card">
          <div className="itd-form-card-head">
            <div>
              <h3>Notifications &amp; Alerts</h3>
              <p>Choose how you'd like to be notified about tasks, attendance, and leave updates.</p>
            </div>
          </div>
          <div className="itd-field-grid">
            <div className="itd-field">
              <label>TASK ASSIGNMENT ALERTS</label>
              <select defaultValue="email-app">
                <option value="email-app">Email &amp; In-App</option>
                <option value="app">In-App Only</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div className="itd-field">
              <label>SLA / DEADLINE REMINDERS</label>
              <select defaultValue="email-app">
                <option value="email-app">Email &amp; In-App</option>
                <option value="app">In-App Only</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div className="itd-field">
              <label>ATTENDANCE PUNCH REMINDERS</label>
              <select defaultValue="app">
                <option value="app">In-App Only</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div className="itd-field">
              <label>LEAVE APPROVAL UPDATES</label>
              <select defaultValue="email-app">
                <option value="email-app">Email &amp; In-App</option>
                <option value="app">In-App Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {tab === "workstation" && (
        <div className="itd-form-card">
          <div className="itd-form-card-head">
            <div>
              <h3>Workstation &amp; Shifts</h3>
              <p>Your assigned terminal, official shift window, and grace period configuration.</p>
            </div>
          </div>
          <div className="itd-field-grid">
            <div className="itd-field locked">
              <label>SHIFT WINDOW <span className="locked">locked</span></label>
              <input value="09:30 AM – 06:30 PM" disabled />
            </div>
            <div className="itd-field locked">
              <label>GRACE BUFFER <span className="locked">locked</span></label>
              <input value="15 minutes" disabled />
            </div>
            <div className="itd-field locked">
              <label>WORK LOCATION <span className="locked">locked</span></label>
              <input value="Office (Aajmer HQ)" disabled />
            </div>
            <div className="itd-field">
              <label>PREFERRED LUNCH BREAK</label>
              <input defaultValue="45 minutes" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

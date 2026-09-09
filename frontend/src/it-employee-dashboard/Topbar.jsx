import React from "react";
import { IconMenu } from "./Icons";
import { employee } from "./data";

export default function Topbar({ onMenuClick }) {
  return (
    <header className="itd-topbar">
      <button className="itd-topbar-hamburger" onClick={onMenuClick} aria-label="Open menu">
        <IconMenu />
      </button>
      <div className="itd-topbar-meta">
        <span>
          <span className="label">CRM ID</span>
          <span className="value">{employee.crmId}</span>
        </span>
        <span>
          <span className="label">BRANCH</span>
          <span className="value">{employee.branch}</span>
        </span>
        <span>
          <span className="label">DESIGNATION</span>
          <span className="value">{employee.designation}</span>
        </span>
        <span>
          <span className="label">DEPARTMENT</span>
          <span className="value">{employee.dept}</span>
        </span>
      </div>
    </header>
  );
}

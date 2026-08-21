import React from "react";
import ReactDOM from "react-dom/client";
import StudentDashboard from "./StudentDashboard.jsx";
import "./index.css";

function getStudentUser() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "crmst") {
      return {
        name: params.get("name") || "Student",
        email: params.get("email") || "",
        role: params.get("role") || "Student",
        dept: params.get("dept") || "",
      };
    }
  } catch {}

  try {
    const raw = localStorage.getItem("crmst-student-session");
    if (raw) return JSON.parse(raw);
  } catch {}

  return null;
}

const CRMST_URL = "http://localhost:5174";
const user = getStudentUser();

if (!user) {
  window.location.href = CRMST_URL;
} else {
  const handleLogout = () => {
    try {
      localStorage.removeItem("crmst-current-user");
      localStorage.removeItem("crmst-api-token");
      localStorage.removeItem("crmst-student-session");
    } catch {}
    window.location.href = `${CRMST_URL}?studentLogout=1`;
  };

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <StudentDashboard user={user} onLogout={handleLogout} />
    </React.StrictMode>
  );
}

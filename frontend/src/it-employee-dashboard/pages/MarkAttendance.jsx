import React, { useEffect, useState } from "react";
import { employee } from "../data";

function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return { time: `${h.toString().padStart(2, "0")}:${m}:${s}`, ampm };
}

export default function MarkAttendance() {
  const [now, setNow] = useState(new Date());
  const [punchedIn, setPunchedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [firstPunchIn, setFirstPunchIn] = useState(null);
  const [finalPunchOut, setFinalPunchOut] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { time, ampm } = formatTime(now);

  const handlePunch = () => {
    if (!punchedIn && !status) return;
    if (punchedIn) {
      const { time: t, ampm: a } = formatTime(new Date());
      setFinalPunchOut(`${t.slice(0, 5)} ${a}`);
      setPunchedIn(false);
    } else {
      const { time: t, ampm: a } = formatTime(new Date());
      setFirstPunchIn(`${t.slice(0, 5)} ${a}`);
      setFinalPunchOut(null);
      setPunchedIn(true);
    }
  };

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="itd-page">
      <div className="itd-attendance-wrap">
        <h2>Mark Attendance</h2>
        <p className="sub">{dateStr} · Current time {time} {ampm}</p>

        <div className="itd-attendance-form-card">
          <label className="itd-attendance-field">
            <span>Employee Name</span>
            <input value={employee.fullName} readOnly />
          </label>
          <label className="itd-attendance-field">
            <span>Select Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={punchedIn}>
              <option value="">Select Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </label>
          <label className="itd-attendance-field">
            <span>Remark</span>
            <input
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              placeholder="Remark (optional)"
              disabled={punchedIn}
            />
          </label>
          <button className={`itd-attendance-submit ${punchedIn ? "checkout" : ""}`} onClick={handlePunch} disabled={!punchedIn && !status}>
            {punchedIn ? "Check Out" : "Check In"}
          </button>
        </div>

        <div className="itd-attendance-times">
          <span>Punch In: <strong>{firstPunchIn || "Not recorded"}</strong></span>
          <span>Punch Out: <strong>{finalPunchOut || "Not recorded"}</strong></span>
          <span>Status: <strong>{status || "Not selected"}</strong></span>
        </div>
        {finalPunchOut && (
          <p className="itd-attendance-complete">Attendance recorded successfully.</p>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { IconClock } from "../Icons";

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
  const [punchedIn, setPunchedIn] = useState(true);
  const [firstPunchIn] = useState("09:15 AM");
  const [finalPunchOut, setFinalPunchOut] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { time, ampm } = formatTime(now);

  const handlePunch = () => {
    if (punchedIn) {
      const { time: t, ampm: a } = formatTime(new Date());
      setFinalPunchOut(`${t.slice(0, 5)} ${a}`);
      setPunchedIn(false);
    } else {
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
        <span className="itd-shift-badge">
          {punchedIn ? "● SHIFT IN PROGRESS" : "SHIFT ENDED"}
        </span>
        <h2>Mark Attendance</h2>
        <p className="sub">{dateStr}</p>

        <div className="itd-clock">
          {time} <span className="ampm">{ampm}</span>
        </div>

        <div className="itd-punch-card">
          <button className="itd-punch-btn" onClick={handlePunch}>
            <IconClock width={28} height={28} />
            <span className="big">{punchedIn ? "PUNCH OUT" : "PUNCH IN"}</span>
            <span className="small">{punchedIn ? "Record Exit Time" : "Record Entry Time"}</span>
          </button>

          <div className="itd-punch-info">
            <div className="box">
              <div className="k">FIRST PUNCH-IN</div>
              <div className="v done">{firstPunchIn}</div>
              <div className="n">Recorded &amp; Verified</div>
            </div>
            <div className="box">
              <div className="k">FINAL PUNCH-OUT</div>
              <div className={`v ${finalPunchOut ? "done" : "pending"}`}>
                {finalPunchOut || "--:-- --"}
              </div>
              <div className="n">{finalPunchOut ? "Recorded & Verified" : "Awaiting Tap"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

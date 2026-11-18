import { useEffect, useState } from "react";
import { UserCircle, ListChecks, MessageSquareText, Clock3, CircleAlert, CalendarDays, Check } from "lucide-react";
import { fetchTodayAttendance, checkInAttendance, checkOutAttendance } from "../../backendApi.js";
import "./hrMarkAttendance.css";

export default function HrMarkAttendance({ c: { db, user } }) {
  const employeeId = String(user?.id || user?._id || "");
  const [now, setNow] = useState(() => new Date());
  const [record, setRecord] = useState(null);
  const [status, setStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(now).map(({ type, value }) => [type, value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const sunday = parts.weekday === "Sun";
  const closed = Number(parts.hour) >= 12;
  const [loadedDate, setLoadedDate] = useState("");
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchTodayAttendance().then((saved) => {
      if (!active) return;
      setRecord(saved);
      setStatus(saved?.status || "");
      setRemark(saved?.remark || "");
      setLoadedDate(today);
    }).catch((err) => { if (active) setError(err.message || "Unable to load today's attendance."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [employeeId, today, closed]);
  const checkIn = record?.checkIn && record.checkIn !== "-" ? record.checkIn : "";
  const checkOut = record?.checkOut && record.checkOut !== "-" ? record.checkOut : "";
  const canCheckOut = Boolean(checkIn && !checkOut && record?.status === "Present");
  const autoAbsent = record?.autoMarked && !record?.correctedAt && record?.status === "Absent";
  const locked = loading || saving || loadedDate !== today || sunday || closed || Boolean(record);
  const disabled = loading || saving || loadedDate !== today || !employeeId || sunday || (record ? !canCheckOut : closed || !status);
  const start = Date.parse(record?.checkInAt || "");
  const minutes = checkOut && record?.workedMinutes != null ? Number(record.workedMinutes) : Number.isFinite(start) ? Math.max(0, Math.floor((now.getTime() - start) / 60000)) : 0;
  const worked = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const time = now.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  async function submit(event) {
    event.preventDefault();
    if (disabled) return;
    setSaving(true);
    setError("");
    try {
      const saved = canCheckOut ? await checkOutAttendance() : await checkInAttendance({ status, remark: remark.trim() });
      setRecord(saved);
      setStatus(saved.status || "");
      setRemark(saved.remark || "");
      setNow(new Date());
    } catch (err) { setError(err.message || "Unable to save attendance."); }
    finally { setSaving(false); }
  }
  return <div className="hr-self-attendance">
    <section className="hr-self-panel" aria-label="Mark Attendance">
      {sunday && <p className="hr-self-notice" role="status">Sunday is a holiday. Attendance cannot be marked today.</p>}
      {autoAbsent && <p className="hr-self-notice" role="status">Attendance was automatically marked Absent after 12:00 PM IST.</p>}
      {checkIn && record?.status === "Present" && <p className="hr-self-notice" role="status"><Check size={17} />{checkOut ? `Attendance complete: ${checkIn} - ${checkOut} (${worked})` : `Checked in at ${checkIn} · Worked ${worked}`}</p>}
      <form className="hr-self-form" onSubmit={submit}>
        <label className="hr-self-field"><span><UserCircle size={15} />Employee Name</span><input value={db.me?.name || user?.name || "HR"} readOnly /></label>
        <label className="hr-self-field"><span><ListChecks size={15} />Select Status</span><select value={sunday ? "Holiday" : status} disabled={locked} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Select Status</option>{["Present", "Absent", ...(sunday ? ["Holiday"] : []), ...(status && !["Present", "Absent", "Holiday"].includes(status) ? [status] : [])].map((value) => <option key={value} value={value}>{value}</option>)}
        </select></label>
        <label className="hr-self-field"><span><MessageSquareText size={15} />Remark</span><input value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Remark (optional)" maxLength={240} disabled={locked} /></label>
        <div className="hr-self-action"><div className="hr-self-clock"><i aria-hidden="true" /><span>India time</span><strong>{time} IST</strong></div>
          <button type="submit" disabled={disabled} className={canCheckOut ? "checkout" : record ? "completed" : ""}>{loading ? "Loading…" : saving ? "Saving…" : sunday ? "Holiday" : autoAbsent ? "Marked Absent" : checkOut ? "Completed" : canCheckOut ? "Check Out" : record ? "Marked" : closed ? "Check-in Closed" : "Check In"}</button>
        </div>
      </form>
      {error && <p className="hr-self-error" role="alert">{error}</p>}
      {!employeeId && <p className="hr-self-error" role="alert">Your employee account ID is unavailable; attendance cannot be saved.</p>}
      <div className="hr-self-policy" role="note">
        <div><i><Clock3 size={17} /></i><div><strong>Check-in window</strong><span>Monday–Saturday, before 12:00 PM IST</span></div></div>
        <div><i><CircleAlert size={17} /></i><div><strong>After 12:00 PM</strong><span>Unmarked attendance becomes Absent; approved leave stays unchanged</span></div></div>
        <div><i><CalendarDays size={17} /></i><div><strong>Sunday &amp; checkout</strong><span>Sunday holiday · Checkout until midnight</span></div></div>
      </div>
    </section>
  </div>;
}

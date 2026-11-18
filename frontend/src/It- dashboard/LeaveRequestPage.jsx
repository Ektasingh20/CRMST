import { useEffect, useMemo, useState } from "react";
import { Check, Download, Hourglass } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createLeave } from "../../backendApi.js";
import { formatITDate, inclusiveLeaveDuration } from "./workPageModel.js";

const initialForm = (date) => ({ type: "Sick Leave", from: date, to: date, reason: "" });

export default function LeaveRequestPage({ notify, leaves = [], setLeaves, authenticated = false, initialDate = "", onSubmitted, today }) {
  const defaultDate = initialDate && initialDate >= today ? initialDate : today;
  const [form, setForm] = useState(() => initialForm(defaultDate));
  const [submitting, setSubmitting] = useState(false);
  const duration = useMemo(() => inclusiveLeaveDuration(form.from, form.to), [form.from, form.to]);

  useEffect(() => {
    if (!initialDate) return;
    const date = initialDate >= today ? initialDate : today;
    setForm((current) => ({ ...current, from: date, to: date }));
  }, [initialDate, today]);

  const submit = async (event) => {
    event.preventDefault();
    if (!authenticated) { notify("Sign in to submit a leave request."); return; }
    if (!form.from || !form.to || !form.reason.trim()) { notify("Complete the leave dates and reason."); return; }
    if (form.from < today) { notify("Choose today or a future date for leave."); return; }
    if (form.to < form.from) { notify("End date must be on or after the start date."); return; }
    setSubmitting(true);
    try {
      const saved = await createLeave({ ...form, reason: form.reason.trim() });
      setLeaves?.((current) => [saved, ...current.filter((leave) => leave.id !== saved.id)]);
      setForm(initialForm(today));
      onSubmitted?.();
      notify("Leave request submitted.");
    } catch (error) {
      notify(error.message || "Could not submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("My Leave Requests", 14, 16);
    autoTable(doc, {
      startY: 23,
      head: [["Type", "From", "To", "Days", "Reason", "Applied on", "Status"]],
      body: leaves.map((leave) => [
        leave.type || "—",
        formatITDate(leave.from),
        formatITDate(leave.to),
        String(leave.duration || inclusiveLeaveDuration(String(leave.from || "").slice(0, 10), String(leave.to || "").slice(0, 10))),
        leave.reason || "—",
        formatITDate(leave.appliedOn || leave.createdAt),
        leave.status || "Pending",
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [128, 73, 42] },
      alternateRowStyles: { fillColor: [255, 241, 228] },
    });
    doc.save("my-leave-requests.pdf");
  };

  return (
    <div className="it-work-page it-leave-page">
      <section className="it-work-card">
        <div className="it-leave-card-heading"><h2>Apply for Leave</h2><p>Select your dates and see the total before submitting</p></div>
        <form onSubmit={submit}>
          <div className="it-leave-form">
            <label><span>Leave Type</span><select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}><option>Sick Leave</option><option>Casual Leave</option><option>Earned Leave</option></select></label>
            <label><span>From</span><input required type="date" min={today} value={form.from} onChange={(event) => setForm((current) => ({ ...current, from: event.target.value, to: current.to && current.to < event.target.value ? event.target.value : current.to }))} /></label>
            <label><span>To</span><input required type="date" min={form.from || today} value={form.to} onChange={(event) => setForm((current) => ({ ...current, to: event.target.value }))} /></label>
            <div className="it-leave-duration"><Hourglass size={15} /><span>Leave duration</span><strong>{duration} {duration === 1 ? "day" : "days"}</strong></div>
            <label className="it-leave-reason"><span>Reason</span><textarea required rows={2} maxLength={2000} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} /></label>
          </div>
          <div className="it-leave-submit-row"><button type="submit" className="it-work-primary-button" disabled={submitting}><Check size={15} />{submitting ? "Submitting…" : "Submit Request"}</button></div>
        </form>
      </section>

      <section className="it-work-card it-leave-history">
        <div className="it-leave-history-heading"><div><h2>My Leave Requests</h2><p>Track the status and duration of each request</p></div><button type="button" className="it-work-primary-button" onClick={exportPdf} disabled={!leaves.length}><Download size={15} /> Export PDF ({leaves.length})</button></div>
        <div className="it-work-table-wrap">
          <table className="it-work-table">
            <thead><tr>{["Type", "From", "To", "Days", "Reason", "Applied on", "Status"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
            <tbody>
              {leaves.map((leave, index) => <tr key={leave.id || `${leave.from}-${index}`}>
                <td>{leave.type || "—"}</td><td>{formatITDate(leave.from)}</td><td>{formatITDate(leave.to)}</td>
                <td>{leave.duration || inclusiveLeaveDuration(String(leave.from || "").slice(0, 10), String(leave.to || "").slice(0, 10))}</td>
                <td>{leave.reason || "—"}</td><td>{formatITDate(leave.appliedOn || leave.createdAt)}</td>
                <td><span className={`it-leave-status ${String(leave.status || "Pending").toLowerCase()}`}>{leave.status || "Pending"}</span></td>
              </tr>)}
              {!leaves.length && <tr><td className="it-work-empty" colSpan={7}>No leave requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

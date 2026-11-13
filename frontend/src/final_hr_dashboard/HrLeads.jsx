import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarPlus, Download, FileSpreadsheet, FileText, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { createHrLead, deleteHrLead, fetchHrLeads, updateHrLead, uploadHrLeadResume } from "../hrLeadsApi.js";
import "./hrLeads.css";

const PROGRAMS = ["Front-End Development", "Front-End with React.js", "Back-End with Node.js", "Back-End with PHP", "Back-End with Python", "Full-Stack with Node.js", "Full-Stack with PHP", "Full-Stack with Python"];
const STATUSES = ["New", "Contacted", "Counselling done", "Interview scheduled", "Interview completed", "Selected", "Enrolled", "Rejected"];
const INTERVIEW_MODES = ["On-site Ajmer", "Phone", "Google Meet"];
const INTERVIEW_STATUSES = ["Scheduled", "Completed", "No-show", "Cancelled"];
const INTERVIEW_RESULTS = ["Pass", "Fail", "On hold"];
const SOURCES = ["Instagram", "Facebook", "Google", "College visit", "Friend/Alumni", "WhatsApp", "Walk-in", "Other"];
const EMPTY = { program: "", name: "", mobile: "", email: "", city: "", qualification: "", college: "", passingYear: "", skillLevel: "", source: "", status: "New", followUpDate: "", notes: "" };
const PAGE_SIZE = 10;
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const localIsoDate = (offset = 0) => { const date = new Date(); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };

function LeadForm({ lead, staff, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY, ...(lead || {}), interview_date: lead?.interview_date || (lead?.scheduleMode ? localIsoDate() : ""), interview_status: lead?.scheduleMode ? "Scheduled" : lead?.interview_status || "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setError("");
    if (!form.program || !form.name.trim() || !/^\d{10}$/.test(form.mobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Choose a program and enter a name, 10-digit mobile number, and valid email."); return;
    }
    setSaving(true);
    try {
      const resume = resumeFile ? await uploadHrLeadResume(resumeFile) : form.resume;
      await onSave({ ...form, ...(resume ? { resume } : {}) });
    }
    catch (err) { setError(err.duplicate ? `${err.message} Existing lead: ${err.duplicate.name} (${err.duplicate.mobile}, ${err.duplicate.email}).` : err.message); }
    finally { setSaving(false); }
  }
  return <div className="hr-leads-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="hr-leads-dialog hr-card hr-box" role="dialog" aria-modal="true" aria-labelledby="hr-lead-form-title">
      <header><div><h2 id="hr-lead-form-title">{lead ? "Edit Lead" : "Create Lead"}</h2><p>Enter the lead’s details below.</p></div><button type="button" className="hr-leads-icon-button" onClick={onClose} aria-label="Close form"><X size={18} /></button></header>
      <form onSubmit={submit}>
        <div className="hr-leads-form-grid">
          <label>Program *<select required value={form.program} onChange={set("program")}><option value="">Select program</option>{PROGRAMS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Full name *<input required value={form.name} onChange={set("name")} maxLength={120} /></label>
          <label>Mobile *<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.mobile} onChange={set("mobile")} /></label>
          <label>Email *<input required type="email" value={form.email} onChange={set("email")} maxLength={160} /></label>
          <label>City<input value={form.city} onChange={set("city")} maxLength={100} /></label>
          <label>Qualification<input value={form.qualification} onChange={set("qualification")} maxLength={120} /></label>
          <label>College<input value={form.college} onChange={set("college")} maxLength={160} /></label>
          <label>Passing year<input inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={form.passingYear} onChange={set("passingYear")} /></label>
          <label>Skill level<select value={form.skillLevel} onChange={set("skillLevel")}><option value="">Select skill level</option><option>Beginner</option><option>Intermediate</option></select></label>
          <label>Source<select value={form.source} onChange={set("source")}><option value="">Select source</option>{SOURCES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Status<select value={form.status} onChange={set("status")}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Follow-up date<input type="date" value={form.followUpDate} onChange={set("followUpDate")} /></label>
          <label className="hr-leads-wide">Resume
            <span className="hr-leads-resume-control"><input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setResumeFile(event.target.files?.[0] || null)} /><span><Upload size={15} /> Upload resume</span></span>
            <small className="hr-leads-resume-hint">PDF, DOC, or DOCX · 5 MB maximum</small>
            {resumeFile ? <small className="hr-leads-resume-current"><FileText size={14} /> {resumeFile.name} · Ready to upload</small> : form.resume?.url ? <a className="hr-leads-resume-current" href={form.resume.url} target="_blank" rel="noreferrer"><FileText size={14} /> {form.resume.name || "View uploaded resume"}</a> : null}
          </label>
          <fieldset className="hr-leads-interview hr-leads-wide"><legend>Interview</legend>
            <div className="hr-leads-form-grid">
              <label>Interview date<input type="date" value={form.interview_date || ""} onChange={(event) => setForm((current) => ({ ...current, interview_date: event.target.value, ...(event.target.value && current.interviewer_id ? { interview_status: current.interview_status || "Scheduled" } : {}) }))} /></label>
              <label>Interview mode<select value={form.interview_mode || ""} onChange={set("interview_mode")}><option value="">Select mode</option>{INTERVIEW_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
              <label>Interviewer<select value={form.interviewer_id || ""} onChange={(event) => { const selected = staff.find((person) => String(person.backendId || person.id) === event.target.value); setForm((current) => ({ ...current, interviewer_id: event.target.value, interviewer: selected?.name || "", ...(event.target.value && current.interview_date ? { interview_status: current.interview_status || "Scheduled" } : {}) })); }}><option value="">Select interviewer</option>{staff.map((person) => <option key={person.backendId || person.id} value={person.backendId || person.id}>{person.name}{person.dept ? ` · ${person.dept}` : ""}</option>)}</select></label>
              <label>Interview status<select value={form.interview_status || ""} onChange={set("interview_status")}><option value="">Select status</option>{INTERVIEW_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Interview result<select value={form.interview_result || ""} onChange={set("interview_result")}><option value="">Select result</option>{INTERVIEW_RESULTS.map((result) => <option key={result}>{result}</option>)}</select></label>
              <label className="hr-leads-wide">Interview feedback<textarea rows="3" value={form.interview_feedback || ""} onChange={set("interview_feedback")} maxLength={3000} /></label>
            </div>
          </fieldset>
          <label className="hr-leads-wide">Notes<textarea rows="3" value={form.notes} onChange={set("notes")} maxLength={3000} /></label>
        </div>
        {error && <p className="hr-leads-error" role="alert">{error}</p>}
        <footer><button type="button" className="hr-leads-secondary" onClick={onClose}>Cancel</button><button type="submit" className="hr-btn" disabled={saving}>{saving ? "Saving…" : lead ? "Save changes" : "Save Lead"}</button></footer>
      </form>
    </section>
  </div>;
}

export default function HrLeads({ staff = [] }) {
  const activeStaff = useMemo(() => staff.filter((person) => person.status === "active" || !person.status), [staff]);
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");
  const [interviewFrom, setInterviewFrom] = useState("");
  const [interviewTo, setInterviewTo] = useState("");
  const [interviewerId, setInterviewerId] = useState("");
  const [interviewStatus, setInterviewStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true); setError("");
    try { setLeads(await fetchHrLeads()); } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (!message) return undefined; const timer = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(timer); }, [message]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return leads.filter((lead) => (!term || [lead.name, lead.mobile, lead.email].some((value) => String(value || "").toLowerCase().includes(term)))
      && (!program || lead.program === program) && (!status || lead.status === status)
      && (!interviewFrom || (lead.interview_date && lead.interview_date >= interviewFrom))
      && (!interviewTo || (lead.interview_date && lead.interview_date <= interviewTo))
      && (!interviewerId || lead.interviewer_id === interviewerId)
      && (!interviewStatus || lead.interview_status === interviewStatus));
  }, [leads, query, program, status, interviewFrom, interviewTo, interviewerId, interviewStatus]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const upcoming = leads.filter((lead) => [localIsoDate(), localIsoDate(1)].includes(lead.interview_date)
    && lead.interview_status === "Scheduled").sort((a, b) => a.interview_date.localeCompare(b.interview_date));
  const makeExportRows = () => filtered.map((lead) => ({
    Name: lead.name || "", Mobile: lead.mobile || "", Email: lead.email || "", Program: lead.program || "",
    Status: lead.status || "", "Interview date": lead.interview_date || "", Interviewer: lead.interviewer || "",
    "Interview status": lead.interview_status || "", "Interview mode": lead.interview_mode || "",
    "Follow-up date": lead.followUpDate || "", "Created date": lead.createdAt ? dateLabel(lead.createdAt) : "",
  }));
  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(makeExportRows()), "Leads");
    XLSX.writeFile(workbook, `hr-leads-${localIsoDate()}.xlsx`);
  }
  function exportPdf() {
    const rows = makeExportRows();
    const columns = Object.keys(rows[0] || { Name: "", Mobile: "", Email: "", Program: "", Status: "", "Interview date": "", Interviewer: "", "Interview status": "", "Interview mode": "", "Follow-up date": "", "Created date": "" });
    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(16);
    pdf.text("HR Leads", 14, 15);
    autoTable(pdf, { startY: 21, head: [columns], body: rows.map((row) => columns.map((column) => row[column])), styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [132, 81, 47] } });
    pdf.save(`hr-leads-${localIsoDate()}.pdf`);
  }
  async function save(form) {
    if (editor?.id) await updateHrLead(editor.id, form); else await createHrLead(form);
    setEditor(null); setMessage(editor?.id ? "Lead updated successfully." : "Lead saved successfully."); await refresh();
  }
  async function remove(lead) {
    if (!window.confirm(`Delete lead for ${lead.name}? This cannot be undone.`)) return;
    try { await deleteHrLead(lead.id); setMessage("Lead deleted successfully."); await refresh(); }
    catch (err) { setError(err.message); }
  }
  return <div className="hr-leads-page">
    <div className="hr-leads-heading"><div><p>LEAD MANAGEMENT</p><h2>Leads</h2><span>Manage prospective student enquiries.</span></div><button className="hr-btn" onClick={() => setEditor({ ...EMPTY })}><Plus size={16} /> Create Lead</button></div>
    <section className="hr-card hr-box hr-leads-upcoming"><div className="hr-leads-upcoming-heading"><CalendarClock size={18} /><div><h3>Upcoming Interviews</h3><span>Today and tomorrow</span></div><strong>{upcoming.length}</strong></div>
      {upcoming.length ? <div className="hr-leads-upcoming-list">{upcoming.map((lead) => <button key={lead.id} type="button" onClick={() => setEditor(lead)}><time>{dateLabel(lead.interview_date)}</time><strong>{lead.name}</strong><span>{lead.interviewer || "Interviewer pending"} · {lead.interview_mode || "Mode pending"}</span></button>)}</div> : <p className="hr-leads-upcoming-empty">No interviews scheduled for today or tomorrow.</p>}
    </section>
    <section className="hr-leads-card hr-card hr-box">
      <div className="hr-leads-toolbar"><label className="hr-leads-search"><Search size={16} /><input placeholder="Search name, mobile, or email" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>
        <select aria-label="Filter by program" value={program} onChange={(event) => { setProgram(event.target.value); setPage(1); }}><option value="">All programs</option>{PROGRAMS.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="hr-leads-date-filter">Interview from<input type="date" value={interviewFrom} onChange={(event) => { setInterviewFrom(event.target.value); setPage(1); }} /></label>
        <label className="hr-leads-date-filter">Interview to<input type="date" value={interviewTo} onChange={(event) => { setInterviewTo(event.target.value); setPage(1); }} /></label>
        <select aria-label="Filter by interviewer" value={interviewerId} onChange={(event) => { setInterviewerId(event.target.value); setPage(1); }}><option value="">All interviewers</option>{activeStaff.map((person) => <option key={person.backendId || person.id} value={person.backendId || person.id}>{person.name}</option>)}</select>
        <select aria-label="Filter by interview status" value={interviewStatus} onChange={(event) => { setInterviewStatus(event.target.value); setPage(1); }}><option value="">All interview statuses</option>{INTERVIEW_STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
        <div className="hr-leads-export"><button type="button" onClick={exportPdf} disabled={!filtered.length}><Download size={14} /> Export PDF</button><button type="button" onClick={exportExcel} disabled={!filtered.length}><FileSpreadsheet size={14} /> Export Excel</button></div>
      </div>
      {message && <p className="hr-leads-success" role="status">{message}</p>}{error && <p className="hr-leads-error" role="alert">{error}</p>}
      <div className="hr-leads-table-wrap"><table className="hr-leads-table"><thead><tr>{["Name", "Mobile", "Email", "Program", "Status", "Interview", "Interviewer", "Interview status", "Follow-up date", "Created date", "Actions"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{visible.map((lead) => <tr key={lead.id}><td><strong>{lead.name}</strong></td><td>{lead.mobile}</td><td>{lead.email}</td><td>{lead.program}</td><td><span className={`hr-leads-status status-${lead.status.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{lead.status}</span></td><td>{lead.interview_date ? dateLabel(lead.interview_date) : "—"}</td><td>{lead.interviewer || "—"}</td><td>{lead.interview_status || "—"}</td><td>{dateLabel(lead.followUpDate)}</td><td>{dateLabel(lead.createdAt)}</td><td><div className="hr-leads-actions"><button type="button" aria-label={`Schedule interview for ${lead.name}`} title="Schedule" onClick={() => setEditor({ ...lead, scheduleMode: true })}><CalendarPlus size={15} /></button><button type="button" aria-label={`Edit ${lead.name}`} title="Edit" onClick={() => setEditor(lead)}><Pencil size={15} /></button><button type="button" aria-label={`Delete ${lead.name}`} title="Delete" onClick={() => remove(lead)}><Trash2 size={15} /></button></div></td></tr>)}
          {!visible.length && <tr><td colSpan="11" className="hr-leads-empty">{loading ? "Loading leads…" : "No leads found."}</td></tr>}</tbody>
      </table></div>
      <div className="hr-leads-pagination"><span>{filtered.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} leads` : "0 leads"}</span><div><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {Math.min(page, pageCount)} of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
    </section>
    {editor && <LeadForm key={editor.id || "new"} lead={editor.id ? editor : null} staff={activeStaff} onClose={() => setEditor(null)} onSave={save} />}
  </div>;
}

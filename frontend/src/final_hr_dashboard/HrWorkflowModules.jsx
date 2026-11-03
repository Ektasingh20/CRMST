import { useState } from "react";
import { BriefcaseBusiness, FileText, Upload, Download, BellRing, ArrowRight, Check, X } from "lucide-react";
import HelpdeskChat from "../shared/HelpdeskChat.jsx";
import "./hrWorkflowModules.css";

const now = () => new Date().toISOString();
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const fmt = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const isHr = (c) => /admin|hr|human resource|manager/i.test(String(c.db.me.role || ""));
const Header = ({ icon: Icon, title, subtitle }) => <header className="hr-module-header"><span className="hr-module-icon"><Icon size={19}/></span><div><p>PEOPLE OPERATIONS</p><h2>{title}</h2><span>{subtitle}</span></div></header>;
const Field = ({ label, children }) => <label className="hr-module-field"><span>{label}</span>{children}</label>;
const Panel = ({ title, children }) => <section className="hr-card hr-module-panel"><div className="hr-module-panel-heading"><h3>{title}</h3></div>{children}</section>;
const Status = ({ value }) => {
  const status = String(value || "").toLowerCase();
  const tone = /verified|completed|resolved|approved|done/.test(status) ? "is-ok" : /rejected|withdrawn/.test(status) ? "is-bad" : "is-warn";
  return <span className={`hr-module-status ${tone}`}>{value}</span>;
};
const Timeline = ({ entries = [] }) => <div className="hr-workflow-history">{[...entries].reverse().map((entry, i) => <div key={`${entry.at}-${i}`}><i/><span><b>{entry.status}</b><small>{entry.actor} · {fmt(entry.at)}{entry.remark ? ` · ${entry.remark}` : ""}</small></span></div>)}</div>;

function Documents({ c }) {
  const [employeeId, setEmployeeId] = useState(String(c.db.emps[0]?.id || ""));
  const [kind, setKind] = useState("Identity proof");
  const [file, setFile] = useState(null);
  const [remark, setRemark] = useState("");
  const [fileError, setFileError] = useState("");
  const docs = c.db.hrDocuments || [];
  const upload = (event) => {
    event.preventDefault(); if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setFileError("Choose a file smaller than 2 MB so it can be saved with this browser-based HR workspace."); return; }
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      const at = now(); const item = { id: makeId("DOC"), employeeId, employeeName: c.db.emps.find((e) => String(e.id) === employeeId)?.name || "Employee", kind, name: file.name, mime: file.type, data: reader.result, size: file.size, status: "Pending Verification", createdAt: at, history: [{ status: "Pending Verification", at, actor: c.db.me.name, remark: "Uploaded for verification" }] };
      c.upd((db) => ({ hrDocuments: [item, ...(db.hrDocuments || [])], hrNotifications: [{ id: makeId("NTF"), message: `${item.employeeName} uploaded ${item.name} for verification.`, at, read: false }, ...(db.hrNotifications || [])] }), `${file.name} uploaded`); setFile(null); event.target.reset();
    };
    reader.readAsDataURL(file);
  };
  const decide = (doc, status) => {
    if (!isHr(c)) return;
    const at = now(); const note = remark.trim();
    c.upd((db) => ({ hrDocuments: (db.hrDocuments || []).map((item) => item.id !== doc.id ? item : { ...item, status, updatedAt: at, history: [...(item.history || []), { status, at, actor: c.db.me.name, remark: note }] }), hrNotifications: [{ id: makeId("NTF"), message: `${doc.name} was ${status.toLowerCase()}.`, at, read: false }, ...(db.hrNotifications || [])] }), `${doc.name} ${status.toLowerCase()}`); setRemark("");
  };
  return <div className="hr-new-module hr-workflow"><Header icon={FileText} title="Employee Documents" subtitle="Upload, download, and verify employee records with a complete status history."/><Panel title="Upload a document"><form className="hr-module-form" onSubmit={upload}><Field label="Employee"><select value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)} required>{c.db.emps.map((e)=><option key={e.id} value={e.id}>{e.name}</option>)}</select></Field><Field label="Document type"><select value={kind} onChange={(e)=>setKind(e.target.value)}>{["Identity proof","Address proof","Education certificate","Employment record","Other"].map((x)=><option key={x}>{x}</option>)}</select></Field><Field label="Choose file"><input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" required onChange={(e)=>{setFile(e.target.files?.[0]||null);setFileError("");}}/>{fileError&&<small className="hr-form-error">{fileError}</small>}</Field><button className="hr-module-button" disabled={!file}><Upload size={15}/>Upload for verification</button></form></Panel><Panel title={`Documents · ${docs.length}`}>
    {!docs.length ? <p className="hr-module-empty">No employee documents have been uploaded.</p> : <div className="hr-workflow-list">{docs.map((doc)=><article className="hr-workflow-item" key={doc.id}><div className="hr-workflow-item-top"><div><strong>{doc.name}</strong><small>{doc.employeeName} · {doc.kind} · Uploaded {fmt(doc.createdAt)}</small></div><Status value={doc.status}/></div><div className="hr-workflow-actions"><a className="hr-module-text-button" href={doc.data} download={doc.name}><Download size={14}/>Download</a>{doc.status === "Pending Verification" && isHr(c) && <><input aria-label={`Remarks for ${doc.name}`} placeholder="Verification remarks" value={remark} onChange={(e)=>setRemark(e.target.value)}/><button className="hr-module-text-button" onClick={()=>decide(doc,"Verified")}><Check size={14}/>Verify</button><button className="hr-module-text-button" onClick={()=>decide(doc,"Rejected")}><X size={14}/>Reject</button></>}</div><Timeline entries={doc.history}/></article>)}</div>}
  </Panel></div>;
}

const EXIT_CHECKLIST = ["Manager handover completed", "Company assets returned", "System access revoked", "Finance clearance", "HR documents collected", "Full and final settlement"];
const EXIT_DOCUMENTS = [["resignationProof", "Resignation email / letter / message"], ["handoverDocument", "Handover document"], ["clearanceDocument", "Exit clearance document"]];
const readAttachment = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve({ name: file.name, type: file.type, data: reader.result }) : reject(new Error("Unable to read the selected file."));
  reader.onerror = () => reject(new Error("Unable to read the selected file."));
  reader.readAsDataURL(file);
});
const recordStatus = (row) => ({
  Requested: "Notice Period", "Under Review": "Notice Period", Approved: "Notice Period",
  "Clearance Pending": "Clearance In Progress", Rejected: "Withdrawn",
}[row.status] || row.status || "Notice Period");

function Resignations({ c }) {
  const [employeeId, setEmployeeId] = useState("");
  const [receivedDate, setReceivedDate] = useState(today());
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [source, setSource] = useState("Email");
  const [reason, setReason] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [files, setFiles] = useState({});
  const [fileError, setFileError] = useState("");
  const [remarks, setRemarks] = useState({});
  const rows = c.db.hrResignations || [];
  const employees = c.db.emps.filter((employee) => employee.status === "active" || employee.status === "Active");

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const employee = employees.find((item) => String(item.id) === employeeId);
    if (!employee || !receivedDate || !lastWorkingDay || !reason.trim()) return;
    const selectedFiles = Object.entries(files).filter(([, file]) => file);
    const oversized = selectedFiles.find(([, file]) => file.size > 512 * 1024);
    if (oversized) { setFileError(`${oversized[1].name} is larger than 512 KB. Choose a smaller file.`); return; }
    setFileError("");
    try {
      const documents = Object.fromEntries(await Promise.all(selectedFiles.map(async ([key, file]) => [key, await readAttachment(file)])));
      const at = now();
      const item = {
        id: makeId("EXIT"), employeeId, employeeName: employee.name, department: employee.dept || "", designation: employee.desig || "",
        receivedDate, requestedDate: lastWorkingDay, source, requestSource: source,
        reason: reason.trim(), noticePeriod: noticePeriod.trim(), handoverNotes: handoverNotes.trim(),
        documents, status: "Notice Period", submittedBy: c.db.me.name, createdAt: at,
        clearance: EXIT_CHECKLIST.map((label) => ({ label, done: false })),
        history: [{ status: "Notice Period", at, actor: c.db.me.name, remark: `Resignation recorded from ${source}.` }],
      };
      c.upd((db) => ({
        hrResignations: [item, ...(db.hrResignations || [])],
        hrNotifications: [{ id: makeId("NTF"), message: `Resignation details recorded for ${employee.name}.`, at, read: false }, ...(db.hrNotifications || [])],
      }), "Resignation details recorded");
      setEmployeeId(""); setReceivedDate(today()); setLastWorkingDay(""); setSource("Email");
      setReason(""); setNoticePeriod(""); setHandoverNotes(""); setFiles({});
      form.reset();
    } catch (error) {
      setFileError(error.message || "Unable to read the selected files.");
    }
  };

  const move = (row, status) => {
    if (!isHr(c)) return;
    if (status === "Exit Completed" && (row.clearance || []).some((item) => !item.done)) return;
    const at = now(); const note = (remarks[row.id] || "").trim();
    c.upd((db) => ({
      hrResignations: (db.hrResignations || []).map((item) => item.id !== row.id ? item : {
        ...item, status, updatedAt: at,
        history: [...(item.history || []), { status, at, actor: c.db.me.name, remark: note }],
      }),
      hrNotifications: [{ id: makeId("NTF"), message: `${row.employeeName}'s exit status changed to ${status}.`, at, read: false }, ...(db.hrNotifications || [])],
      emps: status === "Exit Completed" ? db.emps.map((employee) => String(employee.id) === String(row.employeeId)
        ? { ...employee, status: "inactive", exEmployee: "Yes", employeeStatus: "Inactive", resignationDate: row.requestedDate || row.lastWorkingDay || "", left: row.requestedDate || row.lastWorkingDay || "" }
        : employee) : db.emps,
    }), `Exit status updated to ${status}`);
    setRemarks((current) => ({ ...current, [row.id]: "" }));
  };

  const setClearance = (row, label, done) => c.upd((db) => ({
    hrResignations: (db.hrResignations || []).map((item) => item.id !== row.id ? item : {
      ...item,
      status: recordStatus(item) === "Notice Period" ? "Clearance In Progress" : recordStatus(item),
      clearance: (item.clearance || EXIT_CHECKLIST.map((name) => ({ label: name, done: false }))).map((step) => step.label !== label ? step : {
        ...step, done, completedAt: done ? now() : "", completedBy: done ? c.db.me.name : "",
      }),
    }),
  }));

  return <div className="hr-new-module hr-workflow">
    <Header icon={BriefcaseBusiness} title="Resignation & Exit" subtitle="Record how a resignation was received, then track notice, handover, documents, and clearance through the employee’s last day." />
    <Panel title="Record resignation details">
      <p className="hr-workflow-form-note">Use this record when an employee resigns by email, WhatsApp, in person, or another channel. HR records the information and manages the exit steps here.</p>
      <form className="hr-module-form hr-exit-record-form" onSubmit={submit}>
        <Field label="Employee"><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></Field>
        <Field label="Received through"><select value={source} onChange={(event) => setSource(event.target.value)}>{["Email", "WhatsApp", "In person", "Phone call", "Written letter", "Other"].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Resignation received date"><input type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} required /></Field>
        <Field label="Last working day"><input type="date" min={receivedDate} value={lastWorkingDay} onChange={(event) => setLastWorkingDay(event.target.value)} required /></Field>
        <Field label="Notice period"><input value={noticePeriod} onChange={(event) => setNoticePeriod(event.target.value)} placeholder="e.g. 30 days" /></Field>
        <Field label="Reason given by employee"><textarea rows="2" value={reason} onChange={(event) => setReason(event.target.value)} required placeholder="Record the reason as shared by the employee" /></Field>
        <Field label="Handover / exit notes"><textarea rows="2" value={handoverNotes} onChange={(event) => setHandoverNotes(event.target.value)} placeholder="Pending work, handover owner, or other context" /></Field>
        {EXIT_DOCUMENTS.map(([key, label]) => <Field key={key} label={label}><input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(event) => setFiles((current) => ({ ...current, [key]: event.target.files?.[0] || null }))} /></Field>)}
        {fileError && <p className="hr-form-error" role="alert">{fileError}</p>}
        <button className="hr-module-button hr-workflow-submit" type="submit" disabled={!isHr(c) || !employeeId || !receivedDate || !lastWorkingDay || !reason.trim()}><BriefcaseBusiness size={15} />Save resignation record</button>
      </form>
    </Panel>
    <Panel title={`Resignation records · ${rows.length}`}>
      {!rows.length ? <p className="hr-module-empty">No resignation records yet.</p> : <div className="hr-workflow-list">
        {rows.map((row) => {
          const status = recordStatus(row);
          const clearance = row.clearance || EXIT_CHECKLIST.map((label) => ({ label, done: false }));
          const allClear = clearance.every((item) => item.done);
          return <article className="hr-workflow-item hr-exit-record" key={row.id}>
            <div className="hr-workflow-item-top"><div><strong>{row.employeeName}</strong><small>{row.department || ""}{row.designation ? ` · ${row.designation}` : ""}</small><small>{row.source || row.requestSource || "Resignation recorded"} · Received {row.receivedDate || fmt(row.createdAt)} · Last working day {row.requestedDate || row.lastWorkingDay || "—"}</small></div><Status value={status} /></div>
            <div className="hr-exit-record-details">
              <p><b>Reason</b><span>{row.reason || "—"}</span></p>
              <p><b>Notice period</b><span>{row.noticePeriod || "Not specified"}</span></p>
              {row.handoverNotes && <p><b>Handover / exit notes</b><span>{row.handoverNotes}</span></p>}
              {row.documents && <div className="hr-exit-documents">{EXIT_DOCUMENTS.map(([key, label]) => row.documents[key] && <a key={key} className="hr-module-text-button" href={row.documents[key].data} download={row.documents[key].name}><Download size={14} />{label}</a>)}</div>}
            </div>
            <div className="hr-workflow-clearance"><b>Exit checklist · {clearance.filter((item) => item.done).length}/{clearance.length} complete</b>{clearance.map((item) => <label key={item.label}><input type="checkbox" disabled={!isHr(c) || status === "Exit Completed"} checked={item.done} onChange={(event) => setClearance(row, item.label, event.target.checked)} /><span>{item.label}</span>{item.done && <small>Completed by {item.completedBy || "HR"}{item.completedAt ? ` · ${fmt(item.completedAt)}` : ""}</small>}</label>)}</div>
            {isHr(c) && status !== "Exit Completed" && status !== "Withdrawn" && <div className="hr-workflow-actions"><input aria-label={`Exit update note for ${row.employeeName}`} placeholder="Add an exit update note (optional)" value={remarks[row.id] || ""} onChange={(event) => setRemarks((current) => ({ ...current, [row.id]: event.target.value }))} />{status === "Notice Period" && <button className="hr-module-text-button" onClick={() => move(row, "Clearance In Progress")}><ArrowRight size={14} />Start clearance</button>}<button className="hr-module-text-button" disabled={!allClear} onClick={() => move(row, "Exit Completed")}><Check size={14} />Complete exit</button><button className="hr-module-text-button" onClick={() => move(row, "Withdrawn")}><X size={14} />Mark withdrawn</button></div>}
            <Timeline entries={row.history} />
          </article>;
        })}
      </div>}
    </Panel>
  </div>;
}

export default function HrWorkflowModules({ page, c }) {
  if(page==="Employee Documents") return <Documents c={c}/>;
  if(page==="Resignation & Exit") return <Resignations c={c}/>;
  if(page==="Employee Helpdesk") return <HelpdeskChat user={c.user} displayName={c.db.me.name}/>;
  if(page==="HR Notifications") return <div className="hr-new-module hr-workflow"><Header icon={BellRing} title="HR Notifications" subtitle="Workflow updates and requests that need attention."/><Panel title="Recent notifications">{(c.db.hrNotifications||[]).length ? <div className="hr-workflow-list">{c.db.hrNotifications.map((item)=><article className="hr-workflow-notification" key={item.id}><span><b>{item.message}</b><small>{fmt(item.at)}</small></span>{!item.read&&<button className="hr-module-text-button" onClick={()=>c.upd((db)=>({hrNotifications:(db.hrNotifications||[]).map((n)=>n.id===item.id?{...n,read:true}:n)}),"Notification marked as read")}>Mark read</button>}</article>)}</div>:<p className="hr-module-empty">You’re all caught up.</p>}</Panel></div>;
  return null;
}

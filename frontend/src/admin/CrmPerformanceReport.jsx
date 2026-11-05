import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { MessageCircle, PhoneCall } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./crmPerformanceReport.css";

const norm = (value) => String(value || "").trim().toLowerCase();
const statusOf = (row) => String(row.callStatus || "Pending").trim().toLowerCase();
const rowDate = (row) => String(row.createdAt || row.date || row.updatedAt || "").slice(0, 10);
const userId = (user) => String(user?._id || user?.id || "");
const dateTimeOf = (row) => row.callTime || row.time || row.updatedAt || row.createdAt || row.date || "";
const latestDateOf = (row) => row.updatedAt || row.createdAt || row.date || "";
function displayDate(value) {
  if (!value) return "—";
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function displayDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function rowTimestamp(row) {
  const parsed = new Date(latestDateOf(row)).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function isCrmUser(user) {
  return [user.role, user.position, user.dept, user.department].some((value) => /crm|sales/i.test(String(value || "")));
}

function workedCounts(rows) {
  const completed = rows.filter((row) => statusOf(row) === "completed").length;
  const followUp = rows.filter((row) => statusOf(row).replace(/[ -]/g, "") === "followup").length;
  const untouched = (row) => statusOf(row) === "pending" && !row.callClicked && !row.whatsappClicked && !String(row.remark || "").trim();
  const notWorked = rows.filter(untouched).length;
  const pending = rows.filter((row) => statusOf(row) === "pending" && !untouched(row)).length;
  return { uploaded: rows.length, completed, pending, followUp, notWorked, totalWorked: rows.length - notWorked };
}

function dateInRange(value, from, to, period) {
  if (!value) return !from && !to && period === "overall";
  const today = new Date();
  const date = new Date(`${value}T00:00:00`);
  if (from && value < from) return false;
  if (to && value > to) return false;
  if (period === "today") return value === today.toISOString().slice(0, 10);
  if (period === "week") {
    const start = new Date(today); start.setDate(today.getDate() - 6); start.setHours(0, 0, 0, 0);
    return date >= start && date <= today;
  }
  if (period === "month") return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  return true;
}

function getTimeBucket(value) {
  const timeMatch = String(value || "").match(/(?:^|T|\s)(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    return hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hour = date.getHours();
  return hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
}

export default function CrmPerformanceReport({ rows = [], users = [], onSaveCall }) {
  const [period, setPeriod] = useState("overall");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [employee, setEmployee] = useState("all");
  const [status, setStatus] = useState("all");
  const [time, setTime] = useState("all");
  const [detailSearch, setDetailSearch] = useState("");
  const [filterFeedback, setFilterFeedback] = useState("");
  const [saveError, setSaveError] = useState("");
  const employees = useMemo(() => users.filter(isCrmUser), [users]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const assigned = String(row.assignedTo || "");
    const assignedName = norm(row.assignedToName || users.find((user) => userId(user) === assigned)?.name);
    const matchesEmployee = employee === "all" || assigned === employee;
    const normalizedStatus = statusOf(row);
    const matchesStatus = status === "all" || normalizedStatus === status;
    const bucket = getTimeBucket(dateTimeOf(row));
    const matchesTime = time === "all" || bucket.toLowerCase() === time;
    return matchesEmployee && matchesStatus && matchesTime && dateInRange(rowDate(row), from, to, period);
  }), [rows, users, employee, status, time, from, to, period]);
  const reportRows = useMemo(() => {
    const groups = new Map();
    employees.forEach((user) => groups.set(userId(user), { id: userId(user), exec: user.name || user.username || "CRM Executive", rows: [] }));
    filteredRows.forEach((row) => {
      const id = String(row.assignedTo || "unassigned");
      if (!groups.has(id)) groups.set(id, { id, exec: row.assignedToName || users.find((user) => userId(user) === id)?.name || "Unassigned", rows: [] });
      groups.get(id).rows.push(row);
    });
    return [...groups.values()].map((group) => ({ ...group, ...workedCounts(group.rows) })).sort((a, b) => b.uploaded - a.uploaded || a.exec.localeCompare(b.exec));
  }, [employees, filteredRows, users]);
  const detailRows = useMemo(() => {
    const query = detailSearch.trim().toLowerCase();
    return filteredRows.filter((row) => !query || [row.name, row.contact, row.number, row.remark, row.program, row.assignedToName].some((value) => String(value || "").toLowerCase().includes(query)))
      .sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
  }, [filteredRows, detailSearch]);

  const reset = () => { setPeriod("overall"); setFrom(""); setTo(""); setEmployee("all"); setStatus("all"); setTime("all"); };
  const exportSheet = (name, data) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Report"); XLSX.writeFile(book, name);
  };
  const exportPdf = (title, headers, data, filename) => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(15); pdf.text(title, 14, 14);
    autoTable(pdf, { startY: 20, head: [headers], body: data, styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [127, 78, 43] } });
    pdf.save(filename);
  };
  const summaryData = reportRows.map(({ exec, uploaded, completed, pending, followUp, notWorked, totalWorked }) => ({ "CRM Executive": exec, "Uploaded list": uploaded, Completed: completed, Pending: pending, "Follow-up": followUp, "Not worked": notWorked, "Total worked": totalWorked, Completion: `${uploaded ? Math.round(totalWorked / uploaded * 100) : 0}%` }));
  const detailsData = detailRows.map((row, index) => ({ "Sr no": index + 1, Date: displayDate(rowDate(row)), "CRM exec": row.assignedToName || users.find((user) => userId(user) === String(row.assignedTo || ""))?.name || "Unassigned", Contact: row.contact || row.number || "", "Customer name": row.name || "", "Call status": row.callStatus || "Pending", "Interest status": row.interestStatus || "", Service: row.program || row.listType || "", "Call at": displayDateTime(row.callAt), Remark: row.remark || "", "Updated at": displayDateTime(row.updatedAt) }));
  const summaryHeaders = ["CRM Executive", "Uploaded list", "Completed", "Pending", "Follow-up", "Not worked", "Total worked", "Completion"];
  const detailHeaders = ["Sr no", "Date", "CRM exec", "Contact", "Customer name", "Call status", "Interest status", "Service", "Call at", "Remark", "Updated at"];
  async function saveCustomField(row, field, inputValue) {
    const value = field === "callAt" && inputValue ? new Date(inputValue).toISOString() : inputValue;
    if (String(row[field] || "") === String(value || "")) return;
    if (!onSaveCall) { setSaveError("Saving call details is unavailable right now."); return; }
    setSaveError("");
    try {
      await onSaveCall(row, { [field]: value });
    } catch (error) {
      setSaveError(error.message || "Unable to save this call detail.");
    }
  }

  return <div className="crm-performance-report">
    <section className="crm-report-panel">
      <header className="crm-report-panel-heading"><div><h2>Detailed CRM call performance report</h2><p>Filter by period, employee, status and call time.</p></div>
        <div className="crm-report-export"><button type="button" onClick={() => exportSheet("crm-summary.xlsx", summaryData)}>Summary Excel</button><button type="button" onClick={() => exportPdf("CRM call performance summary", summaryHeaders, reportRows.map((row) => [row.exec, row.uploaded, row.completed, row.pending, row.followUp, row.notWorked, row.totalWorked, `${row.uploaded ? Math.round(row.totalWorked / row.uploaded * 100) : 0}%`]), "crm-summary.pdf")}>Summary PDF</button></div>
      </header>
      <div className="crm-report-filters">
        <select aria-label="Report period" value={period} onChange={(event) => { const next = event.target.value; setPeriod(next); if (next !== "custom") { setFrom(""); setTo(""); } }}><option value="overall">Overall</option><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option><option value="custom">Custom dates</option></select>
        <label><span className="sr-only">From date</span><input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPeriod("custom"); }} /></label>
        <label><span className="sr-only">To date</span><input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setPeriod("custom"); }} /></label>
        <select aria-label="Filter by employee" value={employee} onChange={(event) => setEmployee(event.target.value)}><option value="all">Current employees</option>{employees.map((user) => <option key={userId(user)} value={userId(user)}>{user.name || user.username}</option>)}</select>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All status</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="follow up">Follow-up</option></select>
        <select aria-label="Filter by call time" value={time} onChange={(event) => setTime(event.target.value)}><option value="all">All call times</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select>
        <button type="button" className="crm-report-filter-button" onClick={() => setFilterFeedback(`Showing ${filteredRows.length.toLocaleString()} matching calls.`)}>Filter</button><button type="button" className="crm-report-reset" onClick={() => { reset(); setFilterFeedback(""); }}>Reset</button>
      </div>
      {filterFeedback && <p className="crm-report-feedback" role="status">{filterFeedback}</p>}
      <div className="crm-report-table-wrap"><table className="crm-performance-table"><thead><tr><th>CRM executive</th><th>Uploaded list</th><th>Completed</th><th>Pending</th><th>Follow-up</th><th>Not worked</th><th>Total worked</th><th>Completion</th></tr></thead><tbody>
        {reportRows.map((row) => <tr key={row.id}><td><strong>{row.exec}</strong></td><td>{row.uploaded.toLocaleString()}</td><td>{row.completed.toLocaleString()}</td><td>{row.pending.toLocaleString()}</td><td>{row.followUp.toLocaleString()}</td><td>{row.notWorked.toLocaleString()}</td><td>{row.totalWorked.toLocaleString()}</td><td><span className="crm-report-progress"><i style={{ width: `${row.uploaded ? Math.round(row.totalWorked / row.uploaded * 100) : 0}%` }} /></span><span>{row.uploaded ? Math.round(row.totalWorked / row.uploaded * 100) : 0}%</span></td></tr>)}
        {!reportRows.length && <tr><td colSpan="8" className="crm-report-empty">No CRM users or calls match these filters.</td></tr>}
      </tbody></table></div>
    </section>

    <section className="crm-report-panel crm-report-detail-panel">
      <header className="crm-report-panel-heading"><div><h2>Detail call list</h2><p>Every call logged for the selected filters.</p></div>
        <div className="crm-report-export"><button type="button" onClick={() => exportSheet("crm-call-details.xlsx", detailsData)}>Detail Excel</button><button type="button" onClick={() => exportPdf("CRM call detail list", detailHeaders, detailRows.map((row, index) => [index + 1, displayDate(rowDate(row)), row.assignedToName || users.find((user) => userId(user) === String(row.assignedTo || ""))?.name || "Unassigned", row.contact || row.number || "", row.name || "", row.callStatus || "Pending", row.interestStatus || "", row.program || row.listType || "", displayDateTime(row.callAt), row.remark || "", displayDateTime(row.updatedAt)]), "crm-call-details.pdf")}>Detail PDF</button></div>
      </header>
      <div className="crm-report-detail-toolbar"><label><input value={detailSearch} onChange={(event) => setDetailSearch(event.target.value)} placeholder="Search customer name or contact number" /></label><span>{detailRows.length} records</span></div>
      {saveError && <p className="crm-report-save-error" role="alert">{saveError}</p>}
      <div className="crm-report-table-wrap"><table className="crm-performance-table crm-detail-table"><thead><tr><th>Sr no</th><th>Date (newest first)</th><th>CRM exec</th><th>Name</th><th>Contact</th><th>Call / WhatsApp</th><th>Call status</th><th>Interest status</th><th>Service / program</th><th>Call at</th><th>Remark</th><th>Updated at</th></tr></thead><tbody>
        {detailRows.map((row, index) => {
          const contact = String(row.contact || row.number || "");
          const normalizedPhone = contact.replace(/\D/g, "");
          const whatsappPhone = normalizedPhone.length === 12 && normalizedPhone.startsWith("91") ? normalizedPhone : `91${normalizedPhone.slice(-10)}`;
          const assignedName = row.assignedToName || users.find((user) => userId(user) === String(row.assignedTo || ""))?.name || "Unassigned";
          const rowKey = `${row.listType || "list"}:${row.id || index}`;
          return <tr key={rowKey}>
            <td>{index + 1}</td><td>{displayDate(rowDate(row))}</td><td>{assignedName}</td><td><strong>{row.name || "—"}</strong></td><td>{contact || "—"}</td>
            <td><div className="crm-report-contact-actions"><a href={contact ? `tel:${contact}` : undefined} aria-label={`Call ${row.name || contact}`} title="Call"><PhoneCall size={15} /></a><a href={normalizedPhone ? `https://wa.me/${whatsappPhone}` : undefined} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${row.name || contact}`} title="WhatsApp"><MessageCircle size={15} /></a></div></td>
            <td><span className={`crm-report-status ${statusOf(row).replace(/\s+/g, "-")}`}>{row.callStatus || "Pending"}</span></td><td>{row.interestStatus || "Not Interested"}</td><td>{row.program || row.listType || "—"}</td>
            <td><input key={`callAt:${row.updatedAt || ""}`} className="crm-report-editable-field crm-report-call-at" type="datetime-local" aria-label={`Call time for ${row.name || contact}`} defaultValue={toDateTimeLocal(row.callAt)} onBlur={(event) => saveCustomField(row, "callAt", event.target.value)} /></td>
            <td><input key={`remark:${row.updatedAt || ""}`} className="crm-report-editable-field crm-report-remark" type="text" aria-label={`Remark for ${row.name || contact}`} defaultValue={row.remark || ""} placeholder="Add remark" onBlur={(event) => saveCustomField(row, "remark", event.target.value)} /></td>
            <td>{displayDateTime(row.updatedAt)}</td>
          </tr>;
        })}
        {!detailRows.length && <tr><td colSpan="12" className="crm-report-empty">No call records found for these filters.</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}

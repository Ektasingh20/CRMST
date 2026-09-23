import { useEffect, useState } from "react";
import { FileText, PhoneCall, Search, Trash2 } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { isCallLead } from "./callLeads.js";
import RemarkField from "./RemarkField.jsx";
import "./callLeads.css";

export default function CallLeadsPanel({
  rows, users = [], onSave, onDelete, onAdd, canDelete = false,
  canEditCallData = true, showAssignee = true, lockCreatedLead = false,
  title = "Call Leads Data", subtitle = "Contacts marked Follow Up or Completed and Interested",
  assignedTo = "", showActions = true, highlightAssigned = false, allowReturnToOwner = false,
  showSourceOwner = false,
}) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [program, setProgram] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const assigneeUsers = users.filter((user) => {
    const role = String(user?.role || "").trim().toLowerCase();
    const department = String(user?.dept || user?.department || "").trim().toLowerCase();
    const position = String(user?.position || "").trim().toLowerCase();
    const userStatus = String(user?.status || "Active").trim().toLowerCase();
    return userStatus !== "inactive" && (
      role.includes("admin") || role.startsWith("operation")
      || department.includes("admin") || department.startsWith("operation")
      || position.includes("admin") || position.startsWith("operation")
    );
  });
  const sourceOwnerName = (row) => {
    const ownerId = String(row.assignedTo || "");
    const owner = users.find((user) => String(user.id || user._id) === ownerId);
    return row.assignedToName || owner?.name || owner?.username || ownerId || "-";
  };
  const qualified = rows.filter(isCallLead).filter((row) => !assignedTo || String(row.callLeadAssignedTo || "") === String(assignedTo));
  const save = async (row, patch) => {
    if (Object.entries(patch).every(([key, value]) => (row[key] || "") === value)) return;
    if (patch.callLeadStatus === "Approved" && !row.leadCreated) {
      setError("Please fill the Add Lead form first before approving this lead.");
      return;
    }
    if (patch.callStatus === "Completed" && !String(row.program || "").trim()) {
      setError(`Please select a ${row.listType === "training" ? "program" : "service"} before marking this lead Completed.`);
      return;
    }
    try { await onSave(row, patch); setError(""); }
    catch (err) { setError(err.message || "Could not save call lead."); }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete call contact "${row.name}"?`)) return;
    try { await onDelete(row); setError(""); }
    catch (err) { setError(err.message || "Could not delete call contact."); }
  };
  // The backend records this only for status/interest/remark work. Other edits
  // keep the original date visible.
  const rowDate = (row) => String(row.lastWorkedAt || row.createdLeadDate || row.createdAt || row.date || "").slice(0, 10);
  const filtered = qualified.filter((row) => `${row.name} ${row.contact || row.phone || ""}`.toLowerCase().includes(search.toLowerCase())
    && (!status || row.callLeadStatus === status) && (!program || row.program === program)
    && (!fromDate || rowDate(row) >= fromDate) && (!toDate || rowDate(row) <= toDate))
    .sort((left, right) => {
      const leftApproved = left.leadCreated || left.callLeadStatus === "Approved" ? 1 : 0;
      const rightApproved = right.leadCreated || right.callLeadStatus === "Approved" ? 1 : 0;
      if (leftApproved !== rightApproved) return leftApproved - rightApproved;
      const leftAssigned = assigneeUsers.some((user) => String(user.id || user._id) === String(left.callLeadAssignedTo || "")) ? 1 : 0;
      const rightAssigned = assigneeUsers.some((user) => String(user.id || user._id) === String(right.callLeadAssignedTo || "")) ? 1 : 0;
      if (highlightAssigned && leftAssigned !== rightAssigned) return leftAssigned - rightAssigned;
      return rowDate(right).localeCompare(rowDate(left));
    });
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [search, status, program, fromDate, toDate]);
  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16); pdf.text("Call Leads Report", 14, 14);
    pdf.setFontSize(9); pdf.setTextColor(100); pdf.text(`${filtered.length} filtered lead(s)`, 14, 20);
    autoTable(pdf, {
      startY: 25,
      head: [["S. No.", "Date", "Service / Program", "Type", "Name", "Contact", "Call Status", "Interest", "Remark", "Lead Status", ...(showSourceOwner ? ["CRM Executive"] : []), ...(showAssignee ? ["Assigned To"] : [])]],
      body: filtered.map((row, index) => [index + 1, rowDate(row) || "-", row.program || "-", row.listType === "training" ? "Program" : "Service", row.name || "-", row.contact || row.phone || "-", row.callStatus || "-", row.interestStatus || "-", row.remark || "-", row.callLeadStatus || "-", ...(showSourceOwner ? [sourceOwnerName(row)] : []), ...(showAssignee ? [assigneeUsers.find((user) => String(user.id || user._id) === String(row.callLeadAssignedTo))?.name || row.callLeadAssignedTo || "Unassigned"] : [])]),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [127, 78, 43] },
    });
    pdf.save(`call-leads-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  return <section className="panel leads-panel shared-call-leads">
    <div className="panel-head"><div><h3>{title}</h3><p className="panel-subtitle">{subtitle}</p></div><button type="button" className="primary-button" onClick={exportPdf} disabled={!filtered.length}><FileText size={16} /> Export PDF ({filtered.length})</button></div>
    <form className="module-toolbar call-leads-toolbar" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
      <div className="call-leads-search">
        <Search size={16} aria-hidden="true" />
        <input aria-label="Search call leads" placeholder="Search by name or contact number" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); if (!e.target.value) setSearch(""); }} />
        <button type="submit">Search</button>
      </div>
      <select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Statuses</option>{["Pending", "Approved", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filter program" value={program} onChange={(e) => setProgram(e.target.value)}><option value="">All Services / Programs</option>{[...new Set(qualified.map((row) => row.program).filter(Boolean))].map((item) => <option key={item}>{item}</option>)}</select>
      <label className="table-date-filter"><span>From</span><input aria-label="From date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
      <label className="table-date-filter"><span>To</span><input aria-label="To date" type="date" min={fromDate} value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
      <button type="button" className="call-leads-reset" onClick={() => { setSearchInput(""); setSearch(""); setStatus(""); setProgram(""); setFromDate(""); setToDate(""); }}>Reset</button>
    </form>
    <div className="table-wrap crm-call-leads-table-wrap"><table className="table crm-call-leads-table">
      <thead><tr>{["S. No.", "Date", "Service / Program", "Lead Type", "Name", "Call Status", "Interest Type", "Remark", "Lead Status", ...(showSourceOwner ? ["CRM Executive"] : []), ...(showActions ? ["Action"] : []), ...(showAssignee ? ["Assigned To"] : []), "Call Now"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{!filtered.length && <tr><td colSpan={9 + Number(showSourceOwner) + Number(showActions) + Number(showAssignee) + 1}>No qualifying call leads assigned to you.</td></tr>}{pageRows.map((row, index) => {
        const key = `${row.listType}:${row.id}`;
        const locked = lockCreatedLead && Boolean(row.leadCreated || row.callLeadStatus === "Approved");
        const leadExists = Boolean(row.leadCreated);
        const hasValidAssignee = assigneeUsers.some((user) => String(user.id || user._id) === String(row.callLeadAssignedTo || ""));
        const assignedReadOnly = highlightAssigned && hasValidAssignee;
        const originalOwnerId = String(row.assignedTo || "");
        const originalOwner = users.find((user) => String(user.id || user._id) === originalOwnerId);
        const originalOwnerName = row.assignedToName || originalOwner?.name || originalOwner?.username || originalOwnerId;
        const returnValue = originalOwnerId ? `return:${originalOwnerId}` : "";
        return <tr key={key} className={locked ? "call-lead-locked" : highlightAssigned && hasValidAssignee ? "call-lead-assigned" : ""}>
          <td>{(page - 1) * pageSize + index + 1}</td><td>{rowDate(row) ? new Date(`${rowDate(row)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
          <td title={row.program}>{row.program || "-"}</td><td><span className="lead-type-label">{row.listType === "training" ? "Program" : "Service"}</span></td><td><div className="call-leads-name"><strong title={row.name}>{row.name}</strong></div></td><td>{row.callStatus || "-"}</td><td>{row.interestStatus}</td>
          <td><RemarkField value={drafts[key] ?? row.remark ?? ""} readOnly={!canEditCallData || locked || assignedReadOnly} label={`Remark for ${row.name}`} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} onCommit={async (value) => { await save(row, { remark: value }); setDrafts((current) => { const next = { ...current }; delete next[key]; return next; }); }} /></td>
          <td>{canEditCallData ? <select className={`inline-select lead-status-select ${(row.callLeadStatus || "").toLowerCase()}`} aria-label={`Status for ${row.name}`} disabled={locked || assignedReadOnly} value={row.callLeadStatus || ""} onChange={(e) => save(row, { callLeadStatus: e.target.value })}><option value="">Select Status</option>{["Pending", "Approved", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select> : (row.callLeadStatus || "-")}</td>
          {showSourceOwner && <td><strong>{sourceOwnerName(row)}</strong></td>}
          {showActions && <td><div className="row-actions"><button type="button" className="row-icon-btn call-lead-add-button" title={leadExists || locked ? "Lead already created" : assignedReadOnly ? "Lead assigned and locked" : "Add Lead"} aria-label={leadExists || locked ? `Lead already created for ${row.name}` : assignedReadOnly ? `Assigned lead locked for ${row.name}` : `Add lead for ${row.name}`} disabled={leadExists || locked || assignedReadOnly} onClick={() => { if (!hasValidAssignee) { setError("Please assign this call lead to Admin or Operations first."); return; } onAdd?.(row); }}><svg className="call-lead-form-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 3h9l5 5v13H5a2 2 0 0 1 2-2V5a2 2 0 0 1-2-2Z" /><path d="M14 3v6h6" /><path d="m9 17 7.5-7.5a2.1 2.1 0 0 1 3 3L12 20l-4 1 1-4Z" /><path d="M7 8h4M7 12h4" /></svg></button>{canDelete && <button type="button" className="row-icon-btn delete" title={locked || assignedReadOnly ? "Lead locked" : "Delete"} aria-label={`Delete ${row.name}`} disabled={locked || assignedReadOnly} onClick={() => remove(row)}><Trash2 size={15} /></button>}</div></td>}
          {showAssignee && <td><select className="inline-select lead-assignee-select" aria-label={`Assigned to for ${row.name}`} disabled={locked || assignedReadOnly} value={row.callLeadAssignedTo || ""} onChange={(e) => {
            const returningToOriginalOwner = allowReturnToOwner && e.target.value === returnValue;
            // Returning a delegated lead is an ownership change. Persist both fields
            // together so the original CRM executive receives it after a refresh.
            save(row, returningToOriginalOwner
              ? { callLeadAssignedTo: "", assignedTo: originalOwnerId, assignedToName: originalOwnerName }
              : { callLeadAssignedTo: e.target.value });
          }}><option value="">Select Admin / Operations</option>{allowReturnToOwner && returnValue && <option value={returnValue}>Send back to {originalOwnerName}</option>}{row.callLeadAssignedTo && !assigneeUsers.some((user) => String(user.id || user._id) === String(row.callLeadAssignedTo)) && <option value={row.callLeadAssignedTo}>{row.callLeadAssignedTo}</option>}{assigneeUsers.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}</select></td>}
          <td><button type="button" className="row-icon-btn call" title={locked || assignedReadOnly ? "Lead locked" : "Call now"} aria-label={locked || assignedReadOnly ? `Calling locked for ${row.name}` : `Call ${row.name}`} disabled={locked || assignedReadOnly} onClick={() => { window.location.href = `tel:${row.contact || row.phone || ""}`; }}><PhoneCall size={15} /></button></td>
        </tr>;
      })}</tbody>
    </table></div>
    <div className="call-leads-pagination"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
    {error && <p className="call-leads-error" role="alert">{error}</p>}
  </section>;
}

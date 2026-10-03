import { useEffect, useState } from "react";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { isCallLead } from "./callLeads.js";
import { normalizeCallProgram } from "./callListConfig.js";
import RemarkField from "./RemarkField.jsx";
import WhatsAppModal from "./WhatsAppModal.jsx";
import { useMessageTemplates } from "./useMessageTemplates.js";
import { resolveLeadTemplate, templateSelectionPatch } from "./whatsAppMessage.js";
import "./callLeads.css";

const leadStatus = (row) => ["Pending", "Approved", "Rejected"].includes(row.callLeadStatus) ? row.callLeadStatus : "Pending";
const ContactIcon = ({ children }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const ContactPhoneIcon = () => <ContactIcon><path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v4a2 2 0 0 1-2 2C9.5 21 3 14.5 3 6a2 2 0 0 1 2-2Z" /></ContactIcon>;
const ContactWhatsappIcon = () => <ContactIcon><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-3.9A8 8 0 1 1 20 11.5Z" /><path d="M9.2 8.8c.2 2.7 2 4.7 4.8 5.1" /><path d="m9.4 8.8 1.2 1.8-.9 1" /><path d="m14 13.9 1.5-.9 1.7 1.1" /></ContactIcon>;

export default function CallLeadsPanel({
  rows, users = [], onSave, onApprove, onDelete, onAdd, canDelete = false,
  canEditCallData = true, showAssignee = true, lockCreatedLead = false,
  title = "Call Leads Data", subtitle = "Contacts marked Follow Up or Completed and Interested",
  assignedTo = "", showActions = true, highlightAssigned = false, allowReturnToOwner = false,
  showSourceOwner = false, onUploadLead, showAllRows = false, showContactActions = true,
  currentUser,
}) {
  const { templates, loading: templatesLoading, error: templatesError } = useMessageTemplates();
  const [whatsAppLead, setWhatsAppLead] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [program, setProgram] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
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
  const qualified = (showAllRows ? rows : rows.filter(isCallLead)).filter((row) => !assignedTo || String(row.callLeadAssignedTo || "") === String(assignedTo));
  const typeRows = showAllRows || selectedTypes.length !== 1 ? qualified : qualified.filter((row) => row.listType === selectedTypes[0]);
  const selectedCatalog = selectedTypes.length === 1 ? selectedTypes[0] : "";
  const programOptions = [...new Set([...templates.filter((template) => !selectedCatalog || template.type === (selectedCatalog === "training" ? "training" : "service")).map((template) => template.title), ...typeRows.map((row) => normalizeCallProgram(row.program)).filter(Boolean)])];
  const toggleType = (type) => {
    setSelectedTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
    setProgram("All");
  };
  const save = async (row, patch) => {
    if (Object.entries(patch).every(([key, value]) => (row[key] || "") === value)) return;
    if (patch.callLeadStatus === "Approved" && !row.leadCreated) {
      if (!row.leadDraft) {
        setError("Save the lead form first, then approve this lead.");
        return;
      }
      if (onApprove) {
        try { await onApprove(row); setError(""); }
        catch (err) { setError(err.message || "Could not approve call lead."); }
        return;
      }
      setError("Approval is unavailable here.");
      return;
    }
    if (patch.callStatus === "Completed" && !String(row.program || "").trim()) {
      setError(`Please select a ${row.listType === "training" ? "training" : "service"} before marking this lead Completed.`);
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
  const filtered = typeRows.filter((row) => `${row.name} ${row.contact || row.phone || ""}`.toLowerCase().includes(search.toLowerCase())
    && (!status || leadStatus(row) === status) && (program === "All" || normalizeCallProgram(row.program) === program)
    && (!fromDate || rowDate(row) >= fromDate) && (!toDate || rowDate(row) <= toDate));
  const sortedRows = [...filtered].sort((left, right) => {
    const valueFor = (row) => ({
      date: rowDate(row),
      name: row.name || "",
      leadType: row.listType === "training" ? "Training" : "Service",
      callStatus: row.callStatus || "",
      interestType: row.interestStatus || "",
    }[sortKey] || "");
    return String(valueFor(left)).localeCompare(String(valueFor(right)), undefined, { sensitivity: "base", numeric: true }) * (sortDir === "asc" ? 1 : -1);
  });
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [search, status, selectedTypes, program, fromDate, toDate]);
  useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16); pdf.text("Call Leads Report", 14, 14);
    pdf.setFontSize(9); pdf.setTextColor(100); pdf.text(`${filtered.length} filtered lead(s)`, 14, 20);
    autoTable(pdf, {
      startY: 25,
      head: [["S. No.", "Date", "Service / Training", "Type", "Name", "Contact", "Call Status", "Interest", "Remark", "Lead Status", ...(showSourceOwner ? ["CRM Executive"] : []), ...(showAssignee ? ["Assigned To"] : [])]],
      body: filtered.map((row, index) => [index + 1, rowDate(row) || "-", normalizeCallProgram(row.program) || "-", row.listType === "training" ? "Training" : "Service", row.name || "-", row.contact || row.phone || "-", row.callStatus || "-", row.interestStatus || "-", row.remark || "-", leadStatus(row), ...(showSourceOwner ? [sourceOwnerName(row)] : []), ...(showAssignee ? [assigneeUsers.find((user) => String(user.id || user._id) === String(row.callLeadAssignedTo))?.name || row.callLeadAssignedTo || "Unassigned"] : [])]),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [127, 78, 43] },
    });
    pdf.save(`call-leads-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  return <section className="panel leads-panel shared-call-leads">
    <div className="panel-head"><div><h3>{title}</h3><p className="panel-subtitle">{subtitle}</p></div><div className="call-leads-head-actions">{onUploadLead && <button type="button" className="primary-button" onClick={onUploadLead}><Plus size={16} /> Upload Lead</button>}<button type="button" className="primary-button" onClick={exportPdf} disabled={!filtered.length}><FileText size={16} /> Export PDF ({filtered.length})</button></div></div>
    {!showAllRows && <div className="call-leads-type-tabs" role="group" aria-label="Lead type">
      <button type="button" className={selectedTypes.includes("training") ? "active" : ""} aria-pressed={selectedTypes.includes("training")} onClick={() => toggleType("training")}>Training</button>
      <button type="button" className={selectedTypes.includes("services") ? "active" : ""} aria-pressed={selectedTypes.includes("services")} onClick={() => toggleType("services")}>Service</button>
    </div>}
    <form className="module-toolbar call-leads-toolbar" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
      <div className="call-leads-search">
        <Search size={16} aria-hidden="true" />
        <input aria-label="Search call leads" placeholder="Search by name or contact number" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); if (!e.target.value) setSearch(""); }} />
        <button type="submit">Search</button>
      </div>
      <select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Statuses</option>{["Pending", "Approved", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filter service or training" value={program} onChange={(e) => setProgram(e.target.value)}><option value="All">{selectedCatalog === "training" ? "All Training" : selectedCatalog === "services" ? "All Services" : "All Services / Training"}</option><option value="">Unspecified</option>{programOptions.map((item) => <option key={item}>{item}</option>)}</select>
      <label className="table-date-filter"><span>From</span><input aria-label="From date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
      <label className="table-date-filter"><span>To</span><input aria-label="To date" type="date" min={fromDate} value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
      <button type="button" className="call-leads-reset" onClick={() => { setSearchInput(""); setSearch(""); setStatus(""); setSelectedTypes([]); setProgram("All"); setFromDate(""); setToDate(""); }}>Reset</button>
    </form>
    <div className="table-wrap crm-call-leads-table-wrap"><table className="table crm-call-leads-table">
      <thead><tr><th>S. No.</th><th className="sortable-call-leads-header" title="Sort by date" aria-sort={sortKey === "date" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} onClick={() => toggleSort("date")}>Date {sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th><th>Service / Training</th><th className="sortable-call-leads-header" title="Sort by lead type" onClick={() => toggleSort("leadType")}>Lead Type {sortKey === "leadType" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th><th className="sortable-call-leads-header" title="Sort names alphabetically" aria-sort={sortKey === "name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} onClick={() => toggleSort("name")}>Name {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th><th className="sortable-call-leads-header" title="Sort by call status" onClick={() => toggleSort("callStatus")}>Call Status {sortKey === "callStatus" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th><th className="sortable-call-leads-header" title="Sort by interest type" onClick={() => toggleSort("interestType")}>Interest Type {sortKey === "interestType" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th><th>Remark</th><th>Lead Status</th>{showSourceOwner && <th>CRM Executive</th>}{showActions && <th>Action</th>}{showAssignee && <th>Assigned To</th>}{showContactActions && <th>Contact</th>}</tr></thead>
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
        const selectedProgram = normalizeCallProgram(row.program);
        const rowType = row.listType === "training" ? "training" : "service";
        const rowTemplates = templates.filter((template) => template.type === rowType);
        const selectedTemplate = resolveLeadTemplate(row, rowType, rowTemplates);
        return <tr key={key} className={locked ? "call-lead-locked" : highlightAssigned && hasValidAssignee ? "call-lead-assigned" : ""}>
          <td>{(page - 1) * pageSize + index + 1}</td><td>{rowDate(row) ? new Date(`${rowDate(row)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
          <td title={selectedProgram}>{canEditCallData ? <select className="inline-select call-lead-program-select" aria-label={`Service or training for ${row.name}`} disabled={locked || assignedReadOnly || templatesLoading} value={selectedTemplate?.id || (selectedProgram ? `legacy:${selectedProgram}` : "")} onChange={(e) => save(row, templateSelectionPatch(rowType, rowTemplates.find((template) => template.id === e.target.value)))}>
            <option value="">{row.listType === "training" ? "Select Training" : "Select Service"}</option>
            {selectedProgram && !selectedTemplate && <option value={`legacy:${selectedProgram}`}>{selectedProgram} (previous selection)</option>}
            {rowTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
          </select> : (selectedProgram || "-")}</td><td><span className="lead-type-label">{row.listType === "training" ? "Training" : "Service"}</span></td><td><div className="call-leads-name"><strong title={row.name}>{row.name}</strong></div></td><td>{row.callStatus || "-"}</td><td>{row.interestStatus}</td>
          <td><RemarkField value={drafts[key] ?? row.remark ?? ""} readOnly={!canEditCallData || locked || assignedReadOnly} label={`Remark for ${row.name}`} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} onCommit={async (value) => { await save(row, { remark: value }); setDrafts((current) => { const next = { ...current }; delete next[key]; return next; }); }} /></td>
          <td>{canEditCallData ? <select className={`inline-select lead-status-select ${leadStatus(row).toLowerCase()}`} aria-label={`Status for ${row.name}`} disabled={locked || assignedReadOnly} value={leadStatus(row)} onChange={(e) => save(row, { callLeadStatus: e.target.value })}>{["Pending", "Approved", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select> : leadStatus(row)}</td>
          {showSourceOwner && <td><strong>{sourceOwnerName(row)}</strong></td>}
          {showActions && <td><div className="row-actions"><button type="button" className="row-icon-btn call-lead-add-button" title={leadExists || locked ? "Lead approved" : row.leadDraft ? "Lead form already saved" : assignedReadOnly ? "Lead assigned and locked" : "Add Lead"} aria-label={leadExists || locked ? `Lead approved for ${row.name}` : row.leadDraft ? `Lead form already saved for ${row.name}` : assignedReadOnly ? `Assigned lead locked for ${row.name}` : `Add lead for ${row.name}`} disabled={leadExists || locked || Boolean(row.leadDraft) || assignedReadOnly} onClick={() => onAdd?.(row)}><svg className="call-lead-form-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 3h9l5 5v13H5a2 2 0 0 1 2-2V5a2 2 0 0 1-2-2Z" /><path d="M14 3v6h6" /><path d="m9 17 7.5-7.5a2.1 2.1 0 0 1 3 3L12 20l-4 1 1-4Z" /><path d="M7 8h4M7 12h4" /></svg></button>{canDelete && <button type="button" className="row-icon-btn delete" title={locked || assignedReadOnly ? "Lead locked" : "Delete"} aria-label={`Delete ${row.name}`} disabled={locked || assignedReadOnly} onClick={() => remove(row)}><Trash2 size={15} /></button>}</div></td>}
          {showAssignee && <td><select className="inline-select lead-assignee-select" aria-label={`Assigned to for ${row.name}`} disabled={locked || assignedReadOnly} value={row.callLeadAssignedTo || ""} onChange={(e) => {
            const returningToOriginalOwner = allowReturnToOwner && e.target.value === returnValue;
            // Returning a delegated lead is an ownership change. Persist both fields
            // together so the original CRM executive receives it after a refresh.
            save(row, returningToOriginalOwner
              ? { callLeadAssignedTo: "", assignedTo: originalOwnerId, assignedToName: originalOwnerName }
              : { callLeadAssignedTo: e.target.value });
          }}><option value="">Select Admin / Operations</option>{allowReturnToOwner && returnValue && <option value={returnValue}>Send back to {originalOwnerName}</option>}{row.callLeadAssignedTo && !assigneeUsers.some((user) => String(user.id || user._id) === String(row.callLeadAssignedTo)) && <option value={row.callLeadAssignedTo}>{row.callLeadAssignedTo}</option>}{assigneeUsers.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}</select></td>}
          {showContactActions && <td><div className="row-actions"><button type="button" className="row-icon-btn call" title={locked || assignedReadOnly ? "Lead locked" : "Call now"} aria-label={locked || assignedReadOnly ? `Calling locked for ${row.name}` : `Call ${row.name}`} disabled={locked || assignedReadOnly} onClick={() => { void save(row, { callClicked: true, activityRecorded: true }); window.location.href = `tel:${row.contact || row.phone || ""}`; }}><ContactPhoneIcon /></button><button type="button" className="row-icon-btn whatsapp" title={locked || assignedReadOnly ? "Lead locked" : "Open WhatsApp"} aria-label={locked || assignedReadOnly ? `WhatsApp locked for ${row.name}` : `Open WhatsApp for ${row.name}`} disabled={locked || assignedReadOnly} onClick={() => setWhatsAppLead(row)}><ContactWhatsappIcon /></button></div></td>}
        </tr>;
      })}</tbody>
    </table></div>
    <div className="call-leads-pagination"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
    {error && <p className="call-leads-error" role="alert">{error}</p>}
    {templatesError && <p className="call-leads-error" role="alert">Could not load message templates: {templatesError}</p>}
    {whatsAppLead && <WhatsAppModal lead={whatsAppLead} leadType={whatsAppLead.listType === "training" ? "training" : "service"} currentUser={currentUser} onClose={() => setWhatsAppLead(null)} onSelectTemplate={(template) => save(whatsAppLead, templateSelectionPatch(whatsAppLead.listType === "training" ? "training" : "service", template))} onSent={() => save(whatsAppLead, { whatsappClicked: true, activityRecorded: true })} />}
  </section>;
}

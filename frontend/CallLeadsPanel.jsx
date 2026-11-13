import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, Clock3, Download, Eye, Layers, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { callLeadProgram, callLeadReviewStatus, isCallLead } from "./callLeads.js";
import { normalizeCallStatus } from "./callListConfig.js";
import { callLeadRecordDate, callListStableSortDate } from "./callListConfig.js";
import RemarkField from "./RemarkField.jsx";
import CallListDatePicker from "./CallListDatePicker.jsx";
import WhatsAppModal from "./WhatsAppModal.jsx";
import { useMessageTemplates } from "./useMessageTemplates.js";
import { resolveLeadTemplate, templateSelectionPatch } from "./whatsAppMessage.js";
import "./callLeads.css";

const leadStatus = callLeadReviewStatus;
const ContactIcon = ({ children }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const ContactPhoneIcon = () => <ContactIcon><path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v4a2 2 0 0 1-2 2C9.5 21 3 14.5 3 6a2 2 0 0 1 2-2Z" /></ContactIcon>;
const ContactWhatsappIcon = () => <ContactIcon><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-3.9A8 8 0 1 1 20 11.5Z" /><path d="M9.2 8.8c.2 2.7 2 4.7 4.8 5.1" /><path d="m9.4 8.8 1.2 1.8-.9 1" /><path d="m14 13.9 1.5-.9 1.7 1.1" /></ContactIcon>;
const CALL_LEAD_STATUSES = [
  { value: "", label: "Choose", Icon: Layers },
  { value: "Pending", label: "Pending", Icon: Clock3 },
  { value: "Approved", label: "Approved", Icon: Check },
  { value: "Rejected", label: "Rejected", Icon: X },
];

function CallLeadStatusSelect({ row, disabled, onChange }) {
  const selectedStatus = leadStatus(row);
  const selected = CALL_LEAD_STATUSES.find((item) => item.value === selectedStatus) || CALL_LEAD_STATUSES[0];
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(132, rect.width);
      const menuHeight = CALL_LEAD_STATUSES.length * 40 + 8;
      const below = window.innerHeight - rect.bottom;
      const top = below >= menuHeight || below >= rect.top ? rect.bottom + 4 : rect.top - menuHeight - 4;
      setPosition({
        top: Math.max(4, Math.min(top, window.innerHeight - menuHeight - 4)),
        left: Math.max(4, Math.min(rect.left, window.innerWidth - width - 4)),
        width: Math.min(width, window.innerWidth - 8),
      });
    };
    const closeOnOutsideClick = (event) => {
      if (!buttonRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = CALL_LEAD_STATUSES.findIndex((item) => item.value === selected.value);
    optionRefs.current[selectedIndex]?.focus();
  }, [open, selected.value]);

  const closeMenu = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  const handleOptionKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % CALL_LEAD_STATUSES.length;
    else if (event.key === "ArrowUp") nextIndex = (index - 1 + CALL_LEAD_STATUSES.length) % CALL_LEAD_STATUSES.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = CALL_LEAD_STATUSES.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    } else return;
    event.preventDefault();
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="call-lead-status-picker">
      <button
        ref={buttonRef}
        type="button"
        className={`inline-select lead-status-select ${selected.value.toLowerCase() || "choose"}`}
        aria-label={`Status for ${row.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <selected.Icon size={14} aria-hidden="true" />
        <span>{selected.label}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
      </button>
      {open && position && createPortal(
        <div ref={menuRef} className="call-lead-status-menu" role="listbox" aria-label={`Status options for ${row.name}`} style={{ ...position, position: "fixed" }}>
          {CALL_LEAD_STATUSES.map(({ value, label, Icon }, index) => (
            <button
              key={label}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              className={`call-lead-status-option ${value ? value.toLowerCase() : "choose"}`}
              role="option"
              aria-selected={selected.value === value}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onClick={() => {
                onChange(value);
                closeMenu();
              }}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function CallLeadsPanel({
  rows, users = [], onSave, onApprove, onDelete, onAdd, canDelete = false,
  canEditCallData = true, showAssignee = true, lockCreatedLead = false,
  title = "Call Leads Data", subtitle = "Selected course or service, Follow Up or Completed, and Interested",
  assignedTo = "", showActions = true, highlightAssigned = false, allowReturnToOwner = false,
  showSourceOwner = false, onUploadLead, showAllRows = false, showContactActions = true,
  currentUser, largeText = false, compactHeader = false, onView,
}) {
  const { templates, loading: templatesLoading, error: templatesError } = useMessageTemplates();
  const [whatsAppLead, setWhatsAppLead] = useState(null);
  const [viewingLeadDraft, setViewingLeadDraft] = useState(null);
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
  const programOptions = [...new Set([...templates.filter((template) => !selectedCatalog || template.type === (selectedCatalog === "training" ? "training" : "service")).map((template) => template.title), ...typeRows.map(callLeadProgram).filter(Boolean)])];
  const toggleType = (type) => {
    setSelectedTypes(type ? [type] : []);
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
    if (patch.callStatus === "Completed" && !callLeadProgram(row)) {
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
  // Lead creation may set the displayed lead date once. Later activity must
  // not change it or move the row in the working table.
  const rowDate = callLeadRecordDate;
  const filtered = typeRows.filter((row) => `${row.name} ${row.contact || row.phone || ""}`.toLowerCase().includes(search.toLowerCase())
    && (!status || (status === "__choose__" ? !leadStatus(row) : leadStatus(row) === status)) && (program === "All" || callLeadProgram(row) === program)
    && (!fromDate || rowDate(row) >= fromDate) && (!toDate || rowDate(row) <= toDate));
  const sortedRows = [...filtered].sort((left, right) => {
    const valueFor = (row) => ({
      date: callListStableSortDate(row),
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
      body: filtered.map((row, index) => [index + 1, rowDate(row) || "-", callLeadProgram(row) || "-", row.listType === "training" ? "Training" : "Service", row.name || "-", row.contact || row.phone || "-", row.callStatus || "-", row.interestStatus || "-", row.remark || "-", leadStatus(row) || "Choose", ...(showSourceOwner ? [sourceOwnerName(row)] : []), ...(showAssignee ? [assigneeUsers.find((user) => String(user.id || user._id) === String(row.callLeadAssignedTo))?.name || row.callLeadAssignedTo || "Unassigned"] : [])]),
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [127, 78, 43] },
    });
    pdf.save(`call-leads-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  return <section className={`panel leads-panel shared-call-leads${compactHeader ? " call-leads-compact-header" : ""}`}>
    <div className="panel-head"><div>{compactHeader ? <h3>Sales-Ready Leads ({filtered.length})</h3> : <><h3>{title}</h3><p className="panel-subtitle">{subtitle}</p></>}</div><div className="call-leads-head-actions"><button type="button" className="primary-button call-leads-export-button" onClick={exportPdf} disabled={!filtered.length}><Download size={16} /> Export PDF <span className="call-leads-button-count">{filtered.length}</span></button>{onUploadLead && <button type="button" className="primary-button call-leads-add-button" onClick={onUploadLead}><Plus size={16} /> Add Lead</button>}</div></div>
    <div className="call-leads-filter-area">
    {!showAllRows && <div className="call-leads-filter-top"><span>Lead type</span><div className="call-leads-type-tabs" role="group" aria-label="Lead type">
      <button type="button" className={!selectedTypes.length ? "active" : ""} aria-pressed={!selectedTypes.length} onClick={() => toggleType("")}>All</button>
      <button type="button" className={selectedTypes.includes("training") ? "active" : ""} aria-pressed={selectedTypes.includes("training")} onClick={() => toggleType("training")}>Training</button>
      <button type="button" className={selectedTypes.includes("services") ? "active" : ""} aria-pressed={selectedTypes.includes("services")} onClick={() => toggleType("services")}>Service</button>
    </div></div>}
    <form className="module-toolbar call-leads-toolbar" onSubmit={(event) => event.preventDefault()}>
      <div className="call-leads-search">
        <Search className="call-leads-search-icon" size={17} aria-hidden="true" />
        <input type="search" aria-label="Search qualified leads" placeholder="Search by name or contact number" value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setSearch(e.target.value.trim()); }} />
        {searchInput && <button type="button" className="call-leads-search-clear" aria-label="Clear search" title="Clear search" onClick={() => { setSearchInput(""); setSearch(""); }}><X size={16} aria-hidden="true" /></button>}
      </div>
      <select aria-label="Filter lead status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All lead statuses</option><option value="__choose__">Choose</option>{["Pending", "Approved", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filter service or training" value={program} onChange={(e) => setProgram(e.target.value)}><option value="All">{selectedCatalog === "training" ? "All Training" : selectedCatalog === "services" ? "All Services" : "All Services / Training"}</option><option value="">Unspecified</option>{programOptions.map((item) => <option key={item}>{item}</option>)}</select>
      <div className="call-leads-date-row call-list-date-row"><span className="call-leads-date-caption call-list-date-caption"><CalendarDays size={15} aria-hidden="true" /> Lead date</span><CallListDatePicker label="From" value={fromDate} onChange={(value) => { setFromDate(value); if (value && toDate && value > toDate) setToDate(""); }} /><CallListDatePicker label="To" value={toDate} min={fromDate} onChange={setToDate} />
      <button type="button" className="ghost-button compact call-leads-reset" onClick={() => { setSearchInput(""); setSearch(""); setStatus(""); setSelectedTypes([]); setProgram("All"); setFromDate(""); setToDate(""); }}>Reset</button>
      </div>
    </form>
    </div>
    <div className="table-wrap crm-call-leads-table-wrap" tabIndex={0} role="region" aria-label="Call leads table. Scroll horizontally to see all columns."><table className={`table crm-call-leads-table${showContactActions && showActions && !showSourceOwner && !showAssignee ? " call-leads-table-standard" : ""}`}>
      <thead><tr>
        <th>S. No.</th>
        <th className="sortable-call-leads-header" title="Sort by date" aria-sort={sortKey === "date" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} onClick={() => toggleSort("date")}>Date {sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th className="sortable-call-leads-header" title="Sort names alphabetically" aria-sort={sortKey === "name" ? (sortDir === "asc" ? "ascending" : "descending") : "none"} onClick={() => toggleSort("name")}>Name {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th>Contact</th>
        {showContactActions && <th>Call / WhatsApp</th>}
        <th className="sortable-call-leads-header" title="Sort by call status" onClick={() => toggleSort("callStatus")}>Call Status {sortKey === "callStatus" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th>Interest Status</th>
        <th>{selectedCatalog === "training" ? "Training" : selectedCatalog === "services" ? "Service" : "Service / Training"}</th>
        <th>Remark</th>
        <th>Lead Status</th>
        {showSourceOwner && <th>CRM Executive</th>}
        {showActions && <th>Action</th>}
        {showAssignee && <th>Assigned To</th>}
      </tr></thead>
      <tbody>{!filtered.length && <tr><td colSpan={9 + Number(showSourceOwner) + Number(showActions) + Number(showAssignee) + Number(showContactActions)}>No qualifying call leads assigned to you.</td></tr>}{pageRows.map((row, index) => {
        const key = `${row.listType}:${row.id}`;
        const locked = lockCreatedLead && Boolean(row.leadCreated || row.callLeadStatus === "Approved");
        const leadExists = Boolean(row.leadCreated);
        const hasSavedLeadDraft = Boolean(row.leadDraft);
        const hasValidAssignee = assigneeUsers.some((user) => String(user.id || user._id) === String(row.callLeadAssignedTo || ""));
        const assignedReadOnly = highlightAssigned && hasValidAssignee;
        const originalOwnerId = String(row.assignedTo || "");
        const originalOwner = users.find((user) => String(user.id || user._id) === originalOwnerId);
        const originalOwnerName = row.assignedToName || originalOwner?.name || originalOwner?.username || originalOwnerId;
        const returnValue = originalOwnerId ? `return:${originalOwnerId}` : "";
        const selectedProgram = callLeadProgram(row);
        const rowType = row.listType === "training" ? "training" : "service";
        const rowTemplates = templates.filter((template) => template.type === rowType);
        const selectedTemplate = resolveLeadTemplate(row, rowType, rowTemplates);
        const normalizedCallStatus = normalizeCallStatus(row.callStatus);
        const callStatusClass = (normalizedCallStatus || "Choose").toLowerCase().replace(/\s+/g, "-");
        const rowClasses = [
          locked && "call-lead-locked",
          !locked && highlightAssigned && hasValidAssignee && "call-lead-assigned",
          callStatusClass && `call-status-${callStatusClass}`,
        ].filter(Boolean).join(" ");
        return <tr key={key} className={rowClasses}>
          <td><span className="call-lead-row-number">{(page - 1) * pageSize + index + 1}</span></td>
          <td>{rowDate(row) ? new Date(`${rowDate(row)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-"}</td>
          <td><div className="call-leads-name"><strong title={row.name}>{row.name}</strong></div></td>
          <td>{row.contact || row.phone || "-"}</td>
          {showContactActions && <td><div className="row-actions"><button type="button" className="row-icon-btn call" title={locked || assignedReadOnly ? "Lead locked" : "Call now"} aria-label={locked || assignedReadOnly ? `Calling locked for ${row.name}` : `Call ${row.name}`} disabled={locked || assignedReadOnly} onClick={() => { void save(row, { callClicked: true, activityRecorded: true }); window.location.href = `tel:${row.contact || row.phone || ""}`; }}><ContactPhoneIcon /></button><button type="button" className="row-icon-btn whatsapp" title={locked || assignedReadOnly ? "Lead locked" : "Open WhatsApp"} aria-label={locked || assignedReadOnly ? `WhatsApp locked for ${row.name}` : `Open WhatsApp for ${row.name}`} disabled={locked || assignedReadOnly} onClick={() => setWhatsAppLead(row)}><ContactWhatsappIcon /></button></div></td>}
          <td><span className={`call-lead-call-status call-list-status-${callStatusClass}`}>{normalizedCallStatus === "Completed" ? <Check size={15} aria-hidden="true" /> : normalizedCallStatus === "Follow Up" ? <RefreshCw size={15} aria-hidden="true" /> : normalizedCallStatus ? <Clock3 size={15} aria-hidden="true" /> : null}{normalizedCallStatus || "Choose"}</span></td>
          <td>{row.interestStatus || "-"}</td>
          <td title={selectedProgram}>{canEditCallData ? <select className="inline-select call-lead-program-select" aria-label="Service or training" disabled={locked || assignedReadOnly || templatesLoading} value={selectedTemplate?.id || (selectedProgram ? `legacy:${selectedProgram}` : "")} onChange={(e) => save(row, templateSelectionPatch(rowType, rowTemplates.find((template) => template.id === e.target.value)))}>
            <option value="">{row.listType === "training" ? "Select Training" : "Select Service"}</option>
            {selectedProgram && !selectedTemplate && <option value={`legacy:${selectedProgram}`}>{selectedProgram} (previous selection)</option>}
            {rowTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
          </select> : (selectedProgram || "-")}</td>
          <td><RemarkField largeText={largeText} value={drafts[key] ?? row.remark ?? ""} readOnly={!canEditCallData || locked || assignedReadOnly} label={`Remark for ${row.name}`} onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))} onCommit={async (value) => { await save(row, { remark: value }); setDrafts((current) => { const next = { ...current }; delete next[key]; return next; }); }} /></td>
          <td>{canEditCallData ? <CallLeadStatusSelect row={row} disabled={locked || assignedReadOnly} onChange={(value) => save(row, { callLeadStatus: value, callLeadStatusSelected: true })} /> : leadStatus(row) || "Choose"}</td>
          {showSourceOwner && <td><strong>{sourceOwnerName(row)}</strong></td>}
          {showActions && <td><div className="row-actions"><button type="button" className="row-icon-btn call-lead-add-button" title={hasSavedLeadDraft ? "View saved lead form" : leadExists || locked ? "Lead approved" : assignedReadOnly ? "Lead assigned and locked" : "Add Lead"} aria-label={hasSavedLeadDraft ? `View saved lead form for ${row.name}` : leadExists || locked ? `Lead approved for ${row.name}` : assignedReadOnly ? `Assigned lead locked for ${row.name}` : `Add lead for ${row.name}`} disabled={!hasSavedLeadDraft && (leadExists || locked || assignedReadOnly)} onClick={() => hasSavedLeadDraft ? (onView ? onView(row) : setViewingLeadDraft(row)) : onAdd?.(row)}>{hasSavedLeadDraft ? <Eye size={18} aria-hidden="true" /> : <svg className="call-lead-form-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 3h9l5 5v13H5a2 2 0 0 1 2-2V5a2 2 0 0 1-2-2Z" /><path d="M14 3v6h6" /><path d="m9 17 7.5-7.5a2.1 2.1 0 0 1 3 3L12 20l-4 1 1-4Z" /><path d="M7 8h4M7 12h4" /></svg>}</button>{canDelete && <button type="button" className="row-icon-btn delete" title={locked || assignedReadOnly ? "Lead locked" : "Delete"} aria-label={`Delete ${row.name}`} disabled={locked || assignedReadOnly} onClick={() => remove(row)}><Trash2 size={15} /></button>}</div></td>}
          {showAssignee && <td><select className="inline-select lead-assignee-select" aria-label={`Assigned to for ${row.name}`} disabled={locked || assignedReadOnly} value={row.callLeadAssignedTo || ""} onChange={(e) => {
            const returningToOriginalOwner = allowReturnToOwner && e.target.value === returnValue;
            // Returning a delegated lead is an ownership change. Persist both fields
            // together so the original CRM executive receives it after a refresh.
            save(row, returningToOriginalOwner
              ? { callLeadAssignedTo: "", assignedTo: originalOwnerId, assignedToName: originalOwnerName }
              : { callLeadAssignedTo: e.target.value });
          }}><option value="">Select Admin / Operations</option>{allowReturnToOwner && returnValue && <option value={returnValue}>Send back to {originalOwnerName}</option>}{row.callLeadAssignedTo && !assigneeUsers.some((user) => String(user.id || user._id) === String(row.callLeadAssignedTo)) && <option value={row.callLeadAssignedTo}>{row.callLeadAssignedTo}</option>}{assigneeUsers.map((user) => <option key={user.id || user._id} value={user.id || user._id}>{user.name || user.username}</option>)}</select></td>}
        </tr>;
      })}</tbody>
    </table></div>
    <div className="call-leads-pagination"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
    {error && <p className="call-leads-error" role="alert">{error}</p>}
    {templatesError && <p className="call-leads-error" role="alert">Could not load message templates: {templatesError}</p>}
    {whatsAppLead && <WhatsAppModal lead={whatsAppLead} leadType={whatsAppLead.listType === "training" ? "training" : "service"} currentUser={currentUser} onClose={() => setWhatsAppLead(null)} onSelectTemplate={(template) => save(whatsAppLead, templateSelectionPatch(whatsAppLead.listType === "training" ? "training" : "service", template))} onSent={() => save(whatsAppLead, { whatsappClicked: true, activityRecorded: true })} />}
    {viewingLeadDraft && <div className="modal-surface" role="dialog" aria-modal="true" aria-labelledby="call-lead-draft-title">
      <div className="modal-backdrop" onClick={() => setViewingLeadDraft(null)} />
      <section className="modal-shell wide call-lead-draft-view">
        <div className="modal-head">
          <strong id="call-lead-draft-title">View saved lead form</strong>
          <button type="button" className="icon-button" onClick={() => setViewingLeadDraft(null)} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="call-lead-draft-view-grid">
            {[
              ["Full name", viewingLeadDraft.leadDraft.name || viewingLeadDraft.name],
              ["Phone", viewingLeadDraft.leadDraft.phone || viewingLeadDraft.contact || viewingLeadDraft.phone],
              ["Email", viewingLeadDraft.leadDraft.email],
              ["Alternate phone", viewingLeadDraft.leadDraft.alternatePhone],
              ["City", viewingLeadDraft.leadDraft.city],
              ["Company / Organization", viewingLeadDraft.leadDraft.company],
              ["Lead type", viewingLeadDraft.leadDraft.type],
              ["Interest", viewingLeadDraft.leadDraft.interest || callLeadProgram(viewingLeadDraft)],
              ["Value", viewingLeadDraft.leadDraft.value],
              ["Lead source", viewingLeadDraft.leadDraft.leadSource || viewingLeadDraft.leadDraft.source],
              ["Status", viewingLeadDraft.leadDraft.status],
              ["Entered by", viewingLeadDraft.leadDraft.enteredBy],
              ["Assigned to", viewingLeadDraft.leadDraft.assignedTo],
              ["Assigned date", viewingLeadDraft.leadDraft.assignedDate],
              ["Lead notes / remarks", viewingLeadDraft.leadDraft.notes || viewingLeadDraft.remark],
            ].map(([label, value]) => <div className="call-lead-draft-view-field" key={label}>
              <span>{label}</span>
              <strong>{value || "-"}</strong>
            </div>)}
          </div>
          <div className="form-actions"><button type="button" className="ghost-button" onClick={() => setViewingLeadDraft(null)}>Close</button></div>
        </div>
      </section>
    </div>}
  </section>;
}

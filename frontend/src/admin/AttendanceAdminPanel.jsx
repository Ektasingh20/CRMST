import { useEffect, useMemo, useState } from "react";
import { correctAttendance, fetchAdminAttendance, fetchAdminAttendanceSummary } from "../../backendApi.js";

const indiaDate = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).filter((part) => part.type !== "literal").map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const displayDate = (value) => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
  : "-";

const workedTime = (minutes) => {
  if (minutes === null || minutes === undefined || minutes === "" || !Number.isFinite(Number(minutes))) return "-";
  const value = Math.max(0, Number(minutes));
  return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
};

function downloadRows(rows) {
  if (!rows.length) return;
  const values = rows.map((row) => ({
    Employee: row.employeeName,
    Date: row.date,
    Status: row.status,
    "Check In": row.checkIn || "",
    "Check Out": row.checkOut || "",
    "Worked Minutes": row.workedMinutes ?? "",
    Remark: row.remark || "",
  }));
  const headers = Object.keys(values[0]);
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(quote).join(","), ...values.map((row) => headers.map((header) => quote(row[header])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-admin-${indiaDate()}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AttendanceAdminPanel({ employees = [] }) {
  const today = indiaDate();
  const [filters, setFilters] = useState({ month: today.slice(0, 7), date: "", employeeId: "", status: "" });
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [nextCursor, setNextCursor] = useState("");
  const [cursorStack, setCursorStack] = useState([""]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [correcting, setCorrecting] = useState("");

  const employeeChoices = useMemo(() => employees
    .filter((employee) => String(employee.role || "").toLowerCase() !== "student")
    .map((employee) => ({
      id: String(employee.id || employee._id || ""),
      label: `${employee.name || employee.username || "Employee"} (${employee.id || employee._id || ""})`,
    })).filter((employee) => employee.id), [employees]);

  useEffect(() => {
    const match = employeeChoices.find((employee) => employee.label.toLowerCase() === employeeQuery.trim().toLowerCase()
      || employee.id.toLowerCase() === employeeQuery.trim().toLowerCase());
    const employeeId = match?.id || "";
    setFilters((current) => current.employeeId === employeeId ? current : { ...current, employeeId });
  }, [employeeChoices, employeeQuery]);

  useEffect(() => {
    setPage(0);
    setCursorStack([""]);
  }, [filters.month, filters.date, filters.employeeId, filters.status]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const requestFilters = {
      ...(filters.date ? { date: filters.date } : { month: filters.month }),
      employeeId: filters.employeeId,
      status: filters.status,
      pageSize: 25,
      cursor: cursorStack[page] || "",
    };
    Promise.all([
      fetchAdminAttendance(requestFilters),
      fetchAdminAttendanceSummary(filters.date || today),
    ]).then(([result, summaryResult]) => {
      if (!active) return;
      setRecords(Array.isArray(result?.records) ? result.records : []);
      setNextCursor(result?.nextCursor || "");
      setSummary(summaryResult || null);
    }).catch((requestError) => {
      if (active) setError(requestError.message || "Unable to load attendance.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cursorStack, filters, page, today]);

  const goNext = () => {
    if (!nextCursor) return;
    setCursorStack((current) => {
      const next = current.slice(0, page + 1);
      next.push(nextCursor);
      return next;
    });
    setPage((current) => current + 1);
  };

  const correct = async (record) => {
    setCorrecting(record.id);
    try {
      const updated = await correctAttendance(record.id, { status: "Present" });
      setRecords((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(requestError.message || "Unable to correct attendance.");
    } finally {
      setCorrecting("");
    }
  };

  return <div className="admin-attendance-workspace">
    <div className="admin-attendance-summary">
      {[
        ["Recorded", summary?.recorded ?? 0],
        ["Present", summary?.present ?? 0],
        ["Absent", summary?.absent ?? 0],
        ["Checked in", summary?.checkedIn ?? 0],
        ["Checked out", summary?.checkedOut ?? 0],
        ["Leave / Holiday", (summary?.leave ?? 0) + (summary?.holiday ?? 0)],
      ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </div>

    <div className="admin-attendance-filters">
      <label><span>Month</span><input type="month" value={filters.month} disabled={Boolean(filters.date)} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))} /></label>
      <label><span>Exact date</span><input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} /></label>
      <label><span>Employee search</span><input type="search" list="admin-attendance-employees" value={employeeQuery} placeholder="Name or employee ID" onChange={(event) => setEmployeeQuery(event.target.value)} /><datalist id="admin-attendance-employees">{employeeChoices.map((employee) => <option key={employee.id} value={employee.label} />)}</datalist></label>
      <label><span>Status</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option><option value="present">Present</option><option value="absent">Absent</option><option value="leave">Leave</option><option value="holiday">Holiday</option></select></label>
      <button type="button" className="ghost-button" onClick={() => { setFilters({ month: today.slice(0, 7), date: "", employeeId: "", status: "" }); setEmployeeQuery(""); }}>Reset</button>
      <button type="button" className="primary-button" disabled={!records.length} onClick={() => downloadRows(records)}>Export page</button>
    </div>

    {error && <p className="admin-attendance-error" role="alert">{error}</p>}
    <div className="table-wrap">
      <table className="table admin-attendance-table">
        <thead><tr><th>Employee</th><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Worked</th><th>Remark</th><th>Correction</th></tr></thead>
        <tbody>
          {!loading && !records.length && <tr><td colSpan="8" className="empty-cell">No attendance records match these filters.</td></tr>}
          {records.map((record) => <tr key={`${record.employeeId}-${record.date}`}>
            <td><strong>{record.employeeName || record.employeeId}</strong><small>{record.employeeId}</small></td>
            <td>{displayDate(record.date)}</td>
            <td><span className={`badge ${String(record.status || "").toLowerCase()}`}>{record.status}</span></td>
            <td>{record.checkIn || "-"}</td><td>{record.checkOut || "-"}</td><td>{workedTime(record.workedMinutes)}</td><td>{record.remark || "-"}</td>
            <td>{record.autoMarked && !record.correctedAt
              ? <button type="button" className="ghost-button compact" disabled={correcting === record.id} onClick={() => correct(record)}>{correcting === record.id ? "Correcting…" : "Correct to Present"}</button>
              : record.correctedAt ? `Corrected by ${record.correctedBy || "Admin"}` : "-"}</td>
          </tr>)}
        </tbody>
      </table>
      {loading && <div className="admin-attendance-loading" role="status">Loading attendance…</div>}
    </div>
    <div className="admin-attendance-pagination"><span>Page {page + 1} · up to 25 records</span><div><button type="button" className="ghost-button compact" disabled={page === 0 || loading} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</button><button type="button" className="ghost-button compact" disabled={!nextCursor || loading} onClick={goNext}>Next</button></div></div>
  </div>;
}

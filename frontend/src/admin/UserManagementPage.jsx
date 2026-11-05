import { useMemo, useState } from "react";
import { Search, RotateCcw, Download, Trash2, UserRoundCheck, Users, UserX } from "lucide-react";
import { deleteUser, updateUser } from "../../backendApi.js";
import "./userManagementPage.css";

const isInactive = (user) => String(user?.status || "Active").trim().toLowerCase() === "inactive";
const idOf = (user) => String(user?._id || user?.id || "");

export default function UserManagementPage({ users = [], onUsersChange = () => {} }) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [message, setMessage] = useState("");
  const counts = useMemo(() => ({
    all: users.length,
    active: users.filter((user) => !isInactive(user)).length,
    inactive: users.filter(isInactive).length,
  }), [users]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => (tab === "all" || (tab === "active" ? !isInactive(user) : isInactive(user)))
      && (!q || [user.name, user.username, user.email, user.phone, user.role, user.dept, user.department, idOf(user)].some((value) => String(value || "").toLowerCase().includes(q))))
      .slice(0, pageSize);
  }, [users, tab, query, pageSize]);

  async function toggleStatus(user) {
    const id = idOf(user);
    if (!id) return setMessage("This user has no account ID and cannot be updated.");
    const status = isInactive(user) ? "Active" : "Inactive";
    setMessage("");
    try {
      const saved = await updateUser(id, { status });
      onUsersChange((current) => current.map((item) => idOf(item) === id ? { ...item, ...saved, status } : item));
    } catch (error) { setMessage(error.message || "Unable to update user status."); }
  }

  async function removeUser(user) {
    const id = idOf(user);
    if (!id || !window.confirm(`Delete ${user.name || user.username || "this user"}'s account? This cannot be undone.`)) return;
    setMessage("");
    try {
      await deleteUser(id);
      onUsersChange((current) => current.filter((item) => idOf(item) !== id));
    } catch (error) { setMessage(error.message || "Unable to delete this user."); }
  }

  function exportCsv() {
    const fields = ["Username", "Email", "Role", "Status"];
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const content = [fields, ...rows.map((user) => [user.username || user.name, user.email, user.role || user.position, isInactive(user) ? "Inactive" : "Active"])].map((line) => line.map(quote).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    link.download = "users.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <section className="user-management-page">
    <div className="user-management-metrics">
      <article><strong>{counts.all}</strong><span>Total users</span><Users size={19} /></article>
      <article><strong>{counts.active}</strong><span>Active</span><UserRoundCheck size={19} /></article>
      <article><strong>{counts.inactive}</strong><span>Inactive</span><UserX size={19} /></article>
    </div>
    <section className="user-management-panel">
      <header className="user-management-heading"><div><h2>Active &amp; inactive users</h2><p>Search accounts, review status, or update access.</p></div>
        <div className="user-management-tabs" role="tablist" aria-label="Filter users by status">
          {[ ["all", `All users (${counts.all})`], ["active", `Active (${counts.active})`], ["inactive", `Inactive (${counts.inactive})`] ].map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "selected" : ""} onClick={() => setTab(key)}>{label}</button>)}
        </div>
      </header>
      <div className="user-management-toolbar">
        <label className="user-management-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, contact or other details..." /></label>
        <select aria-label="Users per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select>
        <button type="button" className="user-management-button primary" onClick={() => setMessage(`${rows.length} users shown.`)}>Search</button>
        <button type="button" className="user-management-button" onClick={() => { setQuery(""); setTab("all"); setPageSize(50); setMessage(""); }}><RotateCcw size={14} /> Reset</button>
        <button type="button" className="user-management-button export" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </div>
      {message && <p className="user-management-message" role="status">{message}</p>}
      <div className="user-management-table-wrap"><table><thead><tr><th>#</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{rows.map((user, index) => <tr key={idOf(user) || `${user.username}-${index}`}><td>{index + 1}</td><td><strong>{user.username || user.name || "—"}</strong></td><td>{user.email || "—"}</td><td>{user.role || user.position || "—"}</td><td><span className={`user-status ${isInactive(user) ? "inactive" : "active"}`}>{isInactive(user) ? "Inactive" : "Active"}</span></td><td className="user-management-actions"><button type="button" className="delete" onClick={() => removeUser(user)}><Trash2 size={14} /> Delete</button><button type="button" className="primary" onClick={() => toggleStatus(user)}>Change status</button></td></tr>)}
          {!rows.length && <tr><td colSpan="6" className="user-management-empty">No users match this view.</td></tr>}
        </tbody></table></div>
      <footer className="user-management-footer">Showing {rows.length} of {tab === "all" ? counts.all : counts[tab]} users</footer>
    </section>
  </section>;
}

import { useEffect, useMemo, useState } from "react";
import { Blocks, Plus, Search, Users, X } from "lucide-react";
import "./itAdminModule.css";

const STORAGE_KEY = "admin_department_management_v1";
const norm = (value) => String(value || "").trim().toLowerCase();
const userId = (user) => String(user?.id || user?._id || user?.uid || "");

function initialDepartments(users) {
  const names = [...new Set(users.map((user) => String(user.dept || user.department || "").trim()).filter(Boolean))];
  return names.map((name, index) => ({ id: `dept-${index}-${norm(name).replace(/[^a-z0-9]+/g, "-")}`, name, managerId: "", employeeIds: users.filter((user) => norm(user.dept || user.department) === norm(name)).map(userId), unassignedEmployeeIds: [], status: "Active" }));
}

function readDepartments() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(saved)) return { departments: saved, initialized: true };
  } catch { /* Use dashboard departments when local data is unavailable. */ }
  return { departments: [], initialized: false };
}

export default function DepartmentManagement({ users = [] }) {
  const employees = useMemo(() => users.filter((user) => !["student", "admin", "administrator", "super admin", "superadmin"].includes(norm(user.role))), [users]);
  const [storedState] = useState(readDepartments);
  const [departments, setDepartments] = useState(storedState.departments);
  const [initialized, setInitialized] = useState(storedState.initialized);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: "", managerId: "", status: "Active" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initialized || !users.length) return;
    setDepartments(initialDepartments(users));
    setInitialized(true);
  }, [initialized, users]);
  useEffect(() => {
    if (!initialized) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(departments)); }
    catch { setMessage("Department changes could not be saved in this browser."); }
  }, [departments, initialized]);
  const employeeDepartment = (employee) => {
    const id = userId(employee);
    if (departments.some((department) => (department.unassignedEmployeeIds || []).includes(id))) return null;
    const explicit = departments.find((department) => (department.employeeIds || []).includes(id));
    return explicit || departments.find((department) => norm(department.name) === norm(employee.dept || employee.department)) || null;
  };
  const filtered = departments.filter((department) => {
    const term = norm(query);
    const manager = employees.find((employee) => userId(employee) === department.managerId);
    const matchesText = !term || [department.name, manager?.name, manager?.username].some((value) => norm(value).includes(term));
    return matchesText && (statusFilter === "all" || norm(department.status) === statusFilter);
  });
  const activeCount = departments.filter((department) => norm(department.status) === "active").length;
  const assignedEmployees = employees.filter((employee) => employeeDepartment(employee)).length;
  const teamFor = (department) => employees.filter((employee) => employeeDepartment(employee)?.id === department.id || userId(employee) === department.managerId);

  function saveDepartment(event) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    if (departments.some((department) => norm(department.name) === norm(name))) {
      setMessage("A department with this name already exists.");
      return;
    }
    setDepartments((current) => [...current, { id: `dept-${Date.now()}`, ...draft, name, employeeIds: [], unassignedEmployeeIds: [] }]);
    setInitialized(true);
    setShowForm(false);
    setDraft({ name: "", managerId: "", status: "Active" });
    setMessage("Department created.");
  }

  function updateEmployeeDepartment(employee, nextId) {
    if (!employee) return;
    const id = userId(employee);
    setDepartments((current) => current.map((department) => {
      let employeeIds = (department.employeeIds || []).filter((employeeId) => employeeId !== id);
      let unassignedEmployeeIds = (department.unassignedEmployeeIds || []).filter((employeeId) => employeeId !== id);
      if (department.id === nextId) employeeIds = [...employeeIds, id];
      if (!nextId && current[0]?.id === department.id) unassignedEmployeeIds = [...unassignedEmployeeIds, id];
      return { ...department, employeeIds, unassignedEmployeeIds };
    }));
    setMessage(`${employee.name || "Employee"} reassigned.`);
  }

  return (
    <div className="it-admin-module department-module">
      <header className="it-admin-page-heading">
        <div><p className="eyebrow">PEOPLE &amp; TEAMS</p><h2>Department Management</h2><p>Organize teams, assign department managers, and keep employee ownership current.</p></div>
        <button type="button" className="primary-button" onClick={() => { setDraft({ name: "", managerId: "", status: "Active" }); setShowForm(true); }}><Plus size={16} /> Add Department</button>
      </header>

      <section className="it-admin-metrics department-metrics">
        <article className="it-admin-metric"><span>Total Departments</span><strong>{departments.length}</strong><small>Across the organization</small></article>
        <article className="it-admin-metric"><span>Active Departments</span><strong>{activeCount}</strong><small>Currently operating</small></article>
        <article className="it-admin-metric"><span>Assigned Employees</span><strong>{assignedEmployees}</strong><small>With a department</small></article>
      </section>

      {showForm && <form className="it-admin-panel department-form" onSubmit={saveDepartment}>
        <div className="it-admin-panel-heading"><h3>Create a department</h3><button type="button" className="icon-button" aria-label="Close form" onClick={() => { setShowForm(false); setDraft({ name: "", managerId: "", status: "Active" }); }}><X size={17} /></button></div>
        <div className="department-form-fields">
          <label>Department name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Finance" /></label>
          <label>Manager<select value={draft.managerId} onChange={(event) => setDraft({ ...draft, managerId: event.target.value })}><option value="">Unassigned</option>{employees.map((employee) => <option key={userId(employee)} value={userId(employee)}>{employee.name || employee.username || "Employee"}</option>)}</select></label>
          <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option>Active</option><option>Inactive</option></select></label>
          <div className="department-form-actions"><button type="button" className="secondary-button" onClick={() => { setShowForm(false); setDraft({ name: "", managerId: "", status: "Active" }); }}>Cancel</button><button type="submit" className="primary-button">Create department</button></div>
        </div>
      </form>}

      {message && <p className="department-message" role="status">{message}</p>}
      <section className="it-admin-panel">
        <div className="it-admin-panel-heading it-admin-toolbar"><div><h3>Departments and teams</h3><small>{filtered.length} departments</small></div><div className="department-filters"><label className="department-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search departments or managers" /></label><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div>
        {filtered.length === 0 ? <div className="it-admin-empty">No departments match this view. Add a department to get started.</div> : <div className="department-grid">{filtered.map((department) => {
          const manager = employees.find((employee) => userId(employee) === department.managerId);
          const team = teamFor(department);
          const expanded = selectedId === department.id;
          return <article className={`department-card ${expanded ? "is-selected" : ""}`} key={department.id}>
            <div className="department-card-head"><span className="department-icon"><Blocks size={18} /></span><span className={`department-status ${norm(department.status)}`}>{department.status}</span></div>
            <h4>{department.name}</h4><p className="department-manager">Manager <strong>{manager?.name || manager?.username || "Unassigned"}</strong></p>
            <button type="button" className="department-team-toggle" onClick={() => setSelectedId(expanded ? "" : department.id)}><Users size={16} />{team.length} {team.length === 1 ? "employee" : "employees"}<span>{expanded ? "Hide team" : "View team"}</span></button>
            {expanded && <div className="department-team-list">{team.length ? team.map((employee) => <div className="department-team-row" key={userId(employee)}><span className="department-avatar">{String(employee.name || "?").trim().slice(0, 1).toUpperCase()}</span><span><strong>{employee.name || employee.username}</strong><small>{employee.position || employee.role || "Employee"}</small></span><span className={`department-status ${norm(employee.status || "active")}`}>{employee.status || "Active"}</span><button type="button" className="department-unassign" aria-label={`Remove ${employee.name || employee.username} from ${department.name}`} onClick={() => updateEmployeeDepartment(employee, "")}><X size={14} /></button></div>) : <p className="department-no-team">No employees assigned yet.</p>}
              <label className="department-add-employee">Add employee<select value="" onChange={(event) => updateEmployeeDepartment(employees.find((employee) => userId(employee) === event.target.value), department.id)}><option value="">Choose employee…</option>{employees.filter((employee) => employeeDepartment(employee)?.id !== department.id).map((employee) => <option key={userId(employee)} value={userId(employee)}>{employee.name || employee.username}</option>)}</select></label>
            </div>}
          </article>;
        })}</div>}
      </section>

      <section className="it-admin-panel">
        <div className="it-admin-panel-heading"><div><h3>Employee assignments</h3><small>Reassign an employee from this list.</small></div></div>
        {employees.length ? <div className="it-admin-table-wrap"><table className="it-admin-table"><thead><tr><th>Employee</th><th>Role</th><th>Status</th><th>Department</th></tr></thead><tbody>{employees.filter((employee) => !query || [employee.name, employee.username, employee.email, employee.department, employee.dept].some((value) => norm(value).includes(norm(query)))).map((employee) => { const assigned = employeeDepartment(employee); return <tr key={userId(employee)}><td><strong>{employee.name || employee.username || "Employee"}</strong><br /><small>{employee.email || employee.username || ""}</small></td><td>{employee.position || employee.role || "Employee"}</td><td><span className={`department-status ${norm(employee.status || "active")}`}>{employee.status || "Active"}</span></td><td><select aria-label={`Department for ${employee.name || employee.username}`} value={assigned?.id || ""} onChange={(event) => updateEmployeeDepartment(employee, event.target.value)}><option value="">Unassigned</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></td></tr>; })}</tbody></table></div> : <div className="it-admin-empty">No employees are available in the dashboard directory.</div>}
      </section>
    </div>
  );
}

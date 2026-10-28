import { useRef, useState } from "react";
import { Plus, Pencil, Trash2, CalendarClock, ClipboardCheck, Search, X, Check } from "lucide-react";
import { PLANNER_TYPES, ONBOARDING_STEPS, plannerKey, readPlanner, plannerStatus, togglePlannerStep, filterPlanner, taskToPlanner, plannerToTask } from "./hrPlannerModel";
import "./hrPlanner.css";

const todayDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const blank = (type = "Task") => ({ title: "", type, employeeId: "", due: "", notes: "", status: "Pending", priority: "Medium", reminder: "None" });
const displayDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function HrPlanner({ employees, profile, tasks = [], updateTasks }) {
  const key = plannerKey(profile);
  const [initial] = useState(() => {
    try { return readPlanner(window.localStorage, key); }
    catch { return { items: [], error: "Browser storage is unavailable. Changes will only last while this tab is open." }; }
  });
  const [plannerItems, setItems] = useState(initial.items);
  const items = [...tasks.map(taskToPlanner), ...plannerItems];
  const [error, setError] = useState(initial.error);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(null);
  const [filters, setFilters] = useState({ query: "", type: "All", status: "Open" });
  const [deleted, setDeleted] = useState(null);
  const editor = useRef(null);
  const today = todayDate();
  const visible = filterPlanner(items, filters, today);
  const employeeName = (id) => employees.find((employee) => String(employee.id) === id)?.name || "Employee no longer available";

  function save(next, message) {
    const nextPlanner = next.filter((item) => item.type !== "Task");
    const nextTasks = next.filter((item) => item.type === "Task").map((item) => plannerToTask(item, employees));
    if (JSON.stringify(nextTasks) !== JSON.stringify(tasks)) updateTasks(nextTasks);
    setItems(nextPlanner);
    try {
      window.localStorage.setItem(key, JSON.stringify(nextPlanner));
      setError("");
      setNotice(message);
    } catch {
      setError("Could not save to this browser. Your latest changes are only available until you leave this tab; free up browser storage and try again.");
      setNotice("");
    }
  }
  function openEditor(value) {
    setForm(value);
    setNotice("");
    requestAnimationFrame(() => {
      editor.current?.scrollIntoView({ block: "nearest" });
      editor.current?.querySelector("input")?.focus();
    });
  }
  function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    if (form.type === "Task" && !employees.some((employee) => String(employee.id) === form.employeeId && employee.status === "active")) {
      setError("Select an active employee to assign this task.");
      return;
    }
    const existing = items.find((item) => item.id === form.id);
    const item = {
      ...form, title: form.title.trim(), notes: form.notes.trim(),
      id: existing?.id || crypto.randomUUID(), done: form.type === "Task" ? form.status === "Done" : existing?.done || false,
      steps: form.type === "Onboarding" ? existing?.steps || ONBOARDING_STEPS.map((label) => ({ label, done: false })) : [],
    };
    save(existing ? items.map((entry) => entry.id === item.id ? item : entry) : [...items, item], existing ? "Workspace item updated." : "Workspace item added.");
    setFilters({ query: "", type: "All", status: "All" });
    setForm(null);
  }
  function complete(item) {
    const done = !item.done;
    save(items.map((entry) => entry.id === item.id ? { ...entry, done, steps: entry.steps.map((step) => ({ ...step, done })) } : entry), done ? "Marked complete." : "Item reopened.");
  }
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return <section className="hr-planner">
    <div className="hr-planner-heading"><div><h2>One workspace for every employee</h2><p>Assign tasks to CRM executives or any employee, manage onboarding, and keep reminders and notes. Saved in this browser only; no notifications are sent.</p></div><button className="hr-btn" onClick={() => openEditor(blank())}><Plus size={16} /> Add task / item</button></div>
    <div className="hr-planner-stats">
      {[["Open items", items.filter((item) => !item.done).length, "Open"], ["Due today", items.filter((item) => plannerStatus(item, today) === "Due today").length, "Due today"], ["Overdue", items.filter((item) => plannerStatus(item, today) === "Overdue").length, "Overdue"], ["Completed", items.filter((item) => item.done).length, "Completed"]].map(([label, count, status]) => <button className="hr-card" key={label} onClick={() => setFilters({ query: "", type: "All", status })}><span>{label}</span><strong>{count}</strong></button>)}
    </div>
    {error && <p className="hr-planner-error" role="alert">{error}</p>}
    {notice && <p className="hr-planner-notice" role="status">{notice}</p>}
    {deleted && <div className="hr-planner-undo"><span>Removed “{deleted.title}”.</span><button className="hr-ghost" onClick={() => { save([...items, deleted], "Item restored."); setDeleted(null); setFilters({ query: "", type: "All", status: "All" }); }}>Undo</button></div>}
    {form && <form ref={editor} className="hr-card hr-planner-editor" onSubmit={submit}>
      <div className="hr-planner-section-heading"><h3>{form.id ? "Edit workspace item" : "New task or planner item"}</h3><button type="button" aria-label="Close editor" onClick={() => setForm(null)}><X size={18} /></button></div>
      <div className="hr-planner-fields">
        <label className="hr-f hr-planner-wide"><span>Title *</span><input required maxLength={120} value={form.title} onChange={setField("title")} placeholder="e.g. Prepare orientation for a new joiner" /></label>
        <label className="hr-f"><span>Type</span><select value={form.type} disabled={!!form.id} onChange={setField("type")}>{PLANNER_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="hr-f"><span>Employee {form.type === "Task" ? "*" : "(optional)"}</span><select required={form.type === "Task"} value={form.employeeId} onChange={setField("employeeId")}><option value="">{form.type === "Task" ? "Select any active employee" : "General / no employee"}</option>{form.employeeId && !employees.some((employee) => String(employee.id) === form.employeeId) && <option value={form.employeeId}>Employee no longer available</option>}{employees.map((employee) => <option key={employee.id} value={employee.id} disabled={form.type === "Task" && employee.status !== "active"}>{employee.name} · {employee.dept} · {employee.id}{employee.status !== "active" ? " (inactive)" : ""}</option>)}</select></label>
        {form.type === "Task" && <>
          <label className="hr-f"><span>Status</span><select value={form.status || "Pending"} onChange={setField("status")}>{["Pending", "In Progress", "Done"].map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="hr-f"><span>Priority</span><select value={form.priority || "Medium"} onChange={setField("priority")}>{["Low", "Medium", "High"].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
          <label className="hr-f"><span>Reminder preference</span><select value={form.reminder || "None"} onChange={setField("reminder")}>{["None", "Daily", "Weekly", "Before due date"].map((reminder) => <option key={reminder}>{reminder}</option>)}</select></label>
        </>}
        <label className="hr-f"><span>Due date {form.type === "Reminder" ? "*" : "(optional)"}</span><input type="date" required={form.type === "Reminder"} value={form.due} onChange={setField("due")} /></label>
        <label className="hr-f hr-planner-wide"><span>Notes</span><textarea rows={3} maxLength={3000} value={form.notes} onChange={setField("notes")} placeholder="Add details or preparation notes…" /></label>
      </div>
      {form.type === "Onboarding" && !form.id && <p className="hr-planner-muted">Includes a checklist for documents, workstation, orientation, and team introductions.</p>}
      <div className="hr-planner-editor-actions"><button className="hr-ghost" type="button" onClick={() => setForm(null)}>Cancel</button><button className="hr-btn" type="submit" disabled={!form.title.trim()}><Check size={15} /> Save item</button></div>
    </form>}
    <div className="hr-planner-filters">
      <label className="hr-planner-search"><Search size={16} /><input aria-label="Search planner" placeholder="Search titles and notes…" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /></label>
      <select aria-label="Filter by type" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>{["All", ...PLANNER_TYPES].map((type) => <option key={type} value={type}>{type === "All" ? "All types" : type}</option>)}</select>
      <select aria-label="Filter by employee" value={filters.employeeId || ""} onChange={(event) => setFilters({ ...filters, employeeId: event.target.value })}><option value="">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.dept}</option>)}</select>
      <select aria-label="Filter by status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>{["All", "Open", "Due today", "Overdue", "Completed"].map((status) => <option key={status} value={status}>{status === "All" ? "All statuses" : status}</option>)}</select>
      <span className="hr-planner-muted" aria-live="polite">{visible.length} of {items.length} items</span>
    </div>
    {visible.length ? <div className="hr-planner-grid">{visible.map((item) => {
      const status = plannerStatus(item, today);
      return <article className="hr-card hr-planner-item" key={item.id}>
        <div className="hr-planner-section-heading"><span className="hr-planner-type"><ClipboardCheck size={15} /> {item.type}</span><span className={`hr-planner-status status-${status.toLowerCase().replace(" ", "-")}`}>{status}</span></div>
        <h3>{item.title}</h3>
        {item.employeeId && <p className="hr-planner-muted">{employeeName(item.employeeId)}</p>}
        {item.type === "Task" && <p className="hr-planner-muted">{item.status} · {item.priority} priority · Reminder: {item.reminder || "None"}</p>}
        {item.due && <p className="hr-planner-due"><CalendarClock size={14} /> {displayDate(item.due)}</p>}
        {item.notes && <p className="hr-planner-notes">{item.notes}</p>}
        {item.steps.length > 0 && <div className="hr-planner-checklist"><div className="hr-planner-muted">{item.steps.filter((step) => step.done).length} of {item.steps.length} steps complete</div><progress aria-label={`Onboarding progress for ${item.title}`} max={item.steps.length} value={item.steps.filter((step) => step.done).length} />{item.steps.map((step, index) => <label key={step.label}><input type="checkbox" checked={step.done} onChange={() => save(items.map((entry) => entry.id === item.id ? togglePlannerStep(entry, index) : entry), "Checklist updated.")} /><span>{step.label}</span></label>)}</div>}
        <div className="hr-planner-item-actions"><button className="hr-ghost" onClick={() => complete(item)}>{item.done ? "Reopen" : "Mark complete"}</button><button className="hr-ghost" aria-label={`Edit ${item.title}`} onClick={() => openEditor({ ...item })}><Pencil size={14} /></button><button className="hr-ghost" aria-label={`Delete ${item.title}`} onClick={() => { save(items.filter((entry) => entry.id !== item.id), "Item removed. You can undo this below."); setDeleted(item); if (form?.id === item.id) setForm(null); }}><Trash2 size={14} /></button></div>
      </article>;
    })}</div> : <div className="hr-card hr-planner-empty"><ClipboardCheck size={30} /><h3>{items.length ? "No matching items" : "Make room for a smoother workday"}</h3><p>{items.length ? "Try a different type, status, or search." : "Create your first onboarding checklist, reminder, or HR note."}</p><button className="hr-ghost" onClick={() => items.length ? setFilters({ query: "", type: "All", status: "All" }) : openEditor(blank())}>{items.length ? "Clear filters" : "Create first item"}</button></div>}
  </section>;
}

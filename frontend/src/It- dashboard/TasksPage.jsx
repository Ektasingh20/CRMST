import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Search } from "lucide-react";
import { createTask, fetchTasks, updateTask } from "../../backendApi.js";
import { filterTasks, formatITDate, getTaskStatusCounts } from "./workPageModel.js";

const EMPTY_FORM = { title: "", description: "", priority: "Medium", dueDate: "" };
const STATUS_OPTIONS = [
  { value: "To Do", label: "To Do" },
  { value: "In Progress", label: "In Progress" },
  { value: "Done", label: "Completed" },
];

function taskStatus(status) {
  const value = String(status || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (["completed", "complete", "done"].includes(value)) return "Completed";
  if (["in progress", "inprogress", "started"].includes(value)) return "In Progress";
  return "To Do";
}

function taskRecords(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.tasks)) return response.tasks;
  throw new Error("The tasks service returned an unexpected response.");
}

function taskEmployeeId(task) {
  return String(task.assigneeId || task.assignedToId || task.assignedTo || "");
}

function canUpdateTask(task, user) {
  const role = String(user?.role || user?.appRole || "").trim().toLowerCase();
  const userId = String(user?.id || user?._id || "");
  return ["admin", "hr", "super admin"].includes(role)
    || (role === "crm executive" && userId && (taskEmployeeId(task) === userId || String(task.createdById || "") === userId));
}

export default function TasksPage({ user, notify }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("All priorities");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  useEffect(() => {
    let active = true;
    fetchTasks()
      .then((response) => { if (active) setTasks(taskRecords(response)); })
      .catch((error) => { if (active) notify(error.message || "Could not load tasks."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [notify]);

  const counts = useMemo(() => getTaskStatusCounts(tasks), [tasks]);
  const visibleTasks = useMemo(() => filterTasks(tasks, {
    query, priority, from: createdFrom, to: createdTo,
  }), [tasks, query, priority, createdFrom, createdTo]);

  const submitTask = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      notify("Enter a task title.");
      return;
    }
    setSaving(true);
    try {
      const saved = await createTask({
        id: crypto.randomUUID(),
        assigneeId: String(user?.id || user?._id || ""),
        assignee: user?.name || user?.username || "",
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        status: "To Do",
        dueDate: form.dueDate,
      });
      if (!saved || typeof saved !== "object") throw new Error("The task was not returned by the service.");
      setTasks((current) => [saved, ...current.filter((task) => task.id !== saved.id)]);
      setForm(EMPTY_FORM);
      setFormOpen(false);
      notify("Task created.");
    } catch (error) {
      notify(error.message || "Could not create task.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (task, status) => {
    try {
      const saved = await updateTask(task.id, { status });
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...saved, status } : item));
    } catch (error) {
      notify(error.message || "Could not update task status.");
    }
  };

  return (
    <div className="it-work-page it-tasks-page">
      <section className="it-work-card it-task-card">
        <div className="it-work-card-heading">
          <div><h2>My tasks</h2><p>Tasks assigned to you and tasks you created</p></div>
          <button type="button" className="it-work-primary-button" onClick={() => setFormOpen(true)}><Plus size={16} /> New Task</button>
        </div>
        <div className="it-task-summary">
          {[["All tasks", counts.all], ["To do", counts["To Do"]], ["In progress", counts["In Progress"]], ["Completed", counts.Completed]].map(([label, count]) => (
            <div className={`it-task-stat ${label.toLowerCase().replaceAll(" ", "-")}`} key={label}><span>{label}</span><strong>{count}</strong></div>
          ))}
        </div>
        <div className="it-task-filters">
          <label className="it-task-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" aria-label="Search tasks" /></label>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter by priority">
            {["All priorities", "High", "Medium", "Low"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="it-task-date-filter"><CalendarDays size={15} /><span>Created date</span>
            <label><small>From</small><input type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} aria-label="Created from" /></label>
            <label><small>To</small><input type="date" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} aria-label="Created to" /></label>
            <button type="button" onClick={() => { setCreatedFrom(""); setCreatedTo(""); setPriority("All priorities"); setQuery(""); }}>Reset</button>
          </div>
        </div>
        <div className="it-task-table-wrap">
          <table className="it-work-table it-task-table">
            <thead><tr>{["Sr No", "Task", "Description", "Assignee", "Assigned by", "Priority", "Status", "Created date", "Due date"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
            <tbody>
              {visibleTasks.map((task, index) => {
                const status = taskStatus(task.status);
                const canUpdate = canUpdateTask(task, user);
                return <tr key={task.id || `${task.title}-${index}`}>
                  <td>{index + 1}</td>
                  <td><strong>{task.title || task.task || task.name || "Untitled task"}</strong></td>
                  <td>{task.description || task.desc || "—"}</td>
                  <td>{task.assignee || task.assignedToName || task.assigneeName || task.assignedTo || user?.name || "—"}</td>
                  <td>{task.createdBy || task.assignedByName || task.createdByName || task.assignedBy || "—"}</td>
                  <td><span className={`it-task-priority ${String(task.priority || "Medium").toLowerCase()}`}>{task.priority || "Medium"}</span></td>
                  <td><select className={`it-task-status ${status.toLowerCase().replaceAll(" ", "-")}`} value={status === "Completed" ? "Done" : status} disabled={!canUpdate} title={canUpdate ? "Update task status" : "Your current role cannot update shared task status"} onChange={(event) => changeStatus(task, event.target.value)} aria-label={`Status for ${task.title || task.name || "task"}`}>
                    {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select></td>
                  <td>{formatITDate(task.createdAt || task.createdDate || task.createdOn)}</td>
                  <td>{formatITDate(task.dueDate || task.due)}</td>
                </tr>;
              })}
              {!loading && !visibleTasks.length && <tr><td className="it-work-empty" colSpan={9}>{tasks.length ? "No tasks match these filters." : "No tasks assigned yet."}</td></tr>}
              {loading && <tr><td className="it-work-empty" colSpan={9}>Loading tasks…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen && <div className="it-work-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
        <form className="it-work-modal" role="dialog" aria-modal="true" aria-labelledby="it-task-form-title" onSubmit={submitTask}>
          <div className="it-work-modal-heading"><div><h2 id="it-task-form-title">New Task</h2><p>Create a task for your account.</p></div><button type="button" aria-label="Close" onClick={() => setFormOpen(false)}>×</button></div>
          <label><span>Task</span><input required maxLength={200} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
          <label><span>Description</span><textarea rows={3} maxLength={5000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <div className="it-task-form-row">
            <label><span>Priority</span><select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label><span>Due date</span><input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
          </div>
          <div className="it-work-modal-actions"><button type="button" className="it-work-secondary-button" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className="it-work-primary-button" disabled={saving}>{saving ? "Saving…" : "Create Task"}</button></div>
        </form>
      </div>}
    </div>
  );
}

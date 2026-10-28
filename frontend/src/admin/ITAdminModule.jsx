import { useEffect, useMemo, useState } from "react";
import { createProject, fetchAttendance, fetchProjects, fetchTasks, fetchUsers, updateProject, updateTask } from "../../backendApi.js";
import CreateProjectForm from "./CreateProjectForm.jsx";
import "./itAdminModule.css";

const PAGE_TITLES = {
  "it-admin-dashboard": "IT Dashboard",
  "it-admin-create-project": "Create Project",
  "it-admin-assign-projects": "Assign Projects",
  "it-admin-projects": "All Projects",
  "it-admin-new-projects": "New Projects",
  "it-admin-active-projects": "Active Projects",
  "it-admin-completed-projects": "Completed Projects",
  "it-admin-it-employees": "IT Employees",
  "it-admin-workload": "Employee Workload",
  "it-admin-tasks": "All Tasks",
  "it-admin-pending-tasks": "Pending Tasks",
  "it-admin-overdue-tasks": "Overdue Tasks",
  "it-admin-project-reports": "Project Reports",
  "it-admin-employee-performance": "Employee Performance",
  "it-admin-delivery-reports": "Project Delivery Reports",
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const getId = (row) => String(row?.id || row?._id || "");
const getDueDate = (row) => String(row?.expectedDelivery || row?.dueDate || row?.due || "").slice(0, 10);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const isOpenTask = (task) => !["done", "completed", "cancelled"].includes(normalize(task.status));

function isDepartmentUser(user, department) {
  return [user?.dept, user?.department, user?.role].some((value) => normalize(value) === department);
}

function taskBelongsToDepartment(task, users, department) {
  if (normalize(task.dept || task.department) === department) return true;
  const assignedUser = users.find((user) => (
    String(user.id || user._id || "") === String(task.assigneeId || "")
    || normalize(user.name) === normalize(task.assignee || task.emp)
    || normalize(user.username) === normalize(task.assignee || "")
  ));
  return Boolean(assignedUser && isDepartmentUser(assignedUser, department));
}

function taskAssignedToEmployee(task, employee) {
  const assignee = normalize(task.assignee || task.emp);
  return String(task.assigneeId || "") === getId(employee)
    || (assignee && [employee.name, employee.username].some((value) => normalize(value) === assignee));
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Metric({ label, value, note }) {
  return <article className="it-admin-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

function Empty({ children = "No database records match this view." }) {
  return <div className="it-admin-empty">{children}</div>;
}

function RecordsTable({ columns, rows, empty }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="it-admin-table-wrap">
      <table className="it-admin-table">
        <thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.id}>
            {columns.map((column) => <td key={column.label}>{column.render ? column.render(row) : row[column.key] || "—"}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function ITAdminModule({
  page,
  users = [],
  tasks = [],
  projects = [],
  serviceOptions = [],
  onProjectsChange,
  onTasksChange,
  onUsersChange,
  onNavigate,
  isAdmin,
}) {
  const [projectRows, setProjectRows] = useState(projects);
  const [taskRows, setTaskRows] = useState(tasks);
  const [userRows, setUserRows] = useState(users);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [reviewProject, setReviewProject] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: "In Progress",
    progress: "0",
    remarks: "",
    completionDate: today(),
    allTasksCompleted: false,
  });

  useEffect(() => setProjectRows(projects), [projects]);
  useEffect(() => setTaskRows(tasks), [tasks]);
  useEffect(() => setUserRows(users), [users]);

  async function refreshData(showLoading = true) {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    const [projectResult, taskResult, userResult, attendanceResult] = await Promise.allSettled([
      fetchProjects(),
      fetchTasks(),
      fetchUsers(),
      fetchAttendance(),
    ]);
    const failures = [];
    if (projectResult.status === "fulfilled" && Array.isArray(projectResult.value)) {
      setProjectRows(projectResult.value);
      onProjectsChange?.(projectResult.value);
    } else {
      failures.push(`Projects: ${projectResult.reason?.message || "invalid response"}`);
    }
    if (taskResult.status === "fulfilled" && Array.isArray(taskResult.value)) {
      setTaskRows(taskResult.value);
      onTasksChange?.(taskResult.value);
    } else {
      failures.push(`Tasks: ${taskResult.reason?.message || "invalid response"}`);
    }
    if (userResult.status === "fulfilled" && Array.isArray(userResult.value)) {
      setUserRows(userResult.value);
      onUsersChange?.(userResult.value);
    } else {
      failures.push(`Users: ${userResult.reason?.message || "invalid response"}`);
    }
    if (attendanceResult.status === "fulfilled" && Array.isArray(attendanceResult.value)) {
      setAttendanceRows(attendanceResult.value);
    } else {
      failures.push(`Attendance: ${attendanceResult.reason?.message || "invalid response"}`);
    }
    setLoadError(failures.join(" "));
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!isAdmin) return;
    refreshData();
  }, [isAdmin]);

  const itEmployees = useMemo(() => userRows.filter((user) => isDepartmentUser(user, "it")), [userRows]);
  const itTasks = useMemo(() => taskRows.filter((task) => taskBelongsToDepartment(task, userRows, "it")), [taskRows, userRows]);
  const openItTasks = itTasks.filter(isOpenTask);
  const overdueItTasks = openItTasks.filter((task) => getDueDate(task) && getDueDate(task) < today());
  const newProjects = projectRows.filter((project) => normalize(project.status) === "new");
  const activeProjects = projectRows.filter((project) => normalize(project.status) === "active");
  const completedProjects = projectRows.filter((project) => normalize(project.status) === "completed");
  const delayedProjects = activeProjects.filter((project) => getDueDate(project) && getDueDate(project) < today());
  const deadlineLimit = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const todayTasks = openItTasks.filter((task) => getDueDate(task) === today());
  const upcomingDeadlines = [
    ...projectRows.filter((project) => !["completed", "rejected"].includes(normalize(project.status))
      && getDueDate(project) >= today() && getDueDate(project) <= deadlineLimit)
      .map((project) => ({ id: `project-${getId(project)}`, title: project.name || project.projectName || "Project", assignee: project.assignedEmployeeName || "Unassigned", due: getDueDate(project), kind: "Project" })),
    ...openItTasks.filter((task) => getDueDate(task) >= today() && getDueDate(task) <= deadlineLimit)
      .map((task) => ({ id: `task-${getId(task)}`, title: task.title || "Task", assignee: task.assignee || task.emp || "Unassigned", due: getDueDate(task), kind: "Task" })),
  ].sort((left, right) => left.due.localeCompare(right.due)).slice(0, 8);
  const todayAttendance = attendanceRows.filter((record) => String(record.date || "").slice(0, 10) === today());
  const statusCounts = [
    ["New", newProjects.length],
    ["Active", activeProjects.length],
    ["Completed", completedProjects.length],
    ["Rejected", projectRows.filter((project) => normalize(project.status) === "rejected").length],
  ];
  const scopedTasks = itTasks;
  const visibleProjects = useMemo(() => {
    const text = normalize(query);
    return projectRows.filter((project) => {
      const matchesText = !text || [
        project.name, project.projectName, project.client, project.assignedEmployeeName,
        project.status, project.priority, project.service,
      ].some((value) => normalize(value).includes(text));
      const matchesStatus = statusFilter === "all" || normalize(project.status) === statusFilter;
      const matchesEmployee = employeeFilter === "all" || String(project.assignedEmployeeId || "") === employeeFilter;
      return matchesText && matchesStatus && matchesEmployee;
    });
  }, [projectRows, query, statusFilter, employeeFilter]);
  const filteredTasks = useMemo(() => {
    const text = normalize(query);
    return scopedTasks.filter((task) => {
      const due = getDueDate(task);
      const matchesText = !text || [task.title, task.description, task.assignee, task.emp, task.status].some((value) => normalize(value).includes(text));
      const matchesStatus = statusFilter === "all" || normalize(task.status) === statusFilter;
      const matchesEmployee = employeeFilter === "all" || String(task.assigneeId || "") === employeeFilter;
      const matchesPage = page === "it-admin-pending-tasks" ? isOpenTask(task)
        : page === "it-admin-overdue-tasks" ? isOpenTask(task) && due && due < today()
          : true;
      return matchesText && matchesStatus && matchesEmployee && matchesPage;
    });
  }, [scopedTasks, query, statusFilter, employeeFilter, page]);
  const filteredEmployees = itEmployees;

  async function createAssignedProject(project) {
    setActionError("");
    const saved = await createProject(project);
    const next = [saved, ...projectRows.filter((row) => getId(row) !== getId(saved))];
    setProjectRows(next);
    onProjectsChange?.(next);
    setNotice("Project created and assigned.");
    onNavigate?.("it-admin-projects");
    return saved;
  }

  async function reviewNewProject(project, action) {
    setUpdatingId(getId(project));
    setActionError("");
    try {
      const saved = await updateProject(project, { action });
      const next = projectRows.map((row) => getId(row) === getId(saved) ? saved : row);
      setProjectRows(next);
      onProjectsChange?.(next);
      setNotice(`Project ${action === "accept" ? "accepted" : "rejected"}.`);
    } catch (error) {
      setActionError(error.message || "Project review failed.");
    } finally {
      setUpdatingId("");
    }
  }

  async function saveProjectReview(event) {
    event.preventDefault();
    if (!reviewProject || updatingId) return;
    const progress = Number(reviewForm.progress);
    if (!reviewForm.remarks.trim()) {
      setActionError("Add review remarks before saving.");
      return;
    }
    if (reviewForm.status === "Completed" && (!reviewForm.completionDate || !reviewForm.allTasksCompleted)) {
      setActionError("Confirm all assigned tasks are complete and enter the completion date.");
      return;
    }
    setUpdatingId(getId(reviewProject));
    setActionError("");
    try {
      const saved = await updateProject(reviewProject, {
        update: {
          status: reviewForm.status,
          progress: reviewForm.status === "Completed" ? 100 : progress,
          remarks: reviewForm.remarks.trim(),
          completionDate: reviewForm.status === "Completed" ? reviewForm.completionDate : "",
          allTasksCompleted: reviewForm.status === "Completed" && reviewForm.allTasksCompleted,
        },
      });
      const next = projectRows.map((row) => getId(row) === getId(saved) ? saved : row);
      setProjectRows(next);
      onProjectsChange?.(next);
      setReviewProject(null);
      setNotice("Project status and review remarks saved.");
    } catch (error) {
      setActionError(error.message || "Project review failed.");
    } finally {
      setUpdatingId("");
    }
  }

  async function saveTaskStatus(task, status) {
    setUpdatingId(getId(task));
    setActionError("");
    try {
      const saved = await updateTask(getId(task), { status });
      const next = taskRows.map((row) => getId(row) === getId(saved) ? saved : row);
      setTaskRows(next);
      onTasksChange?.(next);
      setNotice("Task status updated.");
    } catch (error) {
      setActionError(error.message || "Task status could not be updated.");
    } finally {
      setUpdatingId("");
    }
  }

  function exportProjects(rows = visibleProjects, filename = "it-project-report.csv") {
    downloadCsv(filename, [
      ["Project", "Client", "Assigned employee", "Status", "Priority", "Start date", "Due date", "Progress"],
      ...rows.map((project) => [
        project.name || project.projectName, project.client, project.assignedEmployeeName,
        project.status, project.priority, project.startDate, getDueDate(project), project.progress,
      ]),
    ]);
  }

  function exportEmployees(rows = filteredEmployees, filename = "it-employee-report.csv") {
    downloadCsv(filename, [
      ["Employee", "Username", "Role", "Department", "Assigned projects", "Open tasks", "Overdue tasks"],
      ...rows.map((employee) => {
        const id = getId(employee);
        const assignedProjects = projectRows.filter((project) => String(project.assignedEmployeeId || "") === id);
        const employeeTasks = itTasks.filter((task) => taskAssignedToEmployee(task, employee));
        return [
          employee.name, employee.username, employee.role, employee.dept || employee.department,
          assignedProjects.length, employeeTasks.filter(isOpenTask).length,
          employeeTasks.filter((task) => isOpenTask(task) && getDueDate(task) && getDueDate(task) < today()).length,
        ];
      }),
    ]);
  }

  if (!isAdmin) {
    return <section className="it-admin-panel"><h2>Admin access required</h2><p>This module is available only to Admin accounts.</p></section>;
  }

  const title = PAGE_TITLES[page] || PAGE_TITLES["it-admin-dashboard"];
  const projectPages = ["it-admin-projects", "it-admin-new-projects", "it-admin-active-projects", "it-admin-completed-projects", "it-admin-project-reports", "it-admin-delivery-reports"];
  const employeePages = ["it-admin-it-employees", "it-admin-workload", "it-admin-employee-performance"];
  const taskPages = ["it-admin-tasks", "it-admin-pending-tasks", "it-admin-overdue-tasks"];

  return (
    <div className="it-admin-module">
      <header className="it-admin-page-heading">
        <div><p className="eyebrow">IT & OPERATIONS OVERSIGHT</p><h2>{title}</h2><p>Live records loaded through the existing Admin-authenticated APIs.</p></div>
        <button type="button" className="primary-button" onClick={() => refreshData(false)} disabled={refreshing}>{refreshing ? "Refreshing..." : "Refresh data"}</button>
      </header>
      {loadError && <p className="it-admin-error" role="alert">{loadError}</p>}
      {actionError && <p className="it-admin-error" role="alert">{actionError}</p>}
      {notice && <p className="it-admin-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></p>}
      {loading ? <div className="it-admin-panel"><Empty>Loading records from the database...</Empty></div> : (
        <>
          {page === "it-admin-create-project" || page === "it-admin-assign-projects" ? (
            <CreateProjectForm users={userRows} projects={projectRows} serviceOptions={serviceOptions} onCreate={createAssignedProject} />
          ) : null}

          {page === "it-admin-dashboard" ? (
            <>
              <section className="it-admin-metrics">
                <Metric label="IT employees" value={itEmployees.length} />
                <Metric label="Projects" value={projectRows.length} />
                <Metric label="Active projects" value={activeProjects.length} />
                <Metric label="Pending assignments" value={newProjects.length} />
                <Metric label="Open IT bugs" value="Unavailable" note="No Admin-authenticated bug API" />
                <Metric label="Overdue IT tasks" value={overdueItTasks.length} />
              </section>
              <section className="it-admin-dashboard-grid">
                <article className="it-admin-panel">
                  <div className="it-admin-panel-heading"><h3>Project status</h3></div>
                  <div className="it-admin-status-chart">{statusCounts.map(([status, count]) => (
                    <div className="it-admin-status-row" key={status}><span>{status}</span><div><i style={{ width: `${projectRows.length ? Math.max(count / projectRows.length * 100, count ? 3 : 0) : 0}%` }} /></div><strong>{count}</strong></div>
                  ))}</div>
                </article>
                <article className="it-admin-panel">
                  <div className="it-admin-panel-heading"><h3>Pending Admin actions</h3></div>
                  <div className="it-admin-action-list">
                    <button type="button" onClick={() => onNavigate?.("it-admin-new-projects")}><span>Projects awaiting assignment review</span><strong>{newProjects.length}</strong></button>
                    <button type="button" onClick={() => onNavigate?.("it-admin-overdue-tasks")}><span>Overdue IT tasks</span><strong>{overdueItTasks.length}</strong></button>
                    <button type="button" onClick={() => onNavigate?.("it-admin-active-projects")}><span>Delayed active projects</span><strong>{delayedProjects.length}</strong></button>
                  </div>
                  <p className="it-admin-muted">Bug and clarification data is unavailable through the current Admin-authenticated API.</p>
                </article>
                <article className="it-admin-panel">
                  <div className="it-admin-panel-heading"><h3>IT employee overview</h3><button type="button" className="it-admin-text-button" onClick={() => onNavigate?.("it-admin-workload")}>Workload</button></div>
                  {itEmployees.length ? itEmployees.slice(0, 6).map((employee) => {
                    const id = getId(employee);
                    const workload = projectRows.filter((project) => String(project.assignedEmployeeId || "") === id).length
                      + itTasks.filter((task) => taskAssignedToEmployee(task, employee) && isOpenTask(task)).length;
                    return <div className="it-admin-list-row" key={id}><div><strong>{employee.name || employee.username || "Employee"}</strong><span>{employee.position || employee.role || "IT"} · {workload} active assignments</span></div><span>{employee.status || "—"}</span></div>;
                  }) : <Empty>No IT employee records were found.</Empty>}
                </article>
                <article className="it-admin-panel">
                  <div className="it-admin-panel-heading"><h3>Projects</h3><button type="button" className="it-admin-text-button" onClick={() => onNavigate?.("it-admin-projects")}>View all</button></div>
                  <RecordsTable empty="No project records were found." rows={projectRows.slice(0, 6).map((project) => ({ ...project, id: getId(project) }))} columns={[
                    { label: "Project", render: (row) => row.name || row.projectName || "Untitled project" },
                    { label: "Assigned to", render: (row) => row.assignedEmployeeName || "Unassigned" },
                    { label: "Status", render: (row) => row.status || "—" },
                    { label: "Due", render: getDueDate },
                  ]} />
                </article>
                <article className="it-admin-panel">
                  <div className="it-admin-panel-heading"><h3>Today's IT tasks</h3><button type="button" className="it-admin-text-button" onClick={() => onNavigate?.("it-admin-tasks")}>View tasks</button></div>
                  {todayTasks.length ? todayTasks.slice(0, 6).map((task) => (
                    <div className="it-admin-list-row" key={getId(task)}><div><strong>{task.title || "Untitled task"}</strong><span>{task.assignee || task.emp || "Unassigned"}</span></div><span>{task.status || "—"}</span></div>
                  )) : <Empty>No open IT tasks are due today.</Empty>}
                </article>
                <article className="it-admin-panel">
                  <div className="it-admin-panel-heading"><h3>Upcoming deadlines</h3></div>
                  {upcomingDeadlines.length ? upcomingDeadlines.map((deadline) => (
                    <div className="it-admin-list-row" key={deadline.id}><div><strong>{deadline.title}</strong><span>{deadline.kind} · {deadline.assignee}</span></div><span>{deadline.due}</span></div>
                  )) : <Empty>No project or IT task deadlines in the next 7 days.</Empty>}
                </article>
                <p className="it-admin-scope-note">Persistent System Logs, IT task assignment, bugs, and clarifications are not exposed to this Admin session by the current APIs; no placeholder actions or sample records are shown.</p>
              </section>
            </>
          ) : null}

          {projectPages.includes(page) ? (
            <section className="it-admin-panel">
              <div className="it-admin-panel-heading it-admin-toolbar">
                <h3>{title}</h3>
                <div><input aria-label="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." />
                  <select aria-label="Filter projects by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{["new", "active", "completed", "rejected"].map((status) => <option key={status} value={status}>{status}</option>)}</select>
                  <select aria-label="Filter projects by employee" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}><option value="all">All IT employees</option>{itEmployees.map((employee) => <option key={getId(employee)} value={getId(employee)}>{employee.name || employee.username}</option>)}</select>
                  <button type="button" className="it-admin-secondary-button" onClick={() => exportProjects()}>Export CSV</button>
                </div>
              </div>
              <RecordsTable empty="No project records match your search and filters." rows={visibleProjects.filter((project) => {
                if (page === "it-admin-new-projects") return normalize(project.status) === "new";
                if (page === "it-admin-active-projects") return normalize(project.status) === "active";
                if (page === "it-admin-completed-projects") return normalize(project.status) === "completed";
                return true;
              }).map((project) => ({ ...project, id: getId(project) }))} columns={[
                { label: "Project", render: (row) => <strong>{row.name || row.projectName || "Untitled project"}</strong> },
                { label: "Client", key: "client" }, { label: "Assigned to", render: (row) => row.assignedEmployeeName || "Unassigned" },
                { label: "Status", key: "status" }, { label: "Priority", key: "priority" }, { label: "Due", render: getDueDate },
                { label: "Progress", render: (row) => row.status === "Completed" ? "100%" : row.progress == null ? "—" : `${row.progress}%` },
                { label: "Actions", render: (row) => <span className="it-admin-actions">
                  {normalize(row.status) === "new" && <><button type="button" disabled={updatingId === row.id} onClick={() => reviewNewProject(row, "accept")}>Accept</button><button type="button" className="is-danger" disabled={updatingId === row.id} onClick={() => reviewNewProject(row, "reject")}>Reject</button></>}
                  {normalize(row.status) === "active" && <button type="button" onClick={() => { setReviewProject(row); setReviewForm({ status: row.executionStatus || "In Progress", progress: String(row.progress ?? 0), remarks: "", completionDate: today(), allTasksCompleted: false }); }}>Review</button>}
                </span> },
              ]} />
            </section>
          ) : null}

          {employeePages.includes(page) ? (
            <section className="it-admin-panel">
              <div className="it-admin-panel-heading it-admin-toolbar"><h3>{title}</h3><div><input aria-label="Search employees" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employees..." /><button type="button" className="it-admin-secondary-button" onClick={() => exportEmployees()}>Export CSV</button></div></div>
              <RecordsTable empty="No IT employee records match your search." rows={itEmployees.filter((employee) => [employee.name, employee.username, employee.role, employee.position].some((value) => normalize(value).includes(normalize(query)))).map((employee) => {
                const id = getId(employee);
                const assignedProjects = projectRows.filter((project) => String(project.assignedEmployeeId || "") === id);
                const employeeTasks = itTasks.filter((task) => taskAssignedToEmployee(task, employee));
                return { ...employee, id, projectsCount: assignedProjects.length, openTasks: employeeTasks.filter(isOpenTask).length, overdueTasks: employeeTasks.filter((task) => isOpenTask(task) && getDueDate(task) && getDueDate(task) < today()).length, presentToday: todayAttendance.some((record) => String(record.employeeId || "") === id && normalize(record.status) === "present") };
              })} columns={[
                { label: "Employee", render: (row) => <strong>{row.name || row.username}</strong> }, { label: "Username", key: "username" },
                { label: "Role", key: "role" }, { label: "Status", render: (row) => row.status || "—" },
                { label: "Assigned projects", key: "projectsCount" }, { label: "Open tasks", key: "openTasks" },
                { label: "Overdue tasks", key: "overdueTasks" }, { label: "Attendance today", render: (row) => row.presentToday ? "Present" : "No record" },
              ]} />
            </section>
          ) : null}

          {taskPages.includes(page) ? (
            <section className="it-admin-panel">
              <p className="it-admin-scope-note">Tasks are loaded from the existing shared task API and filtered to IT assignees. Task assignment is restricted to CRM Executives by the current API.</p>
              <div className="it-admin-panel-heading it-admin-toolbar"><h3>{title}</h3><div><input aria-label="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search IT tasks..." />
                <select aria-label="Filter tasks by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{[...new Set(scopedTasks.map((task) => task.status).filter(Boolean))].map((status) => <option key={status} value={normalize(status)}>{status}</option>)}</select>
                <select aria-label="Filter tasks by assignee" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}><option value="all">All employees</option>{filteredEmployees.map((employee) => <option key={getId(employee)} value={getId(employee)}>{employee.name || employee.username}</option>)}</select>
              </div></div>
              <RecordsTable empty="No task records match this view." rows={filteredTasks.map((task) => ({ ...task, id: getId(task) }))} columns={[
                { label: "Task", render: (row) => <strong>{row.title || "Untitled task"}</strong> }, { label: "Assignee", render: (row) => row.assignee || row.emp || "Unassigned" },
                { label: "Status", render: (row) => <select aria-label={`Update status for ${row.title || "task"}`} value={row.status || "To Do"} disabled={updatingId === row.id} onChange={(event) => saveTaskStatus(row, event.target.value)}>{["To Do", "Pending", "In Progress", "Done"].map((status) => <option key={status}>{status}</option>)}</select> },
                { label: "Priority", key: "priority" }, { label: "Due", render: getDueDate },
              ]} />
            </section>
          ) : null}
        </>
      )}

      {reviewProject && (
        <div className="it-admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewProject(null); }}>
          <form className="it-admin-review-form" onSubmit={saveProjectReview}>
            <div className="it-admin-panel-heading"><h3>Review {reviewProject.name || reviewProject.projectName}</h3><button type="button" aria-label="Close review" onClick={() => setReviewProject(null)}>×</button></div>
            {actionError && <p className="it-admin-error" role="alert">{actionError}</p>}
            <label>Status<select value={reviewForm.status} onChange={(event) => setReviewForm((current) => ({ ...current, status: event.target.value }))}><option>In Progress</option><option>On Hold</option><option>Completed</option></select></label>
            {reviewForm.status !== "Completed" && <label>Progress (%)<input type="number" min="0" max="100" value={reviewForm.progress} onChange={(event) => setReviewForm((current) => ({ ...current, progress: event.target.value }))} required /></label>}
            {reviewForm.status === "Completed" && <>
              <label>Completion date<input type="date" value={reviewForm.completionDate} onChange={(event) => setReviewForm((current) => ({ ...current, completionDate: event.target.value }))} required /></label>
              <label className="it-admin-checkbox"><input type="checkbox" checked={reviewForm.allTasksCompleted} onChange={(event) => setReviewForm((current) => ({ ...current, allTasksCompleted: event.target.checked }))} />I confirm all assigned tasks are complete</label>
            </>}
            <label>Review remarks<textarea value={reviewForm.remarks} onChange={(event) => setReviewForm((current) => ({ ...current, remarks: event.target.value }))} maxLength={5000} required /></label>
            <div className="it-admin-form-actions"><button type="button" className="it-admin-secondary-button" onClick={() => setReviewProject(null)}>Cancel</button><button className="primary-button" type="submit" disabled={Boolean(updatingId)}>{updatingId ? "Saving..." : "Save review"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

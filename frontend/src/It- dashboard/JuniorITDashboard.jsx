import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Bell, Bug, CalendarDays, CheckCircle2, ClipboardList, Clock3, FolderKanban, LayoutDashboard, ListChecks, LogOut, MessageCircle, RefreshCw, Settings, UserCircle2 } from "lucide-react";
import { fetchAppNotifications, fetchAttendanceCalendar, fetchAttendanceMonth, fetchITProjectDetails, fetchITProjects, fetchITTasks, fetchLeaves, fetchTodayAttendance, markAppNotificationRead, syncAttendanceHistory, updateITTaskStatus } from "../../backendApi.js";
import { filterITNotifications, formatITDate, notificationId } from "./workPageModel.js";
import LogoutConfirmDialog from "../shared/LogoutConfirmDialog.jsx";
import LeaveRequestPage from "./LeaveRequestPage.jsx";
import { AttendanceReportPage, MarkAttendancePage, ProjectDetailsPage, THEME_CSS } from "./ITDashboard.jsx";
import NotificationsPage from "./NotificationsPage.jsx";
import ClarificationPage from "./ClarificationPage.jsx";
import OpenBugsPage from "./OpenBugsPage.jsx";
import HelpdeskChat from "../shared/HelpdeskChat.jsx";
import { SettingsTab as SharedAccountSettings } from "../crm-executive/CrmExecutiveDashboard.jsx";
import { attendanceDateInIndia } from "../../../shared/attendanceClassification.js";
import "./workPages.css";
import "./juniorITDashboard.css";

const NAV = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "tasks", label: "Tasks", icon: ListChecks, group: "Work" },
  { id: "mark-attendance", label: "Mark Attendance", icon: CalendarDays, group: "Work" },
  { id: "attendance-report", label: "Attendance Report", icon: ClipboardList, group: "Work" },
  { id: "leave-request", label: "Leave Request", icon: UserCircle2, group: "Work" },
  { id: "projects", label: "Assigned Project", icon: FolderKanban, group: "Projects" },
  { id: "open-bugs", label: "Open Bugs", icon: Bug, group: "Support" },
  { id: "clarification", label: "Clarification", icon: MessageCircle, group: "Support" },
  { id: "hr-helpdesk", label: "HR Helpdesk", icon: MessageCircle, group: "Support" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Account" },
  { id: "settings", label: "Settings", icon: Settings, group: "Account" },
];
const STATUS_OPTIONS = ["Pending", "In Progress", "Done"];
const unwrap = value => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
const dateValue = value => String(value || "").slice(0, 10);
const taskDue = task => task.dueDate || task.due || "";
const taskTitle = task => task.title || task.task || task.name || "Untitled task";
const projectTitle = project => project.name || project.projectName || project.client || "Project";
const statusLabel = value => String(value || "Pending").replaceAll("_", " ");
const isDone = task => ["done", "complete", "completed"].includes(String(task.status || "").toLowerCase());

function Metric({ icon: Icon, label, value, tone }) {
  return <article className={`junior-it-metric ${tone || ""}`}><span className="junior-it-metric-icon"><Icon size={18} /></span><span className="junior-it-metric-label">{label}</span><strong>{value}</strong></article>;
}

function ProjectCard({ project, onOpen }) {
  const progress = Math.max(0, Math.min(100, Number(project.progress) || 0));
  return <article className="junior-it-project-card">
    <div className="junior-it-project-heading"><span className="junior-it-project-mark"><FolderKanban size={18} /></span><span className={`junior-it-status ${String(project.status || "Active").toLowerCase().replaceAll(" ", "-")}`}>{project.status || "Active"}</span></div>
    <h3>{projectTitle(project)}</h3>
    <p>{project.client || "Assigned project"}</p>
    <div className="junior-it-project-meta"><span><CalendarDays size={14} /> Due {formatITDate(project.dueDate || project.due)}</span><span>{project.priority || "Medium"} priority</span></div>
    <div className="junior-it-progress-label"><span>Project progress</span><strong>{progress}%</strong></div>
    <div className="junior-it-progress"><span style={{ width: `${progress}%` }} /></div>
    <button type="button" className="junior-it-link-button" onClick={() => onOpen(project)}>View project <ArrowRight size={15} /></button>
  </article>;
}

function ActivityList({ notifications, onOpen }) {
  const recent = notifications.slice(0, 5);
  return recent.length ? <div className="junior-it-activity-list">{recent.map(item => <button type="button" key={notificationId(item)} onClick={() => onOpen(item)}><span className="junior-it-activity-dot"><Bell size={13} /></span><span><strong>{item.message || item.title || "Work update"}</strong><small>{formatITDate(item.createdAt || item.timestamp || item.at)}</small></span></button>)}</div> : <div className="junior-it-mini-empty">No recent updates.</div>;
}

function TaskList({ tasks, projects, onStatusChange, savingTask }) {
  const projectById = useMemo(() => new Map(projects.map(project => [String(project.id), project])), [projects]);
  if (!tasks.length) return <div className="junior-it-empty"><CheckCircle2 size={22} /><strong>No assigned tasks yet</strong><span>Tasks assigned to you will appear here.</span></div>;
  return <div className="junior-it-task-list">{tasks.map(task => {
    const project = projectById.get(String(task.projectId));
    const projectInactive = project && String(project.status || "").toLowerCase() !== "active";
    return <article className="junior-it-task-row" key={task.id}>
    <span className={`junior-it-task-icon ${isDone(task) ? "done" : ""}`}>{isDone(task) ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}</span>
    <div className="junior-it-task-copy"><strong>{taskTitle(task)}</strong><span>{project ? projectTitle(project) : task.projectName || "Assigned project"}</span>{task.description && <small>{task.description}</small>}</div>
    <span className="junior-it-task-due"><CalendarDays size={13} />{taskDue(task) ? formatITDate(taskDue(task)) : "No due date"}</span>
    <select aria-label={`Update status for ${taskTitle(task)}`} title={projectInactive ? "Task status is locked because this project is not active." : "Update your task status"} value={statusLabel(task.status)} disabled={savingTask === task.id || Boolean(projectInactive)} onChange={event => onStatusChange(task, event.target.value)}>
      {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status === "Done" ? "Completed" : status}</option>)}
    </select>
  </article>;
  })}</div>;
}

export default function JuniorITDashboard({ user, onLogout, onProfileUpdated }) {
  const [section, setSection] = useState("overview");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [accountProfile, setAccountProfile] = useState(() => ({ ...user }));
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingTask, setSavingTask] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceCalendar, setAttendanceCalendar] = useState(null);
  const [attendanceLeaves, setAttendanceLeaves] = useState([]);
  const [leaveRequestDate, setLeaveRequestDate] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectReturnSection, setProjectReturnSection] = useState("projects");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const attendanceMonthsLoaded = useRef(new Set());
  const attendanceMonthRequests = useRef(new Map());
  const attendanceCalendarLoaded = useRef(false);
  const leavesLoaded = useRef(false);
  const projectDetailsCache = useRef(new Map());

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    const [projectResult, taskResult, notificationResult] = await Promise.allSettled([
      fetchITProjects(), fetchITTasks(), fetchAppNotifications(),
    ]);
    if (projectResult.status === "fulfilled") setProjects(unwrap(projectResult.value));
    if (taskResult.status === "fulfilled") setTasks(unwrap(taskResult.value));
    if (notificationResult.status === "fulfilled") setNotifications(filterITNotifications(unwrap(notificationResult.value), user));
    const failed = [projectResult, taskResult, notificationResult].find(result => result.status === "rejected");
    if (failed) setError(failed.reason?.message || "Some work information could not be loaded.");
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const notify = useCallback(message => { setNotice(message); }, []);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadAttendanceMonth = useCallback(async (month, { force = false } = {}) => {
    if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return;
    const needsRecords = force || !attendanceMonthsLoaded.current.has(month);
    const needsCalendar = !attendanceCalendarLoaded.current;
    if (!needsRecords && !needsCalendar) return;
    if (!force && attendanceMonthRequests.current.has(month)) return attendanceMonthRequests.current.get(month);
    setAttendanceLoading(true);
    const request = Promise.all([
      needsRecords ? fetchAttendanceMonth(month) : Promise.resolve(null),
      needsCalendar ? fetchAttendanceCalendar() : Promise.resolve(null),
    ]).then(([records, calendar]) => {
      if (records !== null) {
        if (!Array.isArray(records)) throw new Error("Attendance returned an invalid response.");
        attendanceMonthsLoaded.current.add(month);
        setAttendanceRecords(current => [...records, ...current.filter(record => String(record.date || record.workDate || "").slice(0, 7) !== month)]);
      }
      if (calendar !== null) {
        if (!calendar || !Array.isArray(calendar.weeklyHolidays) || !Array.isArray(calendar.holidays)) throw new Error("Attendance calendar returned an invalid response.");
        attendanceCalendarLoaded.current = true;
        setAttendanceCalendar(calendar);
      }
    }).catch(loadError => {
      setError(loadError.message || "Could not load attendance.");
      throw loadError;
    }).finally(() => {
      if (attendanceMonthRequests.current.get(month) === request) attendanceMonthRequests.current.delete(month);
      setAttendanceLoading(false);
    });
    attendanceMonthRequests.current.set(month, request);
    return request;
  }, []);

  const loadLeaveRequests = useCallback(async (force = false) => {
    if (leavesLoaded.current && !force) return;
    const records = await fetchLeaves();
    if (Array.isArray(records)) setAttendanceLeaves(records);
    leavesLoaded.current = true;
  }, []);

  useEffect(() => {
    if (section === "mark-attendance") loadAttendanceMonth(attendanceDateInIndia().slice(0, 7)).catch(() => {});
    if (section === "leave-request" || section === "attendance-report") loadLeaveRequests().catch(loadError => setError(loadError.message || "Could not load leave requests."));
  }, [section, loadAttendanceMonth, loadLeaveRequests]);

  const refreshTodayAttendance = useCallback(async () => {
    const record = await fetchTodayAttendance();
    if (record) setAttendanceRecords(current => [record, ...current.filter(item => String(item.date || item.workDate || "") !== String(record.date || record.workDate || "") && String(item.id || "") !== String(record.id || ""))]);
    return record;
  }, []);

  const synchronizeAttendance = useCallback(async month => {
    const result = await syncAttendanceHistory();
    attendanceMonthsLoaded.current.clear();
    attendanceMonthRequests.current.clear();
    await loadAttendanceMonth(month || attendanceDateInIndia().slice(0, 7), { force: true });
    await loadLeaveRequests(true);
    return result;
  }, [loadAttendanceMonth, loadLeaveRequests]);

  const activeProjects = useMemo(() => projects.filter(project => !["completed", "rejected"].includes(String(project.status || "").toLowerCase())), [projects]);
  const pendingTasks = useMemo(() => tasks.filter(task => !isDone(task)), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(isDone), [tasks]);
  const overdueTasks = useMemo(() => pendingTasks.filter(task => taskDue(task) && dateValue(taskDue(task)) < new Date().toISOString().slice(0, 10)), [pendingTasks]);
  const unreadCount = notifications.filter(item => !item.read).length;
  const openProject = async project => {
    setProjectReturnSection(section);
    const projectId = String(project.id);
    const cachedProject = projectDetailsCache.current.get(projectId);
    const initialProject = cachedProject || project;
    setSelectedProject(initialProject);
    setSection("project-details");
    if (cachedProject) return;
    const alreadyHasFiles = (Array.isArray(project.documents) && project.documents.length > 0)
      || Object.values(project.scopeFiles || {}).some(files => Array.isArray(files) ? files.length > 0 : Boolean(files));
    if (alreadyHasFiles) {
      projectDetailsCache.current.set(projectId, project);
      return;
    }
    try {
      const details = await fetchITProjectDetails(project.id);
      const resolved = { ...project, ...details };
      projectDetailsCache.current.set(projectId, resolved);
      setSelectedProject(current => String(current?.id) === projectId ? resolved : current);
    } catch (requestError) {
      setError(requestError.message || "Some project details could not be loaded.");
    }
  };
  const closeProjectDetails = () => {
    setSelectedProject(null);
    setSection(projectReturnSection);
  };

  const changeTaskStatus = async (task, status) => {
    setSavingTask(task.id);
    try {
      const updated = await updateITTaskStatus(task.id, status);
      setTasks(current => current.map(item => item.id === task.id ? { ...item, ...updated, status } : item));
    } catch (requestError) {
      setError(requestError.message || "Could not update this task.");
    } finally { setSavingTask(""); }
  };

  const openNotification = async item => {
    if (item.read || !notificationId(item)) return;
    try {
      await markAppNotificationRead(notificationId(item));
      setNotifications(current => current.map(record => notificationId(record) === notificationId(item) ? { ...record, read: true } : record));
    } catch (requestError) { setError(requestError.message || "Could not update this notification."); }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter(item => !item.read && notificationId(item));
    const results = await Promise.allSettled(unread.map(item => markAppNotificationRead(notificationId(item))));
    const readIds = new Set(unread.filter((_, index) => results[index].status === "fulfilled").map(notificationId));
    setNotifications(current => current.map(item => readIds.has(notificationId(item)) ? { ...item, read: true } : item));
    const failed = results.find(result => result.status === "rejected");
    if (failed) setError(failed.reason?.message || "Some notifications could not be marked as read.");
  };

  return <div className="junior-it-shell">
    <style>{THEME_CSS}</style>
    <aside className="junior-it-sidebar">
      <div className="junior-it-brand"><span className="junior-it-logo">S/T</span><span><strong>System Technologies</strong><small>Junior IT Workspace</small></span></div>
      <div className="junior-it-user">{accountProfile?.imageUrl || user?.imageUrl ? <img className="junior-it-avatar-photo" src={accountProfile?.imageUrl || user?.imageUrl} alt="" /> : <span className="junior-it-avatar">{String(user?.name || "IT").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</span>}<strong>{user?.name || user?.username || "IT Team Member"}</strong><small>{user?.role || "Junior IT"}</small></div>
      <nav className="junior-it-nav" aria-label="Junior IT navigation">{["Overview", "Work", "Projects", "Support", "Account"].map(group => <div className="junior-it-nav-group" key={group}><small>{group}</small>{NAV.filter(item => item.group === group).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={section === id ? "active" : ""} onClick={() => setSection(id)}><Icon size={16} />{label}{id === "notifications" && unreadCount > 0 && <span>{unreadCount}</span>}</button>)}</div>)}</nav>
      <button type="button" className="junior-it-logout" onClick={() => setLogoutOpen(true)}><LogOut size={16} />Log out</button>
    </aside>
    <main className="junior-it-main">
      <header className="junior-it-topbar"><div>{section === "overview" ? <><h1>Dashboard</h1><p className="junior-it-topbar-subtitle">{user?.username || user?.name || "IT Employee"} · IT</p></> : <><p>IT DEPARTMENT</p><h1>{section === "project-details" ? "Project Details" : NAV.find(item => item.id === section)?.label}</h1></>}</div><div className="junior-it-topbar-actions"><button type="button" className="junior-it-alert" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} onClick={() => setSection("notifications")}><Bell size={17} />{unreadCount > 0 && <span>{unreadCount}</span>}</button><button type="button" className="junior-it-refresh" onClick={() => load(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "spinning" : ""} />Refresh</button></div></header>
      <div className="junior-it-content">
        {error && <div className="junior-it-error" role="alert"><AlertCircle size={15} /><span>{/not linked to an active IT workspace membership/i.test(error) ? "Your IT profile needs workspace access. Ask your IT Head or Admin to link it." : error}</span></div>}
        {section === "overview" && <>
          <div className="junior-it-greeting"><strong>Welcome, {user?.name || user?.username || "IT team member"}</strong><span>{"\u00b7"} {user?.role || "IT Employee"}</span><time>{formatITDate(new Date())}</time></div>
          <section className="junior-it-metrics">
            <Metric icon={FolderKanban} label="Active Projects" value={activeProjects.length} />
            <Metric icon={ListChecks} label="Pending Tasks" value={pendingTasks.length} tone="orange" />
            <Metric icon={CheckCircle2} label="Completed Tasks" value={completedTasks.length} tone="green" />
            <Metric icon={Bell} label="Unread Updates" value={unreadCount} tone="purple" />
          </section>
          <section className="junior-it-overview-grid">
            <article className="junior-it-overview-card">
              <span>OVERVIEW</span><h2>Welcome back, keep your work moving</h2>
              <p>{activeProjects.length} active projects ? {pendingTasks.length} tasks in progress</p>
              <button type="button" onClick={() => setSection("tasks")}>View my work <ArrowRight size={14} /></button>
              <div className="junior-it-overview-stat"><span><ListChecks size={16} />Pending tasks</span><strong>{pendingTasks.length}</strong></div>
              <div className="junior-it-overview-stat"><span><CheckCircle2 size={16} />Completed tasks</span><strong>{completedTasks.length}</strong></div>
            </article>
            <article className="junior-it-overview-panel">
              <header><strong>My Work</strong><span>{pendingTasks.length}</span><button type="button" onClick={() => setSection("tasks")}>View all <ArrowRight size={13} /></button></header>
              {loading ? <div className="junior-it-mini-empty">Loading your work...</div> : pendingTasks.length ? <div className="junior-it-mini-tasks">{pendingTasks.slice(0, 5).map(task => <div key={task.id}><span className="junior-it-mini-task-icon"><Clock3 size={14} /></span><span><strong>{taskTitle(task)}</strong><small>{taskDue(task) ? `Due ${formatITDate(taskDue(task))}` : "No due date"}</small></span></div>)}</div> : <div className="junior-it-mini-empty">No pending tasks. You are all caught up.</div>}
            </article>
            <article className="junior-it-overview-panel">
              <header><strong>Recent Activity</strong><button type="button" onClick={() => setSection("notifications")}>View all <ArrowRight size={13} /></button></header>
              <ActivityList notifications={notifications} onOpen={openNotification} />
            </article>
          </section>
          <section className="junior-it-quick-actions">
            <div><span>QUICK ACTIONS</span><small>Go to a workspace</small></div>
            {[{ id: "tasks", label: "My Work", icon: ListChecks }, { id: "projects", label: "My Projects", icon: FolderKanban }, { id: "notifications", label: "Notifications", icon: Bell }].map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => setSection(id)}><Icon size={15} />{label}<ArrowRight size={12} /></button>)}
          </section>
          <section className="junior-it-bottom-grid">
            <article className="junior-it-overview-panel">
              <header><strong>Needs Attention</strong><span>{overdueTasks.length}</span><button type="button" onClick={() => setSection("tasks")}>View all <ArrowRight size={13} /></button></header>
              {overdueTasks.length ? <div className="junior-it-attention-list">{overdueTasks.slice(0, 5).map(task => <button type="button" key={task.id} onClick={() => setSection("tasks")}><AlertCircle size={14} /><span><strong>{taskTitle(task)}</strong><small>Overdue ? Due {formatITDate(taskDue(task))}</small></span><ArrowRight size={13} /></button>)}</div> : <div className="junior-it-mini-empty">No overdue tasks. You are on track.</div>}
            </article>
            <article className="junior-it-overview-panel">
              <header><strong>Active Projects</strong><span>{activeProjects.length}</span><button type="button" onClick={() => setSection("projects")}>View all <ArrowRight size={13} /></button></header>
              {activeProjects.length ? <div className="junior-it-project-table-wrap"><table className="junior-it-project-table"><thead><tr><th>Project</th><th>Progress</th><th>Tasks</th><th>Deadline</th></tr></thead><tbody>{activeProjects.slice(0, 5).map(project => { const projectTasks = tasks.filter(task => String(task.projectId) === String(project.id)); const progress = Math.max(0, Math.min(100, Number(project.progress) || 0)); return <tr key={project.id} onClick={() => openProject(project)}><td><strong>{projectTitle(project)}</strong></td><td><span className="junior-it-table-progress"><i style={{ width: `${progress}%` }} /></span>{progress}%</td><td>{projectTasks.filter(isDone).length}/{projectTasks.length}</td><td>{formatITDate(project.dueDate || project.due)}</td></tr>; })}</tbody></table></div> : <div className="junior-it-mini-empty">No active projects assigned.</div>}
            </article>
          </section>
        </>}
        {section === "projects" && <section className="junior-it-section"><div className="junior-it-section-heading"><div><span>ASSIGNED TO YOU</span><h2>Assigned Project</h2></div><p>{projects.length} total</p></div>{loading ? <div className="junior-it-loading">Loading your projects…</div> : projects.length ? <div className="junior-it-project-grid">{projects.map(project => <ProjectCard key={project.id} project={project} onOpen={openProject} />)}</div> : <div className="junior-it-empty"><FolderKanban size={22} /><strong>No projects assigned</strong><span>Projects assigned to you will appear here.</span></div>}</section>}
        {section === "project-details" && selectedProject && <div className="junior-it-shared-page crm-root"><ProjectDetailsPage project={{ ...selectedProject, tasks: tasks.filter(task => String(task.projectId) === String(selectedProject.id)) }} readOnly onBack={closeProjectDetails} /></div>}
        {section === "tasks" && <section className="junior-it-section"><div className="junior-it-section-heading"><div><span>ASSIGNED TO YOU</span><h2>My tasks</h2></div><p>{tasks.length} total</p></div>{loading ? <div className="junior-it-loading">Loading your tasks…</div> : <TaskList tasks={tasks} projects={projects} onStatusChange={changeTaskStatus} savingTask={savingTask} />}</section>}
        {section === "mark-attendance" && <div className="junior-it-shared-page"><MarkAttendancePage notify={notify} employee={user} attendance={attendanceRecords} setAttendance={setAttendanceRecords} calendar={attendanceCalendar} loading={attendanceLoading} authenticated={Boolean(user)} onRefreshToday={refreshTodayAttendance} /></div>}
        {section === "attendance-report" && <div className="junior-it-shared-page"><AttendanceReportPage notify={notify} employee={user} attendance={attendanceRecords} leaveRequests={attendanceLeaves} calendar={attendanceCalendar} loading={attendanceLoading} onMonthRequested={loadAttendanceMonth} onApplyLeave={date => { setLeaveRequestDate(date); setSection("leave-request"); }} onSyncAttendance={synchronizeAttendance} /></div>}
        {section === "leave-request" && <div className="junior-it-shared-page"><LeaveRequestPage notify={notify} leaves={attendanceLeaves} setLeaves={setAttendanceLeaves} authenticated={Boolean(user)} initialDate={leaveRequestDate} onSubmitted={() => setLeaveRequestDate("")} today={attendanceDateInIndia()} /></div>}
        {section === "open-bugs" && <div className="junior-it-shared-page"><OpenBugsPage key={user?.name || user?.username} projects={projects} person={user?.name || user?.username || "IT Team Member"} /></div>}
        {section === "clarification" && <div className="junior-it-shared-page"><ClarificationPage key={user?.name || user?.username} person={user?.name || user?.username || "IT Team Member"} projects={projects} /></div>}
        {section === "hr-helpdesk" && <div className="junior-it-shared-page crm-root it-helpdesk-sales-layout"><HelpdeskChat user={user} displayName={user?.name || user?.username || "IT Team Member"} /></div>}
        {section === "notifications" && <NotificationsPage notifications={notifications} unreadCount={unreadCount} onOpen={openNotification} onMarkAllRead={markAllNotificationsRead} />}
        {section === "settings" && <div className="junior-it-shared-page crm-root it-settings-sales-layout"><SharedAccountSettings profile={accountProfile} setProfile={setAccountProfile} showToast={notify} currentUser={{ ...(user || {}), ...accountProfile }} onProfileUpdated={saved => { setAccountProfile(current => ({ ...current, ...saved })); onProfileUpdated?.(saved); }} /></div>}
      </div>
    </main>
    {notice && <div className="junior-it-notice" role="status">{notice}</div>}
    <LogoutConfirmDialog open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={() => { setLogoutOpen(false); onLogout?.(); }} />
  </div>;
}

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Gauge,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  MessageSquareText,
  PhoneCall,
  Plus,
  Search,
  Settings,
  Target,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
  BadgeCheck,
  Building2,
  NotebookPen,
  Megaphone,
  CircleDashed,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  createAttendance,
  createLeave,
  createTask,
  loadAttendance,
  loadLeaves,
  loadTasks,
  updateAttendance,
  updateLead,
} from "../../backendClient";
import "./crmExecutive.css";
import "./crmExecutiveForm.css";

const dashboardTabs = ["overview", "my-leads", "follow-ups", "performance", "activity"];

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "call-list", label: "Call List", icon: PhoneCall },
  { id: "leads", label: "Leads", icon: Users },
  { id: "sales-reports", label: "Sales Reports", icon: BarChart3 },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "sales-summary", label: "Sales Summary", icon: TrendingUp },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "attendance", label: "Mark Attendance", icon: CalendarCheck2 },
  { id: "attendance-report", label: "Attendance Report", icon: FileText },
  { id: "leave-request", label: "Leave Request", icon: BriefcaseBusiness },
  { id: "adds-list", label: "Adds List", icon: Megaphone },
  { id: "logout", label: "Logout", icon: LogOut },
];

const callStatusOptions = ["Pending", "Completed", "Not Answered", "Busy", "Callback Requested", "Interested", "Not Interested", "Lost"];
const leadTypeOptions = ["IT Service", "Training Course", "Internship", "Stipend / Internship", "Other"];
const leadStatusOptions = ["New", "Contacted", "Interested", "Follow-up", "Converted", "Lost"];
const serviceOptions = [
  "Website Development",
  "App Development",
  "Software Development",
  "Digital Marketing",
  "SEO",
  "Graphic Design",
  "IT Support",
  "Python",
  "Java",
  "Web Development",
  "Full Stack Development",
  "Data Analytics",
  "AI / ML",
  "Other",
];

function isConverted(lead) {
  return String(lead.status || lead.interestStatus || "").toLowerCase() === "converted" || String(lead.callStatus || "").toLowerCase() === "completed";
}

function isLost(lead) {
  const status = String(lead.status || lead.interestStatus || lead.callStatus || "").toLowerCase();
  return status.includes("lost") || status.includes("not interested") || status === "wrong number";
}

function displayDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function initials(name = "CRM Executive") {
  return String(name || "CRM Executive")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function matchesUserLead(user, lead) {
  if (!lead) return false;
  const assignedTo = String(lead.assignedTo ?? "");
  if (!assignedTo) return true;
  const userKey = String(user?._id || user?.id || "");
  const userName = String(user?.name || "");
  return assignedTo === userKey || assignedTo === userName || assignedTo === String(user?.id || user?._id || "");
}

function normaliseLeadStatus(lead) {
  return String(lead?.status || lead?.interestStatus || lead?.callStatus || "Pending").trim() || "Pending";
}

export default function CrmExecutiveDashboard({ user, leads, onUpdateLead, onCreateLead, onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savingLeadId, setSavingLeadId] = useState(null);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadSuccess, setLeadSuccess] = useState("");
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "", city: "", interest: "", type: "Training", status: "Pending", source: "Training" });
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [callFilters, setCallFilters] = useState({ search: "", status: "All Call Status", leadType: "All Lead Types", leadStatus: "All Lead Status", service: "All Services / Courses", date: "All Dates" });
  const [callEditMap, setCallEditMap] = useState({});
  const [attendanceStatus, setAttendanceStatus] = useState("Present");
  const [leaveForm, setLeaveForm] = useState({ type: "Casual", from: "", to: "", reason: "" });
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCallLoading, setIsCallLoading] = useState(true);
  const [callError, setCallError] = useState("");

  const myLeads = useMemo(() => (Array.isArray(leads) ? leads.filter((lead) => matchesUserLead(user, lead)) : []), [leads, user]);
  const followUps = myLeads.filter((lead) => /follow-up|required|calling/i.test(String(lead.status || lead.callStatus || "")) || String(lead.followUpDate || "").trim());
  const interested = myLeads.filter((lead) => /interested/i.test(String(lead.interestStatus || lead.status || lead.callStatus || "")) || String(lead.interestStatus || "").includes("Interested"));
  const converted = myLeads.filter(isConverted);
  const lost = myLeads.filter(isLost);
  const conversionRate = myLeads.length ? Math.round((converted.length / myLeads.length) * 100) : 0;
  const recentActivity = useMemo(
    () => [...myLeads].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)).slice(0, 5),
    [myLeads],
  );

  useEffect(() => {
    let ignore = false;
    async function fetchExecutiveData() {
      const [taskData, attendanceData, leaveData] = await Promise.all([
        loadTasks().catch(() => []),
        loadAttendance().catch(() => []),
        loadLeaves().catch(() => []),
      ]);
      if (ignore) return;
      const userName = String(user?.name || "");
      const userId = String(user?._id || user?.id || "");
      setTasks(taskData.filter((task) => !task.emp || String(task.emp) === userName || String(task.emp) === userId));
      setAttendance(attendanceData.filter((entry) => !entry.emp || String(entry.emp) === userName || String(entry.emp) === userId));
      setLeaveRequests(leaveData.filter((entry) => !entry.emp || String(entry.emp) === userName || String(entry.emp) === userId));
    }
    fetchExecutiveData();
    return () => {
      ignore = true;
    };
  }, [user?._id, user?.id, user?.name]);

  async function changeStatus(lead, status) {
    setSavingLeadId(lead.id || lead._id);
    try {
      await onUpdateLead({ ...lead, status, callStatus: status });
    } finally {
      setSavingLeadId(null);
    }
  }

  function selectPage(page) {
    if (page === "logout") {
      onLogout();
      return;
    }
    setActiveTab(page);
    setSidebarOpen(false);
  }

  async function submitLead(event) {
    event.preventDefault();
    if (isCreatingLead) return;
    setLeadError("");
    setLeadSuccess("");
    setIsCreatingLead(true);
    try {
      await onCreateLead({
        ...leadForm,
        assignedTo: String(user?._id || user?.id || ""),
        assignedDate: new Date().toISOString().slice(0, 10),
        leadSource: leadForm.source,
        value: 0,
        notes: "",
      });
      setLeadForm({ name: "", phone: "", email: "", city: "", interest: "", type: "Training", status: "Pending", source: "Training" });
      setLeadFormOpen(false);
      setActiveTab("leads");
      setLeadSuccess("Lead created successfully.");
    } catch (err) {
      setLeadError(err.message || "Unable to add this lead.");
    } finally {
      setIsCreatingLead(false);
    }
  }

  const visibleLeadSet = activeTab === "dashboard" ? myLeads : activeTab === "follow-ups" ? followUps : activeTab === "my-leads" ? myLeads : activeTab === "interested" ? interested : activeTab === "converted" ? converted : activeTab === "lost" ? lost : myLeads;

  const callRows = useMemo(() => {
    const rows = myLeads.filter((lead) => lead && (lead.phone || lead.contact));
    return rows.filter((lead) => {
      const draft = callEditMap[lead.id || lead._id] || lead;
      const search = (callFilters.search || "").trim().toLowerCase();
      const matchesSearch = !search || [lead.name, lead.phone, lead.email, lead.type, lead.interest, lead.courseInterest, lead.programInterest].some((value) => String(value || "").toLowerCase().includes(search));
      const statusMatch = callFilters.status === "All Call Status" || String(draft.callStatus || draft.status || "").toLowerCase() === String(callFilters.status).toLowerCase();
      const leadTypeMatch = callFilters.leadType === "All Lead Types" || String(draft.type || "").toLowerCase() === String(callFilters.leadType).toLowerCase();
      const leadStatusMatch = callFilters.leadStatus === "All Lead Status" || String(draft.status || draft.interestStatus || "").toLowerCase() === String(callFilters.leadStatus).toLowerCase();
      const serviceMatch = callFilters.service === "All Services / Courses" || [draft.interest, draft.courseInterest, draft.programInterest, draft.type].some((value) => String(value || "").toLowerCase() === String(callFilters.service).toLowerCase());
      const dateMatch = callFilters.date === "All Dates" || (lead.assignedDate && lead.assignedDate === callFilters.date) || (lead.createdAt && lead.createdAt === callFilters.date);
      return matchesSearch && statusMatch && leadTypeMatch && leadStatusMatch && serviceMatch && dateMatch;
    });
  }, [callEditMap, callFilters, myLeads]);

  const totalPages = Math.max(1, Math.ceil(callRows.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return callRows.slice(start, start + rowsPerPage);
  }, [callRows, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [callFilters.search, callFilters.status, callFilters.leadType, callFilters.leadStatus, callFilters.service, callFilters.date, rowsPerPage]);

  useEffect(() => {
    setIsCallLoading(true);
    const timer = window.setTimeout(() => {
      setIsCallLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [myLeads.length]);

  function resetCallFilters() {
    setCallFilters({ search: "", status: "All Call Status", leadType: "All Lead Types", leadStatus: "All Lead Status", service: "All Services / Courses", date: "All Dates" });
    setCurrentPage(1);
  }

  function exportExcel() {
    const rows = callRows.map((lead, index) => ({
      "SR No": index + 1,
      Date: lead.assignedDate || lead.createdAt || "",
      Name: lead.name || "",
      Email: lead.email || "",
      Contact: lead.phone || "",
      "Lead Type": lead.type || "",
      "Service / Course": lead.interest || lead.courseInterest || lead.programInterest || "",
      "Call Status": lead.callStatus || lead.status || "Pending",
      "Lead Status": lead.status || lead.interestStatus || "New",
      "Follow-up Date": lead.followUpDate || "",
      "Follow-up Time": lead.followUpTime || "",
      Remark: lead.remark || lead.notes || "",
      "Assigned Executive": user?.name || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CRM Call List");
    XLSX.writeFile(workbook, `CRM_Call_List_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPdf() {
    const rows = callRows.map((lead, index) => [
      index + 1,
      lead.assignedDate || lead.createdAt || "",
      lead.name || "",
      lead.phone || "",
      lead.type || "",
      lead.interest || lead.courseInterest || lead.programInterest || "",
      lead.callStatus || lead.status || "Pending",
      lead.status || lead.interestStatus || "New",
      lead.followUpDate || "",
      lead.remark || lead.notes || "",
    ]);

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("SYSTEM TECHNOLOGIES", 14, 16);
    doc.setFontSize(11);
    doc.text("CRM Executive — Daily Contact Report", 14, 24);
    doc.text(`Generated Date: ${new Date().toISOString().slice(0, 10)}`, 14, 30);
    doc.text(`Executive: ${user?.name || "CRM Executive"}`, 14, 36);
    autoTable(doc, {
      head: [["SR No", "Date", "Name", "Contact", "Lead Type", "Service / Course", "Call Status", "Lead Status", "Follow-up", "Remark"]],
      body: rows,
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [17, 24, 39] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.text(`Page ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 8);
      },
    });
    doc.save(`CRM_Call_List_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  async function handleCallUpdate(lead) {
    const key = lead.id || lead._id;
    const draft = callEditMap[key] || lead;
    const payload = {
      ...lead,
      ...draft,
      callStatus: draft.callStatus || lead.callStatus || "Pending",
      status: draft.leadStatus || draft.status || lead.status || "New",
      type: draft.leadType || lead.type || "IT Service",
      interestStatus: draft.leadStatus || lead.interestStatus || "New",
      interest: draft.service || lead.interest || lead.courseInterest || lead.programInterest || "",
      courseInterest: draft.service || lead.courseInterest || lead.interest || "",
      programInterest: draft.service || lead.programInterest || lead.interest || "",
      remark: draft.remark || lead.remark || lead.notes || "",
      notes: draft.remark || lead.remark || lead.notes || "",
    };
    setSavingLeadId(key);
    try {
      await onUpdateLead(payload);
      setCallEditMap((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    } finally {
      setSavingLeadId(null);
    }
  }

  const todayAttendance = attendance.find((entry) => entry.date === new Date().toISOString().slice(0, 10));

  async function submitAttendance() {
    const dateKey = new Date().toISOString().slice(0, 10);
    const payload = { id: `${user?.name || "user"}-${dateKey}`.replace(/\s+/g, "-"), emp: user?.name || "Executive", date: dateKey, status: attendanceStatus };
    try {
      if (todayAttendance) {
        await updateAttendance(todayAttendance._id || todayAttendance.id, { ...todayAttendance, ...payload });
      } else {
        await createAttendance(payload);
      }
      const refreshed = await loadAttendance();
      setAttendance(refreshed.filter((entry) => !entry.emp || String(entry.emp) === String(user?.name || "") || String(entry.emp) === String(user?._id || user?.id || "")));
    } catch (error) {
      console.error("Attendance update failed", error);
    }
  }

  async function submitLeaveRequest(event) {
    event.preventDefault();
    const payload = {
      id: `leave-${Date.now()}`,
      emp: user?.name || "Executive",
      type: leaveForm.type,
      from: leaveForm.from,
      to: leaveForm.to,
      days: Math.max(1, new Date(leaveForm.to || leaveForm.from).getTime() - new Date(leaveForm.from || leaveForm.to).getTime() > 0 ? Math.ceil((new Date(leaveForm.to || leaveForm.from) - new Date(leaveForm.from || leaveForm.to)) / (1000 * 60 * 60 * 24)) + 1 : 1),
      reason: leaveForm.reason,
      status: "Pending",
    };
    try {
      await createLeave(payload);
      const refreshed = await loadLeaves();
      setLeaveRequests(refreshed.filter((entry) => !entry.emp || String(entry.emp) === String(user?.name || "") || String(entry.emp) === String(user?._id || user?.id || "")));
      setLeaveForm({ type: "Casual", from: "", to: "", reason: "" });
    } catch (error) {
      console.error("Leave create failed", error);
    }
  }

  const taskItems = tasks.slice(0, 5);
  const salesTotals = useMemo(() => {
    const totalLeads = myLeads.length;
    const interestedLeads = interested.length;
    const convertedLeads = converted.length;
    const lostLeads = lost.length;
    const followUpsCount = followUps.length;
    return { totalLeads, interestedLeads, convertedLeads, lostLeads, followUpsCount, conversionRate };
  }, [converted.length, conversionRate, followUps.length, interested.length, lost.length, myLeads.length]);

  return (
    <div className="crm-executive-shell">
      <div className={`crm-executive-scrim ${sidebarOpen ? "is-open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`crm-executive-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="crm-executive-brand">
          <span className="crm-executive-mark">ST</span>
          <div>
            <strong>SYSTEM<br />TECHNOLOGIES</strong>
            <small>A LEADING IT SOLUTION COMPANY</small>
          </div>
        </div>
        <div className="crm-executive-profile">
          <div className="crm-executive-avatar">
            {user?.imageUrl ? <img src={user.imageUrl} alt="" /> : initials(user?.name || "CRM Executive")}
          </div>
          <div>
            <strong>{user?.name || "CRM Executive"}</strong>
            <span>CRM Executive</span>
          </div>
        </div>
        <nav className="crm-executive-nav">
          <p>CRM / EXECUTIVE MENU</p>
          {navItems.map((item) => (
            <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => selectPage(item.id)}>
              <item.icon size={17} />
              <span>{item.label}</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
      </aside>

      <main className="crm-executive-main">
        <header className="crm-executive-header">
          <button className="crm-executive-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div>
            <p>SYSTEM TECHNOLOGIES</p>
            <h1>CRM Executive Dashboard</h1>
          </div>
          <div className="crm-executive-header-actions">
            <span><CalendarDays size={16} /> {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            <button aria-label="Notifications"><Bell size={18} /></button>
            <div className="crm-executive-mini-profile">{initials(user?.name || "CRM Executive")}</div>
          </div>
        </header>

        {activeTab === "dashboard" && (
          <>
            <section className="crm-executive-hero">
              <div>
                <p>EXECUTIVE WORKSPACE</p>
                <h2>CRM Executive Dashboard</h2>
                <span>Manage your assigned leads, follow-ups and customer interactions.</span>
              </div>
              <button onClick={() => setLeadFormOpen(true)}><Plus size={18} /> Add Lead</button>
            </section>
            {leadFormOpen && (
              <form className="crm-executive-add-lead" onSubmit={submitLead}>
                <div>
                  <strong>Add a lead</strong>
                  <button type="button" onClick={() => setLeadFormOpen(false)} aria-label="Close"><X size={17} /></button>
                </div>
                <section>
                  <input required placeholder="Lead name" value={leadForm.name} onChange={(event) => setLeadForm((current) => ({ ...current, name: event.target.value }))} />
                  <input required pattern="[6-9][0-9]{9}" placeholder="10-digit phone" value={leadForm.phone} onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))} />
                  <input type="email" placeholder="Email (optional)" value={leadForm.email} onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))} />
                  <input required placeholder="City" value={leadForm.city} onChange={(event) => setLeadForm((current) => ({ ...current, city: event.target.value }))} />
                  <input required placeholder="Interest" value={leadForm.interest} onChange={(event) => setLeadForm((current) => ({ ...current, interest: event.target.value }))} />
                  <select value={leadForm.status} onChange={(event) => setLeadForm((current) => ({ ...current, status: event.target.value }))}><option>Pending</option><option>Follow-up</option><option>Interested</option><option>Converted</option><option>Lost</option></select>
                  <select value={leadForm.source} onChange={(event) => setLeadForm((current) => ({ ...current, source: event.target.value }))}><option>Training</option><option>Website</option><option>Referral</option><option>Walk-in</option><option>WhatsApp</option></select>
                  <select value={leadForm.type} onChange={(event) => setLeadForm((current) => ({ ...current, type: event.target.value }))}><option>Training</option><option>Service</option></select>
                </section>
                {leadError ? <p className="crm-executive-form-error">{leadError}</p> : null}
                <button type="submit" disabled={isCreatingLead}>{isCreatingLead ? "Saving lead..." : "Save lead"}</button>
              </form>
            )}
            {leadSuccess ? <p className="crm-executive-form-success">{leadSuccess}</p> : null}

            <div className="crm-executive-kpis">
              <Kpi label="My Leads" value={myLeads.length} note="Assigned leads" icon={<Users />} />
              <Kpi label="Follow-ups Today" value={followUps.length} note="Due follow-ups" icon={<Clock3 />} tone="amber" />
              <Kpi label="Interested Leads" value={interested.length} note="Active opportunities" icon={<Target />} tone="teal" />
              <Kpi label="Converted" value={converted.length} note="Successful conversions" icon={<CheckCircle2 />} tone="green" />
              <Kpi label="Conversion Rate" value={`${conversionRate}%`} note="Current performance" icon={<BarChart3 />} tone="violet" />
            </div>

            <div className="crm-executive-tabs">{dashboardTabs.map((tab) => <button key={tab} className={tab === "overview" ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab === "overview" ? "Overview" : tab.replace("-", " ")}</button>)}</div>

            {(activeTab === "overview" || activeTab === "dashboard") && (
              <section className="crm-executive-grid">
                <div className="crm-executive-card crm-executive-activity">
                  <div className="crm-executive-card-heading">
                    <div><p>LIVE PIPELINE</p><h3>Recent Activity</h3></div>
                    <button onClick={() => setActiveTab("my-leads")}>View all <ChevronRight size={16} /></button>
                  </div>
                  {recentActivity.length ? recentActivity.map((lead) => (
                    <article key={lead.id || lead._id}>
                      <span className="crm-executive-activity-icon"><Activity size={16} /></span>
                      <div>
                        <strong>{lead.name}</strong>
                        <p>{normaliseLeadStatus(lead)} · {lead.city || "No city"}</p>
                      </div>
                      <time>{displayDate(lead.updatedAt || lead.createdAt)}</time>
                    </article>
                  )) : <EmptyState message="No lead activity yet." />}
                </div>
                <div className="crm-executive-card crm-executive-focus">
                  <p>TODAY'S FOCUS</p>
                  <h3>{followUps.length} follow-up{followUps.length === 1 ? "" : "s"} need attention</h3>
                  <span>Keep lead records current so your pipeline and Admin reporting stay in sync.</span>
                  <button onClick={() => setActiveTab("follow-ups")}>Review follow-ups <ChevronRight size={16} /></button>
                </div>
              </section>
            )}

            {activeTab === "my-leads" && (
              <section className="crm-executive-card crm-executive-leads">
                <div className="crm-executive-card-heading"><div><p>ASSIGNED PIPELINE</p><h3>My Leads</h3></div><span>{myLeads.length} records</span></div>
                {myLeads.length ? <div className="crm-executive-lead-list">{myLeads.map((lead) => <article key={lead.id || lead._id}><div className="crm-executive-lead-avatar">{initials(lead.name)}</div><div className="crm-executive-lead-copy"><strong>{lead.name}</strong><span>{lead.interest || lead.type} · {lead.city || "No city"}</span><a href={`tel:${lead.phone}`}>{lead.phone}</a></div><div className="crm-executive-lead-meta"><small>{displayDate(lead.assignedDate || lead.updatedAt || lead.createdAt)}</small><select value={lead.status || "Pending"} onChange={(event) => changeStatus(lead, event.target.value)} disabled={savingLeadId === (lead.id || lead._id)}><option>Pending</option><option>Follow-up</option><option>Interested</option><option>Converted</option><option>Lost</option><option>Not Interested</option></select></div></article>)}</div> : <EmptyState message="No assigned leads in this section." />}
              </section>
            )}

            {activeTab === "follow-ups" && (
              <section className="crm-executive-card crm-executive-leads">
                <div className="crm-executive-card-heading"><div><p>FOLLOW-UP STATUS</p><h3>Follow Ups</h3></div><span>{followUps.length} records</span></div>
                {followUps.length ? <div className="crm-executive-lead-list">{followUps.map((lead) => <article key={lead.id || lead._id}><div className="crm-executive-lead-avatar">{initials(lead.name)}</div><div className="crm-executive-lead-copy"><strong>{lead.name}</strong><span>{lead.interest || lead.type} · {lead.city || "No city"}</span><a href={`tel:${lead.phone}`}>{lead.phone}</a></div><div className="crm-executive-lead-meta"><small>{displayDate(lead.followUpDate || lead.assignedDate)}</small><button className="crm-executive-inline-btn" onClick={() => window.open(`tel:${lead.phone}`)}>Call</button></div></article>)}</div> : <EmptyState message="No follow-ups in this section." />}
              </section>
            )}

            {activeTab === "performance" && (
              <section className="crm-executive-card crm-executive-performance">
                <p>MY PERFORMANCE</p>
                <h3>Current pipeline performance</h3>
                <div className="crm-executive-metrics-grid">
                  <Metric value={myLeads.length} label="Assigned" />
                  <Metric value={interested.length} label="Interested" />
                  <Metric value={converted.length} label="Converted" />
                  <Metric value={`${conversionRate}%`} label="Conversion rate" />
                </div>
              </section>
            )}

            {activeTab === "activity" && (
              <section className="crm-executive-card crm-executive-activity">
                <div className="crm-executive-card-heading"><div><p>ACTIVITY</p><h3>Recent Lead Activity</h3></div><span>{recentActivity.length} items</span></div>
                {recentActivity.length ? recentActivity.map((lead) => <article key={lead.id || lead._id}><span className="crm-executive-activity-icon"><Activity size={16} /></span><div><strong>{lead.name}</strong><p>{normaliseLeadStatus(lead)}</p></div><time>{displayDate(lead.updatedAt || lead.createdAt)}</time></article>) : <EmptyState message="No activity yet." />}
              </section>
            )}
          </>
        )}

        {activeTab === "call-list" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header">
              <div>
                <h2>Daily Contacts</h2>
                <p>Manage your daily calls, follow-ups and customer interactions.</p>
              </div>
              <button className="crm-executive-top-action" onClick={() => setLeadFormOpen(true)}><Plus size={15} /> Add Lead</button>
            </div>

            <div className="crm-executive-call-filters">
              <div className="crm-executive-search-box">
                <Search size={15} />
                <input value={callFilters.search} onChange={(event) => setCallFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search contacts..." />
              </div>

              <select value={callFilters.status} onChange={(event) => setCallFilters((current) => ({ ...current, status: event.target.value }))}>
                <option>All Call Status</option>
                {callStatusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>

              <select value={callFilters.leadType} onChange={(event) => setCallFilters((current) => ({ ...current, leadType: event.target.value }))}>
                <option>All Lead Types</option>
                {leadTypeOptions.map((type) => <option key={type}>{type}</option>)}
              </select>

              <select value={callFilters.leadStatus} onChange={(event) => setCallFilters((current) => ({ ...current, leadStatus: event.target.value }))}>
                <option>All Lead Status</option>
                {leadStatusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>

              <select value={callFilters.service} onChange={(event) => setCallFilters((current) => ({ ...current, service: event.target.value }))}>
                <option>All Services / Courses</option>
                {serviceOptions.map((service) => <option key={service}>{service}</option>)}
              </select>

              <input type="date" value={callFilters.date === "All Dates" ? "" : callFilters.date} onChange={(event) => setCallFilters((current) => ({ ...current, date: event.target.value || "All Dates" }))} />

              <button className="crm-executive-filter-button" onClick={resetCallFilters}>Reset Filters</button>
            </div>

            <div className="crm-executive-call-toolbar">
              <span>Showing {Math.min(callRows.length, (currentPage - 1) * rowsPerPage + 1)}–{Math.min(currentPage * rowsPerPage, callRows.length)} of {callRows.length} leads</span>
              <div>
                <button className="crm-executive-export-btn" onClick={exportExcel}>Export Excel</button>
                <button className="crm-executive-export-btn secondary" onClick={exportPdf}>Export PDF</button>
                <button className="crm-executive-export-btn ghost" onClick={() => setCurrentPage(1)}>Refresh</button>
              </div>
            </div>

            {isCallLoading ? (
              <div className="crm-executive-skeleton-wrap">
                <div className="crm-executive-skeleton-row" />
                <div className="crm-executive-skeleton-row short" />
                <div className="crm-executive-skeleton-row" />
              </div>
            ) : callError ? (
              <div className="crm-executive-empty state-error">
                <strong>Unable to load contacts.</strong>
                <button onClick={() => setCallError("")}>Retry</button>
              </div>
            ) : (
              <div className="crm-executive-table-wrap">
                <table className="crm-executive-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Lead / Customer</th>
                      <th>Contact</th>
                      <th>Lead Type</th>
                      <th>Service / Course</th>
                      <th>Call Status</th>
                      <th>Lead Status</th>
                      <th>Follow-up</th>
                      <th>Remark</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length ? paginatedRows.map((lead, index) => {
                      const key = lead.id || lead._id;
                      const draft = callEditMap[key] || lead;
                      return (
                        <tr key={key}>
                          <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                          <td>{displayDate(lead.assignedDate || lead.createdAt)}</td>
                          <td>
                            <div className="crm-executive-contact-name">
                              <strong>{lead.name}</strong>
                              <small>{lead.email || "No email"}</small>
                            </div>
                          </td>
                          <td>
                            <div className="crm-executive-contact-phone">
                              <span>{lead.phone}</span>
                              <div className="crm-executive-mini-actions">
                                <button className="crm-executive-mini-call" onClick={() => window.open(`tel:${lead.phone}`)}><PhoneCall size={14} /></button>
                                <button className="crm-executive-mini-whatsapp" onClick={() => window.open(`https://wa.me/${String(lead.phone).replace(/\D/g, "")}`)}><MessageSquareText size={14} /></button>
                              </div>
                            </div>
                          </td>
                          <td>
                            <select value={draft.leadType || draft.type || "IT Service"} onChange={(event) => setCallEditMap((current) => ({ ...current, [key]: { ...draft, leadType: event.target.value } }))}>
                              {leadTypeOptions.map((type) => <option key={type}>{type}</option>)}
                            </select>
                          </td>
                          <td>
                            <select value={draft.service || draft.interest || draft.courseInterest || draft.programInterest || "Website Development"} onChange={(event) => setCallEditMap((current) => ({ ...current, [key]: { ...draft, service: event.target.value } }))}>
                              {serviceOptions.map((service) => <option key={service}>{service}</option>)}
                            </select>
                          </td>
                          <td>
                            <select value={draft.callStatus || lead.callStatus || "Pending"} onChange={(event) => setCallEditMap((current) => ({ ...current, [key]: { ...draft, callStatus: event.target.value } }))}>
                              {callStatusOptions.map((status) => <option key={status}>{status}</option>)}
                            </select>
                          </td>
                          <td>
                            <select value={draft.leadStatus || draft.status || lead.status || "New"} onChange={(event) => setCallEditMap((current) => ({ ...current, [key]: { ...draft, leadStatus: event.target.value, status: event.target.value } }))}>
                              {leadStatusOptions.map((status) => <option key={status}>{status}</option>)}
                            </select>
                          </td>
                          <td>
                            <div className="crm-executive-followup-cell">
                              <input type="date" value={draft.followUpDate || ""} onChange={(event) => setCallEditMap((current) => ({ ...current, [key]: { ...draft, followUpDate: event.target.value } }))} />
                              <input type="time" value={draft.followUpTime || ""} onChange={(event) => setCallEditMap((current) => ({ ...current, [key]: { ...draft, followUpTime: event.target.value } }))} />
                            </div>
                          </td>
                          <td>
                            <textarea value={draft.remark || draft.notes || ""} onChange={(event) => setCallEditMap((current) => ({ ...current, [key]: { ...draft, remark: event.target.value, notes: event.target.value } }))} />
                          </td>
                          <td>
                            <button className="crm-executive-save-btn" onClick={() => handleCallUpdate(lead)} disabled={savingLeadId === key}>{savingLeadId === key ? "Saving..." : "Save"}</button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={11} className="crm-executive-empty-row">
                          <div className="crm-executive-empty state-empty">
                            <strong>No contacts have been assigned to you yet.</strong>
                            <span>No contacts match your current filters.</span>
                            <button onClick={resetCallFilters}>Clear Filters</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {callRows.length > rowsPerPage && !isCallLoading && !callError && (
              <div className="crm-executive-pagination">
                <label>
                  Rows per page
                  <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value))}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <div className="pagination-buttons">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Previous</button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map((page) => (
                    <button key={page} className={page === currentPage ? "active" : ""} onClick={() => setCurrentPage(page)}>{page}</button>
                  ))}
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>Next</button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "leads" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header"><h2>My Leads</h2></div>
            <div className="crm-executive-list-grid">
              {myLeads.length ? myLeads.map((lead) => (
                <div className="crm-executive-lead-card" key={lead.id || lead._id}>
                  <div className="crm-executive-lead-card-top"><div className="crm-executive-lead-avatar">{initials(lead.name)}</div><div><strong>{lead.name}</strong><small>{lead.city || "No city"}</small></div></div>
                  <div className="crm-executive-info-list">
                    <span><UserRound size={14} /> {lead.phone}</span>
                    <span><Target size={14} /> {lead.interest || lead.type || "Lead"}</span>
                    <span><Clock3 size={14} /> {normaliseLeadStatus(lead)}</span>
                  </div>
                  <div className="crm-executive-lead-card-actions">
                    <button onClick={() => window.open(`tel:${lead.phone}`)}>Call</button>
                    <button onClick={() => window.open(`https://wa.me/${String(lead.phone).replace(/\D/g, "")}`)}>WhatsApp</button>
                  </div>
                </div>
              )) : <EmptyState message="No leads assigned to you yet." />}
            </div>
          </section>
        )}

        {activeTab === "sales-reports" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header"><h2>Sales Reports</h2></div>
            <div className="crm-executive-summary-grid">
              <SummaryCard icon={<Users />} title="Total Leads" value={salesTotals.totalLeads} />
              <SummaryCard icon={<Target />} title="Interested Leads" value={salesTotals.interestedLeads} />
              <SummaryCard icon={<CheckCircle2 />} title="Converted Leads" value={salesTotals.convertedLeads} />
              <SummaryCard icon={<X />} title="Lost Leads" value={salesTotals.lostLeads} />
              <SummaryCard icon={<Clock3 />} title="Follow-ups" value={salesTotals.followUpsCount} />
              <SummaryCard icon={<Gauge />} title="Conversion Rate" value={`${salesTotals.conversionRate}%`} />
            </div>
          </section>
        )}

        {activeTab === "tasks" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header"><h2>Tasks</h2></div>
            <div className="crm-executive-task-list">
              {taskItems.length ? taskItems.map((task) => (
                <div className="crm-executive-task-item" key={task.id || task._id}>
                  <div>
                    <strong>{task.title}</strong>
                    <small>{task.priority} · Due {displayDate(task.due)}</small>
                  </div>
                  <span className={`crm-executive-status-badge ${String(task.status).toLowerCase().replace(/\s+/g, "-")}`}>{task.status}</span>
                </div>
              )) : <EmptyState message="No tasks assigned to you yet." />}
            </div>
          </section>
        )}

        {activeTab === "sales-summary" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header"><h2>Sales Summary</h2></div>
            <div className="crm-executive-summary-grid">
              <SummaryCard icon={<Users />} title="Leads Assigned" value={salesTotals.totalLeads} />
              <SummaryCard icon={<PhoneCall />} title="Calls Completed" value={myLeads.filter((lead) => /completed|interested/i.test(String(lead.callStatus || lead.status || ""))).length} />
              <SummaryCard icon={<Clock3 />} title="Follow-ups" value={salesTotals.followUpsCount} />
              <SummaryCard icon={<BadgeCheck />} title="Interested" value={salesTotals.interestedLeads} />
              <SummaryCard icon={<CheckCircle2 />} title="Converted" value={salesTotals.convertedLeads} />
              <SummaryCard icon={<Wallet />} title="Conversion %" value={`${salesTotals.conversionRate}%`} />
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header"><h2>Settings</h2></div>
            <div className="crm-executive-settings-grid">
              <div className="crm-executive-settings-card">
                <strong>Profile</strong>
                <div className="crm-executive-settings-row"><span>Name</span><b>{user?.name || "CRM Executive"}</b></div>
                <div className="crm-executive-settings-row"><span>Email</span><b>{user?.email || "Not provided"}</b></div>
                <div className="crm-executive-settings-row"><span>Phone</span><b>{user?.phone || "Not provided"}</b></div>
                <div className="crm-executive-settings-row"><span>Role</span><b>{user?.role || "CRM Executive"}</b></div>
              </div>
              <div className="crm-executive-settings-card">
                <strong>Account Preferences</strong>
                <div className="crm-executive-settings-row"><span>Dashboard</span><b>Enabled</b></div>
                <div className="crm-executive-settings-row"><span>Call Notifications</span><b>Enabled</b></div>
                <div className="crm-executive-settings-row"><span>Lead Reminders</span><b>Enabled</b></div>
                <div className="crm-executive-settings-row"><span>Security</span><b>Uses existing auth flow</b></div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "attendance" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header"><h2>Mark Attendance</h2></div>
            <div className="crm-executive-attendance-box">
              <div className="crm-executive-status-block">
                <strong>Today's status</strong>
                <span>{todayAttendance?.status || "Not marked"}</span>
              </div>
              <div className="crm-executive-attendance-actions">
                <select value={attendanceStatus} onChange={(event) => setAttendanceStatus(event.target.value)}>
                  <option>Present</option>
                  <option>Absent</option>
                  <option>Late</option>
                  <option>Leave</option>
                </select>
                <button onClick={submitAttendance}>Save attendance</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "attendance-report" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header"><h2>Attendance Report</h2></div>
            <div className="crm-executive-table-wrap">
              <table className="crm-executive-table">
                <thead><tr><th>Date</th><th>Status</th><th>Check-in</th><th>Check-out</th></tr></thead>
                <tbody>
                  {attendance.length ? attendance.map((entry) => (
                    <tr key={entry.id || entry._id}><td>{entry.date}</td><td>{entry.status}</td><td>--</td><td>--</td></tr>
                  )) : <tr><td colSpan={4} className="crm-executive-empty-row">No attendance records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "leave-request" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header"><h2>Leave Request</h2></div>
            <form className="crm-executive-leave-form" onSubmit={submitLeaveRequest}>
              <select value={leaveForm.type} onChange={(event) => setLeaveForm((current) => ({ ...current, type: event.target.value }))}><option>Casual</option><option>Sick</option><option>Earned</option><option>Personal</option></select>
              <input type="date" value={leaveForm.from} onChange={(event) => setLeaveForm((current) => ({ ...current, from: event.target.value }))} />
              <input type="date" value={leaveForm.to} onChange={(event) => setLeaveForm((current) => ({ ...current, to: event.target.value }))} />
              <textarea value={leaveForm.reason} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason for leave" />
              <button type="submit">Submit Leave</button>
            </form>
            <div className="crm-executive-table-wrap">
              <table className="crm-executive-table">
                <thead><tr><th>Type</th><th>From</th><th>To</th><th>Status</th></tr></thead>
                <tbody>
                  {leaveRequests.length ? leaveRequests.map((entry) => (
                    <tr key={entry.id || entry._id}><td>{entry.type}</td><td>{entry.from}</td><td>{entry.to}</td><td>{entry.status}</td></tr>
                  )) : <tr><td colSpan={4} className="crm-executive-empty-row">No leave requests found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "adds-list" && (
          <section className="crm-executive-panel">
            <div className="crm-executive-panel-header"><h2>Ads List</h2></div>
            <div className="crm-executive-summary-grid">
              {Object.entries(myLeads.reduce((acc, lead) => {
                const key = String(lead.source || lead.leadSource || "Website");
                acc[key] = (acc[key] || 0) + 1;
                return acc;
              }, {})).map(([source, count]) => (
                <SummaryCard key={source} icon={<Megaphone />} title={source} value={count} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Kpi({ label, value, note, icon, tone = "brand" }) {
  return <article className={`crm-executive-kpi ${tone}`}><span>{icon}</span><strong>{value}</strong><p>{label}</p><small>{note}</small></article>;
}

function Metric({ value, label }) {
  return <div className="crm-executive-metric"><strong>{value}</strong><span>{label}</span></div>;
}

function SummaryCard({ icon, title, value }) {
  return <div className="crm-executive-summary-card"><span>{icon}</span><strong>{value}</strong><p>{title}</p></div>;
}

function EmptyState({ message }) {
  return <div className="crm-executive-empty">{message}</div>;
}

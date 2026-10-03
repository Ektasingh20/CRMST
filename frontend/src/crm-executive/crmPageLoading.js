export function isCrmPageLoading(tab, { callsLoading, leadsLoading, tasksLoaded, attendanceLoaded, leavesLoaded, notificationsLoaded }) {
  if (tab === "dashboard") return callsLoading || leadsLoading || !tasksLoaded || !leavesLoaded;
  if (["servicecalllist", "trainingcalllist", "leads", "salesreports"].includes(tab)) return callsLoading;
  if (tab === "approvedleads") return callsLoading || leadsLoading;
  if (tab === "tasks") return !tasksLoaded;
  if (["markattendance", "attendancereport"].includes(tab)) return !attendanceLoaded;
  if (tab === "leaverequest") return !leavesLoaded;
  if (tab === "notifications") return !notificationsLoaded;
  return false;
}

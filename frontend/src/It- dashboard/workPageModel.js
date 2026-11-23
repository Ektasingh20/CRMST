const displayStatus = (status) => {
  const value = String(status || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (["completed", "complete", "done"].includes(value)) return "Completed";
  if (["in progress", "inprogress", "started"].includes(value)) return "In Progress";
  return "To Do";
};

export function getTaskStatusCounts(tasks) {
  return (tasks || []).reduce((counts, task) => {
    counts[displayStatus(task.status)] += 1;
    counts.all += 1;
    return counts;
  }, { all: 0, "To Do": 0, "In Progress": 0, Completed: 0 });
}

export function filterTasks(tasks, { query = "", priority = "All priorities", from = "", to = "" } = {}) {
  const search = query.trim().toLowerCase();
  return (tasks || []).filter((task) => {
    const searchable = [
      task.title, task.task, task.name, task.description, task.desc,
      task.assignee, task.assignedToName, task.assigneeName, task.createdBy,
      task.assignedByName, task.createdByName,
    ].filter(Boolean).join(" ").toLowerCase();
    const taskPriority = String(task.priority || "").toLowerCase();
    const created = String(task.createdAt || task.createdDate || task.createdOn || "").slice(0, 10);
    return (!search || searchable.includes(search))
      && (priority === "All priorities" || taskPriority === priority.toLowerCase())
      && (!from || (created && created >= from))
      && (!to || (created && created <= to));
  });
}

export function inclusiveLeaveDuration(from, to) {
  if (!from || !to || to < from) return 0;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

export function filterITNotifications(notifications, user) {
  const userIds = new Set([user?.id, user?._id].filter(Boolean).map(String));
  return (notifications || []).filter((item) => {
    const type = String(item.type || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const recipientMatches = userIds.size === 0 || userIds.has(String(item.recipientId || ""));
    return recipientMatches && ["task_assigned", "hr_helpdesk_message", "project_assigned"].includes(type);
  });
}

export function notificationDestination(notification) {
  const description = `${notification.type || ""} ${notification.category || ""} ${notification.message || notification.title || ""}`.toLowerCase();
  if (description.includes("helpdesk")) return "hr-helpdesk";
  if (description.includes("project")) return "new-projects";
  if (description.includes("leave")) return "leave-request";
  if (description.includes("task")) return "tasks";
  if (description.includes("attendance")) return "attendance-report";
  if (description.includes("bug")) return "open-bugs";
  if (description.includes("clarification")) return "clarification";
  if (description.includes("project")) return "active-projects";
  return "notifications";
}

export function notificationId(notification) {
  return String(notification.id || notification._id || "");
}

export function formatITDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", options);
}

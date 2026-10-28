export const PLANNER_TYPES = ["Task", "Onboarding", "Reminder", "Note"];

// Adapt existing tasks for the common workspace without copying them into planner storage.
export function taskToPlanner(task) {
  return { id: `task:${task.id}`, taskId: task.id, source: "task", type: "Task",
    title: task.title || "", notes: task.description || "", employeeId: String(task.assignedTo ?? ""),
    due: task.due || "", done: task.status === "Done", status: task.status || "Pending",
    priority: task.priority || "Medium", reminder: task.reminder || "None", steps: [], taskRecord: task };
}

export function plannerToTask(item, employees) {
  const employee = employees.find((entry) => String(entry.id) === item.employeeId);
  return { ...item.taskRecord, id: item.taskId ?? item.id, title: item.title, description: item.notes,
    assignedTo: employee?.id ?? item.taskRecord?.assignedTo ?? item.employeeId,
    assignedBy: item.taskRecord?.assignedBy ?? 1, due: item.due, priority: item.priority || "Medium",
    status: item.done ? "Done" : item.status === "Done" ? "Pending" : item.status || "Pending",
    reminder: item.reminder || "None" };
}
export const ONBOARDING_STEPS = ["Collect documents", "Prepare workstation", "Arrange orientation", "Introduce the team"];

export function plannerKey(profile) {
  return `hr_planner_v1:${encodeURIComponent(profile.company || "")}:${encodeURIComponent(profile.crm || "default")}`;
}

export function readPlanner(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return { items: [], error: "" };
    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.some((item) => !item || typeof item.id !== "string" ||
      typeof item.title !== "string" || !PLANNER_TYPES.includes(item.type) ||
      typeof item.done !== "boolean" || typeof item.due !== "string" ||
      typeof item.notes !== "string" || typeof item.employeeId !== "string" ||
      !Array.isArray(item.steps) || item.steps.some((step) => typeof step.label !== "string" || typeof step.done !== "boolean"))) {
      throw new Error("Invalid planner data");
    }
    return { items, error: "" };
  } catch {
    return { items: [], error: "Saved planner data could not be read. Changes may replace the saved planner. Other HR data is unaffected." };
  }
}

export function plannerStatus(item, today) {
  if (item.done) return "Completed";
  if (item.due && item.due < today) return "Overdue";
  if (item.due === today) return "Due today";
  return "Open";
}

export function togglePlannerStep(item, index) {
  const steps = item.steps.map((step, i) => i === index ? { ...step, done: !step.done } : step);
  return { ...item, steps, done: steps.length > 0 && steps.every((step) => step.done) };
}

export function filterPlanner(items, { query, type, status, employeeId }, today) {
  const search = query.trim().toLowerCase();
  return items.filter((item) => (!employeeId || item.employeeId === employeeId) && (type === "All" || item.type === type) &&
    (status === "All" || (status === "Open" ? !item.done : plannerStatus(item, today) === status)) &&
    `${item.title} ${item.notes}`.toLowerCase().includes(search))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due || "9999").localeCompare(b.due || "9999"));
}

import express from "express";
import { randomUUID } from "node:crypto";
import { authenticate } from "../middleware/auth.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { isAdmin, isHrUser } from "../utils/roles.js";
import { notifyUser } from "../services/appNotifications.js";

const router = express.Router();
router.use(authenticate);
const userId = (user) => String(user?.id || user?._id || "");
<<<<<<< Updated upstream
const isCrmExecutive = (user) => ["crm executive", "crm_executive"].includes(String(user?.role || "").trim().toLowerCase());
const canManageTasks = (user) => isAdmin(user) || isHrUser(user);
=======
>>>>>>> Stashed changes
const taskJson = (task) => ({ id: task.id || String(task._id), ...task.toObject() });
const ownsTask = (task, user) => [task.assigneeId, task.createdById].filter(Boolean).map(String).includes(userId(user));

function taskDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}${parts.month}${parts.day}`;
}

const nextTaskId = () => `TASK-${taskDateKey()}-${randomUUID().slice(0, 8).toUpperCase()}`;

function isAssignableEmployee(user) {
  const role = String(user?.role || "").trim().toLowerCase();
  const department = String(user?.dept || user?.department || "").trim().toLowerCase();
  return role !== "student"
    && !["student", "students"].includes(department);
}

async function resolveEmployee(id) {
  const user = await User.findOne({ id: String(id) }) || await User.findOne({ _id: String(id) });
  return user && isAssignableEmployee(user.toObject()) ? user.toObject() : null;
}

router.get("/", async (req, res) => {
  try {
<<<<<<< Updated upstream
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json((canManageTasks(req.user) ? tasks : tasks.filter((task) => ownsTask(task, req.user))).map(taskJson));
=======
    const tasks = await (isAdmin(req.user) ? Task.find() : Task.findForUser(userId(req.user))).sort({ createdAt: -1 });
    res.json(tasks.map(taskJson));
>>>>>>> Stashed changes
  } catch (error) { res.status(500).json({ error: error.message || "Unable to load tasks." }); }
});

router.post("/", async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };
    if (!String(payload.title || "").trim()) return res.status(400).json({ error: "Task title is required." });
<<<<<<< Updated upstream
    const assignee = canManageTasks(req.user) ? await resolveEmployee(payload.assigneeId) : isCrmExecutive(req.user) ? req.user : null;
    if (!assignee) return res.status(canManageTasks(req.user) ? 400 : 403).json({ error: canManageTasks(req.user) ? "Choose an active employee assignee." : "Only CRM Executives can create personal tasks." });
    const now = new Date().toISOString();
    const task = await Task.create({ id: await nextTaskId(), title: String(payload.title).trim(), description: String(payload.description || "").trim(), priority: payload.priority || "Medium", status: payload.status || "To Do", dueDate: payload.dueDate || "", reminder: payload.reminder || "", assigneeId: userId(assignee), assignee: assignee.name || assignee.username || "CRM Executive", createdById: userId(req.user), createdBy: req.user.name || req.user.username || "Admin", createdAt: now, updatedAt: now });
=======
    const assignee = isAdmin(req.user) ? await resolveEmployee(payload.assigneeId) : isAssignableEmployee(req.user) ? req.user : null;
    if (!assignee) return res.status(isAdmin(req.user) ? 400 : 403).json({ error: isAdmin(req.user) ? "Choose an employee assignee." : "Only employees can create personal tasks." });
    const now = new Date().toISOString();
    const task = await Task.create({ id: await nextTaskId(), title: String(payload.title).trim(), description: String(payload.description || "").trim(), priority: payload.priority || "Medium", status: payload.status || "To Do", dueDate: payload.dueDate || "", assigneeId: userId(assignee), assignee: assignee.name || assignee.username || "Employee", assigneeRole: assignee.role || "", assigneeDepartment: assignee.dept || assignee.department || "", createdById: userId(req.user), createdBy: req.user.name || req.user.username || "Admin", createdAt: now, updatedAt: now });
>>>>>>> Stashed changes
    await notifyUser(task.assigneeId, { type: "task_assigned", message: `You were assigned a task: ${task.title}.` });
    res.status(201).json(taskJson(task));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to create task." }); }
});

router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findOne({ id: String(req.params.id) });
    if (!task) return res.status(404).json({ error: "Task not found." });
<<<<<<< Updated upstream
    if (!canManageTasks(req.user) && (!isCrmExecutive(req.user) || !ownsTask(task, req.user))) return res.status(403).json({ error: "You can only update your own tasks." });
=======
    if (!isAdmin(req.user) && (!isAssignableEmployee(req.user) || !ownsTask(task, req.user))) return res.status(403).json({ error: "You can only update your own tasks." });
>>>>>>> Stashed changes
    const payload = { ...(req.body || {}) };
    if (!isAdmin(req.user)) { delete payload.assigneeId; delete payload.assignee; delete payload.createdById; delete payload.createdBy; }
    if (canManageTasks(req.user) && payload.assigneeId && String(payload.assigneeId) !== String(task.assigneeId || "")) {
      const assignee = await resolveEmployee(payload.assigneeId);
      if (!assignee) return res.status(400).json({ error: "Choose an active employee assignee." });
      payload.assigneeId = userId(assignee); payload.assignee = assignee.name || assignee.username || "Employee";
      payload.assigneeRole = assignee.role || ""; payload.assigneeDepartment = assignee.dept || assignee.department || "";
    }
    const wasCompleted = String(task.status || "") === "Done";
    Object.assign(task, payload, { updatedAt: new Date().toISOString() }); await task.save();
    if (!wasCompleted && String(task.status || "") === "Done") await notifyUser(task.createdById, { type: "task_completed", message: `${task.assignee || "A CRM Executive"} completed: ${task.title}.` });
    res.json(taskJson(task));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to update task." }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOne({ id: String(req.params.id) });
    if (!task) return res.json({ success: true });
    if (!canManageTasks(req.user) && String(task.createdById || "") !== userId(req.user)) return res.status(403).json({ error: "Only the task creator can delete this task." });
    await Task.findOneAndDelete({ id: String(req.params.id) }); res.json({ success: true });
  } catch (error) { res.status(400).json({ error: error.message || "Unable to delete task." }); }
});

export default router;

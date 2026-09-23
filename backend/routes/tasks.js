import express from "express";
import { authenticate } from "../middleware/auth.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { isAdmin } from "../utils/roles.js";
import { notifyUser } from "../services/appNotifications.js";

const router = express.Router();
router.use(authenticate);
const userId = (user) => String(user?.id || user?._id || "");
const isCrmExecutive = (user) => ["crm executive", "crm_executive"].includes(String(user?.role || "").trim().toLowerCase());
const taskJson = (task) => ({ id: task.id || String(task._id), ...task.toObject() });
const ownsTask = (task, user) => [task.assigneeId, task.createdById].filter(Boolean).map(String).includes(userId(user));

function taskDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}${parts.month}${parts.day}`;
}

async function nextTaskId() {
  const prefix = `TASK-${taskDateKey()}-`;
  const sameDayTasks = await Task.find({ id: { $regex: `^${prefix}` } });
  const highestSequence = sameDayTasks.reduce((highest, task) => {
    const sequence = Number(String(task.id || "").slice(prefix.length));
    return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  return `${prefix}${String(highestSequence + 1).padStart(3, "0")}`;
}

async function resolveCrmExecutive(id) {
  const user = await User.findOne({ id: String(id) }) || await User.findOne({ _id: String(id) });
  return user && isCrmExecutive(user.toObject()) ? user.toObject() : null;
}

router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json((isAdmin(req.user) ? tasks : tasks.filter((task) => ownsTask(task, req.user))).map(taskJson));
  } catch (error) { res.status(500).json({ error: error.message || "Unable to load tasks." }); }
});

router.post("/", async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };
    if (!String(payload.title || "").trim()) return res.status(400).json({ error: "Task title is required." });
    const assignee = isAdmin(req.user) ? await resolveCrmExecutive(payload.assigneeId) : isCrmExecutive(req.user) ? req.user : null;
    if (!assignee) return res.status(403).json({ error: isAdmin(req.user) ? "Choose a CRM Executive assignee." : "Only CRM Executives can create personal tasks." });
    const now = new Date().toISOString();
    const task = await Task.create({ id: await nextTaskId(), title: String(payload.title).trim(), description: String(payload.description || "").trim(), priority: payload.priority || "Medium", status: payload.status || "To Do", dueDate: payload.dueDate || "", assigneeId: userId(assignee), assignee: assignee.name || assignee.username || "CRM Executive", createdById: userId(req.user), createdBy: req.user.name || req.user.username || "Admin", createdAt: now, updatedAt: now });
    await notifyUser(task.assigneeId, { type: "task_assigned", message: `You were assigned a task: ${task.title}.` });
    res.status(201).json(taskJson(task));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to create task." }); }
});

router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findOne({ id: String(req.params.id) });
    if (!task) return res.status(404).json({ error: "Task not found." });
    if (!isAdmin(req.user) && (!isCrmExecutive(req.user) || !ownsTask(task, req.user))) return res.status(403).json({ error: "You can only update your own tasks." });
    const payload = { ...(req.body || {}) };
    if (!isAdmin(req.user)) { delete payload.assigneeId; delete payload.assignee; delete payload.createdById; delete payload.createdBy; }
    if (isAdmin(req.user) && payload.assigneeId && String(payload.assigneeId) !== String(task.assigneeId || "")) {
      const assignee = await resolveCrmExecutive(payload.assigneeId);
      if (!assignee) return res.status(400).json({ error: "Tasks can only be assigned to CRM Executives." });
      payload.assigneeId = userId(assignee); payload.assignee = assignee.name || assignee.username || "CRM Executive";
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
    if (!isAdmin(req.user) && String(task.createdById || "") !== userId(req.user)) return res.status(403).json({ error: "Only the task creator can delete this task." });
    await Task.findOneAndDelete({ id: String(req.params.id) }); res.json({ success: true });
  } catch (error) { res.status(400).json({ error: error.message || "Unable to delete task." }); }
});

export default router;

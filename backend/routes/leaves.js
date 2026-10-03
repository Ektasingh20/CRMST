import express from "express";
import { authenticate } from "../middleware/auth.js";
import { createLeave, listLeaves, saveLeave } from "../models/Leave.js";
import { isAdmin } from "../utils/roles.js";
import { notifyAdmins, notifyUser } from "../services/appNotifications.js";
import { leaveDaysInclusive } from "../utils/leaveDuration.js";

const router = express.Router();
router.use(authenticate);

const userId = (user) => String(user?.id || user?._id || "");
const isCrmExecutive = (user) => ["crm executive", "crm_executive"].includes(String(user?.role || "").trim().toLowerCase());
const leaveJson = (leave) => {
  const { _ref, ...data } = leave;
  return { ...data, days: Number(data.days) > 0 ? Number(data.days) : leaveDaysInclusive(data.from, data.to) };
};
const ownsLeave = (leave, user) => String(leave.employeeId || "") === userId(user);

router.get("/", async (req, res) => {
  try {
    const leaves = await listLeaves();
    const visibleLeaves = isAdmin(req.user) ? leaves : leaves.filter((leave) => ownsLeave(leave, req.user));
    await Promise.all(visibleLeaves.map(async (leave) => {
      if (Number(leave.days) > 0) return;
      const days = leaveDaysInclusive(leave.from, leave.to);
      if (days === null) return;
      leave.days = days;
      await saveLeave(leave);
    }));
    res.json(visibleLeaves.map(leaveJson));
  } catch (error) { res.status(500).json({ error: error.message || "Unable to load leave requests." }); }
});

router.post("/", async (req, res) => {
  try {
    if (!isCrmExecutive(req.user)) return res.status(403).json({ error: "Only CRM Executives can submit leave requests." });
    const { type, from, to, reason } = req.body || {};
    if (!String(type || "").trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(from || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(to || "")) || !String(reason || "").trim()) return res.status(400).json({ error: "Type, dates, and reason are required." });
    const days = leaveDaysInclusive(from, to);
    if (days === null) return res.status(400).json({ error: "Choose valid dates with the end date on or after the start date." });
    const now = new Date().toISOString();
    const leave = await createLeave({ id: `LEAVE-${Date.now()}-${userId(req.user)}`, employeeId: userId(req.user), employeeName: req.user.name || req.user.username || "CRM Executive", type: String(type).trim(), from, to, days, reason: String(reason).trim(), status: "Pending", appliedOn: now.slice(0, 10), createdAt: now, updatedAt: now });
    await notifyAdmins({ type: "leave_created", message: `${leave.employeeName} submitted a ${days}-day ${leave.type} request (${from} to ${to}).` });
    res.status(201).json(leaveJson(leave));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to submit leave request." }); }
});

router.put("/:id", async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ error: "Only Admin can decide leave requests." });
    const leave = (await listLeaves()).find((item) => item.id === String(req.params.id));
    if (!leave) return res.status(404).json({ error: "Leave request not found." });
    const status = String(req.body?.status || "");
    if (!["Approved", "Rejected"].includes(status)) return res.status(400).json({ error: "Choose Approved or Rejected." });
    leave.status = status;
    leave.updatedAt = new Date().toISOString();
    await saveLeave(leave);
    await notifyUser(leave.employeeId, { type: "leave_status", message: `Your ${leave.type} request was ${status.toLowerCase()}.` });
    res.json(leaveJson(leave));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to update leave request." }); }
});

export default router;

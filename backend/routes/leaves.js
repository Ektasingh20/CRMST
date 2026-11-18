import express from "express";
import { authenticate } from "../middleware/auth.js";
import { createLeave, getLeaveById, listEmployeeLeaves, listLeaves, saveLeave } from "../models/Leave.js";
import { isAdmin, isHrUser } from "../utils/roles.js";
import { notifyAdmins, notifyUser } from "../services/appNotifications.js";
import { leaveDaysInclusive, validateLeaveApplicationDates } from "../utils/leaveDuration.js";
import { isActiveEmployee } from "../services/attendanceStore.js";
import { indiaDateString } from "../services/attendanceTime.js";

const router = express.Router();
router.use(authenticate);

const userId = (user) => String(user?.id || user?._id || "");
const leaveJson = (leave) => {
  const { _ref, ...data } = leave;
  return { ...data, days: Number(data.days) > 0 ? Number(data.days) : leaveDaysInclusive(data.from, data.to) };
};

router.get("/", async (req, res) => {
  try {
    const visibleLeaves = isAdmin(req.user) || isHrUser(req.user)
      ? await listLeaves()
      : await listEmployeeLeaves(userId(req.user));
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
    if (!isActiveEmployee(req.user) || !userId(req.user)) return res.status(403).json({ error: "Only active employees can submit leave requests." });
    const { type, from, to, reason } = req.body || {};
    if (!String(type || "").trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(from || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(to || "")) || !String(reason || "").trim()) return res.status(400).json({ error: "Type, dates, and reason are required." });
    const today = indiaDateString();
    const dateError = validateLeaveApplicationDates(from, to, today);
    if (dateError) return res.status(400).json({ error: dateError });
    const days = leaveDaysInclusive(from, to);
    const employeeId = userId(req.user);
    const existingLeaves = await listEmployeeLeaves(employeeId);
    const overlappingLeave = existingLeaves.find((leave) => (
      ["pending", "approved"].includes(String(leave.status || "").toLowerCase())
      && String(leave.from || "") <= to
      && String(leave.to || "") >= from
    ));
    if (overlappingLeave) return res.status(409).json({ error: "A pending or approved leave request already covers one or more selected dates." });
    const now = new Date().toISOString();
    const leave = await createLeave({ id: `LEAVE-${Date.now()}-${employeeId}`, employeeId, employeeName: req.user.name || req.user.username || "Employee", type: String(type).trim(), from, to, days, reason: String(reason).trim(), status: "Pending", appliedOn: today, createdAt: now, updatedAt: now });
    await notifyAdmins({ type: "leave_created", message: `${leave.employeeName} submitted a ${days}-day ${leave.type} request (${from} to ${to}).` });
    res.status(201).json(leaveJson(leave));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to submit leave request." }); }
});

router.put("/:id", async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ error: "Only Admin can decide leave requests." });
    const leave = await getLeaveById(req.params.id);
    if (!leave) return res.status(404).json({ error: "Leave request not found." });
    const status = String(req.body?.status || "");
    if (!["Approved", "Rejected"].includes(status)) return res.status(400).json({ error: "Choose Approved or Rejected." });
    leave.status = status;
    leave.updatedAt = new Date().toISOString();
    leave.approvedBy = req.user.name || req.user.username || "Admin";
    leave.approvedAt = leave.updatedAt;
    await saveLeave(leave);
    await notifyUser(leave.employeeId, { type: "leave_status", message: `Your ${leave.type} request was ${status.toLowerCase()}.` });
    res.json(leaveJson(leave));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to update leave request." }); }
});

export default router;

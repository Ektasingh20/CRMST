import express from "express";
import { authenticate } from "../middleware/auth.js";
import Attendance from "../models/Attendance.js";
import { isAdmin } from "../utils/roles.js";
import { notifyAdmins } from "../services/appNotifications.js";

const router = express.Router();
router.use(authenticate);

const userId = (user) => String(user?.id || user?._id || "");
const isCrmExecutive = (user) => ["crm executive", "crm_executive"].includes(String(user?.role || "").trim().toLowerCase());
const attendanceJson = (record) => ({ id: record.id || String(record._id), ...record.toObject() });
const ownsRecord = (record, user) => String(record.employeeId || "") === userId(user);
const attendanceId = (user, date) => `ATT-${String(date).replaceAll("-", "")}-${userId(user)}`;
const currentTime = () => new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

router.get("/", async (req, res) => {
  try {
    const records = await Attendance.find().sort({ date: -1 });
    const visible = isAdmin(req.user) ? records : records.filter((record) => ownsRecord(record, req.user));
    res.json(visible.map(attendanceJson));
  } catch (error) { res.status(500).json({ error: error.message || "Unable to load attendance." }); }
});

router.post("/", async (req, res) => {
  try {
    if (!isCrmExecutive(req.user)) return res.status(403).json({ error: "Only CRM Executives can mark attendance." });
    const { date, status, remark = "" } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return res.status(400).json({ error: "A valid attendance date is required." });
    if (!["Present", "Absent"].includes(status)) return res.status(400).json({ error: "Select Present or Absent." });
    const id = attendanceId(req.user, date);
    if (await Attendance.findOne({ id })) return res.status(409).json({ error: "Attendance is already marked for this date." });
    const now = new Date().toISOString();
    const record = await Attendance.create({ id, employeeId: userId(req.user), employeeName: req.user.name || req.user.username || "CRM Executive", date, status, checkIn: currentTime(), checkOut: "", remark: String(remark).trim(), createdAt: now, updatedAt: now });
    await notifyAdmins({ type: "attendance_marked", message: `${record.employeeName} marked ${status} attendance for ${date}.` });
    res.status(201).json(attendanceJson(record));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to mark attendance." }); }
});

router.put("/:id", async (req, res) => {
  try {
    const record = await Attendance.findOne({ id: String(req.params.id) });
    if (!record) return res.status(404).json({ error: "Attendance record not found." });
    if (!isCrmExecutive(req.user) || !ownsRecord(record, req.user)) return res.status(403).json({ error: "You can only update your own attendance." });
    if (record.checkOut) return res.status(400).json({ error: "Attendance has already been checked out." });
    record.checkOut = currentTime();
    record.updatedAt = new Date().toISOString();
    await record.save();
    res.json(attendanceJson(record));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to check out." }); }
});

export default router;

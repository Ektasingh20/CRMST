import express from "express";
import { authenticate } from "../middleware/auth.js";
import { listLeaves } from "../models/Leave.js";
import User from "../models/User.js";
import { isOfficialAttendanceRecord, listAttendanceForDate } from "../services/attendanceStore.js";
import { isAdmin, isHrUser } from "../utils/roles.js";

const router = express.Router();
router.use(authenticate, (req, res, next) => {
  if (!isAdmin(req.user) && !isHrUser(req.user)) return res.status(403).json({ error: "HR access required." });
  next();
});

let cached;
let cachedAt = 0;
let pending;
const todayInIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const active = (user) => !["inactive", "disabled", "ex", "former"].includes(String(user.status || "active").toLowerCase())
  && String(user.exEmployee || "").toLowerCase() !== "yes";

router.get("/", async (_req, res) => {
  try {
    if (cached && Date.now() - cachedAt < 60_000) return res.json(cached);
    if (!pending) pending = (async () => {
      const today = todayInIndia();
      const [users, attendanceRecords, allLeaves] = await Promise.all([
        User.find(),
        Attendance.find(),
        listLeaves(),
      ]);
      const attendance = attendanceRecords.map((record) => record.toObject());
      const todayAttendance = attendance.filter((record) => record.date === today);
      const leaves = allLeaves.filter((leave) => leave.status === "Pending");
      const employees = users.map((user) => user.toObject()).filter(active);
      const byStatus = { Present: 0, Absent: 0, Leave: 0 };
      todayAttendance.forEach((record) => { const status = record.status; if (status in byStatus) byStatus[status] += 1; });
      const departments = employees.reduce((counts, employee) => {
        const name = employee.dept || employee.department || "Other";
        counts[name] = (counts[name] || 0) + 1;
        return counts;
      }, {});
      return {
        date: today, employeeCount: employees.length, attendance: byStatus,
        markedCount: todayAttendance.length, pendingLeaveCount: leaves.length,
        attendanceRecords: attendance.map(({ id, employeeId, employeeName, date, status, checkIn, checkOut, remark }) => ({
          id, employeeId, employeeName, date, status, checkIn, checkOut, remark,
        })),
        pendingLeaves: leaves.slice(0, 5).map((leave) => ({ id: leave.id, employeeName: leave.employeeName || "Employee", type: leave.type || "Leave", from: leave.from || "", to: leave.to || "" })),
        departments,
      };
    })().finally(() => { pending = null; });
    cached = await pending;
    cachedAt = Date.now();
    res.json(cached);
  } catch (error) {
    console.error("Failed to load HR dashboard summary:", error);
    res.status(500).json({ error: "Unable to load HR dashboard." });
  }
});

export default router;

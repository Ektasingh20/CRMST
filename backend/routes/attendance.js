import express from "express";
import { timingSafeEqual } from "node:crypto";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { authenticate } from "../middleware/auth.js";
import { verifyAppCheckIfConfigured } from "../middleware/appCheck.js";
import { connectDatabase } from "../config/db.js";
import Attendance from "../models/Attendance.js";
import { isAdmin, isHrUser } from "../utils/roles.js";
import { notifyAdmins } from "../services/appNotifications.js";
import { autoMarkMissingAttendance, syncEmployeeAttendanceHistory } from "../services/attendanceAutomation.js";
import { getAttendanceCalendar, saveAttendanceCalendar } from "../services/attendanceCalendar.js";
import { listApprovedLeavesBetween } from "../models/Leave.js";
import { formatIndiaClock, indiaDateString, indiaMonthString } from "../services/attendanceTime.js";
import {
  checkInEmployee,
  checkOutEmployee,
  correctNestedAttendance,
  getAdminAttendanceSummary,
  getEmployeeAttendanceMonth,
  getEmployeeTodayAttendance,
  listAdminAttendanceMonth,
  listAdminAttendance,
  listLegacyAdminAttendance,
  markEmployeeAbsent,
} from "../services/attendanceStore.js";

const router = express.Router();
const historySyncRequests = new Map();

const userId = (user) => String(user?.id || user?._id || "");
const ownsRecord = (record, user) => String(record.employeeId || "") === userId(user);
const canSelfSyncAttendance = (user) => {
  const role = String(user?.role || "").trim().toLowerCase();
  const department = String(user?.dept || user?.department || "").trim().toLowerCase();
  return department === "crm" || department === "it" || role === "crm executive" || role === "it";
};
const sendAttendanceError = (res, error, fallback) => {
  if (error?.code === 9 || error?.code === "failed-precondition") {
    console.error("Attendance Firestore index is unavailable:", error?.message || fallback);
    return res.status(503).json({ error: "Attendance is preparing. Please try again shortly.", code: "attendance_index_unavailable" });
  }
  return res.status(Number(error?.status) || 400).json({
    error: error?.message || fallback,
    ...(error?.code ? { code: error.code } : {}),
  });
};

function mergeRecords(primary, legacy, limit = 50) {
  const byKey = new Map();
  legacy.forEach((record) => byKey.set(`${record.employeeId}:${record.date}`, record));
  primary.forEach((record) => byKey.set(`${record.employeeId}:${record.date}`, record));
  return [...byKey.values()]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, limit);
}

router.get("/auto-mark", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "Attendance cron is not configured." });
  const authorization = Buffer.from(String(req.headers.authorization || ""));
  const expected = Buffer.from(`Bearer ${secret}`);
  if (authorization.length !== expected.length || !timingSafeEqual(authorization, expected)) {
    return res.status(401).json({ error: "Unauthorized attendance cron request." });
  }

  try {
    await connectDatabase();
    const now = new Date();
    const result = await autoMarkMissingAttendance(now);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to auto-mark attendance." });
  }
});

router.use(authenticate);

router.post("/sync-history", verifyAppCheckIfConfigured, async (req, res) => {
  if (!canSelfSyncAttendance(req.user)) return res.status(403).json({ error: "Attendance synchronization is available to CRM and IT employees." });
  const id = userId(req.user);
  if (!historySyncRequests.has(id)) {
    const request = syncEmployeeAttendanceHistory(req.user)
      .finally(() => { if (historySyncRequests.get(id) === request) historySyncRequests.delete(id); });
    historySyncRequests.set(id, request);
  }
  try {
    const result = await historySyncRequests.get(id);
    return res.json({
      ...result,
      message: result.createdAbsences
        ? `Attendance synchronized through ${result.completedThrough}. ${result.createdAbsences} missing record${result.createdAbsences === 1 ? "" : "s"} finalized.`
        : `Attendance is already synchronized through ${result.completedThrough}.`,
    });
  } catch (error) {
    return sendAttendanceError(res, error, "Unable to synchronize attendance history.");
  }
});

router.get("/today", async (req, res) => {
  try {
    res.json(await getEmployeeTodayAttendance(req.user));
  } catch (error) {
    sendAttendanceError(res, error, "Unable to load today's attendance.");
  }
});

router.get("/month", async (req, res) => {
  try {
    const month = String(req.query.month || indiaMonthString());
    res.json(await getEmployeeAttendanceMonth(req.user, month));
  } catch (error) {
    sendAttendanceError(res, error, "Unable to load monthly attendance.");
  }
});

router.get("/calendar", async (req, res) => {
  try {
    res.json(await getAttendanceCalendar());
  } catch (error) {
    sendAttendanceError(res, error, "Unable to load the attendance calendar.");
  }
});

router.put("/calendar", async (req, res) => {
  if (!isAdmin(req.user) && !isHrUser(req.user)) return res.status(403).json({ error: "HR or Admin access required." });
  try {
    res.json(await saveAttendanceCalendar(req.body || {}));
  } catch (error) {
    sendAttendanceError(res, error, "Unable to save the attendance calendar.");
  }
});

router.get("/admin/month", async (req, res) => {
  if (!isAdmin(req.user) && !isHrUser(req.user)) return res.status(403).json({ error: "HR or Admin access required." });
  try {
    const month = String(req.query.month || indiaMonthString());
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: "A valid attendance month is required." });
    const [year, monthNumber] = month.split("-").map(Number);
    const yearMonths = Array.from({ length: monthNumber }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
    const [yearRecordGroups, yearLeaves, calendar] = await Promise.all([
      Promise.all(yearMonths.map((value) => listAdminAttendanceMonth(value))),
      listApprovedLeavesBetween(`${year}-01-01`, `${month}-31`),
      getAttendanceCalendar(),
    ]);
    const yearRecords = yearRecordGroups.flat();
    const records = yearRecordGroups.at(-1) || [];
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;
    const leaves = yearLeaves.filter((leave) => String(leave.from || "") <= monthEnd && String(leave.to || "") >= monthStart);
    res.json({ month, records, leaves, calendar, yearRecords, yearLeaves });
  } catch (error) {
    sendAttendanceError(res, error, "Unable to load the monthly attendance summary.");
  }
});

router.get("/admin/summary", async (req, res) => {
  if (!isAdmin(req.user) && !isHrUser(req.user)) return res.status(403).json({ error: "HR or Admin access required." });
  try {
    res.json(await getAdminAttendanceSummary(String(req.query.date || indiaDateString())));
  } catch (error) {
    sendAttendanceError(res, error, "Unable to load attendance summary.");
  }
});

router.get("/admin", async (req, res) => {
  if (!isAdmin(req.user) && !isHrUser(req.user)) return res.status(403).json({ error: "HR or Admin access required." });
  try {
    const filters = {
      month: req.query.month || "",
      date: req.query.date || "",
      employeeId: req.query.employeeId || "",
      status: req.query.status || "",
      pageSize: req.query.pageSize || 50,
      cursor: req.query.cursor || "",
    };
    const result = await listAdminAttendance(filters);
    if (!filters.cursor) {
      const legacy = await listLegacyAdminAttendance(filters);
      result.records = mergeRecords(result.records, legacy, Number(result.pageSize) || 50);
    }
    res.json(result);
  } catch (error) {
    sendAttendanceError(res, error, "Unable to load attendance records.");
  }
});

// Compatibility endpoint: employees receive only their selected month; HR and
// Admin receive one bounded current-month page instead of the full database.
router.get("/", async (req, res) => {
  try {
    const month = String(req.query.month || indiaMonthString());
    if (!isAdmin(req.user) && !isHrUser(req.user)) {
      return res.json(await getEmployeeAttendanceMonth(req.user, month));
    }
    const filters = { month, pageSize: 50 };
    const [nested, legacy] = await Promise.all([
      listAdminAttendance(filters),
      listLegacyAdminAttendance(filters),
    ]);
    return res.json(mergeRecords(nested.records, legacy, 50));
  } catch (error) {
    return sendAttendanceError(res, error, "Unable to load attendance.");
  }
});

async function checkIn(req, res) {
  try {
    const status = String(req.body?.status || "Present").trim().toLowerCase();
    const operation = status === "absent" ? markEmployeeAbsent : checkInEmployee;
    const result = await operation(req.user, { remark: req.body?.remark || "" });
    if (!result.idempotent) {
      await notifyAdmins({
        type: "attendance_marked",
        message: `${result.record.employeeName} marked ${result.record.status} attendance for ${result.record.date}.`,
      });
    }
    return res.status(result.idempotent ? 200 : 201).json(result.record);
  } catch (error) {
    return sendAttendanceError(res, error, "Unable to check in.");
  }
}

router.post("/check-in", verifyAppCheckIfConfigured, checkIn);
router.post("/", verifyAppCheckIfConfigured, checkIn);

async function checkoutLegacy(record, req, res) {
  if (!record || !ownsRecord(record, req.user)) return false;
  if (record.checkOut || record.checkOutAt) return res.json({ id: record.id || record._id, ...record.toObject() });
  if (!record.checkIn && !record.checkInAt) return false;
  const now = Timestamp.now();
  await getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(record._ref);
    if (!snapshot.exists) throw Object.assign(new Error("Attendance record not found."), { status: 404 });
    if (snapshot.data()?.checkOut || snapshot.data()?.checkOutAt) return;
    transaction.update(record._ref, {
      checkOutAt: now,
      checkOut: formatIndiaClock(now),
      attendanceState: "checked_out",
      updatedAt: now,
    });
  });
  const updated = await Attendance.findOne({ id: String(record.id || record._id) });
  return res.json({ id: updated.id || updated._id, ...updated.toObject() });
}

async function checkOut(req, res) {
  try {
    const result = await checkOutEmployee(req.user);
    return res.json(result.record);
  } catch (error) {
    if (error?.code === "not_checked_in") {
      const todayId = `ATT-${indiaDateString().replaceAll("-", "")}-${userId(req.user)}`;
      const legacy = await Attendance.findOne({ id: String(req.params?.id || todayId) });
      if (await checkoutLegacy(legacy, req, res)) return undefined;
    }
    return sendAttendanceError(res, error, "Unable to check out.");
  }
}

router.post("/check-out", verifyAppCheckIfConfigured, checkOut);
router.put("/:id", verifyAppCheckIfConfigured, checkOut);

router.patch("/:id", verifyAppCheckIfConfigured, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Only Admin can correct attendance." });
  try {
    try {
      return res.json(await correctNestedAttendance(String(req.params.id), req.user, req.body || {}));
    } catch (nestedError) {
      if (nestedError?.code !== "not_found") throw nestedError;
    }

    // Legacy records remain correctable until an approved migration is run.
    const record = await Attendance.findOne({ id: String(req.params.id) });
    if (!record) return res.status(404).json({ error: "Attendance record not found." });
    if (!record.autoMarked) return res.status(400).json({ error: "Only automatically marked attendance can be corrected here." });
    const status = String(req.body?.status || "");
    if (!["Present", "Absent"].includes(status)) return res.status(400).json({ error: "Choose Present or Absent." });
    const correctedAt = Timestamp.now();
    const previousStatus = record.status;
    const previousRemark = String(record.remark || "");
    const previousSource = String(record.source || "");
    record.status = status;
    record.correctedBy = req.user.name || req.user.username || "Admin";
    record.correctedById = userId(req.user);
    record.correctedAt = correctedAt;
    record.updatedAt = correctedAt;
    record.source = "admin_correction";
    record.remark = req.body?.remark !== undefined
      ? String(req.body.remark).trim().slice(0, 500)
      : `Corrected from ${previousStatus} to ${status} by ${record.correctedBy}.`;
    record.correction = {
      previousStatus,
      previousRemark,
      previousSource,
      status,
      correctedAt,
      correctedById: userId(req.user),
      correctedBy: record.correctedBy,
    };
    await record.save();
    return res.json({ id: record.id || record._id, ...record.toObject() });
  } catch (error) {
    return sendAttendanceError(res, error, "Unable to correct attendance.");
  }
});

export default router;

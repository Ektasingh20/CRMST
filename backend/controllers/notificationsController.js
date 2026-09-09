import { isMongoConnected } from "../config/db.js";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../config/firestoreNotificationModel.js";

function unavailable(res) {
  return res.status(503).json({ error: "Database is unavailable. Please try again later." });
}

function canAccessStudent(req, studentId) {
  return String(req.user?.id || req.user?._id) === String(studentId) || String(req.user?.role || "").toLowerCase() === "admin";
}

export async function getNotifications(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!canAccessStudent(req, req.params.studentId)) return res.status(403).json({ error: "You cannot access these notifications." });
  try { return res.json(await listNotifications(req.params.studentId)); } catch (err) { return res.status(500).json({ error: err.message }); }
}

export async function readNotification(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!canAccessStudent(req, req.params.studentId)) return res.status(403).json({ error: "You cannot update these notifications." });
  try { return res.json(await markNotificationRead(req.params.studentId, req.params.notificationId)); } catch (err) { return res.status(400).json({ error: err.message }); }
}

export async function readAllNotifications(req, res) {
  if (!isMongoConnected) return unavailable(res);
  if (!canAccessStudent(req, req.params.studentId)) return res.status(403).json({ error: "You cannot update these notifications." });
  try { return res.json({ updated: await markAllNotificationsRead(req.params.studentId) }); } catch (err) { return res.status(400).json({ error: err.message }); }
}
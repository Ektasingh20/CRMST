import express from "express";
import { authenticate } from "../middleware/auth.js";
import { getNotifications, readAllNotifications, readNotification } from "../controllers/notificationsController.js";
import AppNotification from "../models/AppNotification.js";

const router = express.Router();
router.use(authenticate);
const currentUserId = (req) => String(req.user?.id || req.user?._id || "");
const appJson = (item) => ({ id: item.id || String(item._id), ...item.toObject() });

router.get("/me", async (req, res) => {
  try { res.json((await AppNotification.find({ recipientId: currentUserId(req) }).sort({ createdAt: -1 })).map(appJson)); }
  catch (error) { res.status(500).json({ error: error.message || "Unable to load notifications." }); }
});
router.patch("/me/:notificationId/read", async (req, res) => {
  try {
    const item = await AppNotification.findOne({ id: String(req.params.notificationId) });
    if (!item || String(item.recipientId) !== currentUserId(req)) return res.status(404).json({ error: "Notification not found." });
    item.read = true; await item.save(); res.json(appJson(item));
  } catch (error) { res.status(400).json({ error: error.message || "Unable to update notification." }); }
});
router.get("/:studentId", getNotifications);
router.patch("/:studentId/read-all", readAllNotifications);
router.patch("/:studentId/:notificationId/read", readNotification);
export default router;

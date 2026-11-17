import express from "express";
import { authenticate } from "../middleware/auth.js";
import { getNotifications, readAllNotifications, readNotification } from "../controllers/notificationsController.js";
import { listAppNotifications, markAppNotificationRead } from "../services/appNotificationStore.js";

const router = express.Router();
router.use(authenticate);
const currentUserId = (req) => String(req.user?.id || req.user?._id || "");

router.get("/me", async (req, res) => {
  try { res.json(await listAppNotifications(currentUserId(req))); }
  catch (error) { res.status(500).json({ error: error.message || "Unable to load notifications." }); }
});
router.patch("/me/:notificationId/read", async (req, res) => {
  try {
    const item = await markAppNotificationRead(currentUserId(req), req.params.notificationId);
    if (!item) return res.status(404).json({ error: "Notification not found." });
    res.json(item);
  } catch (error) { res.status(400).json({ error: error.message || "Unable to update notification." }); }
});
router.get("/:studentId", getNotifications);
router.patch("/:studentId/read-all", readAllNotifications);
router.patch("/:studentId/:notificationId/read", readNotification);
export default router;

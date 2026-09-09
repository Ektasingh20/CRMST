import express from "express";
import { authenticate } from "../middleware/auth.js";
import { getNotifications, readAllNotifications, readNotification } from "../controllers/notificationsController.js";

const router = express.Router();
router.use(authenticate);
router.get("/:studentId", getNotifications);
router.patch("/:studentId/read-all", readAllNotifications);
router.patch("/:studentId/:notificationId/read", readNotification);
export default router;
import User from "../models/User.js";
import { createAppNotification } from "./appNotificationStore.js";

const userId = (user) => String(user?.id || user?._id || "");

export async function notifyUser(recipientId, payload) {
  if (!recipientId) return null;
  return createAppNotification(recipientId, { type: payload.type, message: payload.message, read: false });
}

export async function notifyAdmins(payload) {
  const users = await User.find();
  const admins = users.filter((user) => String(user.role || "").trim().toLowerCase() === "admin");
  await Promise.all(admins.map((admin) => notifyUser(userId(admin), payload)));
}

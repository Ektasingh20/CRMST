import AppNotification from "../models/AppNotification.js";
import User from "../models/User.js";

const userId = (user) => String(user?.id || user?._id || "");

export async function notifyUser(recipientId, payload) {
  if (!recipientId) return null;
  const now = new Date().toISOString();
  return AppNotification.create({ id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, recipientId: String(recipientId), type: payload.type, message: payload.message, read: false, createdAt: now });
}

export async function notifyAdmins(payload) {
  const users = await User.find();
  const admins = users.filter((user) => String(user.role || "").trim().toLowerCase() === "admin");
  await Promise.all(admins.map((admin) => notifyUser(userId(admin), payload)));
}

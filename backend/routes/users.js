import express from "express";
import { authenticate } from "../middleware/auth.js";
import { listUsers, listAssignableUsers, createUser, updateUser, deleteUser } from "../controllers/usersController.js";
import { changePassword } from "../controllers/authController.js";
import { isAdmin } from "../utils/roles.js";
import User from "../models/User.js";

const router = express.Router();

router.use(authenticate);

router.put("/me/profile", async (req, res) => {
  try {
    const currentUserId = String(req.user?.id || req.user?._id || "");
    const user = await User.findOne({ id: currentUserId }) || await User.findOne({ _id: currentUserId });
    if (!user) return res.status(404).json({ error: "User not found." });
    const payload = req.body || {};
    if (payload.name !== undefined) user.name = String(payload.name).trim();
    if (payload.email !== undefined) user.email = String(payload.email).trim().toLowerCase();
    if (payload.phone !== undefined) user.phone = String(payload.phone).trim();
    if (payload.notificationPreferences !== undefined) user.notificationPreferences = payload.notificationPreferences;
    user.updatedAt = new Date().toISOString();
    await user.save();
    const { password: _password, ...safeUser } = user.toObject();
    res.json({ id: safeUser.id || String(user._id), ...safeUser });
  } catch (error) { res.status(400).json({ error: error.message || "Unable to update profile." }); }
});

router.post("/:id/change-password", changePassword);
router.get("/assignees", listAssignableUsers);
router.use((req, res, next) => isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin access required." }));

router.get("/", (req, res) => listUsers(req, res));
router.post("/", (req, res) => createUser(req, res));
router.put("/:id", (req, res) => updateUser(req, res));
router.delete("/:id", (req, res) => deleteUser(req, res));

export default router;

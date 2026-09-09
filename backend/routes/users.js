import express from "express";
import { authenticate } from "../middleware/auth.js";
import { listUsers, createUser, updateUser, deleteUser } from "../controllers/usersController.js";
import { changePassword } from "../controllers/authController.js";
import { isAdmin } from "../utils/roles.js";

const router = express.Router();

router.use(authenticate);
router.post("/:id/change-password", changePassword);
router.use((req, res, next) => isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin access required." }));

router.get("/", (req, res) => listUsers(req, res));
router.post("/", (req, res) => createUser(req, res));
router.put("/:id", (req, res) => updateUser(req, res));
router.delete("/:id", (req, res) => deleteUser(req, res));

export default router;

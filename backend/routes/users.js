import express from "express";
import { authenticate } from "../middleware/auth.js";
import { listUsers, createUser, updateUser, deleteUser } from "../controllers/usersController.js";
import { changePassword } from "../controllers/authController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => listUsers(req, res));
router.post("/", (req, res) => createUser(req, res));
router.put("/:id", (req, res) => updateUser(req, res));
router.delete("/:id", (req, res) => deleteUser(req, res));
router.post("/:id/change-password", changePassword);

export default router;
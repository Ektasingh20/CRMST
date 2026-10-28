import express from "express";
import { login, signup, confirmPasswordReset } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/password-reset/confirm", confirmPasswordReset);

export default router;

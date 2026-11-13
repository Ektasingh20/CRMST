import express from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth.js";
import { isAdmin, isHrUser } from "../utils/roles.js";
import { createHrLead, deleteHrLead, getHrLeads, updateHrLead, uploadHrLeadResume } from "../controllers/hrLeadsController.js";

const router = express.Router();
const resumeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } }).single("file");
const receiveResume = (req, res, next) => resumeUpload(req, res, (error) => {
  if (error) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Resume files must be 5 MB or smaller." : "Could not read the resume file." });
  next();
});
router.use(authenticate, (req, res, next) => {
  if (!isAdmin(req.user) && !isHrUser(req.user)) return res.status(403).json({ error: "HR or Admin access required." });
  next();
});
router.get("/", getHrLeads);
router.post("/resume", receiveResume, uploadHrLeadResume);
router.post("/", createHrLead);
router.put("/:id", updateHrLead);
router.delete("/:id", deleteHrLead);
export default router;

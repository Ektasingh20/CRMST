import express from "express";
import { authenticate } from "../middleware/auth.js";
import Lead from "../models/Lead.js";
import { listLeads, createLead, updateLead, deleteLead } from "../controllers/leadsController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", listLeads);
router.post("/", createLead);
router.put("/:id", updateLead);
router.delete("/:id", deleteLead);

export default router;
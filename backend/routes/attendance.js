import express from "express";
import { authenticate } from "../middleware/auth.js";
import Attendance from "../models/Attendance.js";
import { listCollection, createItem, updateItem, deleteItem } from "../controllers/genericController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => listCollection(req, res, Attendance));
router.post("/", (req, res) => createItem(req, res, Attendance));
router.put("/:id", (req, res) => updateItem(req, res, Attendance));
router.delete("/:id", (req, res) => deleteItem(req, res, Attendance));

export default router;
import express from "express";
import { authenticate } from "../middleware/auth.js";
import Leave from "../models/Leave.js";
import { listCollection, createItem, updateItem, deleteItem } from "../controllers/genericController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => listCollection(req, res, Leave));
router.post("/", (req, res) => createItem(req, res, Leave));
router.put("/:id", (req, res) => updateItem(req, res, Leave));
router.delete("/:id", (req, res) => deleteItem(req, res, Leave));

export default router;
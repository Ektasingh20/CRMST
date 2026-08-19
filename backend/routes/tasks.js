import express from "express";
import { authenticate } from "../middleware/auth.js";
import Task from "../models/Task.js";
import { listCollection, createItem, updateItem, deleteItem } from "../controllers/genericController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => listCollection(req, res, Task));
router.post("/", (req, res) => createItem(req, res, Task));
router.put("/:id", (req, res) => updateItem(req, res, Task));
router.delete("/:id", (req, res) => deleteItem(req, res, Task));

export default router;
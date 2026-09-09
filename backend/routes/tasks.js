import express from "express";
import { authenticate } from "../middleware/auth.js";
import Task from "../models/Task.js";
import { listCollection, createItem, updateItem, deleteItem } from "../controllers/genericController.js";
import { updateTask } from "../controllers/tasksController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => listCollection(req, res, Task));
router.post("/", (req, res) => createItem(req, res, Task));
router.put("/:id", updateTask);
router.post("/:id/grade", updateTask);
router.delete("/:id", (req, res) => deleteItem(req, res, Task));

export default router;
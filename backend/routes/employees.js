import express from "express";
import { authenticate } from "../middleware/auth.js";
import Employee from "../models/Employee.js";
import { listCollection, createItem, updateItem, deleteItem } from "../controllers/genericController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => listCollection(req, res, Employee));
router.post("/", (req, res) => createItem(req, res, Employee));
router.put("/:id", (req, res) => updateItem(req, res, Employee));
router.delete("/:id", (req, res) => deleteItem(req, res, Employee));

export default router;
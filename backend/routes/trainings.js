import express from "express";
import { authenticate } from "../middleware/auth.js";
import Training from "../models/Training.js";
import { listCollection, createItem, updateItem, deleteItem } from "../controllers/genericController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => listCollection(req, res, Training));
router.post("/", (req, res) => createItem(req, res, Training));
router.put("/:id", (req, res) => updateItem(req, res, Training));
router.delete("/:id", (req, res) => deleteItem(req, res, Training));

export default router;
import express from "express";
import { authenticate } from "../middleware/auth.js";
import Service from "../models/Service.js";
import { listCollection, createItem, updateItem, deleteItem } from "../controllers/genericController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => listCollection(req, res, Service));
router.post("/", (req, res) => createItem(req, res, Service));
router.put("/:id", (req, res) => updateItem(req, res, Service));
router.delete("/:id", (req, res) => deleteItem(req, res, Service));

export default router;
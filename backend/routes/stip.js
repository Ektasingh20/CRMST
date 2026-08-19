import express from "express";
import { authenticate } from "../middleware/auth.js";
import StipProgram from "../models/StipProgram.js";
import StipApplication from "../models/StipApplication.js";
import { listCollection, createItem, updateItem, deleteItem } from "../controllers/genericController.js";

const router = express.Router();

router.use(authenticate);

router.get("/programs", (req, res) => listCollection(req, res, StipProgram));
router.post("/programs", (req, res) => createItem(req, res, StipProgram));
router.put("/programs/:id", (req, res) => updateItem(req, res, StipProgram));
router.delete("/programs/:id", (req, res) => deleteItem(req, res, StipProgram));

router.get("/applications", (req, res) => listCollection(req, res, StipApplication));
router.post("/applications", (req, res) => createItem(req, res, StipApplication));
router.put("/applications/:id", (req, res) => updateItem(req, res, StipApplication));
router.delete("/applications/:id", (req, res) => deleteItem(req, res, StipApplication));

export default router;
import express from "express";
import { authenticate } from "../middleware/auth.js";
import { whatsappConfigRef, whatsappMessageRef, whatsappMessages } from "../config/firestoreWhatsAppModel.js";

const router = express.Router();
router.use(authenticate);

const validTypes = new Set(["training", "service"]);
const clean = (value) => String(value || "").trim();

router.get("/config", async (_req, res) => {
  try {
    const snapshot = await whatsappConfigRef().get();
    if (!snapshot.exists) return res.status(404).json({ error: "WhatsApp message settings are not configured." });
    res.json(snapshot.data());
  } catch (error) { res.status(500).json({ error: error.message || "Could not load WhatsApp message settings." }); }
});

router.get("/templates", async (req, res) => {
  try {
    const type = clean(req.query.type).toLowerCase();
    if (type && !validTypes.has(type)) return res.status(400).json({ error: "Invalid lead type." });
    const snapshot = await whatsappMessages().where("active", "==", true).get();
    const templates = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))
      .filter((template) => validTypes.has(template.type) && (!type || template.type === type))
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0) || String(left.title || "").localeCompare(String(right.title || "")));
    res.json(templates);
  } catch (error) { res.status(500).json({ error: error.message || "Could not load message templates." }); }
});

router.get("/payment-links/:templateId", async (req, res) => {
  try {
    const snapshot = await whatsappMessageRef(req.params.templateId).get();
    const link = snapshot.exists ? snapshot.data().paymentLink : null;
    if (!link || link.active !== true || !clean(link.url)) return res.status(404).json({ error: "No payment link set for this program" });
    res.json({ id: snapshot.id, templateId: snapshot.id, ...link });
  } catch (error) { res.status(500).json({ error: error.message || "Could not load payment link." }); }
});

export default router;

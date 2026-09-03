import mongoose from "mongoose";
import { isMongoConnected } from "../config/db.js";
import Lead from "../models/Lead.js";
import { listCollection, deleteItem } from "../controllers/genericController.js";

function mongoUnavailable(res) {
  return res.status(503).json({ error: "Database is unavailable. Please try again later." });
}

function validatePhone(value) {
  return /^[6-9]\d{9}$/.test(String(value || "").trim());
}

function validateEmail(value) {
  if (!value || String(value).trim() === "") return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isCrmExecutive(user) {
  return ["crm executive", "crm_executive"].includes(String(user?.role || "").trim().toLowerCase());
}

function userLeadIds(user) {
  return [user?.id, user?._id].filter(Boolean).map(String);
}

export async function listLeads(req, res) {
  if (!isCrmExecutive(req.user)) return listCollection(req, res, Lead);
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const items = await Lead.find({ assignedTo: { $in: userLeadIds(req.user) } }).sort({ updatedAt: -1 });
    return res.json(items.map((doc) => ({ id: doc.id || String(doc._id), ...doc.toObject() })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createLead(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const payload = { ...req.body };

    if (isCrmExecutive(req.user)) {
      payload.assignedTo = String(req.user.id || req.user._id);
    }

    if (!payload.name || String(payload.name).trim() === "") {
      return res.status(400).json({ error: "Full name is required." });
    }
    if (!validatePhone(payload.phone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }
    if (!validateEmail(payload.email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (payload.alternatePhone && !validatePhone(payload.alternatePhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }

    const allowedStatuses = ["pending", "follow-up", "interested", "converted", "lost", "not_interested", "Pending", "Follow-up", "Interested", "Converted", "Lost", "Not Interested"];
    if (payload.status && !allowedStatuses.includes(payload.status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    if (!payload.id) {
      payload.id = `${payload.name || "lead"}-${Date.now()}`;
    }

    payload.assignedDate = new Date().toISOString().slice(0, 10);
    if (!payload.status) {
      payload.status = "Pending";
    }

    const item = await Lead.create(payload);
    return res.status(201).json({ id: item.id || String(item._id), ...item.toObject() });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function updateLead(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  const { id } = req.params;
  if (!id || String(id).trim() === "") {
    return res.status(400).json({ error: "Invalid document id" });
  }
  try {
    const payload = { ...req.body };

    if (payload.phone && !validatePhone(payload.phone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }
    if (payload.email && !validateEmail(payload.email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (payload.alternatePhone && !validatePhone(payload.alternatePhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });
    }

    const allowedStatuses = ["pending", "follow-up", "interested", "converted", "lost", "not_interested", "Pending", "Follow-up", "Interested", "Converted", "Lost", "Not Interested"];
    if (payload.status && !allowedStatuses.includes(payload.status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    if (!payload.id) {
      payload.id = String(id);
    }

    const existing = await Lead.findOne({ id: String(id) });
    if (isCrmExecutive(req.user) && (!existing || !userLeadIds(req.user).includes(String(existing.assignedTo)))) {
      return res.status(403).json({ error: "You can only update leads assigned to you." });
    }
    if (isCrmExecutive(req.user)) {
      delete payload.assignedTo;
      delete payload.assignedDate;
    }
    let targetId = id;
    if (existing) {
      targetId = String(existing._id);
    }

    const item = await Lead.findOneAndUpdate(
      { _id: targetId },
      payload,
      { new: true, upsert: true }
    );
    return res.json({ id: item.id || String(item._id), ...item.toObject() });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteLead(req, res) {
  if (isCrmExecutive(req.user)) {
    if (!isMongoConnected) return mongoUnavailable(res);
    const lead = await Lead.findOne({ id: String(req.params.id) });
    if (!lead || !userLeadIds(req.user).includes(String(lead.assignedTo))) {
      return res.status(403).json({ error: "You can only delete leads assigned to you." });
    }
  }
  return deleteItem(req, res, Lead);
}

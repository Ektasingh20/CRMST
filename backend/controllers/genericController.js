import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { isMongoConnected } from "../config/db.js";

function mongoUnavailable(res) {
  return res.status(503).json({ error: "Database is unavailable. Please try again later." });
}

async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;
  try {
    const cloudinary = (await import("../config/cloudinary.js")).default;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn("Failed to delete Cloudinary image:", err.message);
  }
}

export async function listCollection(req, res, Model) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const items = await Model.find().sort({ createdAt: -1 });
    return res.json(items.map((doc) => ({ id: doc.id || String(doc._id), ...doc.toObject() })));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createItem(req, res, Model) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const payload = { ...req.body };
    if (!payload.id) {
      payload.id = `${payload.name || payload.username || payload.title || "record"}-${Date.now()}`;
    }
    if (Model.modelName === "User" && payload.password && !String(payload.password).startsWith("$2a$") && !String(payload.password).startsWith("$2b$")) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    const existing = await Model.findOne({ id: String(payload.id) });
    if (existing) {
      const updated = await Model.findOneAndUpdate(
        { _id: existing._id },
        payload,
        { new: true }
      );
      return res.json({ id: updated.id || String(updated._id), ...updated.toObject() });
    }

    const item = await Model.create(payload);
    return res.status(201).json({ id: item.id || String(item._id), ...item.toObject() });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function updateItem(req, res, Model) {
  if (!isMongoConnected) return mongoUnavailable(res);
  const { id } = req.params;
  if (!id || String(id).trim() === "") {
    return res.status(400).json({ error: "Invalid document id" });
  }
  try {
    const payload = { ...req.body };
    if (!payload.id) {
      payload.id = String(id);
    }

    const existing = await Model.findOne({ id: String(id) });
    let targetId = id;
    if (existing) {
      targetId = String(existing._id);
      const existingPublicId = existing.imagePublicId;
      const newPublicId = payload?.imagePublicId;
      if (existingPublicId && newPublicId && existingPublicId !== newPublicId) {
        await deleteCloudinaryImage(existingPublicId);
      }
    }

    if (payload.password && !String(payload.password).startsWith("$2a$") && !String(payload.password).startsWith("$2b$")) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    const item = await Model.findOneAndUpdate(
      { _id: targetId },
      payload,
      { new: true, upsert: true }
    );
    return res.json({ id: item.id || String(item._id), ...item.toObject() });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteItem(req, res, Model) {
  if (!isMongoConnected) return mongoUnavailable(res);
  const { id } = req.params;
  if (!id || String(id).trim() === "") {
    return res.status(400).json({ error: "Invalid document id" });
  }
  try {
    const existing = await Model.findOne({ id: String(id) });
    let targetId = id;
    if (!existing) {
      const byObjectId = await Model.findOne({ _id: id });
      if (!byObjectId) {
        return res.json({ success: true, id: String(id) });
      }
      targetId = String(byObjectId._id);
      await deleteCloudinaryImage(byObjectId.imagePublicId);
      await Model.findOneAndDelete({ _id: targetId });
      return res.json({ success: true, id: String(byObjectId._id) });
    }

    await deleteCloudinaryImage(existing.imagePublicId);
    await Model.findOneAndDelete({ _id: String(existing._id) });
    return res.json({ success: true, id: String(existing._id) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
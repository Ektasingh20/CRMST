import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { isMongoConnected } from "../config/db.js";
import { isAllowedRole } from "../utils/roles.js";

function mongoUnavailable(res) {
  return res.status(503).json({ error: "Database is unavailable. Please try again later." });
}

function validatePhone(value) {
  return /^[6-9]\d{9}$/.test(String(value || "").trim());
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export async function createUser(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const { name, email, phone, emergencyContact, maritalStatus, education, username, password, dept, position, role, joined, state, branch, branchCode, address, imageUrl = "", imagePublicId = "" } = req.body;

    if (!isAllowedRole(role)) {
      return res.status(400).json({ error: "Choose a valid employee role." });
    }

    if (String(role).trim().toLowerCase() === "admin" || String(dept).trim().toLowerCase() === "admin") {
      const existingAdmin = await User.findOne({ role: { $in: ["Admin", "Administrator", "Super Admin"] } });
      if (existingAdmin) {
        return res.status(409).json({ error: "Only one Admin account is allowed." });
      }
    }

    if (!name || !email || !phone || !emergencyContact || !education || !dept || !position || !role || !joined || !username || !password || !state || !branch || !branchCode || !address) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ error: "Contact number must be exactly 10 digits and start with 6, 7, 8, or 9" });
    }

    if (!validatePhone(emergencyContact)) {
      return res.status(400).json({ error: "Emergency contact must be exactly 10 digits and start with 6, 7, 8, or 9" });
    }

    const usernameLower = String(username).trim().toLowerCase();
    const existingUsername = await User.findOne({ username: usernameLower });
    if (existingUsername) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const existingEmail = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    // const generatedId = `${usernameLower}-${Date.now()}`;

    const user = await User.create({
      // id: generatedId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      emergencyContact: String(emergencyContact).trim(),
      maritalStatus: maritalStatus ? String(maritalStatus).trim() : "",
      education: String(education).trim(),
      username: usernameLower,
      password: hash,
      dept: String(dept).trim(),
      position: String(position).trim(),
      role: String(role).trim(),
      joined: String(joined).trim(),
      state: String(state).trim(),
      branch: String(branch).trim(),
      branchCode: String(branchCode).trim(),
      address: String(address).trim(),
      imageUrl: String(imageUrl || "").trim(),
      imagePublicId: String(imagePublicId || "").trim(),
      status: "Active",
      type: "Current",
    });

    const { password: _password, ...safeUser } = user.toObject();
    return res.status(201).json({ id: user.id || String(user._id), ...safeUser });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function updateUser(req, res) {
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

    const isObjectId = /^[a-fA-F0-9]{24}$/.test(String(id));
    const existing = (await User.findOne({ id: String(id) })) || (isObjectId ? await User.findById(id) : null);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }
    const targetId = String(existing._id);
    if (payload.password && !String(payload.password).startsWith("$2a$") && !String(payload.password).startsWith("$2b$")) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    if (payload.username) {
      const usernameLower = String(payload.username).trim().toLowerCase();
      const duplicate = await User.findOne({ username: usernameLower, _id: { $ne: targetId } });
      if (duplicate) {
        return res.status(409).json({ error: "Username already exists" });
      }
      payload.username = usernameLower;
    }

    if (payload.email) {
      const emailLower = String(payload.email).trim().toLowerCase();
      const duplicate = await User.findOne({ email: emailLower, _id: { $ne: targetId } });
      if (duplicate) {
        return res.status(409).json({ error: "Email already exists" });
      }
      payload.email = emailLower;
    }

    const item = await User.findOneAndUpdate(
      { _id: targetId },
      payload,
      { new: true, upsert: true }
    );
    const { password: _password, ...safeUser } = item.toObject();
    return res.json({ id: item.id || String(item._id), ...safeUser });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export async function listUsers(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  try {
    const items = await User.find().sort({ createdAt: -1 });
    return res.json(items.map((doc) => {
      const { password: _password, ...safeUser } = doc.toObject();
      return { id: safeUser.id || String(safeUser._id), ...safeUser };
    }));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteUser(req, res) {
  if (!isMongoConnected) return mongoUnavailable(res);
  const { id } = req.params;
  if (!id || String(id).trim() === "") {
    return res.status(400).json({ error: "Invalid document id" });
  }
  try {
    const existing = await User.findOne({ id: String(id) });
    let targetId = id;
    if (!existing) {
      const byObjectId = await User.findOne({ _id: id });
      if (!byObjectId) {
        return res.json({ success: true, id: String(id) });
      }
      targetId = String(byObjectId._id);
      await User.findOneAndDelete({ _id: targetId });
      return res.json({ success: true, id: String(byObjectId._id) });
    }

    await User.findOneAndDelete({ _id: String(existing._id) });
    return res.json({ success: true, id: String(existing._id) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { isMongoConnected } from "../config/db.js";

const secret = process.env.JWT_SECRET || "crmst-secret";

export async function login(req, res) {
  if (!isMongoConnected) {
    return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  }
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const storedPassword = String(user.password || "");
    const isHashed = storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$");
    const match = isHashed ? await bcrypt.compare(password, storedPassword) : storedPassword === String(password);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ uid: String(user._id), username: user.username, role: user.role }, secret, { expiresIn: "12h" });
    return res.json({
      token,
      user: { id: String(user._id), username: user.username, name: user.name, email: user.email, phone: user.phone, emergencyContact: user.emergencyContact, maritalStatus: user.maritalStatus, education: user.education, role: user.role, dept: user.dept, position: user.position, joined: user.joined, state: user.state, branch: user.branch, branchCode: user.branchCode, address: user.address, imageUrl: user.imageUrl || "", imagePublicId: user.imagePublicId || "" },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: err.message || "Login failed" });
  }
}

export async function changePassword(req, res) {
  if (!isMongoConnected) {
    return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  }
  try {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    const user = await User.findOne({ id: String(userId) }) || await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const storedPassword = String(user.password || "");
    const isHashed = storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$");
    const currentMatch = isHashed ? await bcrypt.compare(currentPassword, storedPassword) : storedPassword === String(currentPassword);

    if (!currentMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    if (String(currentPassword) === String(newPassword)) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await user.save();

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: err.message || "Failed to change password" });
  }
}

export async function signup(req, res) {
  if (!isMongoConnected) {
    return res.status(503).json({ error: "Database is unavailable. Please try again later." });
  }
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: "Name, username, and password are required" });
    }

    const usernameLower = String(username).trim().toLowerCase();
    const existing = await User.findOne({ username: usernameLower });
    if (existing) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const generatedId = `${username}-${Date.now()}`;
    const user = await User.create({
      id: generatedId,
      name,
      username,
      password: hash,
      email: `${username}@systemtechnologies.local`,
      phone: "",
      role: "Member",
      dept: "CRM",
      status: "Active",
      joined: new Date().toISOString().slice(0, 10),
      type: "Current",
    });

    const token = jwt.sign({ uid: String(user._id), username: user.username, role: user.role }, secret, { expiresIn: "12h" });
    return res.status(201).json({
      token,
      user: { id: String(user._id), username, name, email: user.email, phone: user.phone, emergencyContact: user.emergencyContact, maritalStatus: user.maritalStatus, education: user.education, role: user.role, dept: user.dept, position: user.position, joined: user.joined, state: user.state, branch: user.branch, branchCode: user.branchCode, address: user.address, imageUrl: user.imageUrl || "", imagePublicId: user.imagePublicId || "" },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: err.message || "Signup failed" });
  }
}

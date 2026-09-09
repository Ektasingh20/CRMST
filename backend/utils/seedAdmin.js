import bcrypt from "bcryptjs";
import User from "../models/User.js";

export async function seedDefaultAdmin() {
  const username = String(process.env.DEFAULT_ADMIN_USERNAME || "admin").trim().toLowerCase();
  const existing = await User.findOne({ username });
  if (existing) {
    console.log(`Default admin already exists at path: ${existing._ref?.path}`);
    return;
  }

  const password = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";
  const today = new Date().toISOString().slice(0, 10);

  const created = await User.create({
    name: "System Administrator",
    username,
    password: await bcrypt.hash(password, 10),
    email: process.env.DEFAULT_ADMIN_EMAIL || "admin@crmst.local",
    phone: "0000000000",
    emergencyContact: "0000000000",
    education: "",
    dept: "Admin",              // matches DEPT_SLUGS key exactly
    position: "Administrator",
    role: "Admin",
    joined: today,
    state: "",
    branch: "",
    branchCode: "",
    address: "",
    status: "Active",
    type: "Current",
    createdAt: new Date().toISOString(),
  });

  console.warn(`Default Admin created at: ${created._ref.path}. Change DEFAULT_ADMIN_PASSWORD after first login.`);
}
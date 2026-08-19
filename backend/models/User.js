import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  emergencyContact: { type: String, default: "" },
  maritalStatus: { type: String, default: "" },
  education: { type: String, default: "" },
  role: { type: String, default: "CRM Executive" },
  dept: { type: String, default: "CRM" },
  position: { type: String, default: "" },
  joined: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  state: { type: String, default: "" },
  branch: { type: String, default: "" },
  branchCode: { type: String, default: "" },
  address: { type: String, default: "" },
  status: { type: String, default: "Active" },
  type: { type: String, default: "Current" },
  imageUrl: { type: String, default: "" },
  imagePublicId: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
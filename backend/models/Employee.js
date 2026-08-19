import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: "" },
  role: { type: String, default: "CRM Executive" },
  dept: { type: String, default: "CRM" },
  status: { type: String, default: "Active" },
  joined: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  type: { type: String, default: "Current" },
  imageUrl: { type: String, default: "" },
  imagePublicId: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);
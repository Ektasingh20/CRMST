import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: "" },
  alternatePhone: { type: String, default: "" },
  city: { type: String, default: "" },
  company: { type: String, default: "" },
  type: { type: String, default: "Training" },
  interest: { type: String, default: "" },
  value: { type: Number, default: 0 },
  status: { type: String, default: "Pending" },
  source: { type: String, default: "Website" },
  leadSource: { type: String, default: "Website" },
  assignedTo: { type: mongoose.Schema.Types.Mixed, default: "" },
  assignedDate: { type: String, default: "" },
  notes: { type: String, default: "" },
  createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
}, { timestamps: true });

export default mongoose.model("Lead", leadSchema);
import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  emp: { type: String, default: "" },
  type: { type: String, default: "Casual" },
  from: { type: String, default: "" },
  to: { type: String, default: "" },
  days: { type: Number, default: 1 },
  reason: { type: String, default: "" },
  status: { type: String, default: "Pending" },
}, { timestamps: true });

export default mongoose.model("Leave", leaveSchema);
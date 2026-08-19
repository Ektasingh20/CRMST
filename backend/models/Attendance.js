import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  emp: { type: String, default: "" },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  status: { type: String, default: "Present" },
}, { timestamps: true });

export default mongoose.model("Attendance", attendanceSchema);
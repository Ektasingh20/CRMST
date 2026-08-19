import mongoose from "mongoose";

const trainingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  duration: { type: String, default: "" },
  price: { type: String, default: "" },
  tools: { type: String, default: "" },
  trainer: { type: String, default: "" },
  mode: { type: String, default: "Hybrid" },
  level: { type: String, default: "Advanced" },
  seats: { type: String, default: "24" },
  batchTiming: { type: String, default: "Mon-Fri • 6PM-8PM" },
  projects: { type: String, default: "3 capstone projects" },
  certification: { type: String, default: "Industry certificate" },
  placement: { type: String, default: "100% interview prep" },
  syllabus: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  imagePublicId: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("Training", trainingSchema);
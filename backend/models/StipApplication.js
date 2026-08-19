import mongoose from "mongoose";

const stipApplicationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, default: "" },
  college: { type: String, default: "" },
  track: { type: String, default: "" },
  status: { type: String, default: "Applied" },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
}, { timestamps: true });

export default mongoose.model("StipApplication", stipApplicationSchema);
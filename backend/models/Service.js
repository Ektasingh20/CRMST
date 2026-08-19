import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  category: { type: String, default: "Uncategorized" },
  name: { type: String, required: true },
  details: { type: String, default: "" },
  price: { type: String, default: "" },
  technology: { type: String, default: "" },
  tools: { type: String, default: "" },
  status: { type: String, default: "Active" },
  imageUrl: { type: String, default: "" },
  imagePublicId: { type: String, default: "" },
  updatedAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
}, { timestamps: true });

export default mongoose.model("Service", serviceSchema);
import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  emp: { type: String, default: "" },
  title: { type: String, required: true },
  priority: { type: String, default: "Medium" },
  due: { type: String, default: "" },
  status: { type: String, default: "Pending" },
}, { timestamps: true });

export default mongoose.model("Task", taskSchema);
import mongoose from "mongoose";

const stipProgramSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  track: { type: String, required: true },
  duration: { type: String, default: "" },
  focus: { type: String, default: "" },
  outcome: { type: String, default: "" },
  fee: { type: String, default: "" },
  mentor: { type: String, default: "Project mentor" },
  eligibility: { type: String, default: "Graduate / internship-ready" },
  seats: { type: String, default: "12" },
  deadline: { type: String, default: "" },
  applicationStatus: { type: String, default: "Open" },
  imageUrl: { type: String, default: "" },
  imagePublicId: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("StipProgram", stipProgramSchema);
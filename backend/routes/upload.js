import express from "express";
import { authenticate } from "../middleware/auth.js";
import { uploadImage, handleUploadedImage, deleteUploadedImage } from "../controllers/uploadController.js";

const router = express.Router();

router.post("/", authenticate, uploadImage, handleUploadedImage);
router.delete("/:publicId", authenticate, deleteUploadedImage);

router.use((err, req, res, next) => {
  console.error("Upload route error:", err);
  res.status(500).json({ error: err.message || "Upload failed" });
});

export default router;
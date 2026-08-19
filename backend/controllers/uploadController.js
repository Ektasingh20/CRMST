import cloudinary from "../config/cloudinary.js";
import { uploadSingle } from "../middleware/upload.js";

export const uploadImage = uploadSingle("image");

export async function handleUploadedImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "Image file is required" });
  }
  return res.status(201).json({
    success: true,
    imageUrl: req.file.path,
    publicId: req.file.filename,
  });
}

export async function deleteUploadedImage(req, res) {
  const { publicId } = req.params;
  try {
    await cloudinary.uploader.destroy(publicId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

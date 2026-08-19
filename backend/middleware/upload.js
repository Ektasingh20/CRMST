import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cloudinary from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cloudinaryMemoryStorage() {
  return {
    _handleFile(req, file, cb) {
      const chunks = [];
      file.stream.on("data", (chunk) => chunks.push(chunk));
      file.stream.on("error", (err) => cb(err));
      file.stream.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const ext = file.mimetype === "image/jpeg" || file.mimetype === "image/jpg" ? "jpg" : file.mimetype === "image/png" ? "png" : "webp";
          const tempPath = path.join(__dirname, "..", "uploads", `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
          
          await fs.promises.mkdir(path.dirname(tempPath), { recursive: true });
          await fs.promises.writeFile(tempPath, buffer);
          
          const result = await cloudinary.uploader.upload(tempPath, {
            folder: "crmst",
            resource_type: "image",
          });
          
          await fs.promises.unlink(tempPath).catch(() => {});
          
          cb(null, {
            path: result.secure_url,
            filename: result.public_id,
            size: result.bytes,
          });
       } catch (err) {
  console.error("========== CLOUDINARY UPLOAD ERROR ==========");
  console.error("Message:", err.message);
  console.error("Name:", err.name);
  console.error("HTTP code:", err.http_code);
  console.error("Full error:", err);
  console.error("==============================================");

  cb(err);
}
      });
    },
    _removeFile(req, file, cb) {
      if (file && file.filename) {
        cloudinary.uploader.destroy(file.filename, { invalidate: true }, (err) => {
          if (err) console.warn("Cloudinary delete error:", err);
          cb();
        });
      } else {
        cb();
      }
    },
  };
}

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only jpg, jpeg, png, webp images are allowed"));
  }
};

export const upload = multer({
  storage: cloudinaryMemoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadSingle = (fieldName) => upload.single(fieldName);

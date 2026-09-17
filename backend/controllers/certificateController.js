import crypto from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";

// The student identity comes from authentication, never from the request body.
export async function shareCertificate(req, res) {
  if (String(req.user?.role).toLowerCase() !== "student") return res.status(403).json({ error: "Student access required." });
  const studentId = String(req.user.id || req.user._id || "");
  const courseId = String(req.params.courseId || "");
  if (!studentId || !courseId || courseId.includes("/")) return res.status(400).json({ error: "Invalid enrollment." });
  try {
    const ref = getFirestore().collection("students").doc(studentId).collection("enrolledCourses").doc(courseId);
    const enrollment = await ref.get();
    if (!enrollment.exists) return res.status(404).json({ error: "Enrollment not found." });
    if (Number(enrollment.data().progress) < 100 || !Number.isFinite(Number(enrollment.data().progress))) return res.status(403).json({ error: "Complete this course before sharing a certificate." });
    const image = req.body.image;
    if (typeof image !== "string" || !image.startsWith("data:image/png;base64,") || image.length > 4000000) return res.status(400).json({ error: "A valid certificate PNG is required (maximum 3 MB)." });
    const bytes = Buffer.from(image.slice(22), "base64");
    if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return res.status(400).json({ error: "Invalid PNG image." });
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    if (!privateKey || !publicKey) return res.status(503).json({ error: "ImageKit is not configured." });
    const token = crypto.randomBytes(16).toString("hex");
    const expire = Math.floor(Date.now() / 1000) + 600;
    const form = new FormData();
    form.append("file", image);
    form.append("fileName", `certificate-${studentId}-${courseId}.png`);
    form.append("folder", "/certificates");
    form.append("publicKey", publicKey);
    form.append("token", token);
    form.append("expire", String(expire));
    form.append("signature", crypto.createHmac("sha1", privateKey).update(token + expire).digest("hex"));
    form.append("useUniqueFileName", "true");
    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: form, signal: AbortSignal.timeout(60000) });
    const uploaded = await response.json();
    if (!response.ok || !uploaded.url) throw new Error("Certificate upload failed. Please try again.");
    await ref.set({ certificateUrl: uploaded.url, certificateFileId: uploaded.fileId || "", certificateUpdatedAt: new Date().toISOString() }, { merge: true });
    return res.json({ certificateUrl: uploaded.url });
  } catch (err) {
    console.error("Certificate sharing failed:", err.message);
    return res.status(500).json({ error: "Could not upload or save the certificate. Please try again." });
  }
}

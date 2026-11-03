import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import User from "../models/User.js";
import { isAdmin, isHrUser } from "../utils/roles.js";

const DOCUMENT_KEYS = new Set(["experienceLetter", "priorPayslips", "priorEmploymentProof"]);
const MAX_FILE_SIZE = 512 * 1024;
const SIGNATURES = [
  { type: "application/pdf", ext: ".pdf", matches: (buffer) => buffer.subarray(0, 5).toString() === "%PDF-" },
  { type: "image/png", ext: ".png", matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { type: "image/jpeg", ext: ".jpg", matches: (buffer) => buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 },
  { type: "application/msword", ext: ".doc", matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225])) },
  { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ".docx", matches: (buffer) => buffer.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])) },
];

const safeName = (value) => String(value || "document")
  .replace(/[\\/\u0000-\u001f]/g, "_")
  .replace(/[^a-zA-Z0-9._ -]/g, "_")
  .slice(0, 150) || "document";

function decodeDocument(payload) {
  const dataUrl = String(payload?.data || "");
  const match = dataUrl.match(/^data:([^;,]+);base64,([a-zA-Z0-9+/]+=*)$/);
  if (!match) throw Object.assign(new Error("Choose a valid PDF, PNG, JPG, or Word document."), { status: 400 });
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) throw Object.assign(new Error("The selected document is empty."), { status: 400 });
  if (buffer.length > MAX_FILE_SIZE) throw Object.assign(new Error("Choose a document smaller than 512 KB."), { status: 413 });
  const signature = SIGNATURES.find((candidate) => candidate.matches(buffer));
  if (!signature) throw Object.assign(new Error("The document content is not a supported file type."), { status: 400 });
  const fileName = safeName(payload?.name);
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (!SIGNATURES.some((candidate) => candidate.ext === extension && candidate.type === signature.type)
    && !(signature.type === "image/jpeg" && extension === ".jpeg")) {
    throw Object.assign(new Error("The file extension does not match the document content."), { status: 400 });
  }
  return { buffer, name: fileName, type: signature.type };
}

async function getAuthorizedEmployee(req, res) {
  if (!isAdmin(req.user) && !isHrUser(req.user)) {
    res.status(403).json({ error: "Only HR or Admin can manage employee documents." });
    return null;
  }
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Invalid employee ID." });
    return null;
  }
  const employee = await User.findOne({ id }) || await User.findOne({ _id: id });
  if (!employee) {
    res.status(404).json({ error: "Employee not found." });
    return null;
  }
  if (!isAdmin(req.user) && (String(employee.role || "").toLowerCase() === "admin" || String(employee.dept || "").toLowerCase() === "admin")) {
    res.status(403).json({ error: "HR cannot access Admin profile documents." });
    return null;
  }
  return employee;
}

function storageBucket() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  return getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : undefined));
}

export async function uploadPriorExperienceDocument(req, res) {
  try {
    const employee = await getAuthorizedEmployee(req, res);
    if (!employee) return;
    const key = String(req.params.key || "");
    if (!DOCUMENT_KEYS.has(key)) return res.status(400).json({ error: "Unsupported prior experience document." });
    const { buffer, name, type } = decodeDocument(req.body);
    const employeeId = String(employee.id || employee._id);
    const objectPath = `hr-prior-experience/${employeeId}/${key}/${randomUUID()}`;
    const file = storageBucket().file(objectPath);
    await file.save(buffer, {
      resumable: false,
      validation: "crc32c",
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { contentType: type, cacheControl: "private, no-store" },
    });

    const previous = employee.priorExperienceDocuments?.[key];
    const documents = { ...(employee.priorExperienceDocuments || {}), [key]: { name, type, size: buffer.length, objectPath, updatedAt: new Date().toISOString() } };
    try {
      const updated = await User.findOneAndUpdate(
        { id: employeeId },
        { priorExperienceDocuments: documents, updatedAt: new Date().toISOString() },
        { new: true },
      );
      if (!updated) throw new Error("Employee record was not found while saving document metadata.");
    } catch (error) {
      await file.delete({ ignoreNotFound: true }).catch(() => {});
      throw error;
    }
    if (previous?.objectPath && previous.objectPath !== objectPath) {
      await storageBucket().file(previous.objectPath).delete({ ignoreNotFound: true }).catch((error) => {
        console.error("Prior experience document cleanup required:", previous.objectPath, error.code || error.name);
      });
    }
    return res.status(201).json(documents[key]);
  } catch (error) {
    const status = Number(error.status) || 400;
    return res.status(status).json({ error: error.message || "Unable to upload prior experience document." });
  }
}

export async function downloadPriorExperienceDocument(req, res) {
  try {
    const employee = await getAuthorizedEmployee(req, res);
    if (!employee) return;
    const key = String(req.params.key || "");
    if (!DOCUMENT_KEYS.has(key)) return res.status(400).json({ error: "Unsupported prior experience document." });
    const document = employee.priorExperienceDocuments?.[key];
    if (!document?.objectPath || !document.objectPath.startsWith(`hr-prior-experience/${String(employee.id || employee._id)}/${key}/`)) {
      return res.status(404).json({ error: "Prior experience document not found." });
    }
    res.set("Cache-Control", "private, no-store");
    res.type(document.type || "application/octet-stream");
    res.attachment(safeName(document.name));
    const stream = storageBucket().file(document.objectPath).createReadStream();
    stream.on("error", (error) => {
      if (error.code === 404 && !res.headersSent) return res.status(404).json({ error: "Prior experience document not found." });
      if (!res.headersSent) res.status(502).json({ error: "Unable to read prior experience document." });
      else res.destroy(error);
    });
    stream.pipe(res);
  } catch (error) {
    return res.status(Number(error.status) || 400).json({ error: error.message || "Unable to download prior experience document." });
  }
}

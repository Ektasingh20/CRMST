import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import User from "../models/User.js";
import { isAdmin, isHrUser } from "../utils/roles.js";
import { deleteImageKitFile, uploadImageKitFile } from "../services/imageKitFiles.js";

const DOCUMENT_KEYS = new Set(["experienceLetter", "priorPayslips", "priorEmploymentProof"]);
const PROFILE_DOCUMENT_KEYS = new Set([
  "aadhaarDocument", "panDocument", "bankDocument", "resumeDocument",
  "offerDocument", "appointmentDocument", "otherDocument",
]);
const MAX_FILE_SIZE = 512 * 1024;
const MAX_PROFILE_FILE_SIZE = 5 * 1024 * 1024;
const SIGNATURES = [
  { type: "application/pdf", ext: ".pdf", matches: (buffer) => buffer.subarray(0, 5).toString() === "%PDF-" },
  { type: "image/png", ext: ".png", matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { type: "image/jpeg", ext: ".jpg", matches: (buffer) => buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 },
  { type: "application/msword", ext: ".doc", matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225])) },
  { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ".docx", matches: (buffer) => buffer.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])) },
];
const PROFILE_DOCUMENT_SIGNATURES = SIGNATURES.filter(({ type }) => ["application/pdf", "image/png", "image/jpeg"].includes(type));
const PROFILE_PHOTO_SIGNATURES = [
  ...PROFILE_DOCUMENT_SIGNATURES.filter(({ type }) => type.startsWith("image/")),
  { type: "image/webp", ext: ".webp", matches: (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP" },
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

function validateMultipartFile(file, signatures, label) {
  if (!file?.buffer?.length) throw Object.assign(new Error(`Choose a ${label} to upload.`), { status: 400 });
  if (file.size > MAX_PROFILE_FILE_SIZE) throw Object.assign(new Error(`${label} must be 5 MB or smaller.`), { status: 413 });
  const signature = signatures.find((candidate) => candidate.matches(file.buffer));
  if (!signature) throw Object.assign(new Error(`Choose a valid ${label}.`), { status: 400 });
  const name = safeName(file.originalname);
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (extension !== signature.ext && !(signature.type === "image/jpeg" && extension === ".jpeg")) {
    throw Object.assign(new Error(`The ${label.toLowerCase()} extension does not match its contents.`), { status: 400 });
  }
  return { buffer: file.buffer, name, type: signature.type, size: file.size };
}

function compactDocument(data = {}) {
  return Object.fromEntries(["url", "fileId", "name", "type", "size", "updatedAt"]
    .filter((key) => data[key] !== undefined && data[key] !== "")
    .map((key) => [key, data[key]]));
}

async function nestedProfileDocument(user, key) {
  const snapshot = await user._ref.collection("profileDocuments").doc(key).get();
  return snapshot.exists ? compactDocument(snapshot.data()) : null;
}

export async function listProfileDocuments(user) {
  const documents = {};
  for (const [key, value] of Object.entries(user.documents || {})) {
    documents[key] = compactDocument(value);
  }
  if (user?._ref?.collection) {
    const snapshot = await user._ref.collection("profileDocuments").get();
    snapshot.docs.forEach((document) => { documents[document.id] = compactDocument(document.data()); });
  }
  return documents;
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

async function getCurrentUser(req, res) {
  const id = String(req.user?.id || req.user?._id || "").trim();
  if (!id) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  const user = await User.findOne({ id }) || await User.findOne({ _id: id });
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return null;
  }
  return user;
}

export async function uploadMyProfileDocument(req, res) {
  try {
    const user = await getCurrentUser(req, res);
    if (!user) return;
    const key = String(req.params.key || "");
    if (!PROFILE_DOCUMENT_KEYS.has(key)) return res.status(400).json({ error: "Unsupported account document." });
    const { buffer, name, type, size } = validateMultipartFile(req.file, PROFILE_DOCUMENT_SIGNATURES, "PDF, JPG, or PNG document");
    const id = String(user.id || user._id);
    const previousNested = await nestedProfileDocument(user, key);
    const previousLegacy = user.documents?.[key];
    const uploaded = await uploadImageKitFile({ buffer, name, type, folder: `/user-profile-documents/${id}/${key}` });
    const document = compactDocument({ ...uploaded, name, type, size, updatedAt: new Date().toISOString() });
    try {
      const legacyDocuments = { ...(user.documents || {}) };
      delete legacyDocuments[key];
      const batch = user._ref.firestore.batch();
      batch.set(user._ref.collection("profileDocuments").doc(key), document);
      batch.set(user._ref, {
        documents: Object.keys(legacyDocuments).length ? legacyDocuments : FieldValue.delete(),
        updatedAt: document.updatedAt,
      }, { merge: true });
      await batch.commit();
      User._invalidateCache?.();
    } catch (error) {
      await deleteImageKitFile(uploaded.fileId).catch(() => {});
      throw error;
    }
    const previousFileId = previousNested?.fileId || previousLegacy?.fileId;
    if (previousFileId && previousFileId !== uploaded.fileId) {
      await deleteImageKitFile(previousFileId).catch((error) => console.error("ImageKit profile document cleanup required:", previousFileId, error.message));
    }
    if (previousLegacy?.objectPath) {
      await storageBucket().file(previousLegacy.objectPath).delete({ ignoreNotFound: true }).catch((error) => {
        console.error("Legacy profile document cleanup required:", previousLegacy.objectPath, error.code || error.name);
      });
    }
    return res.status(201).json(document);
  } catch (error) {
    return res.status(Number(error.status) || 500).json({ error: error.message || "Unable to upload account document." });
  }
}

export async function downloadMyProfileDocument(req, res) {
  try {
    const user = await getCurrentUser(req, res);
    if (!user) return;
    const key = String(req.params.key || "");
    if (!PROFILE_DOCUMENT_KEYS.has(key)) return res.status(400).json({ error: "Unsupported account document." });
    const id = String(user.id || user._id);
    const document = await nestedProfileDocument(user, key) || user.documents?.[key];
    if (document?.url) {
      const response = await fetch(document.url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) return res.status(502).json({ error: "Unable to read the ImageKit document." });
      const body = Buffer.from(await response.arrayBuffer());
      res.set("Cache-Control", "private, no-store");
      res.type(document.type || response.headers.get("content-type") || "application/octet-stream");
      res.attachment(safeName(document.name));
      return res.send(body);
    }
    if (!document?.objectPath || !document.objectPath.startsWith(`user-profile-documents/${id}/${key}/`)) {
      return res.status(404).json({ error: "Account document not found." });
    }
    res.set("Cache-Control", "private, no-store");
    res.type(document.type || "application/octet-stream");
    res.attachment(safeName(document.name));
    const stream = storageBucket().file(document.objectPath).createReadStream();
    stream.on("error", (error) => {
      if (error.code === 404 && !res.headersSent) return res.status(404).json({ error: "Account document not found." });
      if (!res.headersSent) res.status(502).json({ error: "Unable to read account document." });
      else res.destroy(error);
    });
    stream.pipe(res);
  } catch (error) {
    return res.status(Number(error.status) || 500).json({ error: error.message || "Unable to download account document." });
  }
}

export async function uploadMyProfilePhoto(req, res) {
  try {
    const user = await getCurrentUser(req, res);
    if (!user) return;
    const { buffer, name, type } = validateMultipartFile(req.file, PROFILE_PHOTO_SIGNATURES, "JPG, PNG, or WEBP profile photo");
    const id = String(user.id || user._id);
    const uploaded = await uploadImageKitFile({ buffer, name, type, folder: `/user-profile-photos/${id}` });
    try {
      await user._ref.set({ imageUrl: uploaded.url, imagePublicId: uploaded.fileId, updatedAt: new Date().toISOString() }, { merge: true });
      User._invalidateCache?.();
    } catch (error) {
      await deleteImageKitFile(uploaded.fileId).catch(() => {});
      throw error;
    }
    if (user.imagePublicId && user.imagePublicId !== uploaded.fileId) {
      await deleteImageKitFile(user.imagePublicId).catch((error) => console.error("ImageKit profile photo cleanup required:", user.imagePublicId, error.message));
    }
    return res.status(201).json({ imageUrl: uploaded.url, imagePublicId: uploaded.fileId });
  } catch (error) {
    return res.status(Number(error.status) || 500).json({ error: error.message || "Unable to upload profile photo." });
  }
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

import test, { mock } from "node:test";
import assert from "node:assert/strict";

const records = new Map();
const uploads = [];
const deletedFileIds = [];

function snapshot(path) {
  return { id: path.split("/").at(-1), exists: records.has(path), data: () => records.get(path), ref: document(path) };
}

function collection(path) {
  return {
    doc: (id) => document(`${path}/${id}`),
    get: async () => ({
      docs: [...records.keys()]
        .filter((key) => key.startsWith(`${path}/`) && key.split("/").length === path.split("/").length + 1)
        .map(snapshot),
    }),
  };
}

function document(path) {
  return {
    id: path.split("/").at(-1),
    path,
    firestore: db,
    collection: (name) => collection(`${path}/${name}`),
    get: async () => snapshot(path),
    set: async (data, options) => records.set(path, options?.merge ? { ...records.get(path), ...data } : data),
  };
}

const db = {
  batch() {
    const writes = [];
    return {
      set: (ref, data, options) => writes.push({ ref, data, options }),
      async commit() {
        writes.forEach(({ ref, data, options }) => records.set(ref.path, options?.merge ? { ...records.get(ref.path), ...data } : data));
      },
    };
  },
};

const userRef = document("users/crm/members/crm_02");
const user = { id: "crm_02", _id: "crm_02", name: "CRM User", _ref: userRef, documents: {} };
const User = {
  findOne: async (filter) => [filter.id, filter._id].includes("crm_02") ? user : null,
  _invalidateCache() {},
};

mock.module("../models/User.js", { defaultExport: User });
mock.module("../services/imageKitFiles.js", { namedExports: {
  uploadImageKitFile: async (file) => {
    uploads.push(file);
    return { url: `https://ik.imagekit.io/test/${encodeURIComponent(file.name)}`, fileId: `file-${uploads.length}` };
  },
  deleteImageKitFile: async (fileId) => { deletedFileIds.push(fileId); },
} });

const { listProfileDocuments, uploadMyProfileDocument, uploadMyProfilePhoto } = await import("../controllers/priorExperienceDocumentsController.js");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("profile documents upload to ImageKit and Firestore stores only compact URL metadata", async () => {
  records.clear(); uploads.length = 0; deletedFileIds.length = 0;
  const file = { originalname: "pan-card.pdf", mimetype: "application/pdf", size: 16, buffer: Buffer.from("%PDF-1.4\n%%EOF") };
  const res = response();
  await uploadMyProfileDocument({ user: { id: "crm_02" }, params: { key: "panDocument" }, file }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(uploads[0].folder, "/user-profile-documents/crm_02/panDocument");
  const stored = records.get("users/crm/members/crm_02/profileDocuments/panDocument");
  assert.deepEqual(Object.keys(stored).sort(), ["fileId", "name", "size", "type", "updatedAt", "url"]);
  assert.equal(stored.url, "https://ik.imagekit.io/test/pan-card.pdf");
  assert.equal("objectPath" in stored, false);
  assert.equal("data" in stored, false);
  assert.deepEqual((await listProfileDocuments(user)).panDocument, stored);
});

test("profile photos upload through the backend and save only the ImageKit URL and file ID", async () => {
  records.clear(); uploads.length = 0; deletedFileIds.length = 0;
  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(8)]);
  const res = response();
  await uploadMyProfilePhoto({ user: { id: "crm_02" }, file: { originalname: "profile.webp", mimetype: "image/webp", size: webp.length, buffer: webp } }, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { imageUrl: "https://ik.imagekit.io/test/profile.webp", imagePublicId: "file-1" });
  const stored = records.get("users/crm/members/crm_02");
  assert.equal(stored.imageUrl, res.body.imageUrl);
  assert.equal(stored.imagePublicId, res.body.imagePublicId);
  assert.equal("image" in stored, false);
});

test("renamed or unsupported profile documents are rejected before ImageKit", async () => {
  records.clear(); uploads.length = 0;
  const res = response();
  await uploadMyProfileDocument({ user: { id: "crm_02" }, params: { key: "resumeDocument" }, file: { originalname: "resume.jpg", size: 16, buffer: Buffer.from("%PDF-1.4\n%%EOF") } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /extension/i);
  assert.equal(uploads.length, 0);
});

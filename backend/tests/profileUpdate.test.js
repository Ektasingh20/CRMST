import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../config/db.js", { namedExports: { isMongoConnected: true } });
const { default: User } = await import("../models/User.js");
const { getMyProfile, updateMyProfile, updateUser } = await import("../controllers/usersController.js");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("profile updates find Firestore IDs and return saved fields and photo without a password", async () => {
  const existing = { _id: "admin_01", name: "Old name", role: "Admin", dept: "Admin", toObject() { return { _id: this._id, name: this.name, role: this.role, dept: this.dept }; } };
  const payload = {
    name: "Updated name", email: "ADMIN@example.com", phone: "9876543210",
    imageUrl: "https://example.com/profile.webp", imagePublicId: "profile-photo",
  };
  const queries = [];
  const find = mock.method(User, "findOne", async (query) => {
    queries.push(query);
    return query._id === "admin_01" ? existing : null;
  });
  const update = mock.method(User, "findOneAndUpdate", async (query, values) => {
    assert.deepEqual(query, { _id: "admin_01" });
    return { _id: "admin_01", toObject: () => ({ ...existing.toObject(), ...values, password: "private-hash" }) };
  });
  let response;
  const res = { status(code) { assert.fail(`Unexpected HTTP ${code}`); }, json(value) { response = value; } };
  try {
    await updateUser({ params: { id: "admin_01" }, body: payload }, res);
    assert.deepEqual(queries.slice(0, 2), [{ id: "admin_01" }, { _id: "admin_01" }]);
    assert.equal(response.name, payload.name);
    assert.equal(response.email, "admin@example.com");
    assert.equal(response.phone, payload.phone);
    assert.equal(response.imageUrl, payload.imageUrl);
    assert.equal(response.imagePublicId, payload.imagePublicId);
    assert.equal(response.id, "admin_01");
    assert.equal("password" in response, false);
  } finally {
    find.mock.restore();
    update.mock.restore();
  }
});

test("CRM profile settings persist validated HR-style details and return no password", async () => {
  let saved = false;
  const user = {
    _id: "crm_01",
    id: "crm_01",
    role: "CRM Executive",
    name: "Old name",
    email: "old@example.com",
    password: "private-hash",
    async save() { saved = true; },
    toObject() { const { save, toObject, ...data } = this; return data; },
  };
  const find = mock.method(User, "findOne", async (filter) => filter.email ? null : user);
  const res = response();
  try {
    await updateMyProfile({ user: { id: user.id }, body: {
      name: "Updated name",
      email: "NEW@example.com",
      phone: "9876543210",
      emergencyPhone: "9876543211",
      emergencyName: "Priya Sharma",
      emergencyRelationship: "Sibling",
      panNumber: "abcde1234f",
      aadhaarNumber: "999999990019",
      bankName: "HDFC Bank",
      accountHolder: "Updated Name",
      accountNumber: "001234567890",
      ifscCode: "hdfc0123456",
      bankBranch: "Main Branch",
      imageUrl: "https://example.com/profile.webp",
    } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(saved, true);
    assert.equal(user.name, "Updated name");
    assert.equal(user.email, "new@example.com");
    assert.equal(user.panNumber, "ABCDE1234F");
    assert.equal(user.ifscCode, "HDFC0123456");
    assert.equal(user.imageUrl, "https://example.com/profile.webp");
    assert.equal("password" in res.body, false);
  } finally {
    find.mock.restore();
  }
});

test("CRM profile settings reject invalid KYC values and insecure photo URLs before saving", async () => {
  let saved = false;
  const user = {
    _id: "crm_01",
    id: "crm_01",
    role: "CRM Executive",
    email: "employee@example.com",
    async save() { saved = true; },
  };
  const find = mock.method(User, "findOne", async () => user);
  const res = response();
  try {
    await updateMyProfile({ user: { id: user.id }, body: { panNumber: "not-a-pan", imageUrl: "http://example.com/photo.png" } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(saved, false);
    assert.match(res.body.error, /PAN/i);

    await updateMyProfile({ user: { id: user.id }, body: { imageUrl: "http://example.com/photo.png" } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(saved, false);
    assert.match(res.body.error, /secure/i);
  } finally {
    find.mock.restore();
  }
});

test("CRM profile settings enforce Indian mobile numbers and real emergency contact names", async () => {
  let saved = false;
  const user = {
    _id: "crm_01", id: "crm_01", role: "CRM Executive", email: "employee@example.com",
    async save() { saved = true; },
  };
  const find = mock.method(User, "findOne", async () => user);
  try {
    const invalidPhone = response();
    await updateMyProfile({ user: { id: user.id }, body: { phone: "1234567890" } }, invalidPhone);
    assert.equal(invalidPhone.statusCode, 400);
    assert.match(invalidPhone.body.error, /10-digit/i);

    const invalidContact = response();
    await updateMyProfile({ user: { id: user.id }, body: { emergencyName: "8888777788" } }, invalidContact);
    assert.equal(invalidContact.statusCode, 400);
    assert.match(invalidContact.body.error, /letters/i);
    assert.equal(saved, false);
  } finally {
    find.mock.restore();
  }
});

test("CRM profile settings do not allow an existing work email to be claimed", async () => {
  let saved = false;
  const user = {
    _id: "crm_01",
    id: "crm_01",
    role: "CRM Executive",
    email: "employee@example.com",
    async save() { saved = true; },
  };
  const find = mock.method(User, "findOne", async (filter) => (
    filter.email ? { _id: "crm_02", email: filter.email } : user
  ));
  const res = response();
  try {
    await updateMyProfile({ user: { id: user.id }, body: { email: "other@example.com" } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(saved, false);
    assert.equal(res.body.error, "Email already exists");
  } finally {
    find.mock.restore();
  }
});

test("CRM profile settings response excludes password and exposes saved document metadata", async () => {
  const user = {
    _id: "crm_01",
    id: "crm_01",
    role: "CRM Executive",
    password: "private-hash",
    panNumber: "ABCDE1234F",
    documents: { panDocument: { name: "pan.pdf", type: "application/pdf" } },
    toObject() { const { toObject, ...data } = this; return data; },
  };
  const find = mock.method(User, "findOne", async () => user);
  const res = response();
  try {
    await getMyProfile({ user: { id: user.id } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.panNumber, "ABCDE1234F");
    assert.equal(res.body.documents.panDocument.name, "pan.pdf");
    assert.equal("password" in res.body, false);
  } finally {
    find.mock.restore();
  }
});

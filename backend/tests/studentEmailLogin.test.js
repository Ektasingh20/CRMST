import test, { mock } from "node:test";
import assert from "node:assert/strict";

let authEmail = "old@example.com";
const auth = {
  async getUser() { return { email: authEmail }; },
  async updateUser(_uid, changes) { authEmail = changes.email; },
};

mock.module("../config/db.js", { namedExports: { isMongoConnected: true } });
mock.module("firebase-admin/auth", { namedExports: { getAuth: () => auth } });

const { default: User } = await import("../models/User.js");
const { updateMyProfile } = await import("../controllers/usersController.js");
const { login } = await import("../controllers/authController.js");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function student() {
  return {
    _id: "student_01", id: "student_01", username: "student", role: "Student",
    email: "old@example.com", personalEmail: "old@example.com", password: "test-password",
    firebaseAuthManaged: true, firebaseAuthUid: "firebase-student-01",
    async save() {},
    toObject() { const { save, toObject, ...data } = this; return data; },
  };
}

test("student email edits update Firebase Auth before saving the profile", async () => {
  authEmail = "old@example.com";
  const user = student();
  let savedAuthEmail = "";
  user.save = async () => { savedAuthEmail = authEmail; };
  const find = mock.method(User, "findOne", async (filter) => filter.email ? null : user);
  const res = response();
  try {
    await updateMyProfile({ user: { id: user.id }, body: { personalEmail: "new@example.com" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(authEmail, "new@example.com");
    assert.equal(savedAuthEmail, "new@example.com");
    assert.equal(res.body.email, "new@example.com");
  } finally { find.mock.restore(); }
});

test("a failed profile save restores the Firebase Auth email", async () => {
  authEmail = "old@example.com";
  const user = student();
  user.save = async () => { throw new Error("Save failed"); };
  const find = mock.method(User, "findOne", async (filter) => filter.email ? null : user);
  const res = response();
  try {
    await updateMyProfile({ user: { id: user.id }, body: { personalEmail: "new@example.com" } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(authEmail, "old@example.com");
  } finally { find.mock.restore(); }
});

test("login uses the Firebase Auth email when an existing account has drifted", async () => {
  authEmail = "old@example.com";
  const user = student();
  user.email = "new@example.com";
  user.personalEmail = user.email;
  const priorApiKey = process.env.FIREBASE_WEB_API_KEY;
  process.env.FIREBASE_WEB_API_KEY = "test-key";
  const find = mock.method(User, "findOne", async () => user);
  const fetch = mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(JSON.parse(options.body).email, "old@example.com");
    return { ok: true };
  });
  const res = response();
  try {
    await login({ body: { username: "student", password: "test-password" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(authEmail, "new@example.com");
    assert.equal(res.body.user.email, "new@example.com");
  } finally {
    find.mock.restore();
    fetch.mock.restore();
    if (priorApiKey === undefined) delete process.env.FIREBASE_WEB_API_KEY;
    else process.env.FIREBASE_WEB_API_KEY = priorApiKey;
  }
});

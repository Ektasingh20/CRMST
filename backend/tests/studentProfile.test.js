import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../config/db.js", { namedExports: { isMongoConnected: true } });
const { default: User } = await import("../models/User.js");
const { updateMyProfile, updateUser } = await import("../controllers/usersController.js");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("students can change their email without changing managed account fields", async () => {
  let saved = false;
  const user = {
    _id: "student_01", id: "student_01", role: "Student", name: "Old name",
    email: "account@example.com", joined: "2026-09-04", batchNo: "B1", password: "private",
    async save() { saved = true; },
    toObject() { const { save, toObject, ...data } = this; return data; },
  };
  const find = mock.method(User, "findOne", async (filter) => filter.email ? null : user);
  const res = response();
  try {
    await updateMyProfile({ user: { id: "student_01" }, body: {
      name: "Ganesh Dholi", phone: "9383839383", dob: "2005-05-02", gender: "Male",
      personalEmail: "different@example.com", education: "B.Tech", address: "Ajmer, Rajasthan",
      email: "changed@example.com", joined: "2024-01-01", batchNo: "Changed", role: "Admin",
    } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(saved, true);
    assert.equal(res.body.name, "Ganesh Dholi");
    assert.equal(res.body.personalEmail, "different@example.com");
    assert.equal(res.body.email, "different@example.com");
    assert.equal(res.body.joined, "2026-09-04");
    assert.equal(res.body.batchNo, "B1");
    assert.equal(res.body.role, "Student");
    assert.equal("password" in res.body, false);
  } finally { find.mock.restore(); }
});

test("invalid student mobile number is rejected before saving", async () => {
  let saved = false;
  const user = { _id: "student_01", role: "Student", async save() { saved = true; } };
  const find = mock.method(User, "findOne", async () => user);
  const res = response();
  try {
    await updateMyProfile({ user: { id: "student_01" }, body: { phone: "123" } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(saved, false);
    assert.match(res.body.error, /mobile number/i);
  } finally { find.mock.restore(); }
});

test("students cannot use another account's email", async () => {
  let saved = false;
  const user = {
    _id: "student_01", id: "student_01", role: "Student", email: "old@example.com",
    async save() { saved = true; },
  };
  const find = mock.method(User, "findOne", async (filter) => filter.email ? { _id: "student_02" } : user);
  const res = response();
  try {
    await updateMyProfile({ user: { id: "student_01" }, body: { personalEmail: "taken@example.com" } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(saved, false);
    assert.equal(user.email, "old@example.com");
  } finally { find.mock.restore(); }
});

test("invalid student email is rejected before saving", async () => {
  let saved = false;
  const user = {
    _id: "student_01", id: "student_01", role: "Student", email: "old@example.com",
    async save() { saved = true; },
  };
  const find = mock.method(User, "findOne", async () => user);
  const res = response();
  try {
    await updateMyProfile({ user: { id: "student_01" }, body: { personalEmail: "invalid" } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(saved, false);
    assert.match(res.body.error, /valid personal email/i);
  } finally { find.mock.restore(); }
});

test("changing a student's account email also changes their personal email", async () => {
  const student = {
    _id: "student_01", id: "student_01", role: "Student", dept: "Student",
    email: "old@example.com", personalEmail: "old@example.com",
    toObject() { const { toObject, ...data } = this; return data; },
  };
  let savedPayload;
  const find = mock.method(User, "findOne", async (filter) => filter.email ? null : student);
  const update = mock.method(User, "findOneAndUpdate", async (_filter, payload) => {
    savedPayload = payload;
    return { ...student, ...payload, toObject: student.toObject };
  });
  const res = response();
  try {
    await updateUser({ params: { id: "student_01" }, body: {
      email: "NEW@example.com", personalEmail: "different@example.com",
    } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(savedPayload.email, "new@example.com");
    assert.equal(savedPayload.personalEmail, "new@example.com");
  } finally { find.mock.restore(); update.mock.restore(); }
});

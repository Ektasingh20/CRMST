import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../config/db.js", { namedExports: { isMongoConnected: true } });
const { default: User } = await import("../models/User.js");
const { updateMyProfile } = await import("../controllers/usersController.js");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("students can save personal details without changing managed account fields", async () => {
  let saved = false;
  const user = {
    _id: "student_01", id: "student_01", role: "Student", name: "Old name",
    email: "account@example.com", joined: "2026-09-04", batchNo: "B1", password: "private",
    async save() { saved = true; },
    toObject() { const { save, toObject, ...data } = this; return data; },
  };
  const find = mock.method(User, "findOne", async () => user);
  const res = response();
  try {
    await updateMyProfile({ user: { id: "student_01" }, body: {
      name: "Ganesh Dholi", phone: "9383839383", dob: "2005-05-02", gender: "Male",
      personalEmail: "PERSONAL@example.com", education: "B.Tech", address: "Ajmer, Rajasthan",
      email: "changed@example.com", joined: "2024-01-01", batchNo: "Changed", role: "Admin",
    } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(saved, true);
    assert.equal(res.body.name, "Ganesh Dholi");
    assert.equal(res.body.personalEmail, "personal@example.com");
    assert.equal(res.body.email, "account@example.com");
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

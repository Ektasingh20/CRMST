import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../config/db.js", { namedExports: { isMongoConnected: true } });
const { default: User } = await import("../models/User.js");
const { updateUser } = await import("../controllers/usersController.js");

test("profile updates find Firestore IDs and return saved fields and photo without a password", async () => {
  const existing = { _id: "admin_01", name: "Old name" };
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
    return { toObject: () => ({ ...existing, ...values, password: "private-hash" }) };
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

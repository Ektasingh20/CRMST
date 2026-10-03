import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCallLeadDraft } from "../config/firestoreCallListModel.js";

const validDraft = {
  name: "Ekta Singh", phone: "9545678033", city: "Mumbai", type: "Training",
  interest: "Full Stack Development", status: "Interested", leadSource: "Phone Call",
  notes: "Call tomorrow", enteredBy: "client-supplied-id",
};

test("saved call lead drafts keep form fields but not client supplied ownership", () => {
  const draft = normalizeCallLeadDraft(validDraft);
  assert.equal(draft.interest, "Full Stack Development");
  assert.equal(draft.notes, "Call tomorrow");
  assert.equal("enteredBy" in draft, false);
});

test("call lead drafts require a valid phone, city, and interest for their type", () => {
  assert.throws(() => normalizeCallLeadDraft({ ...validDraft, phone: "123" }), /mobile number/);
  assert.throws(() => normalizeCallLeadDraft({ ...validDraft, city: "" }), /City/);
  assert.throws(() => normalizeCallLeadDraft({ ...validDraft, type: "Service" }), /interest/);
});

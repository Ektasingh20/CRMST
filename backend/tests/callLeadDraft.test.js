import test from "node:test";
import assert from "node:assert/strict";
import { isApprovedCallCompletionUpdate, normalizeCallLeadDraft } from "../config/firestoreCallListModel.js";

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

test("saved call lead drafts accept active template interests for the matching lead type", () => {
  const activeInterests = {
    training: ["Back End Development – PHP"],
    service: [],
    internship: [],
  };
  const draft = normalizeCallLeadDraft({
    ...validDraft,
    interest: "Back End Development – PHP",
  }, activeInterests);

  assert.equal(draft.interest, "Back End Development – PHP");
  assert.throws(() => normalizeCallLeadDraft({
    ...validDraft,
    type: "Service",
    interest: "Back End Development – PHP",
  }, activeInterests), /interest/);
});

test("call lead drafts require a valid phone, city, and interest for their type", () => {
  assert.throws(() => normalizeCallLeadDraft({ ...validDraft, phone: "123" }), /mobile number/);
  assert.throws(() => normalizeCallLeadDraft({ ...validDraft, city: "" }), /City/);
  assert.throws(() => normalizeCallLeadDraft({ ...validDraft, type: "Service" }), /interest/);
});

test("approved call contacts allow only Follow Up to Completed status changes", () => {
  const record = { callStatus: "Follow Up" };
  assert.equal(isApprovedCallCompletionUpdate(record, { callStatus: "Completed" }), true);
  assert.equal(isApprovedCallCompletionUpdate(record, { callStatus: "Completed", remark: "updated" }), false);
  assert.equal(isApprovedCallCompletionUpdate({ callStatus: "Completed" }, { callStatus: "Follow Up" }), false);
});

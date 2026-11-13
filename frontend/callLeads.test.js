import test from "node:test";
import assert from "node:assert/strict";
import { isCallLead, callLeadForm, callLeadProgram, callLeadReviewStatus } from "./callLeads.js";

test("only interested follow-up and completed calls appear, regardless of review status", () => {
  for (const callStatus of ["Select Status", "Pending", "Follow Up", "Completed"]) {
    for (const interestStatus of ["Select Status", "Interested", "Not Interested"]) {
      assert.equal(isCallLead({ program: "Back End Development", callStatus, interestStatus, callLeadStatus: "Approved" }),
        interestStatus === "Interested" && ["Follow Up", "Completed"].includes(callStatus));
    }
  }
});

test("a selected course is required and common saved status variants qualify", () => {
  for (const callStatus of ["Follow Up", "follow-up", "Follow-up Required", "Completed", "completed"]) {
    assert.equal(isCallLead({ program: "Back End Development", callStatus, interestStatus: "interested" }), true);
    assert.equal(isCallLead({ program: "", callStatus, interestStatus: "Interested" }), false);
    assert.equal(isCallLead({ program: "IT Training", callStatus, interestStatus: "Interested" }), false);
  }
  assert.equal(callLeadProgram({ program: "IT Training", courseInterest: "Full Stack Development" }), "Full Stack Development");
});

test("prefill copies matching values but never record IDs, call ownership or review state", () => {
  const form = callLeadForm({ id: "call-1", sourceCallId: "old-lead", listType: "training", name: "Ridhi",
    contact: "9989898989", program: "Front End Development Foundation", interestStatus: "Interested",
    assignedTo: "crm-owner", callStatus: "Completed", callLeadStatus: "Approved", remark: "Call tomorrow" });
  assert.equal(form.phone, "9989898989");
  assert.equal(form.type, "Training");
  assert.equal(form.interest, "Front End Development Foundation");
  assert.equal(form.notes, "Call tomorrow");
  assert.equal(form.status, "Interested");
  for (const field of ["city", "company", "email", "value", "assignedTo", "assignedDate", "alternatePhone"]) assert.equal(form[field], "");
  for (const field of ["id", "sourceCallId", "callStatus", "callLeadStatus", "listType"]) assert.equal(Object.hasOwn(form, field), false);
});

test("a call without a selected program leaves interest blank", () => {
  assert.equal(callLeadForm({ listType: "services" }).interest, "");
  assert.equal(callLeadForm({ listType: "services" }).type, "Service");
});

test("call lead review status defaults to Choose but keeps explicitly selected statuses", () => {
  assert.equal(callLeadReviewStatus({}), "");
  assert.equal(callLeadReviewStatus({ callLeadStatus: "Pending" }), "");
  assert.equal(callLeadReviewStatus({ callLeadStatus: "Pending", callLeadStatusSelected: true }), "Pending");
  assert.equal(callLeadReviewStatus({ callLeadStatus: "Approved" }), "Approved");
  assert.equal(callLeadReviewStatus({ callLeadStatus: "Rejected" }), "Rejected");
});

import test from "node:test";
import assert from "node:assert/strict";
import { isCallLead, callLeadForm } from "./callLeads.js";

test("only interested follow-up and completed calls appear, regardless of review status", () => {
  for (const callStatus of ["Select Status", "Pending", "Follow Up", "Completed"]) {
    for (const interestStatus of ["Select Status", "Interested", "Not Interested"]) {
      assert.equal(isCallLead({ callStatus, interestStatus, callLeadStatus: "Approved" }),
        interestStatus === "Interested" && ["Follow Up", "Completed"].includes(callStatus));
    }
  }
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

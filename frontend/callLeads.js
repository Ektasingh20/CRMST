import { normalizeCallProgram, normalizeCallStatus, normalizeInterestStatus } from "./callListConfig.js";

export function callLeadProgram(record) {
  return [record?.program, record?.courseInterest, record?.programInterest, record?.training, record?.service]
    .map(normalizeCallProgram)
    .find(Boolean) || "";
}

export function isCallLead(record) {
  const status = normalizeCallStatus(record?.callStatus);
  return Boolean(callLeadProgram(record))
    && normalizeInterestStatus(record?.interestStatus) === "Interested"
    && ["Follow Up", "Completed"].includes(status);
}

export function callLeadReviewStatus(record) {
  const status = ["Pending", "Approved", "Rejected"].includes(record?.callLeadStatus)
    ? record.callLeadStatus
    : "";
  return status === "Pending" && record.callLeadStatusSelected !== true ? "" : status;
}

// Explicit allowlist: call metadata and IDs must never become a created lead.
export function callLeadForm(record) {
  return {
    name: record.name || "", phone: record.contact || record.phone || "",
    email: record.email || "", city: record.city || "", alternatePhone: "", company: "",
    type: record.listType === "training" ? "Training" : "Service",
    interest: callLeadProgram(record), value: "", status: normalizeInterestStatus(record.interestStatus),
    source: "Phone Call", leadSource: "Phone Call", enteredBy: "",
    assignedTo: record.callLeadAssignedTo || "", assignedDate: "", notes: record.remark || "",
  };
}

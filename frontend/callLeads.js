export function isCallLead(record) {
  const interest = String(record?.interestStatus || "").trim().toLowerCase();
  const status = String(record?.callStatus || "").trim().toLowerCase();
  // Follow Up + Interested belongs in Call Leads. Completed + Interested also
  // belongs there (and is highlighted separately in the source Call List).
  return interest === "interested" && ["follow up", "completed"].includes(status);
}

// Explicit allowlist: call metadata and IDs must never become a created lead.
export function callLeadForm(record) {
  return {
    name: record.name || "", phone: record.contact || record.phone || "",
    email: record.email || "", city: record.city || "", alternatePhone: "", company: "",
    type: record.listType === "training" ? "Training" : "Service",
    interest: record.program || "", value: "", status: record.interestStatus || "",
    source: "Phone Call", leadSource: "Phone Call", enteredBy: "",
    assignedTo: record.callLeadAssignedTo || "", assignedDate: "", notes: record.remark || "",
  };
}

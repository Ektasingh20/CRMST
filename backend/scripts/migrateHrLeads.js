import { connectDatabase } from "../config/db.js";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

await connectDatabase();
const ref = getFirestore().collection("hrLeads").doc("_schema");
const existing = await ref.get();
const leads = await getFirestore().collection("hrLeads").where("recordType", "==", "lead").get();
const defaults = {
  interview_date: "", interview_mode: "", interviewer_id: "", interviewer: "",
  interview_status: "", interview_result: "", interview_feedback: "",
};
const removedFields = ["interview_time", "interview_round", "interview_score", "interview_history", "reschedule_reason"];
let migrated = 0;
for (let offset = 0; offset < leads.docs.length; offset += 400) {
  const batch = getFirestore().batch();
  let batchCount = 0;
  leads.docs.slice(offset, offset + 400).forEach((lead) => {
    const current = lead.data();
    const missing = Object.fromEntries(Object.entries(defaults).filter(([field]) => current[field] === undefined));
    removedFields.forEach((field) => { if (current[field] !== undefined) missing[field] = FieldValue.delete(); });
    if (current.interview_status === "Rescheduled") missing.interview_status = "Scheduled";
    if (Object.keys(missing).length) { batch.set(lead.ref, missing, { merge: true }); migrated += 1; batchCount += 1; }
  });
  if (batchCount) await batch.commit();
}
await ref.set({ recordType: "schema", collection: "hrLeads", version: 3, createdAt: existing.get("createdAt") || new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
console.log(`HR leads interview schema version 3 ready; updated ${migrated} lead(s).`);
process.exit(0);

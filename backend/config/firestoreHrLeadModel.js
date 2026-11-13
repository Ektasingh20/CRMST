import { getFirestore } from "firebase-admin/firestore";

const collection = () => getFirestore().collection("hrLeads");
const normalized = (value) => String(value || "").trim().toLowerCase();

export async function listHrLeads() {
  const snapshot = await collection().where("recordType", "==", "lead").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export async function findInterviewerBooking(interviewerId, date, excludeId = "") {
  const leads = await listHrLeads();
  const match = leads.find((lead) => lead.id !== excludeId
    && lead.interviewer_id === String(interviewerId)
    && lead.interview_date === date
    && lead.interview_status === "Scheduled");
  if (!match) return null;
  return { id: match.id, name: match.name, interview_status: match.interview_status };
}

export async function findHrLeadDuplicate(mobile, email, excludeId = "") {
  const [byMobile, byEmail] = await Promise.all([
    collection().where("recordType", "==", "lead").where("mobileNormalized", "==", normalized(mobile)).get(),
    collection().where("recordType", "==", "lead").where("emailNormalized", "==", normalized(email)).get(),
  ]);
  const match = [...byMobile.docs, ...byEmail.docs].find((doc) => doc.id !== excludeId);
  if (!match) return null;
  const data = match.data();
  return { id: match.id, name: data.name, mobile: data.mobile, email: data.email };
}

export async function saveHrLead(id, data) {
  const ref = id ? collection().doc(id) : collection().doc();
  if (id && !(await ref.get()).exists) return null;
  await ref.set(data, { merge: Boolean(id) });
  const saved = await ref.get();
  return { id: ref.id, ...saved.data() };
}

export async function removeHrLead(id) {
  const ref = collection().doc(id);
  const existing = await ref.get();
  if (!existing.exists || existing.get("recordType") !== "lead") return false;
  await ref.delete();
  return true;
}

import { getFirestore } from "firebase-admin/firestore";

export const HELPDESK_EMPLOYEES = "hrHelpdeskEmployees";
export const HELPDESK_THREADS = "hrHelpdeskThreads";
export const LEGACY_HELPDESK_CONVERSATIONS = "hrHelpdeskConversations";

export function helpdeskEmployeeRef(employeeId, db = getFirestore()) {
  const id = String(employeeId || "").trim();
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw new Error("Invalid helpdesk employee ID.");
  return db.collection(HELPDESK_EMPLOYEES).doc(id);
}

export function helpdeskThreads(employeeId, db = getFirestore()) {
  return helpdeskEmployeeRef(employeeId, db).collection(HELPDESK_THREADS);
}

export function helpdeskThreadRef(employeeId, conversationId, db = getFirestore()) {
  const id = String(conversationId || "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Invalid helpdesk conversation ID.");
  return helpdeskThreads(employeeId, db).doc(id);
}

export function helpdeskThreadGroup(db = getFirestore()) {
  return db.collectionGroup(HELPDESK_THREADS);
}

export function legacyHelpdeskThreads(db = getFirestore()) {
  return db.collection(LEGACY_HELPDESK_CONVERSATIONS);
}

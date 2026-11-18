import { getFirestore } from "firebase-admin/firestore";

const leaveCollection = () => getFirestore().collection("leaves");
const executiveName = (name) => String(name || "CRM Executive").trim() || "CRM Executive";
const executiveDocumentId = (name) => encodeURIComponent(executiveName(name));
const leaveData = (snapshot) => ({ id: snapshot.data().id || snapshot.id, ...snapshot.data(), _ref: snapshot.ref });
let warnedMissingOverlapIndex = false;
let warnedMissingEmployeeIndex = false;
let warnedMissingLeaveIdIndex = false;

export async function listLeaves(db = getFirestore()) {
  const snapshot = await db.collectionGroup("leaves").get();
  return snapshot.docs
    .filter((document) => document.data().from && document.data().to)
    .map(leaveData)
    .sort((left, right) => String(right.appliedOn || "").localeCompare(String(left.appliedOn || "")));
}

export async function listEmployeeLeaves(employeeId, db = getFirestore()) {
  const id = String(employeeId || "").trim();
  if (!id) return [];
  let documents;
  try {
    const snapshot = await db.collectionGroup("leaves").where("employeeId", "==", id).get();
    documents = snapshot.docs;
  } catch (error) {
    if (error?.code !== 9 && error?.code !== "failed-precondition") throw error;
    if (!warnedMissingEmployeeIndex) {
      console.warn("Employee leave index unavailable; using one collection-group fallback read until the index is ready.");
      warnedMissingEmployeeIndex = true;
    }
    const snapshot = await db.collectionGroup("leaves").get();
    documents = snapshot.docs;
  }
  return documents
    .filter((document) => String(document.data().employeeId || "") === id)
    .filter((document) => document.data().from && document.data().to)
    .map(leaveData)
    .sort((left, right) => String(right.appliedOn || "").localeCompare(String(left.appliedOn || "")));
}

export async function getLeaveById(id, db = getFirestore()) {
  const leaveId = String(id || "").trim();
  if (!leaveId) return null;
  let document;
  try {
    const snapshot = await db.collectionGroup("leaves").where("id", "==", leaveId).limit(1).get();
    document = snapshot.docs[0];
  } catch (error) {
    if (error?.code !== 9 && error?.code !== "failed-precondition") throw error;
    if (!warnedMissingLeaveIdIndex) {
      console.warn("Leave ID index unavailable; using one collection-group fallback read until the index is ready.");
      warnedMissingLeaveIdIndex = true;
    }
    const snapshot = await db.collectionGroup("leaves").get();
    document = snapshot.docs.find((item) => String(item.data().id || item.id) === leaveId);
  }
  return document ? leaveData(document) : null;
}

export async function listApprovedLeavesBetween(start, end, db = getFirestore()) {
  let documents;
  try {
    const snapshot = await db.collectionGroup("leaves")
      .where("status", "in", ["Approved", "approved"])
      .where("from", "<=", end)
      .get();
    documents = snapshot.docs;
  } catch (error) {
    if (error?.code !== 9 && error?.code !== "failed-precondition") throw error;
    if (!warnedMissingOverlapIndex) {
      console.warn("Approved-leave overlap index unavailable; using one collection-group fallback read per request.");
      warnedMissingOverlapIndex = true;
    }
    const snapshot = await db.collectionGroup("leaves").get();
    documents = snapshot.docs;
  }

  const byId = new Map();
  documents.forEach((snapshot) => {
    const data = snapshot.data();
    if (String(data.status || "").toLowerCase() !== "approved"
      || String(data.from || "") > end
      || String(data.to || "") < start) return;
    const leave = { id: data.id || snapshot.id, ...data };
    byId.set(`${leave.employeeId || ""}:${leave.id}`, leave);
  });
  return [...byId.values()];
}

export async function createLeave(data) {
  const owner = executiveName(data.employeeName);
  const parent = leaveCollection().doc(executiveDocumentId(owner));
  const child = parent.collection("leaves").doc(String(data.id));
  const batch = getFirestore().batch();
  batch.set(parent, { employeeName: owner }, { merge: true });
  batch.set(child, data);
  await batch.commit();
  return { ...data, _ref: child };
}

export async function saveLeave(leave) {
  const { _ref, ...data } = leave;
  await _ref.set(data, { merge: true });
  return leave;
}

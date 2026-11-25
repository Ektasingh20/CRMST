import { getFirestore } from "firebase-admin/firestore";
import { ReadCache } from "../itDashboard/src/cache.js";

const leaveCollection = () => getFirestore().collection("leaves");
const executiveName = (name) => String(name || "CRM Executive").trim() || "CRM Executive";
const executiveDocumentId = (name) => encodeURIComponent(executiveName(name));
const leaveReads = new ReadCache(5 * 60_000, 500);
const databaseIds = new WeakMap();
let nextDatabaseId = 1;
const databaseKey = (db) => {
  if (!databaseIds.has(db)) databaseIds.set(db, nextDatabaseId++);
  return databaseIds.get(db);
};
const cachedLeaveData = (snapshot) => ({
  id: snapshot.data().id || snapshot.id,
  ...snapshot.data(),
  _path: snapshot.ref?.path || `leaves/_cache/leaves/${snapshot.id}`,
});
const hydrateLeave = (row, db) => {
  const { _path, ...data } = row;
  return { ...data, _ref: typeof db.doc === "function" ? db.doc(_path) : { path: _path } };
};
const hydrateLeaves = (rows, db) => rows.map((row) => hydrateLeave(row, db));
let warnedMissingOverlapIndex = false;
let warnedMissingEmployeeIndex = false;
let warnedMissingLeaveIdIndex = false;

export async function listLeaves(db = getFirestore()) {
  const rows = await leaveReads.get(`${databaseKey(db)}:all`, async () => {
    const snapshot = await db.collectionGroup("leaves").get();
    return snapshot.docs
      .filter((document) => document.data().from && document.data().to)
      .map(cachedLeaveData);
  });
  return hydrateLeaves(rows, db)
    .sort((left, right) => String(right.appliedOn || "").localeCompare(String(left.appliedOn || "")));
}

export async function listEmployeeLeaves(employeeId, db = getFirestore()) {
  const id = String(employeeId || "").trim();
  if (!id) return [];
  const rows = await leaveReads.get(`${databaseKey(db)}:employee:${id}`, async () => {
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
      .map(cachedLeaveData);
  });
  return hydrateLeaves(rows, db)
    .sort((left, right) => String(right.appliedOn || "").localeCompare(String(left.appliedOn || "")));
}

export async function getLeaveById(id, db = getFirestore()) {
  const leaveId = String(id || "").trim();
  if (!leaveId) return null;
  const row = await leaveReads.get(`${databaseKey(db)}:id:${leaveId}`, async () => {
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
    return document ? cachedLeaveData(document) : null;
  });
  return row ? hydrateLeave(row, db) : null;
}

export async function listApprovedLeavesBetween(start, end, db = getFirestore()) {
  return leaveReads.get(`${databaseKey(db)}:approved:${start}:${end}`, async () => {
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
        console.warn("Approved-leave overlap index unavailable; using one collection-group fallback read per cache window.");
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
  });
}

export async function createLeave(data) {
  const owner = executiveName(data.employeeName);
  const parent = leaveCollection().doc(executiveDocumentId(owner));
  const child = parent.collection("leaves").doc(String(data.id));
  const batch = getFirestore().batch();
  batch.set(parent, { employeeName: owner }, { merge: true });
  batch.set(child, data);
  await batch.commit();
  leaveReads.clear();
  return { ...data, _ref: child };
}

export async function saveLeave(leave) {
  const { _ref, ...data } = leave;
  await _ref.set(data, { merge: true });
  leaveReads.clear();
  return leave;
}

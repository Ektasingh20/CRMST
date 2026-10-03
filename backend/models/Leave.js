import { getFirestore } from "firebase-admin/firestore";

const leaveCollection = () => getFirestore().collection("leaves");
const executiveName = (name) => String(name || "CRM Executive").trim() || "CRM Executive";
const executiveDocumentId = (name) => encodeURIComponent(executiveName(name));
const leaveData = (snapshot) => ({ id: snapshot.data().id || snapshot.id, ...snapshot.data(), _ref: snapshot.ref });

export async function listLeaves() {
  const root = await leaveCollection().get();
  const groups = await Promise.all(root.docs.map((document) => document.ref.collection("leaves").get()));
  return [
    ...root.docs.filter((document) => document.data().from && document.data().to).map(leaveData),
    ...groups.flatMap((group) => group.docs.map(leaveData)),
  ].sort((left, right) => String(right.appliedOn || "").localeCompare(String(left.appliedOn || "")));
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

import { getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

const options = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith("--") && arg.includes("="))
  .map((arg) => arg.slice(2).split(/=(.*)/s).slice(0, 2)));
const apply = process.argv.includes("--apply");
await connectDatabase();
const projectId = getApp().options.projectId;
if (!options.project || options.project !== projectId) throw new Error("Pass --project with the exact connected Firebase project ID.");

const snapshot = await getFirestore().collectionGroup("history").get();
const historyDocs = snapshot.docs.filter((doc) => {
  const parts = doc.ref.path.split("/");
  return parts[0] === "listData" && ["services", "training"].includes(parts[1])
    && parts.at(-4) === "calls" && parts.at(-2) === "history";
});
const byType = Object.fromEntries(["services", "training"].map((type) => [type,
  historyDocs.filter((doc) => doc.ref.path.split("/")[1] === type).length]));
const parentCount = new Set(historyDocs.map((doc) => doc.ref.parent.parent.path)).size;
console.log(JSON.stringify({ projectId, historyDocuments: historyDocs.length, contacts: parentCount, byType, mode: apply ? "delete" : "preview" }));

if (apply) {
  if (!/^[0-9]+$/.test(options.expected || "") || Number(options.expected) !== historyDocs.length) {
    throw new Error("Pass --expected with the exact preview count before deleting.");
  }
  for (let offset = 0; offset < historyDocs.length; offset += 400) {
    const batch = getFirestore().batch();
    historyDocs.slice(offset, offset + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  const remaining = (await getFirestore().collectionGroup("history").get()).docs.filter((doc) => {
    const parts = doc.ref.path.split("/");
    return parts[0] === "listData" && ["services", "training"].includes(parts[1])
      && parts.at(-4) === "calls" && parts.at(-2) === "history";
  }).length;
  console.log(JSON.stringify({ deleted: historyDocs.length, remaining }));
  if (remaining) process.exitCode = 1;
}

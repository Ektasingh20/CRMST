import { getFirestore } from "firebase-admin/firestore";
import { getApp } from "firebase-admin/app";
import { connectDatabase } from "../config/db.js";

const copyOnly = process.argv.includes("--copy-only");
const deleteLogsOnly = process.argv.includes("--delete-logs-only");
const apply = copyOnly || process.argv.includes("--apply");
await connectDatabase();
const db = getFirestore();
const target = db.collection("whatsappMessages");
const legacyTemplates = db.collection("messageTemplates");
const legacyPayments = db.collection("paymentLinks");
const legacyLogs = db.collection("messageLogs");
const [templates, payments, logs, existing] = await Promise.all([
  legacyTemplates.get(), legacyPayments.get(), legacyLogs.get(), target.get(),
]);
const projectId = getApp().options.projectId || process.env.FIREBASE_PROJECT_ID || "configured Firebase project";
console.log(`Project: ${projectId}`);
console.log(`Existing: ${templates.size} templates, ${payments.size} payment links, ${logs.size} logs, ${existing.size} combined documents.`);
if (templates.empty && payments.empty && existing.empty) {
  throw new Error("No WhatsApp catalog found. Refusing to delete logs from a possibly wrong project.");
}
if (deleteLogsOnly) {
  if (existing.empty) throw new Error("Combined WhatsApp catalog has not been verified; logs were not deleted.");
  for (let offset = 0; offset < logs.docs.length; offset += 400) {
    const batch = db.batch();
    logs.docs.slice(offset, offset + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  console.log(`Deleted ${logs.size} messageLogs documents. Legacy templates and payment links were untouched.`);
  process.exit(0);
}

const oldTemplatesById = new Map(templates.docs.map((doc) => [doc.id, doc.data()]));
const oldPaymentsById = new Map(payments.docs.map((doc) => [doc.id, doc.data()]));
const newById = new Map(existing.docs.map((doc) => [doc.id, doc.data()]));
const ids = new Set([...oldTemplatesById.keys(), ...oldPaymentsById.keys()]);
const changes = [...ids].map((id) => {
  const previous = newById.get(id) || {};
  const oldPayment = oldPaymentsById.get(id);
  const { templateId: _unused, ...paymentFields } = oldPayment || {};
  return {
    id,
    data: {
      ...oldTemplatesById.get(id),
      ...previous,
      ...(previous.paymentLink ? {} : oldPayment ? { paymentLink: paymentFields } : {}),
    },
  };
});
console.log(`${changes.length} combined documents to verify; ${templates.size + payments.size + logs.size} old documents to delete.`);
if (!apply) {
  console.log("Dry run only. Pass --copy-only to copy and verify without deleting anything.");
  process.exit(0);
}

for (let offset = 0; offset < changes.length; offset += 400) {
  const batch = db.batch();
  changes.slice(offset, offset + 400).forEach(({ id, data }) => batch.set(target.doc(id), data, { merge: true }));
  await batch.commit();
}

const copied = await target.get();
const copiedById = new Map(copied.docs.map((doc) => [doc.id, doc.data()]));
for (const { id, data } of changes) {
  const result = copiedById.get(id);
  if (!result || (data.message && result.message !== data.message)
    || (data.type && result.type !== data.type)
    || (data.title && result.title !== data.title)
    || (data.paymentLink?.url && result.paymentLink?.url !== data.paymentLink.url)
    || (data.paymentLink && result.paymentLink?.amount !== data.paymentLink.amount)
    || (data.paymentLink && result.paymentLink?.active !== data.paymentLink.active)) {
    throw new Error(`Verification failed for ${id}; old collections were not deleted.`);
  }
}
console.log(`Verified ${changes.length} combined documents.`);
if (copyOnly) {
  console.log("Copy-only complete. All legacy templates, payment links, and logs were left untouched.");
  process.exit(0);
}

console.log("Removing legacy documents.");

const oldDocs = [...templates.docs, ...payments.docs, ...logs.docs];
for (let offset = 0; offset < oldDocs.length; offset += 400) {
  const batch = db.batch();
  oldDocs.slice(offset, offset + 400).forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
console.log(`Removed ${templates.size} legacy templates, ${payments.size} legacy payment links, and ${logs.size} message logs.`);

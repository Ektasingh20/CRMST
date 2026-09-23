import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

const TYPES = ["services", "training"];
const clean = (value) => String(value ?? "").trim();

async function migrateType(type, dryRun) {
  const db = getFirestore();
  const typeRef = db.collection("listData").doc(type);
  const oldCalls = typeRef.collection("calls");
  const executives = typeRef.collection("crmExecutives");
  const snapshot = await oldCalls.get();
  const records = [];
  const oldExecutiveRefs = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.crmExecutiveId) {
      oldExecutiveRefs.push(doc.ref);
      const childSnapshot = await doc.ref.collection("calls").get();
      childSnapshot.docs.forEach((child) => records.push({
        source: child,
        employeeId: clean(child.data()?.assignedTo) || clean(data.crmExecutiveId) || decodeURIComponent(doc.id),
        employeeName: clean(child.data()?.assignedToName) || clean(data.crmExecutiveName),
      }));
      continue;
    }
    if (data.callId || data.assignedTo || data.contact || data.number || data.phone || data.name) {
      records.push({
        source: doc,
        employeeId: clean(data.assignedTo) || "unassigned",
        employeeName: clean(data.assignedToName),
      });
    }
  }
  if (dryRun) return { calls: records.length, executives: oldExecutiveRefs.length };

  const grouped = new Map();
  records.forEach((record) => {
    if (!grouped.has(record.employeeId)) grouped.set(record.employeeId, []);
    grouped.get(record.employeeId).push(record);
  });

  for (const [employeeId, records] of grouped) {
    const employeeRef = executives.doc(encodeURIComponent(employeeId));
    for (let offset = 0; offset < records.length; offset += 249) {
      const batch = db.batch();
      const chunk = records.slice(offset, offset + 249);
      const first = chunk[0] || {};
      batch.set(employeeRef, {
        crmExecutiveId: employeeId,
        crmExecutiveName: clean(first.employeeName) || (employeeId === "unassigned" ? "Unassigned" : ""),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      chunk.forEach(({ source }) => {
        batch.set(employeeRef.collection("calls").doc(source.id), {
          ...source.data(),
          callId: source.id,
          listType: type,
          assignedTo: clean(source.data().assignedTo) || employeeId,
        }, { merge: true });
        batch.delete(source.ref);
      });
      await batch.commit();
    }
  }

  for (let offset = 0; offset < oldExecutiveRefs.length; offset += 450) {
    const batch = db.batch();
    oldExecutiveRefs.slice(offset, offset + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
  return { calls: records.length, executives: oldExecutiveRefs.length };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await connectDatabase();
  let total = 0;
  for (const type of TYPES) {
    const result = await migrateType(type, dryRun);
    total += result.calls;
    console.log(`${dryRun ? "Found" : "Migrated"} ${result.calls} ${type} call record(s) and ${result.executives} old executive document(s).`);
  }
  console.log(`${dryRun ? "Would migrate" : "Migrated"} ${total} call record(s) in total.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

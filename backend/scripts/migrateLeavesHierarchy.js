import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import { leaveDaysInclusive } from "../utils/leaveDuration.js";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await connectDatabase();
  const db = getFirestore();
  const snapshot = await db.collection("leaves").get();
  const legacy = snapshot.docs.filter((document) => document.data().from && document.data().to);
  console.log(`${dryRun ? "Found" : "Migrating"} ${legacy.length} flat leave request(s).`);
  for (const source of legacy) {
    const name = String(source.data().employeeName || "CRM Executive").trim() || "CRM Executive";
    console.log(`${source.ref.path} -> leaves/${encodeURIComponent(name)}/leaves/${source.id}`);
  }
  if (dryRun) {
    const groups = await Promise.all(snapshot.docs.map((document) => document.ref.collection("leaves").get()));
    console.log(`Found ${groups.reduce((count, group) => count + group.size, 0)} nested leave request(s).`);
    return;
  }

  for (const source of legacy) {
    const data = source.data();
    const name = String(data.employeeName || "CRM Executive").trim() || "CRM Executive";
    const parent = db.collection("leaves").doc(encodeURIComponent(name));
    const target = parent.collection("leaves").doc(source.id);
    const existing = await target.get();
    if (existing.exists) {
      console.log(`Skipped ${source.id}: destination already exists.`);
      continue;
    }
    const days = Number(data.days) > 0 ? Number(data.days) : leaveDaysInclusive(data.from, data.to);
    const batch = db.batch();
    batch.set(parent, { employeeName: name }, { merge: true });
    batch.set(target, { ...data, ...(days === null ? {} : { days }) });
    batch.delete(source.ref);
    await batch.commit();
  }
  console.log("Leave hierarchy migration finished.");
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });

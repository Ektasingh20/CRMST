import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

function normalizePhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

function createdTime(document) {
  const value = document.data()?.createdAt;
  const time = Date.parse(String(value || ""));
  return Number.isNaN(time) ? 0 : time;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await connectDatabase();
  const db = getFirestore();
  const rootDocuments = await db.collection("leads").listDocuments();
  console.log(`Found ${rootDocuments.length} lead type document(s).`);
  const groups = new Map();

  for (const typeRef of rootDocuments) {
    const collections = await typeRef.listCollections();
    console.log(`Reading ${typeRef.id}: ${collections.length} interest collection(s).`);
    for (const collection of collections) {
      for (const document of (await collection.get()).docs) {
        const phone = normalizePhone(document.data()?.phone || document.data()?.contact);
        if (!phone) continue;
        if (!groups.has(phone)) groups.set(phone, []);
        groups.get(phone).push(document);
      }
    }
  }

  const duplicates = [];
  const archiveId = `duplicate-leads-${Date.now()}`;
  for (const [phone, documents] of groups) {
    if (documents.length < 2) continue;
    documents.sort((left, right) => createdTime(right) - createdTime(left));
    const keep = documents[0];
    const remove = documents.slice(1);
    duplicates.push({ phone, keep, remove });
    console.log(`${dryRun ? "Would keep" : "Keeping"} ${keep.data()?.name || "Unnamed"} (${keep.ref.path}); ${dryRun ? "would remove" : "removing"} ${remove.length} duplicate(s).`);
    if (!dryRun) {
      await db.runTransaction(async (transaction) => {
        const current = await Promise.all(documents.map((document) => transaction.get(document.ref)));
        if (current.some((document, index) => !document.exists || !document.updateTime.isEqual(documents[index].updateTime))) {
          throw new Error("A lead changed during cleanup. No changes made to this group; run the scan again.");
        }
        const merged = { ...keep.data() };
        for (const document of remove) {
          for (const [key, value] of Object.entries(document.data())) {
            if (!["id", "_id"].includes(key) && (merged[key] === undefined || merged[key] === null || merged[key] === "")) merged[key] = value;
          }
        }
        const notes = [...new Set(documents.flatMap((document) => [document.data().notes, document.data().remark]).filter(Boolean))];
        if (notes.length) merged.notes = notes.join("\n\n");
        for (const document of documents) {
          transaction.set(db.collection("leadCleanupArchives").doc(archiveId).collection("records").doc(), {
            originalPath: document.ref.path, data: document.data(), keptPath: keep.ref.path,
            removed: document.ref.path !== keep.ref.path, archivedAt: new Date().toISOString(),
          });
        }
        transaction.set(keep.ref, merged);
        remove.forEach((document) => transaction.delete(document.ref));
      });
    }
  }

  const removed = duplicates.reduce((total, group) => total + group.remove.length, 0);
  console.log(`${dryRun ? "Would remove" : "Removed"} ${removed} duplicate lead document(s) across ${duplicates.length} phone number(s).`);
  if (!dryRun && removed) console.log(`Recovery archive: leadCleanupArchives/${archiveId}/records`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

function normalizeLeadData(data = {}, listType = "") {
  const normalized = { ...data };
  normalized.listType = String(data.listType || listType || data.type || "training").trim().toLowerCase();
  normalized.phone = normalized.phone || normalized.contact || "";
  normalized.interest = normalized.interest || normalized.program || "";
  normalized.notes = normalized.notes || normalized.remark || "";
  normalized.source = normalized.source || normalized.leadSource || "";
  normalized.createdAt = normalized.createdAt || normalized.createdDate || new Date().toISOString();
  normalized.enteredBy = normalized.enteredBy || "admin";
  normalized.enteredByName = normalized.enteredByName || "System Administrator";

  delete normalized.contact;
  delete normalized.program;
  delete normalized.remark;
  delete normalized.leadSource;
  delete normalized.createdDate;
  delete normalized.type;
  return normalized;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await connectDatabase();
  const db = getFirestore();
  const rootDocuments = await db.collection("leads").listDocuments();
  let scanned = 0;
  let changed = 0;

  for (const typeRef of rootDocuments) {
    const collections = await typeRef.listCollections();
    for (const collection of collections) {
      const snapshot = await collection.get();
      for (const document of snapshot.docs) {
        scanned += 1;
        const current = document.data() || {};
        const normalized = normalizeLeadData(current, typeRef.id);
        if (JSON.stringify(current) === JSON.stringify(normalized)) continue;
        changed += 1;
        if (!dryRun) await document.ref.set(normalized);
      }
    }
  }

  console.log(`${dryRun ? "Would normalize" : "Normalized"} ${changed} of ${scanned} lead document(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

const fieldsToRemove = ["date", "city", "state", "qualification", "college", "snoozed", "snoozeUntil", "email"];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await connectDatabase();
  const snapshot = await getFirestore().collectionGroup("calls").get();
  let changed = 0;
  let batch = getFirestore().batch();
  let operations = 0;

  for (const document of snapshot.docs) {
    if (!document.ref.path.startsWith("listData/")) continue;
    const data = document.data() || {};
    const needsCreatedAt = !data.createdAt;
    const hasLegacyFields = fieldsToRemove.some((field) => Object.prototype.hasOwnProperty.call(data, field));
    if (!needsCreatedAt && !hasLegacyFields) continue;
    const updates = { createdAt: data.createdAt || new Date().toISOString() };
    fieldsToRemove.forEach((field) => { updates[field] = FieldValue.delete(); });
    changed += 1;
    if (!dryRun) {
      batch.update(document.ref, updates);
      operations += 1;
      if (operations === 450) {
        await batch.commit();
        batch = getFirestore().batch();
        operations = 0;
      }
    }
  }

  if (!dryRun && operations) await batch.commit();
  console.log(`${dryRun ? "Would normalize" : "Normalized"} ${changed} call-list document(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

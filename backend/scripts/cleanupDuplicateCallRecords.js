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
  const snapshot = await db.collectionGroup("calls").get();
  const groups = new Map();

  snapshot.docs
    .filter((document) => document.ref.path.startsWith("listData/"))
    .forEach((document) => {
      const phone = normalizePhone(document.data()?.contact || document.data()?.phone);
      if (!phone) return;
      if (!groups.has(phone)) groups.set(phone, []);
      groups.get(phone).push(document);
    });

  let removed = 0;
  let duplicateGroups = 0;
  for (const [phone, documents] of groups) {
    if (documents.length < 2) continue;
    duplicateGroups += 1;
    documents.sort((left, right) => createdTime(right) - createdTime(left));
    const keep = documents[0];
    const remove = documents.slice(1);
    console.log(`${dryRun ? "Would keep" : "Keeping"} ${keep.data()?.name || "Unnamed"} (${phone}); ${dryRun ? "would remove" : "removing"} ${remove.length} duplicate(s).`);
    if (!dryRun) {
      for (const document of remove) await document.ref.delete();
      removed += remove.length;
    } else {
      removed += remove.length;
    }
  }

  console.log(`${dryRun ? "Would remove" : "Removed"} ${removed} duplicate call-list record(s) across ${duplicateGroups} phone number(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Backfills query metadata in place. Defaults to a read-only plan.
// Run against staging or the Firebase Emulator before any production approval.
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";

const apply = process.argv.includes("--apply");
const types = new Set(["services", "training"]);
const dateOf = (value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return String(value);
  const date = value?.toDate?.() || new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

async function main() {
  if (apply && !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("--apply is restricted to the Firebase Emulator. Production migration requires a separately approved runbook.");
  }
  await connectDatabase();
  const db = getFirestore();
  const counts = { scanned: 0, changed: 0, missingDate: 0, byType: { services: 0, training: 0 } };
  let last;
  while (true) {
    let query = db.collectionGroup("calls").orderBy("__name__").limit(200);
    if (last) query = query.startAfter(last);
    const page = await query.get();
    if (page.empty) break;
    const batch = db.batch();
    let writes = 0;
    for (const doc of page.docs) {
      const parts = doc.ref.path.split("/");
      if (parts[0] !== "listData" || !types.has(parts[1])) continue;
      counts.scanned += 1;
      const data = doc.data();
      const type = parts[1];
      counts.byType[type] += 1;
      const uploadDate = dateOf(data.uploadDate || data.date || data.createdAt);
      if (!uploadDate) counts.missingDate += 1;
      const patch = {};
      if (data.listType !== type) patch.listType = type;
      if (!data.callId) patch.callId = doc.id;
      if (!data.uploadDate && uploadDate) patch.uploadDate = uploadDate;
      if (data.lastCallClickedAt === undefined) patch.lastCallClickedAt = null;
      if (data.callDurationSeconds === undefined) patch.callDurationSeconds = null;
      if (data.callDurationSource === undefined) patch.callDurationSource = null;
      if (!Object.keys(patch).length) continue;
      counts.changed += 1;
      if (apply) { batch.update(doc.ref, patch); writes += 1; }
    }
    if (writes) await batch.commit();
    last = page.docs.at(-1);
    console.log(JSON.stringify({ mode: apply ? "emulator-apply" : "dry-run", ...counts }));
  }
  console.log(JSON.stringify({ complete: true, mode: apply ? "emulator-apply" : "dry-run", ...counts }));
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });

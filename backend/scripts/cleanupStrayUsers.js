import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin using the service account JSON in backend/
if (!getApps().length) {
  const serviceAccountPath = join(__dirname, "..", "serviceAccount.json");
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  initializeApp({
    credential: cert(serviceAccount),
  });
}

async function cleanupStrayUsers() {
  const db = getFirestore();
  const snapshot = await db.collection("users").get();
  const seen = new Map();

  const docs = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));

  for (const doc of docs) {
    const key = String(doc.data.username || doc.data.email || "").toLowerCase();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, doc);
    } else {
      const existing = seen.get(key);
      const existingLooksClean = /-\d+$/.test(existing.id) || existing.id === "admin";
      const currentLooksClean = /-\d+$/.test(doc.id) || doc.id === "admin";
      if (!existingLooksClean && currentLooksClean) {
        seen.set(key, doc);
      }
    }
  }

  const keepIds = new Set([...seen.values()].map((d) => d.id));
  const toDelete = docs.filter((doc) => !keepIds.has(doc.id));

  console.log(`Found ${docs.length} docs, keeping ${keepIds.size}, deleting ${toDelete.length}`);
  for (const doc of toDelete) {
    console.log(`Deleting stray doc: ${doc.id} (${doc.data.name || doc.data.username || "unknown"})`);
    await db.collection("users").doc(doc.id).delete();
  }
  console.log("Cleanup complete.");
}

cleanupStrayUsers().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
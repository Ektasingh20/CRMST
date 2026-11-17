import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import User from "../models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clean = (value) => String(value ?? "").trim();
const departmentByPrefix = {
  admin: "admin",
  crm: "crm",
  hr: "hr",
  it: "it",
  operation: "operations",
  operations: "operations",
  ops: "operations",
};

function isStudent(user) {
  return [user?.role, user?.dept, user?.department]
    .some((value) => ["student", "students"].includes(clean(value).toLowerCase()));
}

function historicalOwner(db, recipientId) {
  if (/^student_/i.test(recipientId)) {
    return { ref: db.collection("students").doc(recipientId), student: true };
  }
  const prefix = recipientId.match(/^([a-z]+)_/i)?.[1]?.toLowerCase();
  const department = departmentByPrefix[prefix];
  if (!department) return null;
  return {
    ref: db.collection("users").doc(department).collection("members").doc(recipientId),
    student: false,
  };
}

function backupNotifications(snapshot) {
  const directory = path.resolve(__dirname, "..", ".notification-migration-backups");
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = path.join(directory, `notifications-${stamp}.json`);
  const documents = snapshot.docs.map((document) => ({
    path: document.ref.path,
    data: document.data(),
  }));
  fs.writeFileSync(filename, `${JSON.stringify({ createdAt: new Date().toISOString(), documents }, null, 2)}\n`, { flag: "wx" });
  return filename;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const confirmed = process.argv.includes("--confirm=MOVE_LEGACY_NOTIFICATIONS");
  if (apply && !process.env.FIRESTORE_EMULATOR_HOST && !confirmed) {
    throw new Error("Production migration requires --confirm=MOVE_LEGACY_NOTIFICATIONS.");
  }

  await connectDatabase();
  const db = getFirestore();
  const [legacy, users] = await Promise.all([
    db.collection("notifications").get(),
    User.find(),
  ]);
  const usersById = new Map(users.map((user) => [clean(user.id || user._id), user]));
  const planned = [];
  const skipped = [];

  for (const source of legacy.docs) {
    const data = source.data();
    const recipientId = clean(data.recipientId);
    const user = usersById.get(recipientId) || null;
    let owner;
    let student;
    let inferred = false;
    if (user) {
      student = isStudent(user);
      owner = student ? db.collection("students").doc(recipientId) : user._ref;
    } else {
      const historical = historicalOwner(db, recipientId);
      if (!historical) {
        skipped.push({ source, reason: `recipient ${recipientId || "(missing)"} has no recognizable account path` });
        continue;
      }
      owner = historical.ref;
      student = historical.student;
      inferred = true;
    }
    const target = owner.collection("notifications").doc(source.id);
    const existing = await target.get();
    planned.push({ source, data, recipientId, user, owner, student, inferred, target, targetExists: existing.exists });
  }

  console.log(`${apply ? "Migrating" : "Would migrate"} ${planned.length} flat notification(s); ${skipped.length} skipped.`);
  planned.forEach(({ source, target, inferred, targetExists }) => {
    console.log(`${source.ref.path} -> ${target.path}${inferred ? " (historical path inferred)" : ""}${targetExists ? " (destination already exists)" : ""}`);
  });
  skipped.forEach(({ source, reason }) => console.warn(`Skip ${source.ref.path}: ${reason}.`));
  if (!apply) return;
  if (skipped.length) throw new Error("Migration stopped because one or more notifications have no safe destination.");

  const backup = backupNotifications(legacy);
  console.log(`Backup saved to ${backup}`);

  for (let offset = 0; offset < planned.length; offset += 120) {
    const batch = db.batch();
    planned.slice(offset, offset + 120).forEach(({ source, data, recipientId, user, owner, student, target, targetExists }) => {
      const recipientName = clean(user?.name || user?.username);
      if (student) {
        batch.set(owner, {
          studentId: recipientId,
          ...(recipientName ? { studentName: recipientName } : {}),
        }, { merge: true });
      }
      if (!targetExists) {
        batch.set(target, {
          ...data,
          id: clean(data.id) || source.id,
          ...(recipientName ? { recipientName } : {}),
        });
      }
      batch.delete(source.ref);
    });
    await batch.commit();
  }
  console.log(`Migrated ${planned.length} notification(s); the flat notifications collection is now empty.`);
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });

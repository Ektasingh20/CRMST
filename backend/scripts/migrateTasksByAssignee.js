import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import User from "../models/User.js";

const clean = (value) => String(value ?? "").trim();

async function main() {
  const dryRun = !process.argv.includes("--apply");
  if (!dryRun && !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("--apply is restricted to the Firebase Emulator. Production migration requires approval and a backup.");
  }
  await connectDatabase();
  const db = getFirestore();
  const root = db.collection("tasks");
  const [legacySnapshot, users] = await Promise.all([root.where("id", ">", "").get(), User.find()]);
  const usersById = new Map(users.map((user) => [clean(user.id || user._id), user.toObject()]));
  const migratable = legacySnapshot.docs.filter((doc) => clean(doc.data()?.assigneeId) && clean(doc.data()?.title));
  const skipped = legacySnapshot.size - migratable.length;

  if (dryRun) {
    console.log(`Would migrate ${migratable.length} legacy task(s) into per-user folders; ${skipped} invalid task(s) would be skipped.`);
    return;
  }

  for (let offset = 0; offset < migratable.length; offset += 160) {
    const batch = db.batch();
    migratable.slice(offset, offset + 160).forEach((source) => {
      const data = source.data();
      const assigneeId = clean(data.assigneeId);
      const employee = usersById.get(assigneeId) || {};
      const owner = root.doc(encodeURIComponent(assigneeId));
      const taskId = clean(data.id) || source.id;
      batch.set(owner, {
        userId: assigneeId,
        userName: clean(data.assignee || employee.name || employee.username),
        role: clean(data.assigneeRole || employee.role),
        department: clean(data.assigneeDepartment || employee.dept || employee.department),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      batch.set(owner.collection("assignedTasks").doc(taskId), {
        ...data,
        id: taskId,
        assigneeRole: clean(data.assigneeRole || employee.role),
        assigneeDepartment: clean(data.assigneeDepartment || employee.dept || employee.department),
      });
      batch.delete(source.ref);
    });
    await batch.commit();
  }
  console.log(`Migrated ${migratable.length} task(s) into per-user folders; skipped ${skipped}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

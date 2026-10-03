import { mkdir, writeFile } from 'node:fs/promises';
import { serialize } from 'node:v8';
import { getFirestore } from 'firebase-admin/firestore';
import { connectDatabase } from '../config/db.js';
import { storedProject } from '../utils/projectData.js';

// Dry run by default. --apply backs up originals before replacing documents.
const apply = process.argv.includes('--apply');
const timeout = setTimeout(() => { console.error('Project cleanup timed out.'); process.exit(1); }, 45000);
try {
  await connectDatabase();
  const db = getFirestore();
  const employees = await db.collection('Project').get();
  const changes = [];
  for (const employee of employees.docs) {
    if (!employee.data().assignedEmployeeId || !employee.data().assignedEmployeeName) throw new Error('Employee identity is missing; cleanup stopped.');
    for (const collection of await employee.ref.listCollections()) {
      const snapshot = await collection.doc('Project Data').get();
      if (!snapshot.exists) continue;
      const original = snapshot.data();
      const cleaned = storedProject(original);
      if (JSON.stringify(original) !== JSON.stringify(cleaned)) changes.push({ snapshot, original, cleaned });
    }
  }
  console.log(`${changes.length} project records ${apply ? 'to clean' : 'would be cleaned (dry run)'}.`);
  if (apply && changes.length) {
    const directory = new URL('../../backups/projects/', import.meta.url);
    await mkdir(directory, { recursive: true });
    const backup = new URL(`projects-${Date.now()}.bin`, directory);
    await writeFile(backup, serialize(changes.map(({ snapshot, original }) => ({ path: snapshot.ref.path, data: original }))), { flag: 'wx' });
    console.log(`Original records backed up to ${backup.pathname}`);
    for (const { snapshot, cleaned } of changes) {
      await db.runTransaction(async transaction => {
        const current = await transaction.get(snapshot.ref);
        if (!current.exists || !current.updateTime.isEqual(snapshot.updateTime)) throw new Error('A project changed during cleanup; rerun to process remaining records.');
        transaction.set(snapshot.ref, cleaned);
      });
    }
    console.log(`Cleaned ${changes.length} project records.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}

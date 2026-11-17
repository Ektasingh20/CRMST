import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import { uploadDayInIndia } from "../config/firestoreCallListModel.js";
import { normalizeCallListDate } from "../../frontend/callListDate.js";

const options = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith("--") && arg.includes("="))
  .map((arg) => arg.slice(2).split(/=(.*)/s).slice(0, 2)));
const apply = process.argv.includes("--apply");
const types = ["services", "training"];

await connectDatabase();
const db = getFirestore();
const projectId = getApp().options.projectId;
if (!options.project || options.project !== projectId) throw new Error("Pass --project with the exact connected Firebase project ID.");

const moves = [];
const blockers = [];
for (const type of types) {
  const employees = await db.collection("listData").doc(type).collection("crmExecutives").listDocuments();
  for (const employee of employees) {
    const calls = await employee.collection("calls").get();
    for (const source of calls.docs) {
      const data = source.data();
      const date = normalizeCallListDate(data.date) || normalizeCallListDate(data.uploadDate)
        || (data.createdAt && !Number.isNaN(Date.parse(data.createdAt)) ? uploadDayInIndia(data.createdAt) : "");
      if (!date) { blockers.push("missing-date"); continue; }
      const target = employee.collection("dates").doc(date).collection("calls").doc(source.id);
      const children = await source.ref.listCollections();
      if (children.length) { blockers.push("child-collection"); continue; }
      const targetSnapshot = await target.get();
      if (targetSnapshot.exists && !isDeepStrictEqual(targetSnapshot.data(), data)) {
        blockers.push("destination-conflict"); continue;
      }
      let leadRef = null;
      let leadSnapshot = null;
      if (data.leadCreated || data.callLeadStatus === "Approved") {
        const leadPath = String(data.createdLeadId || "");
        if (!leadPath.startsWith("leads/") && !leadPath.startsWith("leadData/")) {
          blockers.push("missing-lead-path"); continue;
        }
        leadRef = db.doc(leadPath);
        leadSnapshot = await leadRef.get();
        if (!leadSnapshot.exists || ![source.ref.path, target.path].includes(leadSnapshot.data()?.sourceCallPath)) {
          blockers.push("lead-path-conflict"); continue;
        }
      }
      moves.push({ type, employee, source, target, date, leadRef, leadSnapshot,
        targetExists: targetSnapshot.exists });
    }
  }
}

const counts = Object.fromEntries(types.map((type) => [type, moves.filter((move) => move.type === type).length]));
const uniqueDates = new Set(moves.map((move) => `${move.type}/${move.employee.id}/${move.date}`)).size;
const summary = { projectId, mode: apply ? "apply" : "preview", calls: moves.length, byType: counts,
  dateFolders: uniqueDates, linkedLeads: moves.filter((move) => move.leadRef).length,
  existingTargets: moves.filter((move) => move.targetExists).length,
  blockers: Object.fromEntries([...new Set(blockers)].map((reason) => [reason, blockers.filter((item) => item === reason).length])) };
console.log(JSON.stringify(summary));

if (apply) {
  if (blockers.length) throw new Error("Migration has blockers. Resolve them before applying.");
  if (!/^\d+$/.test(options.expected || "") || Number(options.expected) !== moves.length) {
    throw new Error("Pass --expected with the exact preview count.");
  }
  if (!options.backup || !path.isAbsolute(options.backup)) throw new Error("Pass --backup with an absolute path outside the repository.");
  const backupPath = path.resolve(options.backup);
  if (backupPath.startsWith(path.resolve(process.cwd()) + path.sep)) throw new Error("Keep the backup outside the repository.");
  const backup = JSON.stringify({ projectId, createdAt: new Date().toISOString(), calls: moves.map((move) => ({
    path: move.source.ref.path, data: move.source.data(),
    linkedLeadPath: move.leadRef?.path || null, linkedLeadData: move.leadSnapshot?.data(),
  })) }, null, 2);
  await fs.writeFile(backupPath, backup, { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ backupPath, backupSha256: createHash("sha256").update(backup).digest("hex") }));
  let migrated = 0;
  for (const move of moves) {
    const moved = await db.runTransaction(async (transaction) => {
      const [fresh, target, lead] = await Promise.all([
        transaction.get(move.source.ref), transaction.get(move.target),
        move.leadRef ? transaction.get(move.leadRef) : Promise.resolve(null),
      ]);
      if (!fresh.exists) return false;
      if (!fresh.updateTime.isEqual(move.source.updateTime)) {
        throw new Error(`Call changed after backup: ${move.source.ref.path}`);
      }
      if (target.exists && !isDeepStrictEqual(target.data(), fresh.data())) throw new Error(`Destination conflict: ${move.target.path}`);
      if (lead && (!lead.exists || ![move.source.ref.path, move.target.path].includes(lead.data()?.sourceCallPath))) {
        throw new Error(`Lead reference conflict: ${move.leadRef.path}`);
      }
      if (lead && !lead.updateTime.isEqual(move.leadSnapshot.updateTime)) {
        throw new Error(`Lead changed after backup: ${move.leadRef.path}`);
      }
      transaction.set(move.employee.collection("dates").doc(move.date), { date: move.date, updatedAt: new Date().toISOString() }, { merge: true });
      if (!target.exists) transaction.create(move.target, fresh.data());
      if (lead && lead.data().sourceCallPath !== move.target.path) transaction.update(move.leadRef, { sourceCallPath: move.target.path });
      transaction.delete(move.source.ref);
      return true;
    });
    if (moved) migrated += 1;
  }
  console.log(JSON.stringify({ migrated, remainingDirectCalls: moves.length - migrated }));
}

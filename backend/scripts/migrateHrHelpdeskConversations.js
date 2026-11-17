import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFirestore } from "firebase-admin/firestore";
import { connectDatabase } from "../config/db.js";
import {
  helpdeskEmployeeRef,
  helpdeskThreadRef,
  legacyHelpdeskThreads,
} from "../services/hrHelpdeskPaths.js";
import {
  decodeFirestoreValue,
  encodeFirestoreValue,
  sameAttendanceData,
} from "../services/attendanceTestManifest.js";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".hr-helpdesk-migration-manifests");
const args = process.argv.slice(2);
const prepare = args.includes("--prepare");
const apply = args.includes("--apply");
const operation = String(args.find((arg) => arg.startsWith("--operation="))?.slice(12) || "");

function ownerId(data) {
  const explicit = String(data.employeeId || "").trim();
  if (explicit) return explicit;
  const creator = String(data.createdById || "").trim();
  if (/^(crm|it)_[A-Za-z0-9_-]+$/i.test(creator)
    && ["crm", "it"].includes(String(data.department || "").toLowerCase())) return creator;
  throw new Error("Cannot determine the employee for a legacy helpdesk conversation.");
}

function migratedConversation(id, data) {
  const employeeId = ownerId(data);
  const participants = Array.isArray(data.participantIds) ? data.participantIds.map(String) : [];
  return {
    ...data,
    conversationId: id,
    employeeId,
    participantIds: [...new Set([employeeId, ...participants])],
    schemaVersion: 2,
  };
}

async function prepareManifest(db) {
  const snapshot = await legacyHelpdeskThreads(db).get();
  const conversations = [];
  for (const doc of snapshot.docs) {
    const migrated = migratedConversation(doc.id, doc.data());
    const destination = helpdeskThreadRef(migrated.employeeId, doc.id, db);
    const [messages, destinationSnapshot] = await Promise.all([
      doc.ref.collection("messages").get(),
      destination.get(),
    ]);
    if (destinationSnapshot.exists) throw new Error(`Destination already exists: ${destination.path}`);
    if (messages.size > 200) throw new Error(`Conversation ${doc.id} has too many messages for an atomic move.`);
    conversations.push({
      id: doc.id,
      sourcePath: doc.ref.path,
      destinationPath: destination.path,
      employeeId: migrated.employeeId,
      original: encodeFirestoreValue(doc.data()),
      migrated: encodeFirestoreValue(migrated),
      messages: messages.docs.map((message) => ({ id: message.id, data: encodeFirestoreValue(message.data()) })),
    });
  }
  const operationId = `hr-helpdesk-migration-${Date.now()}-${randomUUID().slice(0, 8)}`;
  return { version: 1, operationId, state: "prepared", createdAt: new Date().toISOString(), conversations };
}

function validateManifest(manifest) {
  if (manifest.version !== 1 || manifest.operationId !== operation
    || !["prepared", "applied"].includes(manifest.state)
    || !Array.isArray(manifest.conversations)) throw new Error("Invalid helpdesk migration manifest.");
  const ids = new Set();
  for (const item of manifest.conversations) {
    if (!/^[a-f0-9-]{36}$/i.test(item.id) || ids.has(item.id)
      || item.sourcePath !== `hrHelpdeskConversations/${item.id}`
      || item.destinationPath !== helpdeskThreadRef(item.employeeId, item.id).path
      || !Array.isArray(item.messages) || item.messages.length > 200) {
      throw new Error("Helpdesk migration manifest contains an invalid path or duplicate conversation.");
    }
    ids.add(item.id);
  }
}

async function applyManifest(db, manifest) {
  for (const item of manifest.conversations) {
    const source = db.doc(item.sourcePath);
    const destination = db.doc(item.destinationPath);
    const parent = helpdeskEmployeeRef(item.employeeId, db);
    const original = decodeFirestoreValue(item.original);
    const migrated = decodeFirestoreValue(item.migrated);
    await db.runTransaction(async (transaction) => {
      const [current, target, messageQuery] = await Promise.all([
        transaction.get(source),
        transaction.get(destination),
        transaction.get(source.collection("messages")),
      ]);
      if (!current.exists && target.exists && sameAttendanceData(target.data(), migrated)) return;
      if (!current.exists || target.exists || !sameAttendanceData(current.data(), original)) {
        throw new Error(`Conversation changed or destination is occupied: ${item.id}`);
      }
      const actualMessages = messageQuery.docs.map((doc) => [doc.id, doc.data()]);
      if (actualMessages.length !== item.messages.length || item.messages.some((message) => {
        const actual = actualMessages.find(([id]) => id === message.id);
        return !actual || !sameAttendanceData(actual[1], decodeFirestoreValue(message.data));
      })) throw new Error(`Messages changed since preview: ${item.id}`);
      transaction.set(parent, {
        employeeId: item.employeeId,
        employeeName: migrated.employeeName || "Employee",
        department: migrated.department || "",
        updatedAt: migrated.updatedAt || migrated.createdAt || "",
      }, { merge: true });
      transaction.create(destination, migrated);
      item.messages.forEach((message) => transaction.create(destination.collection("messages").doc(message.id), decodeFirestoreValue(message.data)));
      messageQuery.docs.forEach((message) => transaction.delete(message.ref));
      transaction.delete(source);
    });
    const [oldDoc, newDoc, oldMessages, newMessages] = await Promise.all([
      source.get(), destination.get(), source.collection("messages").get(), destination.collection("messages").get(),
    ]);
    if (oldDoc.exists || oldMessages.size || !newDoc.exists || !sameAttendanceData(newDoc.data(), migrated)
      || newMessages.size !== item.messages.length || item.messages.some((message) => {
        const found = newMessages.docs.find((doc) => doc.id === message.id);
        return !found || !sameAttendanceData(found.data(), decodeFirestoreValue(message.data));
      })) throw new Error(`Post-migration verification failed for ${item.id}.`);
    console.log(`Moved ${item.id} to ${destination.path} (${item.messages.length} messages).`);
  }
  manifest.state = "applied";
  manifest.appliedAt = new Date().toISOString();
  await fs.writeFile(path.join(directory, `${operation}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
}

if (prepare === apply) throw new Error("Choose exactly one of --prepare or --apply.");
await connectDatabase();
const db = getFirestore();
if (prepare) {
  const manifest = await prepareManifest(db);
  await fs.mkdir(directory, { recursive: true });
  const manifestPath = path.join(directory, `${manifest.operationId}.json`);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({
    mode: "PREPARE — NO FIRESTORE WRITES",
    operationId: manifest.operationId,
    backup: manifestPath,
    conversations: manifest.conversations.map((item) => ({
      from: item.sourcePath, to: item.destinationPath, messages: item.messages.length,
    })),
  }, null, 2));
} else {
  if (!/^hr-helpdesk-migration-[A-Za-z0-9-]+$/.test(operation)) throw new Error("Provide --operation=<prepared-id>.");
  const manifest = JSON.parse(await fs.readFile(path.join(directory, `${operation}.json`), "utf8"));
  validateManifest(manifest);
  await applyManifest(db, manifest);
  console.log(`Verified ${manifest.conversations.length} migrated helpdesk conversations.`);
}

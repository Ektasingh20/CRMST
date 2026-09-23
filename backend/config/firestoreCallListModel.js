import { getFirestore } from "firebase-admin/firestore";
import { isDeepStrictEqual } from "node:util";

const validTypes = new Set(["services", "training"]);
export function normalizeListType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (!validTypes.has(type)) throw new Error("List type must be services or training.");
  return type;
}

const clean = (value) => String(value ?? "").trim();
const cleanIndianPhone = (value) => {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
};
const executiveDocumentId = (assignedTo) => encodeURIComponent(clean(assignedTo));
const typeRef = (type) => getFirestore().collection("listData").doc(normalizeListType(type));
const legacyCalls = (type) => typeRef(type).collection("calls");
const executiveRef = (type, assignedTo) => typeRef(type).collection("crmExecutives").doc(executiveDocumentId(assignedTo));
const executiveCalls = (type, assignedTo) => executiveRef(type, assignedTo).collection("calls");
const legacyExecutiveCalls = (type, assignedTo) => legacyCalls(type).doc(executiveDocumentId(assignedTo)).collection("calls");
const LIST_CACHE_TTL_MS = 10 * 60 * 1000;
const listCache = new Map();
const listRequests = new Map();
const callRefs = new Map();
let allCallsRequest;
function readAllCalls() {
  // Both list types share a single collection-group read during an admin refresh.
  if (!allCallsRequest) {
    allCallsRequest = getFirestore().collectionGroup("calls").get()
      .finally(() => { allCallsRequest = undefined; });
  }
  return allCallsRequest;
}

const listCacheKey = (type, assignedTo) => `${normalizeListType(type)}:${clean(assignedTo)}`;
const copyRows = (rows) => rows.map((row) => ({ ...row }));

function updateCachedRecord(type, record, remove = false) {
  const normalizedType = normalizeListType(type);
  for (const [key, cached] of listCache) {
    const [cachedType, cachedAssignee] = key.split(":");
    if (cachedType !== normalizedType) continue;
    if (cachedAssignee
      && cachedAssignee !== String(record.assignedTo || "")
      && cachedAssignee !== String(record.callLeadAssignedTo || "")) continue;
    const withoutRecord = cached.rows.filter((row) => row.id !== record.id);
    cached.rows = remove ? withoutRecord : [{ ...record }, ...withoutRecord];
  }
}

async function listTypeRecords(type, assignedTo = "") {
  const key = listCacheKey(type, assignedTo);
  const cached = listCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < LIST_CACHE_TTL_MS) return copyRows(cached.rows);
  if (!listRequests.has(key)) {
    const request = (async () => {
      // A delegated call lead must also be visible to the employee who receives it,
      // even though its original call-list owner may be another employee.
      const snapshot = await readAllCalls();
      const normalizedType = normalizeListType(type);
      const rows = snapshot.docs
        .filter((doc) => doc.ref.path.startsWith(`listData/${normalizedType}/`))
        .filter((doc) => !assignedTo
          || String(doc.data().assignedTo || "") === String(assignedTo)
          || String(doc.data().callLeadAssignedTo || "") === String(assignedTo))
        .map((doc) => ({ id: doc.id, listType: normalizedType, ...doc.data() }));
      snapshot.docs.forEach((doc) => {
        if (!doc.ref.path.startsWith(`listData/${normalizedType}/`)) return;
        if (assignedTo && String(doc.data().assignedTo || "") !== String(assignedTo)
          && String(doc.data().callLeadAssignedTo || "") !== String(assignedTo)) return;
        callRefs.set(`${normalizedType}:${assignedTo}:${doc.id}`, doc.ref);
      });
      listCache.set(key, { rows, fetchedAt: Date.now() });
      return rows;
    })().finally(() => listRequests.delete(key));
    listRequests.set(key, request);
  }
  return copyRows(await listRequests.get(key));
}

async function findCallSnapshot(type, id, assignedTo = "") {
  const normalizedType = normalizeListType(type);
  const callId = String(id);
  const cachedKeys = [`${normalizedType}:${clean(assignedTo)}:${callId}`, `${normalizedType}::${callId}`];
  for (const cacheKey of cachedKeys) {
    const ref = callRefs.get(cacheKey);
    if (!ref) continue;
    const cacheEntry = [...listCache.values()].find((entry) => entry.rows.some((row) => row.id === callId));
    const cachedRow = cacheEntry?.rows.find((row) => row.id === callId);
    if (cachedRow) return { ref, id: callId, exists: true, data: () => ({ ...cachedRow }) };
  }
  if (clean(assignedTo)) {
    const nested = await executiveCalls(normalizedType, assignedTo).doc(callId).get();
    if (nested.exists) return nested;

    // Keep the previous calls/{executive}/calls hierarchy usable until migration is complete.
    const oldNested = await legacyExecutiveCalls(normalizedType, assignedTo).doc(callId).get();
    if (oldNested.exists) return oldNested;
  }

  // Keep records from the old flat structure usable during migration.
  const legacy = await legacyCalls(normalizedType).doc(callId).get();
  if (legacy.exists && legacy.data()?.callId) return legacy;

  const matches = await getFirestore().collectionGroup("calls").where("callId", "==", callId).limit(1).get();
  return matches.docs.find((doc) => doc.data()?.listType === normalizedType) || null;
}

export async function getCallRecord(type, id, assignedTo = "") {
  const doc = await findCallSnapshot(type, id, assignedTo);
  return doc?.exists ? { id: doc.id, listType: normalizeListType(type), ...doc.data() } : null;
}

export async function listCallRecords(type = "", assignedTo = "") {
  const types = type ? [normalizeListType(type)] : [...validTypes];
  const rowsByType = await Promise.all(types.map((listType) => listTypeRecords(listType, assignedTo)));
  return rowsByType.flat()
    .filter((row) => !assignedTo
      || String(row.assignedTo) === String(assignedTo)
      || String(row.callLeadAssignedTo || "") === String(assignedTo))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export async function importCallRecords({ listType, assignedTo, assignedToName = "", rows = [], uploadedBy = "" }) {
  const type = normalizeListType(listType);
  const db = getFirestore();
  const now = new Date().toISOString();
  const employeeId = clean(assignedTo);
  if (!employeeId) throw new Error("CRM executive is required.");
  const employeeRef = executiveRef(type, employeeId);
  const created = [];
  const duplicateContacts = [];
  const existingSnapshot = await readAllCalls();
  const existingNumbers = new Set(existingSnapshot.docs.map((doc) => cleanIndianPhone(doc.data()?.contact)).filter(Boolean));
  const numbersInUpload = new Set();
  rows.forEach((raw) => {
    const ref = employeeRef.collection("calls").doc();
    const contact = cleanIndianPhone(raw.contact || raw.number || raw.phone);
    if (!contact || existingNumbers.has(contact) || numbersInUpload.has(contact)) {
      if (contact) duplicateContacts.push({ name: clean(raw.name) || "Unnamed contact", contact });
      return;
    }
    numbersInUpload.add(contact);
    const record = {
      callId: ref.id, listType: type, name: clean(raw.name),
      contact,
      program: clean(raw.program || raw.service || raw.training || raw.programInterest || raw.courseInterest),
      source: clean(raw.source) || "Uploaded Call List", callStatus: clean(raw.callStatus) || "Select Status",
      interestStatus: clean(raw.interestStatus) || "Select Status", remark: clean(raw.remark), assignedTo: clean(assignedTo),
      assignedToName: clean(assignedToName), callClicked: false, whatsappClicked: false, leadCreated: false, active: true,
      createdAt: now, updatedAt: now, uploadedBy: clean(uploadedBy),
    };
    if (!record.name || !record.contact) return;
    created.push({ id: ref.id, ref, record });
  });
  if (!created.length) {
    const duplicateLabels = [...new Map(duplicateContacts.map((item) => [item.contact, item])).values()]
      .map((item) => `${item.name} (${item.contact})`);
    const error = new Error(duplicateContacts.length
      ? `No contacts were added. These contacts already exist: ${duplicateLabels.join(", ")}.`
      : "No usable contacts were found.");
    error.duplicates = [...new Map(duplicateContacts.map((item) => [item.contact, item])).values()];
    throw error;
  }
  let offset = 0;
  let includeExecutive = true;
  while (offset < created.length) {
    const batch = db.batch();
    const batchSize = includeExecutive ? 449 : 450;
    if (includeExecutive) {
      batch.set(employeeRef, {
        crmExecutiveId: employeeId,
        crmExecutiveName: clean(assignedToName),
        updatedAt: now,
      }, { merge: true });
    }
    created.slice(offset, offset + batchSize).forEach(({ ref, record }) => batch.set(ref, record));
    await batch.commit();
    offset += batchSize;
    includeExecutive = false;
  }
  const records = created.map(({ id, record }) => ({ id, ...record }));
  records.forEach((record) => updateCachedRecord(type, record));
  records.duplicates = [...new Map(duplicateContacts.map((item) => [item.contact, item])).values()];
  return records;
}

export async function updateCallRecord(type, id, patch, assignedTo = "", requiredAssignedTo = "") {
  const allowed = ["leadCreated", "createdLeadId", "createdLeadDate", "callLeadStatus", "callLeadAssignedTo", "callLeadAssignedDate", "callStatus", "interestStatus", "program", "remark", "callClicked", "whatsappClicked", "active", "name", "contact", "assignedTo", "assignedToName"];
  const payload = Object.fromEntries(allowed.filter((key) => patch[key] !== undefined).map((key) => [key, patch[key]]));
  const snapshot = await findCallSnapshot(type, id, assignedTo);
  if (!snapshot?.exists) throw new Error("Call record not found.");
  const ref = snapshot.ref;
  const data = snapshot.data();
  // A lead's visible work date changes only when a CRM user records actual
  // follow-up work: call status, interest status, or a remark. Metadata and
  // assignment edits still receive `updatedAt`, but do not alter this date.
  const workFields = ["callStatus", "callLeadStatus", "interestStatus", "remark"];
  const workRecorded = workFields.some((key) => Object.prototype.hasOwnProperty.call(payload, key)
    && !isDeepStrictEqual(data[key], payload[key]));
  if (workRecorded) payload.lastWorkedAt = new Date().toISOString();
  // The handover date belongs to the assignment itself. Set it on the server so
  // every dashboard shows the same current date when a lead is delegated or
  // returned to its CRM executive.
  const callLeadAssigneeChanged = Object.prototype.hasOwnProperty.call(payload, "callLeadAssignedTo")
    && String(payload.callLeadAssignedTo || "") !== String(data.callLeadAssignedTo || "");
  const ownerChanged = Object.prototype.hasOwnProperty.call(payload, "assignedTo")
    && String(payload.assignedTo || "") !== String(data.assignedTo || "");
  if (callLeadAssigneeChanged || ownerChanged) {
    payload.callLeadAssignedDate = new Date().toISOString();
  }
  const hasAssignedAccess = String(data.assignedTo) === String(requiredAssignedTo)
    || String(data.callLeadAssignedTo || "") === String(requiredAssignedTo);
  if (requiredAssignedTo && !hasAssignedAccess) {
    const error = new Error("This call is not assigned to you.");
    error.status = 403;
    throw error;
  }
  if (data.leadCreated && requiredAssignedTo && Object.keys(payload).some((key) => key !== "leadCreated")) {
    const error = new Error("This call contact is locked because its lead has already been created.");
    error.status = 409;
    throw error;
  }
  let saved = { id: snapshot.id, listType: normalizeListType(type), ...data };
  if (Object.keys(payload).some((key) => !isDeepStrictEqual(data[key], payload[key]))) {
    const changes = { ...payload, updatedAt: new Date().toISOString() };
    await ref.update(changes);
    saved = { ...saved, ...changes };
    updateCachedRecord(type, { id: snapshot.id, listType: normalizeListType(type), ...data }, true);
    updateCachedRecord(type, saved);
  }
  return saved;
}

export async function deleteCallRecord(type, id, assignedTo = "", requiredAssignedTo = "") {
  const snapshot = await findCallSnapshot(type, id, assignedTo);
  if (snapshot?.exists) {
    const record = { id: snapshot.id, listType: normalizeListType(type), ...snapshot.data() };
    if (record.leadCreated && requiredAssignedTo) {
      const error = new Error("This call contact is locked because its lead has already been created.");
      error.status = 409;
      throw error;
    }
    if (requiredAssignedTo && String(record.assignedTo) !== String(requiredAssignedTo)) {
      const error = new Error("This call is not assigned to you."); error.status = 403; throw error;
    }
    await snapshot.ref.delete();
    updateCachedRecord(type, record, true);
    return record;
  }
}

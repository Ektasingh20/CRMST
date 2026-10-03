import { getFirestore } from "firebase-admin/firestore";
import { isDeepStrictEqual } from "node:util";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import { LEAD_INTERESTS } from "./leadCatalog.js";
import { leadCollection, normalizeLeadData } from "./firestoreLeadModel.js";
import { whatsappMessageRef } from "./firestoreWhatsAppModel.js";

const validTypes = new Set(["services", "training"]);
export function normalizeListType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (!validTypes.has(type)) throw new Error("List type must be services or training.");
  return type;
}

const clean = (value) => String(value ?? "").trim();
const leadDraftFields = ["name", "phone", "email", "alternatePhone", "city", "company", "type", "interest", "value", "status", "leadSource", "notes", "assignedTo", "assignedDate"];
const leadStatusValues = new Set(["Pending", "Interested", "Not Interested"]);
function callListError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}
export function normalizeCallLeadDraft(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw callListError("Save the lead form before approving.");
  const draft = Object.fromEntries(leadDraftFields.map((key) => [key, clean(value[key])]));
  const typeKey = draft.type.toLowerCase();
  if (!draft.name) throw callListError("Full name is required.");
  if (!/^[6-9]\d{9}$/.test(draft.phone)) throw callListError("Enter a valid 10-digit mobile number.");
  if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) throw callListError("Enter a valid email address.");
  if (draft.alternatePhone && !/^[6-9]\d{9}$/.test(draft.alternatePhone)) throw callListError("Enter a valid alternate mobile number.");
  if (!draft.city) throw callListError("City is required.");
  if (!LEAD_INTERESTS[typeKey]?.includes(draft.interest)) throw callListError("Select an interest for the lead type.");
  if (!leadStatusValues.has(draft.status)) throw callListError("Select a valid lead status.");
  if (draft.value && (!Number.isFinite(Number(draft.value)) || Number(draft.value) < 0)) throw callListError("Enter a valid lead value.");
  return draft;
}
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
    const existingIndex = cached.rows.findIndex((row) => row.id === record.id);
    if (remove) {
      cached.rows = cached.rows.filter((row) => row.id !== record.id);
    } else if (existingIndex >= 0) {
      // Keep records in their original list position after CRM work is saved.
      cached.rows[existingIndex] = { ...record };
    } else {
      cached.rows.push({ ...record });
    }
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
    // Mutations must start from the current document, not a possibly stale list cache.
    const current = await ref.get();
    if (current.exists) return current;
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
    const importedCallStatus = clean(raw.callStatus);
    const importedInterestStatus = clean(raw.interestStatus);
    if (!contact || existingNumbers.has(contact) || numbersInUpload.has(contact)) {
      if (contact) duplicateContacts.push({ name: clean(raw.name) || "Unnamed contact", contact });
      return;
    }
    numbersInUpload.add(contact);
    const record = {
      callId: ref.id, listType: type, name: clean(raw.name),
      contact,
      program: clean(raw.program || raw.service || raw.training || raw.programInterest || raw.courseInterest),
      source: clean(raw.source) || "Uploaded Call List", callStatus: !importedCallStatus || /^select status$/i.test(importedCallStatus) ? "Pending" : importedCallStatus,
      interestStatus: !importedInterestStatus || /^select status$/i.test(importedInterestStatus) ? "Not Interested" : importedInterestStatus, remark: clean(raw.remark), assignedTo: clean(assignedTo),
      assignedToName: clean(assignedToName), callClicked: false, whatsappClicked: false, leadCreated: false, callLeadStatus: "Pending", active: true,
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

export async function createCallRecord(type, input, actor) {
  const listType = normalizeListType(type);
  const assignedTo = clean(actor?.id || actor?._id);
  if (!assignedTo) throw callListError("Unable to identify the logged-in user.", 401);
  const name = clean(input?.name);
  const contact = cleanIndianPhone(input?.contact);
  if (!name) throw callListError("Full name is required.");
  if (!contact) throw callListError("Enter a valid 10-digit Indian mobile number.");
  const templateField = listType === "training" ? "programId" : "serviceId";
  const templateId = clean(input?.[templateField]);
  if (!templateId) throw callListError(`Select a ${listType === "training" ? "training" : "service"}.`);
  const template = await whatsappMessageRef(templateId).get();
  if (!template.exists || template.data()?.active !== true || template.data()?.type !== (listType === "training" ? "training" : "service")) {
    throw callListError("The selected message template is unavailable.");
  }
  const existing = await readAllCalls();
  if (existing.docs.some((doc) => cleanIndianPhone(doc.data()?.contact) === contact)) {
    throw callListError("A call-list contact with this number already exists.", 409);
  }
  const now = new Date().toISOString();
  const ref = executiveCalls(listType, assignedTo).doc();
  const record = {
    callId: ref.id, listType, name, contact,
    program: clean(template.data().title), [templateField]: templateId,
    source: "Manual Call List", date: now.slice(0, 10),
    callStatus: clean(input.callStatus) || "Pending",
    interactionType: clean(input.interactionType) || "",
    interestStatus: clean(input.interestStatus) || "Not Interested",
    remark: clean(input.remark), assignedTo,
    assignedToName: clean(actor?.name || actor?.username),
    callClicked: false, whatsappClicked: false, leadCreated: false,
    callLeadStatus: "Pending", active: true, createdAt: now, updatedAt: now,
    uploadedBy: assignedTo,
  };
  const batch = getFirestore().batch();
  batch.set(executiveRef(listType, assignedTo), {
    crmExecutiveId: assignedTo,
    crmExecutiveName: record.assignedToName,
    updatedAt: now,
  }, { merge: true });
  batch.set(ref, record);
  await batch.commit();
  const saved = { id: ref.id, ...record };
  updateCachedRecord(listType, saved);
  return saved;
}

export async function updateCallRecord(type, id, patch, assignedTo = "", requiredAssignedTo = "") {
  const allowed = ["leadCreated", "createdLeadId", "createdLeadDate", "callLeadStatus", "callLeadAssignedTo", "callLeadAssignedDate", "callStatus", "interactionType", "interestStatus", "program", "programId", "serviceId", "remark", "leadDraft", "leadDraftSavedBy", "leadDraftSavedByName", "callClicked", "whatsappClicked", "active", "name", "contact", "date", "assignedTo", "assignedToName"];
  const payload = Object.fromEntries(allowed.filter((key) => patch[key] !== undefined).map((key) => [key, patch[key]]));
  const templateField = normalizeListType(type) === "training" ? "programId" : "serviceId";
  const otherTemplateField = templateField === "programId" ? "serviceId" : "programId";
  if (payload[otherTemplateField] !== undefined) throw callListError("Template type does not match this call list.");
  if (payload[templateField]) {
    const template = await whatsappMessageRef(payload[templateField]).get();
    if (!template.exists || template.data().active !== true || template.data().type !== (templateField === "programId" ? "training" : "service")) {
      throw callListError("The selected message template is unavailable.");
    }
    payload.program = clean(template.data().title);
  }
  if (payload.leadDraft !== undefined) payload.leadDraft = normalizeCallLeadDraft(payload.leadDraft);
  const snapshot = await findCallSnapshot(type, id, assignedTo);
  if (!snapshot?.exists) throw new Error("Call record not found.");
  const ref = snapshot.ref;
  let before;
  let saved;
  await getFirestore().runTransaction(async (transaction) => {
    const fresh = await transaction.get(ref);
    if (!fresh.exists) throw callListError("Call record not found.", 404);
    const data = fresh.data();
    const hasAssignedAccess = String(data.assignedTo) === String(requiredAssignedTo)
      || String(data.callLeadAssignedTo || "") === String(requiredAssignedTo);
    if (requiredAssignedTo && !hasAssignedAccess) throw callListError("This call is not assigned to you.", 403);
    if (data.leadDraft && Object.prototype.hasOwnProperty.call(payload, "leadDraft")) {
      throw callListError("The lead form has already been saved and cannot be submitted again.", 409);
    }
    if ((data.leadCreated || data.callLeadStatus === "Approved")
      && Object.keys(payload).some((key) => !isDeepStrictEqual(data[key], payload[key]))) {
      throw callListError("This call contact is locked because its lead has already been created.", 409);
    }
    before = { id: fresh.id, listType: normalizeListType(type), ...data };
    saved = before;
    if (!Object.keys(payload).some((key) => !isDeepStrictEqual(data[key], payload[key]))) return;
    const now = new Date().toISOString();
    const changes = { ...payload, updatedAt: now };
    // Only actual CRM work changes the activity date; assignment and draft edits do not.
    const workFields = ["callStatus", "callLeadStatus", "interestStatus", "remark", "callClicked", "whatsappClicked"];
    if (patch.activityRecorded || workFields.some((key) => Object.prototype.hasOwnProperty.call(payload, key)
      && !isDeepStrictEqual(data[key], payload[key]))) changes.lastWorkedAt = now;
    const assigneeChanged = Object.prototype.hasOwnProperty.call(payload, "callLeadAssignedTo")
      && String(payload.callLeadAssignedTo || "") !== String(data.callLeadAssignedTo || "");
    const ownerChanged = Object.prototype.hasOwnProperty.call(payload, "assignedTo")
      && String(payload.assignedTo || "") !== String(data.assignedTo || "");
    if (assigneeChanged || ownerChanged) changes.callLeadAssignedDate = now;
    transaction.update(ref, changes);
    saved = { ...before, ...changes };
  });
  if (saved !== before) {
    updateCachedRecord(type, before, true);
    updateCachedRecord(type, saved);
  }
  return saved;
}

export async function approveCallRecord(type, id, actor, assignedTo = "", admin = false) {
  const snapshot = await findCallSnapshot(type, id, assignedTo);
  if (!snapshot?.exists) throw callListError("Call record not found.", 404);
  const actorId = clean(actor?.id || actor?._id);
  const initialData = snapshot.data();
  if (!admin && String(initialData.assignedTo || "") !== actorId && String(initialData.callLeadAssignedTo || "") !== actorId) {
    throw callListError("This call is not assigned to you.", 403);
  }
  if (initialData.leadCreated || initialData.callLeadStatus === "Approved") throw callListError("This lead has already been approved.", 409);
  const sourceCallPath = snapshot.ref.path;
  const draft = normalizeCallLeadDraft(initialData.leadDraft);
  const existingLead = await Lead.findOne({ phone: draft.phone });
  if (existingLead && existingLead.sourceCallPath !== sourceCallPath) {
    throw callListError("A lead already exists for this phone number.", 409);
  }
  const leadRef = existingLead?._ref || leadCollection(draft.type, draft.interest).doc();
  let assignedToName = "";
  if (draft.assignedTo) {
    const assignee = await User.findOne({ $or: [{ id: draft.assignedTo }, { _id: draft.assignedTo }] });
    const role = clean(assignee?.role).toLowerCase();
    const department = clean(assignee?.dept || assignee?.department).toLowerCase();
    const position = clean(assignee?.position).toLowerCase();
    const canOwnLead = role.includes("admin") || role.startsWith("operation")
      || department.includes("admin") || department.startsWith("operation")
      || position.includes("admin") || position.startsWith("operation");
    if (!assignee || clean(assignee.status || "Active").toLowerCase() !== "active" || !canOwnLead) {
      throw callListError("Leads can only be assigned to active Admin or Operations users.");
    }
    assignedToName = clean(assignee.name || assignee.username);
  }
  const now = new Date().toISOString();
  const leadData = normalizeLeadData({
    ...draft,
    id: leadRef.path,
    source: draft.leadSource || "Phone Call",
    leadSource: draft.leadSource || "Phone Call",
    enteredBy: clean(initialData.leadDraftSavedBy) || actorId,
    enteredByName: clean(initialData.leadDraftSavedByName) || clean(actor?.name || actor?.username),
    createdBy: clean(initialData.leadDraftSavedBy) || actorId,
    createdByName: clean(initialData.leadDraftSavedByName) || clean(actor?.name || actor?.username),
    sourceCallPath,
    ...(initialData.programId ? { programId: initialData.programId } : {}),
    ...(initialData.serviceId ? { serviceId: initialData.serviceId } : {}),
    callLeadStatus: "Approved",
    assignedToName,
    assignedDate: draft.assignedTo ? (draft.assignedDate || now.slice(0, 10)) : "",
    createdAt: now,
  });
  let savedRecord;
  await getFirestore().runTransaction(async (transaction) => {
    const fresh = await transaction.get(snapshot.ref);
    if (!fresh.exists) throw callListError("Call record not found.", 404);
    const data = fresh.data();
    const hasAccess = admin || String(data.assignedTo || "") === actorId || String(data.callLeadAssignedTo || "") === actorId;
    if (!hasAccess) throw callListError("This call is not assigned to you.", 403);
    if (data.leadCreated || data.callLeadStatus === "Approved") {
      throw callListError("This lead has already been approved.", 409);
    }
    if (clean(data.interestStatus).toLowerCase() !== "interested" || !["follow up", "completed"].includes(clean(data.callStatus).toLowerCase())) {
      throw callListError("This contact no longer qualifies as a call lead.", 409);
    }
    const currentDraft = normalizeCallLeadDraft(data.leadDraft);
    if (!isDeepStrictEqual(currentDraft, draft)) throw callListError("The saved lead form changed. Refresh and try again.", 409);
    if (!existingLead) transaction.create(leadRef, leadData);
    const changes = { leadCreated: true, callLeadStatus: "Approved", createdLeadId: leadRef.path, createdLeadDate: now, program: draft.interest, updatedAt: now, lastWorkedAt: now };
    transaction.update(snapshot.ref, changes);
    savedRecord = { id: snapshot.id, listType: normalizeListType(type), ...data, ...changes };
  });
  Lead._invalidateCache();
  updateCachedRecord(type, savedRecord);
  return { record: savedRecord, lead: existingLead ? { id: existingLead.id, ...existingLead.toObject() } : { id: leadRef.path, ...leadData } };
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

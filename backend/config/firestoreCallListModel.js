import { FieldPath, FieldValue, getFirestore } from "firebase-admin/firestore";
import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import { LEAD_INTERESTS } from "./leadCatalog.js";
import { leadCollection, normalizeLeadData } from "./firestoreLeadModel.js";
import { whatsappMessageRef, whatsappMessages } from "./firestoreWhatsAppModel.js";
import { isCallLead } from "../../frontend/callLeads.js";
import { matchesCallListFilters, normalizeCallStatus } from "../../frontend/callListConfig.js";
import { normalizeCallListDate } from "../../frontend/callListDate.js";
import { validateCallImportRows } from "../../frontend/callListImportValidation.js";

const validTypes = new Set(["services", "training"]);
export function normalizeListType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (!validTypes.has(type)) throw new Error("List type must be services or training.");
  return type;
}

const clean = (value) => String(value ?? "").trim();
export const uploadDayInIndia = (value) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(value));
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const callIdForBatch = (batchId, index) => createHash("sha256").update(`${batchId}:${index}`).digest("hex").slice(0, 24);
const leadDraftFields = ["name", "phone", "email", "alternatePhone", "city", "company", "type", "interest", "value", "status", "leadSource", "notes", "assignedTo", "assignedDate"];
const leadStatusValues = new Set(["Pending", "Interested", "Not Interested"]);
function callListError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}
function importRowError(issues) {
  const error = callListError(`Fix ${issues.length} Excel issue${issues.length === 1 ? "" : "s"} and upload the corrected file. No contacts were saved.`, 422);
  error.issues = issues;
  return error;
}
export function isApprovedCallCompletionUpdate(record, patch) {
  return patch.callStatus === "Completed"
    && normalizeCallStatus(record.callStatus) === "Follow Up"
    && Object.keys(patch).every((key) => key === "callStatus");
}
export function normalizeCallLeadDraft(value, validInterests = LEAD_INTERESTS) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw callListError("Save the lead form before approving.");
  const draft = Object.fromEntries(leadDraftFields.map((key) => [key, clean(value[key])]));
  const typeKey = draft.type.toLowerCase();
  if (!draft.name) throw callListError("Full name is required.");
  if (!/^[6-9]\d{9}$/.test(draft.phone)) throw callListError("Enter a valid 10-digit mobile number.");
  if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) throw callListError("Enter a valid email address.");
  if (draft.alternatePhone && !/^[6-9]\d{9}$/.test(draft.alternatePhone)) throw callListError("Enter a valid alternate mobile number.");
  if (!draft.city) throw callListError("City is required.");
  if (!validInterests[typeKey]?.includes(draft.interest)) throw callListError("Select an interest for the lead type.");
  if (!leadStatusValues.has(draft.status)) throw callListError("Select a valid lead status.");
  if (draft.value && (!Number.isFinite(Number(draft.value)) || Number(draft.value) < 0)) throw callListError("Enter a valid lead value.");
  return draft;
}
async function leadInterestsWithActiveTemplates(type) {
  const typeKey = clean(type).toLowerCase();
  const configured = LEAD_INTERESTS[typeKey] || [];
  if (typeKey !== "training" && typeKey !== "service") return LEAD_INTERESTS;
  const snapshot = await whatsappMessages()
    .where("active", "==", true)
    .where("type", "==", typeKey)
    .get();
  const templateTitles = snapshot.docs
    .map((document) => clean(document.data()?.title))
    .filter(Boolean);
  return { ...LEAD_INTERESTS, [typeKey]: [...new Set([...configured, ...templateTitles])] };
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
const executiveDateRef = (type, assignedTo, date) => executiveRef(type, assignedTo).collection("dates").doc(date);
const datedExecutiveCalls = (type, assignedTo, date) => executiveDateRef(type, assignedTo, date).collection("calls");
const dateForCall = (value, fallback) => normalizeCallListDate(value) || fallback;
const legacyExecutiveCalls = (type, assignedTo) => legacyCalls(type).doc(executiveDocumentId(assignedTo)).collection("calls");
const LIST_CACHE_TTL_MS = 5 * 60 * 1000;
const listCache = new Map();
const listRequests = new Map();
const callRefs = new Map();
const COUNT_CACHE_TTL_MS = 5 * 60 * 1000;
let countCache;
let countRequest;
let countRevision = 0;
function clearCallListCountCache() {
  countRevision += 1;
  countCache = undefined;
  countRequest = undefined;
}
export function clearCallListReadCache(type = "", assignedTo = "") {
  const normalizedType = type ? normalizeListType(type) : "";
  const owner = clean(assignedTo);
  for (const key of listCache.keys()) {
    const [cachedType, cachedOwner] = key.split(":");
    if ((!normalizedType || cachedType === normalizedType) && (!owner || cachedOwner === owner)) listCache.delete(key);
  }
  // A manual refresh is also the escape hatch for data changed outside this
  // API (for example, an import or console repair).
  clearCallListCountCache();
}
function rememberCallRef(key, ref) {
  callRefs.delete(key);
  callRefs.set(key, ref);
  if (callRefs.size > 20000) callRefs.delete(callRefs.keys().next().value);
}
let allCallsRequest;
const employeeCallsRequests = new Map();
let employeeGroupIndexesAvailable = true;
let contactGroupIndexAvailable = true;
const adminGroupIndexModes = new Map();
async function allCallCollections() {
  const nested = await Promise.all([...validTypes].map(async (type) => {
    const [employees, oldParents] = await Promise.all([
      typeRef(type).collection("crmExecutives").listDocuments(),
      legacyCalls(type).where("crmExecutiveId", ">", "").get(),
    ]);
    const dated = await Promise.all(employees.map(async (ref) =>
      (await ref.collection("dates").listDocuments()).map((dateRef) => dateRef.collection("calls"))));
    return [legacyCalls(type), ...employees.map((ref) => ref.collection("calls")), ...dated.flat(),
      ...oldParents.docs.map((doc) => doc.ref.collection("calls"))];
  }));
  return nested.flat();
}
function readAllCalls() {
  // Both list types share a single collection-group read during an admin refresh.
  if (!allCallsRequest) {
    allCallsRequest = getFirestore().collectionGroup("calls").get()
      .finally(() => { allCallsRequest = undefined; });
  }
  return allCallsRequest;
}
function readEmployeeCalls(assignedTo) {
  const key = String(assignedTo);
  if (!employeeCallsRequests.has(key)) {
    const request = (async () => {
      if (employeeGroupIndexesAvailable) {
        try {
          const snapshots = await Promise.all([
            getFirestore().collectionGroup("calls").where("assignedTo", "==", key).get(),
            getFirestore().collectionGroup("calls").where("callLeadAssignedTo", "==", key).get(),
          ]);
          return snapshots.flatMap((snapshot) => snapshot.docs);
        } catch (error) {
          if (error.code !== 9) throw error;
          employeeGroupIndexesAvailable = false;
        }
      }
      const collections = await allCallCollections();
      const snapshots = await Promise.all(collections.flatMap((ref) => [
        ref.where("assignedTo", "==", key).get(),
        ref.where("callLeadAssignedTo", "==", key).get(),
      ]));
      return snapshots.flatMap((snapshot) => snapshot.docs);
    })()
      .finally(() => employeeCallsRequests.delete(key));
    employeeCallsRequests.set(key, request);
  }
  return employeeCallsRequests.get(key);
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
      const documents = assignedTo ? await readEmployeeCalls(assignedTo) : (await readAllCalls()).docs;
      const normalizedType = normalizeListType(type);
      const uniqueDocuments = [...new Map(documents.map((doc) => [doc.ref.path, doc])).values()];
      const rows = uniqueDocuments
        .filter((doc) => doc.ref.path.startsWith(`listData/${normalizedType}/`))
        .filter((doc) => !assignedTo
          || String(doc.data().assignedTo || "") === String(assignedTo)
          || String(doc.data().callLeadAssignedTo || "") === String(assignedTo))
        .map((doc) => ({ id: doc.id, listType: normalizedType, ...doc.data() }));
      uniqueDocuments.forEach((doc) => {
        if (!doc.ref.path.startsWith(`listData/${normalizedType}/`)) return;
        if (assignedTo && String(doc.data().assignedTo || "") !== String(assignedTo)
          && String(doc.data().callLeadAssignedTo || "") !== String(assignedTo)) return;
        rememberCallRef(`${normalizedType}:${assignedTo}:${doc.id}`, doc.ref);
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

  try {
    const matches = await getFirestore().collectionGroup("calls").where("callId", "==", callId).get();
    return matches.docs.find((doc) => doc.data()?.listType === normalizedType) || null;
  } catch (error) {
    if (error.code !== 9) throw error;
    const collections = (await allCallCollections()).filter((ref) => ref.path.startsWith(`listData/${normalizedType}/`));
    const matches = await Promise.all(collections.map((ref) => ref.doc(callId).get()));
    return matches.find((doc) => doc.exists && doc.data()?.listType === normalizedType) || null;
  }
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

export async function countAllCallRecords() {
  if (countCache && Date.now() - countCache.fetchedAt < COUNT_CACHE_TTL_MS) return { ...countCache.counts };
  if (!countRequest) {
    const startedAtRevision = countRevision;
    const request = (async () => {
      const counts = { services: 0, training: 0, total: 0 };
      await Promise.all([...validTypes].map(async (type) => {
        const [employees, oldRootCount, oldParents] = await Promise.all([
          typeRef(type).collection("crmExecutives").listDocuments(),
          legacyCalls(type).count().get(),
          legacyCalls(type).where("crmExecutiveId", ">", "").get(),
        ]);
        const currentCounts = await Promise.all(employees.map(async (ref) => {
          const dates = await ref.collection("dates").listDocuments();
          const values = await Promise.all([ref.collection("calls"), ...dates.map((dateRef) => dateRef.collection("calls"))]
            .map(async (collection) => (await collection.count().get()).data().count));
          return values.reduce((total, value) => total + value, 0);
        }));
        const oldCounts = await Promise.all(oldParents.docs.map(async (doc) => (await doc.ref.collection("calls").count().get()).data().count));
        counts[type] = [...currentCounts, ...oldCounts].reduce((total, value) => total + value, 0)
          + oldRootCount.data().count - oldParents.size;
      }));
      counts.total = counts.services + counts.training;
      if (countRevision === startedAtRevision) countCache = { counts, fetchedAt: Date.now() };
      return counts;
    })();
    const wrapped = request.finally(() => { if (countRequest === wrapped) countRequest = undefined; });
    countRequest = wrapped;
  }
  return { ...await countRequest };
}

// Merge small ordered pages from each employee collection. This works before
// collection-group indexes are deployed and reads only nearby table rows.
export async function pageAdminCallRecords({ type = "", assignedTo = "", cursor = "", limit = 25,
  search = "", program = "All", callStatus = "All", interest = "All", fromDate = "", toDate = "" } = {}) {
  const pageSize = Math.min(50, Math.max(1, Number(limit) || 25));
  const types = type ? [normalizeListType(type)] : [...validTypes];
  const owner = clean(assignedTo);
  const filters = { search: clean(search).slice(0, 100), program: clean(program), callStatus: clean(callStatus),
    interest: clean(interest), fromDate: clean(fromDate), toDate: clean(toDate) };
  if ((filters.fromDate && normalizeCallListDate(filters.fromDate) !== filters.fromDate)
    || (filters.toDate && normalizeCallListDate(filters.toDate) !== filters.toDate)
    || (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate)) throw callListError("Invalid date range.");
  const streams = [];
  const indexMode = owner ? "assigned" : "all";
  if (adminGroupIndexModes.get(indexMode) !== false) {
    try {
      for (const listType of types) {
        let query = getFirestore().collectionGroup("calls").where("listType", "==", listType);
        if (owner) query = query.where("assignedTo", "==", owner);
        query = query.orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc");
        await query.limit(1).get();
        streams.push({ type: listType, ref: query, key: `group:${listType}:${indexMode}`, group: true });
      }
      adminGroupIndexModes.set(indexMode, true);
    } catch (error) {
      if (error.code !== 9) throw error;
      adminGroupIndexModes.set(indexMode, false);
      streams.length = 0;
    }
  }
  if (!streams.length) {
    for (const listType of types) {
      // Include every employee so contacts reassigned after upload still appear in the owner filter.
      const employeeRefs = await typeRef(listType).collection("crmExecutives").listDocuments();
      for (const ref of employeeRefs) {
        streams.push({ type: listType, ref: ref.collection("calls") });
        const dates = await ref.collection("dates").listDocuments();
        dates.forEach((dateRef) => streams.push({ type: listType, ref: dateRef.collection("calls") }));
      }
      const oldRoots = await legacyCalls(listType).where("crmExecutiveId", ">", "").get();
      oldRoots.docs.forEach((doc) => streams.push({ type: listType, ref: doc.ref.collection("calls") }));
      streams.push({ type: listType, ref: legacyCalls(listType), flat: true });
    }
  }
  const filterKey = JSON.stringify({ type, assignedTo: owner, strategy: streams[0]?.group ? "group" : "direct", ...filters });
  let decoded = { positions: {} };
  if (cursor) {
    if (cursor.length > 10000) throw callListError("Invalid page cursor.");
    try { decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")); }
    catch { throw callListError("Invalid page cursor."); }
    if (decoded.filterKey !== filterKey || typeof decoded.positions !== "object" || !decoded.positions) {
      throw callListError("Page cursor does not match these filters.");
    }
  }
  const positions = { ...decoded.positions };
  const hasRowFilters = Boolean(filters.search || filters.program !== "All" || filters.callStatus !== "All" || filters.interest !== "All");
  const batchSize = hasRowFilters ? 4 : Math.max(2, Math.ceil((pageSize + 1) / Math.max(1, streams.length)));
  const state = streams.map((stream) => ({ ...stream, key: stream.key || stream.ref.path,
    buffer: [], after: positions[stream.key || stream.ref.path], exhausted: false }));
  async function fill(stream) {
    if (stream.buffer.length || stream.exhausted) return;
    let query = stream.ref.orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(batchSize);
    if (stream.after) {
      if (typeof stream.after.createdAt !== "string" || typeof stream.after.id !== "string") throw callListError("Invalid page cursor.");
      query = query.startAfter(stream.after.createdAt, stream.after.id);
    }
    const result = await query.get();
    stream.buffer = result.docs;
    if (result.size < batchSize) stream.exhausted = true;
    if (result.docs.length) {
      const last = result.docs.at(-1);
      stream.after = { createdAt: last.data().createdAt, id: stream.group ? last.ref.path : last.id };
    }
  }
  const rows = [];
  const seenPaths = new Set();
  let hasMore = false;
  while (rows.length <= pageSize) {
    await Promise.all(state.map(fill));
    const available = state.filter((stream) => stream.buffer.length);
    if (!available.length) break;
    available.sort((left, right) => {
      const a = left.buffer[0]; const b = right.buffer[0];
      return String(b.data().createdAt || "").localeCompare(String(a.data().createdAt || ""))
        || b.ref.path.localeCompare(a.ref.path);
    });
    const selected = available[0];
    const doc = selected.buffer.shift();
    const data = doc.data();
    const matches = matchesCallListFilters({ ...data, listType: selected.type }, {
      search: filters.search, program: filters.program, callStatus: filters.callStatus,
      interest: filters.interest, employee: owner || "All", listType: type || "All",
    });
    const recordDate = normalizeCallListDate(data.date) || String(data.createdAt || "").slice(0, 10);
    const matchesDate = (!filters.fromDate || recordDate >= filters.fromDate)
      && (!filters.toDate || recordDate <= filters.toDate);
    const positionId = selected.group ? doc.ref.path : doc.id;
    if (!doc.ref.path.startsWith(`listData/${selected.type}/`) || (selected.flat && !data.callId)
      || !matches || !matchesDate || seenPaths.has(doc.ref.path)) {
      positions[selected.key] = { createdAt: data.createdAt, id: positionId };
      continue;
    }
    if (rows.length === pageSize) { hasMore = true; break; }
    seenPaths.add(doc.ref.path);
    positions[selected.key] = { createdAt: data.createdAt, id: positionId };
    rows.push({ id: doc.id, listType: selected.type, ...data });
  }
  const nextCursor = hasMore ? Buffer.from(JSON.stringify({ filterKey, positions })).toString("base64url") : null;
  return { items: rows, nextCursor, hasMore };
}

export async function importCallRecords({ listType, assignedTo, assignedToName = "", rows = [], uploadedBy = "", uploadBatchId = "" }) {
  const type = normalizeListType(listType);
  const db = getFirestore();
  const now = new Date().toISOString();
  let uploadDate = uploadDayInIndia(now);
  const employeeId = clean(assignedTo);
  if (!employeeId) throw new Error("CRM executive is required.");
  const validation = validateCallImportRows(rows);
  if (validation.issues.length) throw importRowError(validation.issues);
  const preparedRows = validation.rows;
  const batchId = /^[a-zA-Z0-9_-]{8,100}$/.test(String(uploadBatchId)) ? String(uploadBatchId) : randomUUID();
  const fingerprint = createHash("sha256").update(JSON.stringify({ type, employeeId, rows })).digest("hex");
  const employeeRef = executiveRef(type, employeeId);
  const uploadRef = typeRef(type).collection("uploadBatches").doc(batchId);
  const priorUpload = await uploadRef.get();
  if (priorUpload.exists && priorUpload.data()?.assignedTo !== employeeId) throw callListError("Upload batch belongs to another employee.", 409);
  if (priorUpload.exists && priorUpload.data()?.fingerprint !== fingerprint) throw callListError("Upload batch data changed. Select the file again.", 409);
  if (priorUpload.exists && priorUpload.data()?.uploadDate) uploadDate = priorUpload.data().uploadDate;
  // New batches cannot have earlier rows. A retry checks only its deterministic
  // document IDs, so upload does not depend on a collection-group index.
  const priorDocs = [];
  if (priorUpload.exists) {
    for (let offset = 0; offset < preparedRows.length; offset += 200) {
      const refs = preparedRows.slice(offset, offset + 200).flatMap((row, index) => {
        const id = callIdForBatch(batchId, offset + index);
        const date = dateForCall(row?.date, uploadDate);
        return [datedExecutiveCalls(type, employeeId, date).doc(id), employeeRef.collection("calls").doc(id)];
      });
      priorDocs.push(...await db.getAll(...refs));
    }
  }
  const alreadyCreated = new Map(priorDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc]));
  if (priorUpload.exists && priorUpload.data()?.complete) {
    const records = [...alreadyCreated.values()].map((doc) => ({ id: doc.id, ...doc.data() }));
    records.duplicates = priorUpload.data().duplicates || [];
    records.invalidCount = priorUpload.data().invalidCount || 0;
    records.uploadBatchId = batchId;
    records.alreadyProcessed = true;
    return records;
  }
  const created = [];
  const duplicateContacts = [];
  let invalidCount = 0;
  const validNumbers = [...new Set(preparedRows.map((row) => row.contact))];
  const existingNumbers = new Set();
  let directCollections;
  for (let offset = 0; offset < validNumbers.length; offset += 30) {
    const batch = validNumbers.slice(offset, offset + 30);
    let matches;
    if (contactGroupIndexAvailable) {
      try { matches = (await db.collectionGroup("calls").where("contact", "in", batch).get()).docs; }
      catch (error) {
        if (error.code !== 9) throw error;
        contactGroupIndexAvailable = false;
      }
    }
    if (!matches) {
      directCollections ||= await allCallCollections();
      matches = (await Promise.all(directCollections.map((ref) => ref.where("contact", "in", batch).get())))
        .flatMap((snapshot) => snapshot.docs);
    }
    matches.forEach((doc) => {
      if (doc.data()?.uploadBatchId !== batchId) existingNumbers.add(cleanIndianPhone(doc.data()?.contact));
    });
  }
  const existingIssues = preparedRows.flatMap((row, index) => existingNumbers.has(row.contact)
    ? [{ row: Number.isSafeInteger(row.excelRow) && row.excelRow >= 2 ? row.excelRow : index + 2,
      field: "Number", message: "This number already exists in the CRM. Remove or correct this row." }]
    : []);
  if (existingIssues.length) throw importRowError(existingIssues);
  if (!priorUpload.exists) await uploadRef.create({ uploadBatchId: batchId, assignedTo: employeeId, fingerprint, uploadDate,
    uploadedBy: clean(uploadedBy), complete: false, startedAt: FieldValue.serverTimestamp() });
  const numbersInUpload = new Set();
  preparedRows.forEach((source, index) => {
    const raw = source && typeof source === "object" ? source : {};
    const contactDate = dateForCall(raw.date, uploadDate);
    const ref = datedExecutiveCalls(type, employeeId, contactDate).doc(callIdForBatch(batchId, index));
    const contact = cleanIndianPhone(raw.contact || raw.number || raw.phone);
    if (!clean(raw.name) || !contact) { invalidCount += 1; return; }
    const importedCallStatus = clean(raw.callStatus);
    const importedInterestStatus = clean(raw.interestStatus);
    if (existingNumbers.has(contact) || numbersInUpload.has(contact)) {
      if (contact) duplicateContacts.push({ name: clean(raw.name) || "Unnamed contact", contact });
      return;
    }
    numbersInUpload.add(contact);
    if (alreadyCreated.has(ref.id)) return;
    const record = {
      callId: ref.id, listType: type, name: clean(raw.name),
      contact,
      program: clean(raw.program || raw.service || raw.training || raw.programInterest || raw.courseInterest),
      source: clean(raw.source) || "Uploaded Call List", date: contactDate,
      callStatus: !importedCallStatus || /^(?:select status|choose|not called)$/i.test(importedCallStatus) ? "" : importedCallStatus,
      interestStatus: !importedInterestStatus || /^select status$/i.test(importedInterestStatus) ? "Not Interested" : importedInterestStatus,
      remark: clean(raw.remark), callAt: clean(raw.callAt), interactionType: clean(raw.interactionType), assignedTo: clean(assignedTo),
      assignedToName: clean(assignedToName), callClicked: false, whatsappClicked: false, leadCreated: false,
      callLeadStatus: "", callLeadStatusSelected: false, callLeadAssignedTo: "", callLeadAssignedDate: "",
      leadDraft: null, createdLeadId: "", createdLeadDate: "", active: true, snoozeUntil: null,
      lastWorkedAt: null, revision: 0,
      createdAt: now, updatedAt: now, uploadedBy: clean(uploadedBy), uploadDate, uploadBatchId: batchId,
      lastCallClickedAt: null, callDurationSeconds: null, callDurationSource: null,
    };
    created.push({ id: ref.id, ref, record });
  });
  if (!created.length && !alreadyCreated.size) {
    if (!duplicateContacts.length) throw callListError("No usable contacts were found.");
    await uploadRef.set({ uploadBatchId: batchId, assignedTo: employeeId, fingerprint, uploadDate,
      uploadedBy: clean(uploadedBy), complete: true, createdCount: 0, duplicates: duplicateContacts, invalidCount,
      completedAt: FieldValue.serverTimestamp() });
    const empty = [];
    empty.duplicates = duplicateContacts;
    empty.invalidCount = invalidCount;
    empty.uploadBatchId = batchId;
    return empty;
  }
  let offset = 0;
  let includeExecutive = true;
  while (offset < created.length) {
    const batch = db.batch();
    const batchSize = 200;
    if (includeExecutive) {
      batch.set(employeeRef, {
        crmExecutiveId: employeeId,
        crmExecutiveName: clean(assignedToName),
        updatedAt: now,
      }, { merge: true });
    }
    const batchRows = created.slice(offset, offset + batchSize);
    for (const date of new Set(batchRows.map(({ record }) => record.date))) {
      batch.set(executiveDateRef(type, employeeId, date), { date, updatedAt: now }, { merge: true });
    }
    batchRows.forEach(({ ref, record }) => {
      batch.create(ref, record);
    });
    await batch.commit();
    offset += batchSize;
    includeExecutive = false;
  }
  const records = [
    ...[...alreadyCreated.values()].map((doc) => ({ id: doc.id, ...doc.data() })),
    ...created.map(({ id, record }) => ({ id, ...record })),
  ];
  await uploadRef.set({ uploadBatchId: batchId, assignedTo: employeeId, fingerprint, uploadDate,
    uploadedBy: clean(uploadedBy), complete: true, createdCount: records.length, duplicates: duplicateContacts, invalidCount,
    completedAt: FieldValue.serverTimestamp() });
  records.forEach((record) => updateCachedRecord(type, record));
  if (created.length) clearCallListCountCache();
  records.duplicates = [...new Map(duplicateContacts.map((item) => [item.contact, item])).values()];
  records.invalidCount = invalidCount;
  records.uploadBatchId = batchId;
  records.newlyCreatedIds = created.map(({ id }) => id);
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
  let program = "";
  if (templateId) {
    const template = await whatsappMessageRef(templateId).get();
    if (!template.exists || template.data()?.active !== true || template.data()?.type !== (listType === "training" ? "training" : "service")) {
      throw callListError("The selected message template is unavailable.");
    }
    program = clean(template.data().title);
  }
  let existing;
  if (contactGroupIndexAvailable) {
    try { existing = (await getFirestore().collectionGroup("calls").where("contact", "==", contact).limit(1).get()).docs; }
    catch (error) {
      if (error.code !== 9) throw error;
      contactGroupIndexAvailable = false;
    }
  }
  if (!existing) {
    const collections = await allCallCollections();
    existing = (await Promise.all(collections.map((ref) => ref.where("contact", "==", contact).limit(1).get())))
      .flatMap((snapshot) => snapshot.docs);
  }
  if (existing.length) {
    throw callListError("A call-list contact with this number already exists.", 409);
  }
  const now = new Date().toISOString();
  const uploadDate = uploadDayInIndia(now);
  const ref = datedExecutiveCalls(listType, assignedTo, uploadDate).doc();
  const record = {
    callId: ref.id, listType, name, contact,
    program, [templateField]: templateId,
    source: "Manual Call List", date: uploadDate,
    callStatus: clean(input.callStatus),
    interactionType: clean(input.interactionType) || "",
    interestStatus: clean(input.interestStatus) || "Not Interested",
    remark: clean(input.remark), callAt: clean(input.callAt), assignedTo,
    assignedToName: clean(actor?.name || actor?.username),
    callClicked: false, whatsappClicked: false, leadCreated: false,
    callLeadStatus: "", callLeadStatusSelected: false, callLeadAssignedTo: "", callLeadAssignedDate: "",
    leadDraft: null, createdLeadId: "", createdLeadDate: "", active: true, snoozeUntil: null, lastWorkedAt: null,
    revision: 0, createdAt: now, updatedAt: now,
    uploadedBy: assignedTo, uploadDate, uploadBatchId: null,
    lastCallClickedAt: null, callDurationSeconds: null, callDurationSource: null,
  };
  const batch = getFirestore().batch();
  batch.set(executiveRef(listType, assignedTo), {
    crmExecutiveId: assignedTo,
    crmExecutiveName: record.assignedToName,
    updatedAt: now,
  }, { merge: true });
  batch.set(executiveDateRef(listType, assignedTo, uploadDate), { date: uploadDate, updatedAt: now }, { merge: true });
  batch.set(ref, record);
  await batch.commit();
  const saved = { id: ref.id, ...record };
  updateCachedRecord(listType, saved);
  clearCallListCountCache();
  return saved;
}

export async function updateCallRecord(type, id, patch, assignedTo = "", requiredAssignedTo = "") {
  const allowed = ["leadCreated", "createdLeadId", "createdLeadDate", "callLeadStatus", "callLeadStatusSelected", "callLeadAssignedTo", "callLeadAssignedDate", "callStatus", "callAt", "snoozeUntil", "interactionType", "interestStatus", "program", "programId", "serviceId", "remark", "leadDraft", "leadDraftSavedBy", "leadDraftSavedByName", "callClicked", "whatsappClicked", "active", "name", "contact", "date", "assignedTo", "assignedToName"];
  const payload = Object.fromEntries(allowed.filter((key) => patch[key] !== undefined).map((key) => [key, patch[key]]));
  if (payload.callStatus !== undefined && !["", "Pending", "Follow Up", "Completed"].includes(payload.callStatus)) throw callListError("Invalid call status.");
  if (payload.interestStatus !== undefined && !["Not Interested", "Interested"].includes(payload.interestStatus)) throw callListError("Invalid interest status.");
  if (payload.name !== undefined && (!clean(payload.name) || clean(payload.name).length > 200)) throw callListError("Enter a valid customer name.");
  if (payload.contact !== undefined && !cleanIndianPhone(payload.contact)) throw callListError("Enter a valid 10-digit Indian mobile number.");
  if (payload.remark !== undefined && (typeof payload.remark !== "string" || payload.remark.length > 5000)) throw callListError("Remark is too long.");
  if (payload.program !== undefined && (typeof payload.program !== "string" || payload.program.length > 200)) throw callListError("Invalid service or training.");
  if (payload.callAt !== undefined && (typeof payload.callAt !== "string" || payload.callAt.length > 40)) throw callListError("Invalid follow-up time.");
  if (payload.snoozeUntil !== undefined && payload.snoozeUntil !== null && !/^\d{4}-\d{2}-\d{2}$/.test(payload.snoozeUntil)) throw callListError("Invalid follow-up date.");
  const mutationId = /^[a-zA-Z0-9_-]{8,100}$/.test(String(patch.mutationId || "")) ? String(patch.mutationId) : randomUUID();
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
  if (payload.leadDraft !== undefined) {
    const validInterests = await leadInterestsWithActiveTemplates(payload.leadDraft?.type);
    payload.leadDraft = normalizeCallLeadDraft(payload.leadDraft, validInterests);
  }
  const snapshot = await findCallSnapshot(type, id, assignedTo);
  if (!snapshot?.exists) throw new Error("Call record not found.");
  const ref = snapshot.ref;
  let before;
  let saved;
  await getFirestore().runTransaction(async (transaction) => {
    const fresh = await transaction.get(ref);
    if (!fresh.exists) throw callListError("Call record not found.", 404);
    const data = fresh.data();
    if (payload.date !== undefined && payload.date !== data.date) {
      throw callListError("Contact date cannot be changed after upload because it determines the Firestore folder.", 409);
    }
    const hasAssignedAccess = String(data.assignedTo) === String(requiredAssignedTo)
      || String(data.callLeadAssignedTo || "") === String(requiredAssignedTo);
    if (requiredAssignedTo && !hasAssignedAccess) throw callListError("This call is not assigned to you.", 403);
    if (data.lastMutationId === mutationId) {
      saved = { id: fresh.id, listType: normalizeListType(type), ...fresh.data() };
      before = saved;
      return;
    }
    if (patch.expectedRevision !== undefined && Number(patch.expectedRevision) !== Number(data.revision || 0)) throw callListError("This contact changed elsewhere. Refresh and try again.", 409);
    if (patch.expectedUpdatedAt && data.updatedAt !== patch.expectedUpdatedAt) throw callListError("This contact changed elsewhere. Refresh and try again.", 409);
    const changedKeys = Object.keys(payload).filter((key) => !isDeepStrictEqual(data[key], payload[key])
      || (["callClicked", "whatsappClicked"].includes(key) && patch[key] === true));
    const changesLockedRecord = changedKeys.length > 0;
    const callActionOnly = Boolean(requiredAssignedTo)
      && changedKeys.length > 0
      && changedKeys.every((key) => key === "callClicked" || key === "whatsappClicked");
    const canEditUnapprovedDraft = Boolean(requiredAssignedTo)
      && Boolean(data.leadDraft)
      && !data.leadCreated
      && data.callLeadStatus !== "Approved"
      && payload.callLeadStatus !== "Approved"
      && changedKeys.length > 0
      && changedKeys.every((key) => ["callLeadStatus", "callLeadStatusSelected", "interestStatus", "remark", "program", "programId", "serviceId"].includes(key));
    if ((data.leadDraft || data.leadCreated || data.callLeadStatus === "Approved")
      && changesLockedRecord
      && !callActionOnly
      && !canEditUnapprovedDraft
      && !isApprovedCallCompletionUpdate(data, payload)) {
      throw callListError("This call contact is locked. After saving the lead form, only Follow Up can change to Completed.", 409);
    }
    before = { id: fresh.id, listType: normalizeListType(type), ...data };
    saved = before;
    const clicked = patch.callClicked === true || patch.whatsappClicked === true;
    if (!clicked && !Object.keys(payload).some((key) => !isDeepStrictEqual(data[key], payload[key]))) return;
    const now = new Date().toISOString();
    const changedPayload = Object.fromEntries(Object.entries(payload).filter(([key, value]) => !isDeepStrictEqual(data[key], value) || ((key === "callClicked" || key === "whatsappClicked") && value === true)));
    const changes = { ...changedPayload, updatedAt: now, revision: Number(data.revision || 0) + 1, lastMutationId: mutationId };
    if (patch.callClicked === true) changes.lastCallClickedAt = now;
    // Only actual CRM work changes the activity date; assignment and draft edits do not.
    const workFields = ["callStatus", "callAt", "snoozeUntil", "callLeadStatus", "interestStatus", "remark", "program", "programId", "serviceId", "leadDraft", "callClicked", "whatsappClicked"];
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
  const validInterests = await leadInterestsWithActiveTemplates(initialData.leadDraft?.type);
  const draft = normalizeCallLeadDraft(initialData.leadDraft, validInterests);
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
    if (!isCallLead(data)) {
      throw callListError("This contact no longer qualifies as a call lead.", 409);
    }
    const currentDraft = normalizeCallLeadDraft(data.leadDraft, validInterests);
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
    clearCallListCountCache();
    return record;
  }
}

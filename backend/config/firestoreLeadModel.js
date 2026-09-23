import { getFirestore } from "firebase-admin/firestore";
import { isDeepStrictEqual } from "node:util";
import { createDocumentCache, cloneDocumentData } from "./documentCache.js";

const originals = new WeakMap();

function slug(value, fallback) {
  const normalized = String(value || "")
    .trim()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();
  return normalized || fallback;
}

function typeSlug(type) {
  return slug(type, "training");
}

function interestId(interest) {
  return String(interest || "Unknown Interest")
    .trim()
    .replace(/\//g, "-")
    .replace(/\s+/g, " ");
}

function matchesValue(value, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if ("$in" in expected) return expected.$in.map(String).includes(String(value));
    if ("$ne" in expected) return String(value ?? "") !== String(expected.$ne ?? "");
    if ("$exists" in expected) return expected.$exists ? value !== undefined : value === undefined;
    if ("$regex" in expected) return new RegExp(expected.$regex, expected.$options || "").test(String(value ?? ""));
  }
  return String(value ?? "") === String(expected ?? "");
}

function matches(data, filter = {}) {
  if (filter.$or) return filter.$or.some((condition) => matches(data, condition));
  return Object.entries(filter).every(([key, expected]) => key === "$or" || matchesValue(data[key], expected));
}

class Document {
  constructor(Model, ref, data) {
    Object.assign(this, cloneDocumentData(data), { _Model: Model, _ref: ref, id: ref.path, _id: ref.path });
    originals.set(this, cloneDocumentData(this.toObject()));
  }

  toObject() {
    const { _Model, _ref, ...data } = this;
    return data;
  }

  async save() {
    if (isDeepStrictEqual(this.toObject(), originals.get(this))) return this;
    const { _id, ...data } = normalizeLeadData(this.toObject());
    Object.assign(this, data);
    await this._ref.set(data);
    originals.set(this, cloneDocumentData(this.toObject()));
    this._Model._cacheDocument(this._ref, data);
    return this;
  }
}

class Query {
  constructor(Model, filter = {}) {
    this.Model = Model;
    this.filter = filter;
    this.sortSpec = null;
    this.skipCount = 0;
    this.limitCount = null;
  }

  sort(spec) { this.sortSpec = spec; return this; }
  skip(count) { this.skipCount = Number(count) || 0; return this; }
  limit(count) { this.limitCount = Number(count) || 0; return this; }
  select() { return this; }

  async exec() {
    let rows = (await this.Model._getCachedDocuments())
      .filter((doc) => matches(doc, this.filter));

    if (this.sortSpec) {
      const [field, direction] = Object.entries(this.sortSpec)[0] || [];
      rows.sort((a, b) => String(a[field] ?? "").localeCompare(String(b[field] ?? "")) * (direction < 0 ? -1 : 1));
    }

    rows = rows.slice(this.skipCount);
    return this.limitCount === null ? rows : rows.slice(0, this.limitCount);
  }

  then(resolve, reject) { return this.exec().then(resolve, reject); }
}

function dateId(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function normalizeLeadData(data = {}) {
  const normalized = { ...data };
  normalized.listType = typeSlug(normalized.listType || normalized.type);
  normalized.phone = normalized.phone || normalized.contact || "";
  normalized.interest = normalized.interest || normalized.program || "";
  normalized.notes = normalized.notes || normalized.remark || "";
  normalized.source = normalized.source || normalized.leadSource || "";
  normalized.createdAt = normalized.createdAt || normalized.createdDate || new Date().toISOString();

  delete normalized._id;
  delete normalized.contact;
  delete normalized.program;
  delete normalized.remark;
  delete normalized.leadSource;
  delete normalized.createdDate;
  delete normalized.type;
  return normalized;
}

export function createLeadModel() {
  const cacheTtlMs = 5 * 60 * 1000;
  const cache = createDocumentCache(cacheTtlMs);
  const Model = {
    modelName: "Lead",
    async _getCachedDocuments() {
      const rows = await cache.get(async () => {
            const rootDocuments = await getFirestore().collection("leads").listDocuments();
            const collectionPromises = (await Promise.all(rootDocuments.map((typeRef) =>
              typeRef.listCollections().then((collections) => collections.map((collection) => collection.get()))
            ))).flat();
            const nestedSnapshots = await Promise.all(collectionPromises);
            return nestedSnapshots
              .flatMap((snapshot) => snapshot.docs)
              .map((doc) => ({
                ref: doc.ref,
                data: {
                  ...doc.data(),
                  listType: doc.data()?.listType || doc.ref.path.split("/")[1] || "",
                },
              }));
      });
      return rows.map(({ ref, data }) => new Document(Model, ref, data));
    },
    _invalidateCache() { cache.clear(); },
    _cacheDocument(ref, data) { cache.put({ ref, data: cloneDocumentData(data) }); },
    find(filter = {}) { return new Query(Model, filter); },
    async findOne(filter = {}) { return (await Model.find(filter).limit(1))[0] || null; },
    findById(id) { return new Query(Model, { _id: String(id) }).limit(1); },

    async create(data) {
      const type = typeSlug(data.type);
      const payload = normalizeLeadData({ ...data, listType: type });
      const interest = interestId(payload.interest);
      const parent = getFirestore()
        .collection("leads")
        .doc(type)
        .collection(interest);
      const baseId = `lead_${dateId()}`;
      let createdDocument;

      await getFirestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(parent);
        const existingIds = new Set(snapshot.docs.map((doc) => doc.id));
        let documentId = baseId;
        let suffix = 2;
        while (existingIds.has(documentId)) {
          documentId = `${baseId}_${String(suffix).padStart(2, "0")}`;
          suffix += 1;
        }

        const ref = parent.doc(documentId);
        const documentData = { ...payload, id: documentId };
        transaction.create(ref, documentData);
        createdDocument = new Document(Model, ref, documentData);
      });

      Model._cacheDocument(createdDocument._ref, createdDocument.toObject());
      return createdDocument;
    },

    async countDocuments(filter = {}) { return (await Model.find(filter)).length; },
    async findOneAndUpdate(filter, update, options = {}) {
      const values = update.$set || update;
      const item = await Model.findOne(filter);
      if (!item && !options.upsert) return null;
      if (!item) return Model.create(values);
      Object.assign(item, values, { id: item._ref.path, _id: item._ref.path });
      return item.save();
    },
    async findOneAndDelete(filter) {
      const item = await Model.findOne(filter);
      if (item) { await item._ref.delete(); cache.remove(item._ref.path); }
      return item;
    },
  };
  return Model;
}

import { getFirestore } from "firebase-admin/firestore";
import { isDeepStrictEqual } from "node:util";
import { createDocumentCache, cloneDocumentData } from "./documentCache.js";

const originals = new WeakMap();

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
  constructor(Model, ref, data) { Object.assign(this, cloneDocumentData(data), { _Model: Model, _ref: ref, _id: ref.id }); originals.set(this, cloneDocumentData(this.toObject())); }
  toObject() { const { _Model, _ref, ...data } = this; return data; }
  async save() {
    const snapshot = this.toObject();
    if (isDeepStrictEqual(snapshot, originals.get(this))) return this;
    const { _id, ...data } = snapshot;
    await this._ref.set(data, { merge: true });
    originals.set(this, cloneDocumentData(snapshot));
    this._Model._cacheDocument(this._ref, data);
    return this;
  }
}

class Query {
  constructor(Model, filter = {}) { this.Model = Model; this.filter = filter; this.sortSpec = null; this.skipCount = 0; this.limitCount = null; }
  sort(spec) { this.sortSpec = spec; return this; }
  skip(count) { this.skipCount = Number(count) || 0; return this; }
  limit(count) { this.limitCount = Number(count) || 0; return this; }
  select() { return this; }
  async exec() {
    let rows = (await this.Model._getCachedDocuments()).filter((doc) => matches(doc, this.filter));
    if (this.sortSpec) {
      const [field, direction] = Object.entries(this.sortSpec)[0] || [];
      rows.sort((a, b) => String(a[field] ?? "").localeCompare(String(b[field] ?? "")) * (direction < 0 ? -1 : 1));
    }
    rows = rows.slice(this.skipCount);
    return this.limitCount === null ? rows : rows.slice(0, this.limitCount);
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
}

export function createCollectionModel(collectionName, modelName) {
  // Successful writes update cached snapshots; keep the original expiry so
  // changes made outside this process are still picked up on schedule.
  const cacheTtlMs = 2 * 60 * 1000;
  const cache = createDocumentCache(cacheTtlMs);
  const Model = {
    modelName,
    get collection() { return getFirestore().collection(collectionName); },
    async _getCachedDocuments() {
      const rows = await cache.get(async () => {
        const snapshot = await Model.collection.get();
        return snapshot.docs.map((doc) => ({ ref: doc.ref, data: doc.data() }));
      });
      return rows.map(({ ref, data }) => new Document(Model, ref, data));
    },
    _invalidateCache() { cache.clear(); },
    _cacheDocument(ref, data) { cache.put({ ref, data: cloneDocumentData(data) }); },
    find(filter = {}) { return new Query(Model, filter); },
    async findOne(filter = {}) {
      const entries = Object.entries(filter);
      if (entries.length === 1 && entries[0][0] === "_id" && typeof entries[0][1] !== "object") {
        const snapshot = await Model.collection.doc(String(entries[0][1])).get();
        return snapshot.exists ? new Document(Model, snapshot.ref, snapshot.data()) : null;
      }
      if (entries.length === 1 && typeof entries[0][1] !== "object") {
        const snapshot = await Model.collection.where(entries[0][0], "==", entries[0][1]).limit(1).get();
        const document = snapshot.docs[0];
        return document ? new Document(Model, document.ref, document.data()) : null;
      }
      return (await Model.find(filter).limit(1))[0] || null;
    },
    findById(id) { return new Query(Model, { _id: String(id) }).limit(1); },

    // 👇 CHANGED: use data.id as the Firestore document ID when present,
    // instead of an auto-generated push ID. Falls back to auto-id if none given.
    async create(data) {
      const docId = data.id ? String(data.id) : undefined;
      const ref = docId ? Model.collection.doc(docId) : Model.collection.doc();
      await ref.set({ ...data });
      Model._cacheDocument(ref, data);
      return new Document(Model, ref, data);
    },

    async countDocuments(filter = {}) { return (await Model.find(filter)).length; },
    async findOneAndUpdate(filter, update, options = {}) {
      const values = update.$set || update;
      let item = await Model.findOne(filter);
      if (!item && !options.upsert) return null;
      if (!item) return Model.create(values);
      Object.assign(item, values); await item.save(); return item;
    },
    async findOneAndDelete(filter) { const item = await Model.findOne(filter); if (item) { await item._ref.delete(); cache.remove(item._ref.path); } return item; },
    async updateMany(filter, update) {
      const items = await Model.find(filter); const values = update.$set || update;
      await Promise.all(items.map(async (item) => { Object.assign(item, values); await item.save(); }));
      return { matchedCount: items.length, modifiedCount: items.length };
    },
  };
  return Model;
}

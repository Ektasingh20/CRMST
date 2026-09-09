import { getFirestore } from "firebase-admin/firestore";

// Frontend "dept" value -> Firestore folder name under users/
const DEPT_SLUGS = {
  CRM: "crm",
  HR: "hr",
  IT: "it",
  Operation: "operations",
  Student: "students",
  Admin: "admin",
};

function deptSlug(dept) {
  const key = String(dept || "").trim();
  return DEPT_SLUGS[key] || key.toLowerCase().replace(/\s+/g, "-") || "general";
}

function nextDocumentId(snapshot, slug) {
  const prefix = `${slug}_`;
  let highestNumber = 0;
  snapshot.docs.forEach((doc) => {
    if (!doc.id.startsWith(prefix)) return;
    const number = Number(doc.id.slice(prefix.length));
    if (Number.isInteger(number)) highestNumber = Math.max(highestNumber, number);
  });
  return `${prefix}${String(highestNumber + 1).padStart(2, "0")}`;
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
  constructor(Model, ref, data) { Object.assign(this, data, { _Model: Model, _ref: ref, _id: ref.id }); }
  toObject() { const { _Model, _ref, ...data } = this; return data; }
  async save() { const { _id, ...data } = this.toObject(); await this._ref.set(data, { merge: true }); return this; }
}

// Reads scan every users/<dept>/members/<username> doc via a collectionGroup query,
// then filter client-side exactly like the old flat model did.
class Query {
  constructor(Model, filter = {}) { this.Model = Model; this.filter = filter; this.sortSpec = null; this.skipCount = 0; this.limitCount = null; }
  sort(spec) { this.sortSpec = spec; return this; }
  skip(count) { this.skipCount = Number(count) || 0; return this; }
  limit(count) { this.limitCount = Number(count) || 0; return this; }
  select() { return this; }
  async exec() {
    const snapshot = await getFirestore().collectionGroup("members").get();
    let rows = snapshot.docs
      .filter((doc) => doc.ref.path.startsWith("users/")) // scope to the users tree only
      .map((doc) => new Document(this.Model, doc.ref, doc.data()))
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

export function createUserModel() {
  const Model = {
    modelName: "User",
    find(filter = {}) { return new Query(Model, filter); },
    async findOne(filter = {}) { return (await Model.find(filter).limit(1))[0] || null; },
    findById(id) { return new Query(Model, { _id: String(id) }).limit(1); },

    // users/<deptSlug>/members/<deptSlug_NN>
    async create(data) {
      const slug = deptSlug(data.dept);
      const parent = getFirestore().collection("users").doc(slug).collection("members");
      let createdDocument;

      await getFirestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(parent);
        const docId = nextDocumentId(snapshot, slug);
        const ref = parent.doc(docId);
        const payload = { ...data, id: docId, dept: data.dept };
        transaction.create(ref, payload);
        createdDocument = new Document(Model, ref, payload);
      });

      return createdDocument;
    },

    async countDocuments(filter = {}) { return (await Model.find(filter)).length; },
    async findOneAndUpdate(filter, update, options = {}) {
      const values = update.$set || update;
      let item = await Model.findOne(filter);
      if (!item && !options.upsert) return null;
      if (!item) return Model.create(values);
      Object.assign(item, values); await item.save(); return item;
    },
    async findOneAndDelete(filter) { const item = await Model.findOne(filter); if (item) await item._ref.delete(); return item; },
    async updateMany(filter, update) {
      const items = await Model.find(filter); const values = update.$set || update;
      await Promise.all(items.map(async (item) => { Object.assign(item, values); await item.save(); }));
      return { matchedCount: items.length, modifiedCount: items.length };
    },
  };
  return Model;
}
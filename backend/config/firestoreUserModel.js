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
  if (slug === "students") {
    let highestNumber = 10003;
    snapshot.docs.forEach((doc) => {
      const match = doc.id.match(/^student_(\d+)$/i);
      if (match) highestNumber = Math.max(highestNumber, Number(match[1]));
    });
    return `student_${highestNumber + 1}`;
  }
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
  async save() { const { _id, ...data } = this.toObject(); await this._ref.set(data, { merge: true }); this._Model._invalidateCache(); return this; }
}

async function copyStudentDocumentTree(sourceRef, targetRef, oldStudentId, newStudentId) {
  const source = await sourceRef.get();
  if (source.exists) {
    const data = source.data();
    await targetRef.set({ ...data, studentId: String(data.studentId || "") === oldStudentId ? newStudentId : data.studentId }, { merge: true });
  }
  const collections = await sourceRef.listCollections();
  for (const collection of collections) {
    const children = await collection.get();
    for (const child of children.docs) {
      await copyStudentDocumentTree(child.ref, targetRef.collection(collection.id).doc(child.id), oldStudentId, newStudentId);
    }
  }
  if (source.exists) await sourceRef.delete();
}

async function migrateStudentReferences(oldStudentId, newStudentId) {
  if (oldStudentId === newStudentId) return;
  const db = getFirestore();

  // Student progress, notifications, and enrollment requests use the student
  // ID as their parent document. Move the complete tree to the new ID.
  await copyStudentDocumentTree(
    db.collection("students").doc(oldStudentId),
    db.collection("students").doc(newStudentId),
    oldStudentId,
    newStudentId,
  );

  // Preserve all current course enrolments after the ID changes.
  const courses = await db.collection("courses").get();
  await Promise.all(courses.docs.map(async (course) => {
    const studentIds = Array.isArray(course.data().studentIds) ? course.data().studentIds.map(String) : [];
    if (!studentIds.includes(oldStudentId)) return;
    const nextIds = [...new Set(studentIds.map((id) => id === oldStudentId ? newStudentId : id))];
    await course.ref.update({ studentIds: nextIds });
  }));

  // A task grade is keyed by student ID inside its lesson document.
  const lessons = await db.collectionGroup("lessons").get();
  await Promise.all(lessons.docs.filter((lesson) => lesson.ref.path.startsWith("courses/")).map(async (lesson) => {
    const tasks = Array.isArray(lesson.data().tasks) ? lesson.data().tasks : [];
    let changed = false;
    const nextTasks = tasks.map((task) => {
      if (!task?.grades?.[oldStudentId]) return task;
      changed = true;
      const grades = { ...task.grades, [newStudentId]: task.grades[oldStudentId] };
      delete grades[oldStudentId];
      return { ...task, grades };
    });
    if (changed) await lesson.ref.update({ tasks: nextTasks });
  }));
}

// Reads scan every users/<dept>/members/<username> doc via a collectionGroup query,
// then filter client-side exactly like the old flat model did.
class Query {
  constructor(Model, filter = {}, directRef = null) { this.Model = Model; this.filter = filter; this.directRef = directRef; this.sortSpec = null; this.skipCount = 0; this.limitCount = null; }
  sort(spec) { this.sortSpec = spec; return this; }
  skip(count) { this.skipCount = Number(count) || 0; return this; }
  limit(count) { this.limitCount = Number(count) || 0; return this; }
  select() { return this; }
  async exec() {
    if (this.directRef) {
      const snapshot = await this.directRef.get();
      return snapshot.exists ? [new Document(this.Model, snapshot.ref, snapshot.data())] : [];
    }
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

export function createUserModel() {
  const cacheTtlMs = 60 * 1000;
  let cachedDocuments = null;
  let cachedAt = 0;
  let cachePromise = null;
  const Model = {
    modelName: "User",
    async _getCachedDocuments() {
      if (!cachedDocuments || Date.now() - cachedAt >= cacheTtlMs) {
        if (!cachePromise) {
          cachePromise = getFirestore().collectionGroup("members").get().then((snapshot) => {
            cachedDocuments = snapshot.docs
              .filter((doc) => doc.ref.path.startsWith("users/"))
              .map((doc) => new Document(Model, doc.ref, doc.data()));
            cachedAt = Date.now();
            return cachedDocuments;
          }).finally(() => { cachePromise = null; });
        }
        await cachePromise;
      }
      return cachedDocuments;
    },
    _invalidateCache() { cachedDocuments = null; cachedAt = 0; cachePromise = null; },
    find(filter = {}) { return new Query(Model, filter); },
    async findOne(filter = {}) { return (await Model.find(filter).limit(1))[0] || null; },
    findById(id, dept = "") {
      if (dept) {
        const ref = getFirestore().collection("users").doc(deptSlug(dept)).collection("members").doc(String(id));
        return new Query(Model, {}, ref).limit(1);
      }
      return new Query(Model, { _id: String(id) }).limit(1);
    },

    // users/<deptSlug>/members/<deptSlug_NN>, except students which use
    // student_10004, student_10005, ... as their permanent login IDs.
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

      Model._invalidateCache();
      return createdDocument;
    },

    async countDocuments(filter = {}) { return (await Model.find(filter)).length; },
    async findOneAndUpdate(filter, update, options = {}) {
      const values = update.$set || update;
      let item = await Model.findOne(filter);
      if (!item && !options.upsert) return null;
      if (!item) return Model.create(values);

      // A department is part of the Firestore path, not only a field on the
      // user document. Move the record when it changes so, for example, a
      // former CRM member no longer remains under users/crm/members.
      const nextDept = values.dept ?? item.dept;
      const currentSlug = item._ref.parent.parent.id;
      const nextSlug = deptSlug(nextDept);
      const needsStudentId = nextSlug === "students" && !/^student_\d+$/i.test(String(item._id));
      if (currentSlug !== nextSlug || needsStudentId) {
        const targetParent = getFirestore().collection("users").doc(nextSlug).collection("members");
        let targetRef;
        let payload;
        await getFirestore().runTransaction(async (transaction) => {
          const targetSnapshot = await transaction.get(targetParent);
          const targetId = nextSlug === "students" ? nextDocumentId(targetSnapshot, nextSlug) : String(item._id);
          targetRef = targetParent.doc(targetId);
          payload = { ...item.toObject(), ...values, id: targetId, dept: nextDept };
          transaction.set(targetRef, payload);
          transaction.delete(item._ref);
        });
        if (nextSlug === "students") await migrateStudentReferences(String(item._id), String(targetRef.id));
        Model._invalidateCache();
        return new Document(Model, targetRef, payload);
      }

      Object.assign(item, values); await item.save(); return item;
    },
    async findOneAndDelete(filter) { const item = await Model.findOne(filter); if (item) { await item._ref.delete(); Model._invalidateCache(); } return item; },
    async updateMany(filter, update) {
      const items = await Model.find(filter); const values = update.$set || update;
      await Promise.all(items.map(async (item) => { Object.assign(item, values); await item.save(); }));
      return { matchedCount: items.length, modifiedCount: items.length };
    },
  };
  return Model;
}

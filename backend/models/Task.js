import { getFirestore } from "firebase-admin/firestore";
import { isDeepStrictEqual } from "node:util";

const ROOT_COLLECTION = "tasks";
const USER_TASKS_COLLECTION = "assignedTasks";
const originals = new WeakMap();
const READ_CACHE_TTL_MS = 15 * 1000;
const readCache = new Map();
const readRequests = new Map();
let readGeneration = 0;
const clean = (value) => String(value ?? "").trim();
const userDocumentId = (value) => encodeURIComponent(clean(value));

export function taskDocumentPath(assigneeId, taskId) {
  const owner = userDocumentId(assigneeId);
  const id = clean(taskId);
  if (!owner || !id) throw new Error("Task assignee and task ID are required.");
  return `${ROOT_COLLECTION}/${owner}/${USER_TASKS_COLLECTION}/${id}`;
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

function isTaskDocument(data = {}) {
  return Boolean(clean(data.id) && clean(data.assigneeId) && clean(data.title));
}

const rootRef = () => getFirestore().collection(ROOT_COLLECTION);
const userRef = (assigneeId) => rootRef().doc(userDocumentId(assigneeId));
const assignedTasksRef = (assigneeId) => userRef(assigneeId).collection(USER_TASKS_COLLECTION);
const assignedTaskRef = (assigneeId, taskId) => assignedTasksRef(assigneeId).doc(clean(taskId));

function ownerMetadata(data) {
  return {
    userId: clean(data.assigneeId),
    userName: clean(data.assignee),
    role: clean(data.assigneeRole),
    department: clean(data.assigneeDepartment),
    updatedAt: new Date().toISOString(),
  };
}

class TaskDocument {
  constructor(ref, data) {
    Object.assign(this, { ...data }, { _ref: ref, _id: ref.id });
    originals.set(this, this.toObject());
  }

  toObject() {
    const { _ref, ...data } = this;
    return { ...data };
  }

  async save() {
    const snapshot = this.toObject();
    if (isDeepStrictEqual(snapshot, originals.get(this))) return this;
    const { _id, ...data } = snapshot;
    const taskId = clean(data.id || _id);
    const destination = assignedTaskRef(data.assigneeId, taskId);
    if (this._ref.path === destination.path) {
      // Normal status/content updates touch only the task document.
      await destination.set({ ...data, id: taskId });
    } else {
      // Legacy migration or reassignment also maintains the new user's folder metadata.
      const batch = getFirestore().batch();
      batch.set(userRef(data.assigneeId), ownerMetadata(data), { merge: true });
      batch.set(destination, { ...data, id: taskId });
      batch.delete(this._ref);
      await batch.commit();
    }
    invalidateTaskReads();
    this._ref = destination;
    this._id = taskId;
    this.id = taskId;
    originals.set(this, this.toObject());
    return this;
  }
}

class TaskQuery {
  constructor(loader, filter = {}) {
    this.loader = loader;
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
    let rows = (await this.loader()).filter((task) => matches(task, this.filter));
    if (this.sortSpec) {
      const [field, direction] = Object.entries(this.sortSpec)[0] || [];
      rows.sort((left, right) => String(left[field] ?? "").localeCompare(String(right[field] ?? "")) * (direction < 0 ? -1 : 1));
    }
    rows = rows.slice(this.skipCount);
    return this.limitCount === null ? rows : rows.slice(0, this.limitCount);
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
}

function documentsFromSnapshots(snapshots) {
  const byId = new Map();
  snapshots.flat().forEach((snapshot) => {
    const data = snapshot.data();
    if (!isTaskDocument(data)) return;
    byId.set(clean(data.id) || snapshot.id, new TaskDocument(snapshot.ref, data));
  });
  return [...byId.values()];
}

function copyTaskRows(rows) {
  return rows.map((task) => {
    const { _id, ...data } = task.toObject();
    return new TaskDocument(task._ref, { ...data });
  });
}

async function cachedTaskRead(key, loader) {
  const cached = readCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < READ_CACHE_TTL_MS) return copyTaskRows(cached.rows);
  const existingRequest = readRequests.get(key);
  if (existingRequest) return copyTaskRows(await existingRequest);
  const generation = readGeneration;
  let request;
  request = Promise.resolve(loader()).then((rows) => {
    if (generation === readGeneration) readCache.set(key, { rows: copyTaskRows(rows), fetchedAt: Date.now() });
    return rows;
  }).finally(() => {
    if (readRequests.get(key) === request) readRequests.delete(key);
  });
  readRequests.set(key, request);
  return copyTaskRows(await request);
}

function invalidateTaskReads() {
  readGeneration += 1;
  readCache.clear();
  readRequests.clear();
}

async function loadAllTasks() {
  return cachedTaskRead("all", async () => {
  const [legacy, separated] = await Promise.all([
    rootRef().where("id", ">", "").get(),
    getFirestore().collectionGroup(USER_TASKS_COLLECTION).get(),
  ]);
  return documentsFromSnapshots([legacy.docs, separated.docs]);
  });
}

async function loadTasksForUser(assigneeId) {
  const owner = clean(assigneeId);
  if (!owner) return [];
  return cachedTaskRead(`user:${owner}`, async () => {
  const [separated, legacy] = await Promise.all([
    assignedTasksRef(owner).get(),
    rootRef().where("assigneeId", "==", owner).get(),
  ]);
  return documentsFromSnapshots([legacy.docs, separated.docs]);
  });
}

async function findTaskById(id) {
  const taskId = clean(id);
  if (!taskId) return null;
  const [legacy, separated] = await Promise.all([
    rootRef().doc(taskId).get(),
    getFirestore().collectionGroup(USER_TASKS_COLLECTION).where("id", "==", taskId).limit(1).get(),
  ]);
  const nested = separated.docs[0];
  if (nested && isTaskDocument(nested.data())) return new TaskDocument(nested.ref, nested.data());
  return legacy.exists && isTaskDocument(legacy.data()) ? new TaskDocument(legacy.ref, legacy.data()) : null;
}

const Task = {
  modelName: "Task",
  find(filter = {}) { return new TaskQuery(loadAllTasks, filter); },
  findForUser(assigneeId, filter = {}) { return new TaskQuery(() => loadTasksForUser(assigneeId), filter); },
  async findOne(filter = {}) {
    if (filter.id !== undefined && typeof filter.id !== "object") return findTaskById(filter.id);
    if (filter._id !== undefined && typeof filter._id !== "object") return findTaskById(filter._id);
    return (await Task.find(filter).limit(1))[0] || null;
  },
  findById(id) { return new TaskQuery(async () => { const task = await findTaskById(id); return task ? [task] : []; }); },
  async create(data) {
    const taskId = clean(data.id);
    const assigneeId = clean(data.assigneeId);
    if (!taskId || !assigneeId) throw new Error("Task assignee and task ID are required.");
    const ref = assignedTaskRef(assigneeId, taskId);
    const batch = getFirestore().batch();
    batch.set(userRef(assigneeId), ownerMetadata(data), { merge: true });
    batch.set(ref, { ...data, id: taskId });
    await batch.commit();
    invalidateTaskReads();
    return new TaskDocument(ref, { ...data, id: taskId });
  },
  async countDocuments(filter = {}) { return (await Task.find(filter)).length; },
  async findOneAndUpdate(filter, update, options = {}) {
    const values = update.$set || update;
    let task = await Task.findOne(filter);
    if (!task && !options.upsert) return null;
    if (!task) return Task.create(values);
    Object.assign(task, values);
    await task.save();
    return task;
  },
  async findOneAndDelete(filter) {
    const task = await Task.findOne(filter);
    if (task) {
      await task._ref.delete();
      invalidateTaskReads();
    }
    return task;
  },
  async updateMany(filter, update) {
    const tasks = await Task.find(filter);
    const values = update.$set || update;
    await Promise.all(tasks.map(async (task) => { Object.assign(task, values); await task.save(); }));
    return { matchedCount: tasks.length, modifiedCount: tasks.length };
  },
};

export default Task;

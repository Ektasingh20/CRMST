// This is the ONLY module allowed to receive a raw Firestore handle.
// No DocumentReference, QuerySnapshot or transaction escapes the capability boundary.
const owned = new Set(['itd_projects','itd_tasks','itd_bugs','itd_clarifications','itd_members','itd_statusHistory','itd_activity','itd_counters','itd_sync']);
const legacy = new Set(['Project','users','tasks','attendance','leaves','notifications','students']);
function pathParts(path) {
  if (typeof path !== 'string' || path.startsWith('/') || path.endsWith('/') || path.includes('//')) throw new Error('Invalid Firestore path.');
  const parts = path.split('/');
  if (parts.some(p => !p || p === '.' || p === '..')) throw new Error('Invalid Firestore path.');
  return parts;
}
export function assertWrite(path) {
  const parts = pathParts(path);
  if (parts.length % 2 || !owned.has(parts[0])) throw new Error(`Write forbidden: ${path}`);
  return path;
}
function assertRead(path, document) {
  const parts = pathParts(path);
  if ((!owned.has(parts[0]) && !legacy.has(parts[0])) || (parts.length % 2 === 0) !== document) throw new Error('Read path is not allowed.');
  return path;
}
const plain = value => value?.toDate ? value.toDate().toISOString() : Array.isArray(value) ? value.map(plain) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k,plain(v)])) : value;
const record = snapshot => snapshot.exists ? { ...plain(snapshot.data()), id: snapshot.id, path: snapshot.ref.path } : null;
export function createStore(db) {
  let reads = 0;
  function queryRef(path, { filters = [], limit = 100, after, fields, descending = false } = {}) {
    let query = db.collection(assertRead(path, false));
    for (const [field, operator, value] of filters) query = query.where(field, operator, value);
    query = query.orderBy('__name__', descending ? 'desc' : 'asc').limit(Math.max(1, Math.min(limit, 5001)));
    if (after) query = query.startAfter(after);
    if (fields) query = query.select(...fields);
    return query;
  }
  const get = async path => { reads++; return record(await db.doc(assertRead(path, true)).get()); };
  const query = async (path, options) => { const snap = await queryRef(path, options).get(); reads += Math.max(1,snap.size); return snap.docs.map(record); };
  function writer(raw) {
    return Object.freeze(Object.fromEntries(['set','create','update','delete'].map(method => [method, (path, ...args) => {
      raw[method](db.doc(assertWrite(path)), ...args);
    }])));
  }
  const api = {
    get, query,
    async count(path, filters = []) {
      let q = db.collection(assertRead(path, false));
      for (const [field, op, value] of filters) q = q.where(field, op, value);
      const snap = await q.count().get(); reads++;
      return snap.data().count;
    },
    async projectCollections(employeePath) {
      if (!/^Project\/[^/]+$/.test(employeePath)) throw new Error('Only project subcollection discovery is allowed.');
      // Read-only metadata discovery is necessary because project IDs are collection names.
      return (await db.doc(employeePath).listCollections()).map(ref => ref.id).sort();
    },
    async describeDocument(path) {
      if (!/^Project\/[^/]+(?:\/[^/]+\/Project Data)?$/.test(path)) throw new Error('Source schema discovery is limited to Project documents.');
      const snapshot = await db.doc(assertRead(path, true)).get();
      if (!snapshot.exists) return null;
      const typeOf = value => value?.toDate ? 'timestamp' : value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      return Object.fromEntries(Object.entries(snapshot.data()).map(([key,value]) => [key,typeOf(value)]));
    },
    async transaction(fn) {
      return db.runTransaction(async tx => fn(Object.freeze({
        ...writer(tx),
        get: async path => { reads++; return record(await tx.get(db.doc(assertRead(path,true)))); },
        query: async (path, options) => { const snap = await tx.get(queryRef(path,options)); reads += Math.max(1,snap.size); return snap.docs.map(record); },
      })));
    },
    async batch(operations) {
      if (operations.length > 450) throw new Error('Batch exceeds safe operation limit.');
      for (const op of operations) assertWrite(op.path);
      const batch = db.batch(); const safe = writer(batch);
      for (const { method, path, data } of operations) {
        if (!['set','create','update','delete'].includes(method)) throw new Error('Unsupported write.');
        method === 'delete' ? safe.delete(path) : safe[method](path,data);
      }
      await batch.commit();
    },
    readCount: () => reads,
  };
  for (const method of ['set','create','update','delete']) api[method] = async (path, ...args) => db.doc(assertWrite(path))[method](...args);
  // A separate capability with no access to the service's write operations.
  api.source = Object.freeze({ get, query, projectCollections: api.projectCollections, describeDocument: api.describeDocument,
    ...Object.fromEntries(['set','create','update','delete','batch','transaction'].map(name => [name, () => { throw new Error('Existing data is read-only.'); }])) });
  return Object.freeze(api);
}

// Store immutable snapshots, not mutable model Documents. Writes update a warm
// cache without extending its original expiry (external changes still refresh).
export function cloneDocumentData(value) {
  if (value instanceof Date) return new Date(value);
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (Array.isArray(value)) return value.map(cloneDocumentData);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneDocumentData(item)]));
  }
  // Firestore Timestamp, GeoPoint and DocumentReference instances retain their
  // SDK prototypes. They are immutable values rather than editable field maps.
  return value;
}

export function createDocumentCache(ttlMs) {
  let rows = null;
  let fetchedAt = 0;
  let pending = null;
  let revision = 0;
  return {
    async get(load) {
      if (rows && Date.now() - fetchedAt < ttlMs) return rows;
      if (!pending) {
        const startedAt = revision;
        const request = Promise.resolve().then(load).then((result) => {
          if (revision === startedAt) {
            rows = result;
            fetchedAt = Date.now();
          }
          return result;
        }).finally(() => { if (pending === request) pending = null; });
        pending = request;
      }
      return pending;
    },
    put(row) {
      revision += 1;
      pending = null;
      if (!rows) return;
      const index = rows.findIndex((item) => item.ref.path === row.ref.path);
      rows = index < 0 ? [...rows, row] : rows.map((item, i) => i === index ? row : item);
    },
    remove(path) {
      revision += 1;
      pending = null;
      if (rows) rows = rows.filter((item) => item.ref.path !== path);
    },
    clear() { revision += 1; rows = null; fetchedAt = 0; pending = null; },
  };
}

// Share concurrent reads and, when requested, keep a short per-session snapshot.
// The cache is memory-only, bounded, cloned on return, and cleared by every API
// mutation/logout so one account or write cannot reuse another response.
export function createRequestCoalescer({ defaultTtlMs = 0, maxEntries = 250 } = {}) {
  const entries = new Map();
  let generation = 0;
  return {
    clear() { generation += 1; entries.clear(); },
    async read(key, load, ttlMs = defaultTtlMs) {
      const now = Date.now();
      const existing = entries.get(key);
      if (existing?.value !== undefined && existing.expiresAt > now) return structuredClone(existing.value);
      if (existing?.promise) return structuredClone(await existing.promise);

      if (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
      const startedAt = generation;
      let request;
      const entry = { value: undefined, expiresAt: 0, promise: null };
      request = Promise.resolve().then(load).then((value) => {
        if (generation === startedAt && entries.get(key) === entry && Number(ttlMs) > 0) {
          entry.value = structuredClone(value);
          entry.expiresAt = Date.now() + Number(ttlMs);
        }
        return value;
      }).finally(() => {
        if (entries.get(key) !== entry) return;
        entry.promise = null;
        if (entry.value === undefined || entry.expiresAt <= Date.now()) entries.delete(key);
      });
      entry.promise = request;
      entries.set(key, entry);
      try {
        return structuredClone(await request);
      } catch (error) {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      }
    },
  };
}

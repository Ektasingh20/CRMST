// Share only concurrent reads; no persistent personal data or stale responses.
export function createRequestCoalescer() {
  const pending = new Map();
  return {
    clear() { pending.clear(); },
    async read(key, load) {
      let request = pending.get(key);
      if (!request) {
        request = Promise.resolve().then(load);
        pending.set(key, request);
      }
      try { return structuredClone(await request); }
      finally { if (pending.get(key) === request) pending.delete(key); }
    },
  };
}

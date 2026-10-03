export class ReadCache {
  constructor(ttl = 15000, maxKeys = 250) { this.ttl = ttl; this.maxKeys = maxKeys; this.entries = new Map(); this.generation = 0; }
  clear() { this.generation++; this.entries.clear(); }
  async get(key, loader) {
    const old = this.entries.get(key);
    if (old && old.until > Date.now()) return structuredClone(await old.promise);
    if (this.entries.size >= this.maxKeys) this.entries.delete(this.entries.keys().next().value);
    const entry = { until: Date.now() + this.ttl, promise: Promise.resolve().then(loader) };
    this.entries.set(key, entry);
    try { return structuredClone(await entry.promise); }
    catch (error) { if (this.entries.get(key) === entry) this.entries.delete(key); throw error; }
  }
}

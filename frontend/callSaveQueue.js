// One queue per customer keeps edits ordered and combines changes made close together.
export function createCallSaveQueue(write, { delay = 1500, onStatus = () => {} } = {}) {
  const queues = new Map();
  const keyOf = (type, id) => `${type}:${id}`;
  function queueFor(type, id, assignedTo) {
    const key = keyOf(type, id);
    if (!queues.has(key)) queues.set(key, { key, type, id, assignedTo, pending: {}, timer: null, running: false, waiters: [] });
    return queues.get(key);
  }
  function status(queue, value) { onStatus({ type: queue.type, id: queue.id, status: value }); }
  async function flushQueue(queue) {
    clearTimeout(queue.timer);
    queue.timer = null;
    if (queue.running || !Object.keys(queue.pending).length) return;
    if (globalThis.navigator?.onLine === false) { status(queue, "offline"); return; }
    queue.running = true;
    status(queue, "saving");
    let saved;
    try {
      while (Object.keys(queue.pending).length) {
        const patch = queue.pending;
        queue.pending = {};
        if (queue.lastVersion) patch.expectedUpdatedAt = queue.lastVersion;
        if (queue.lastRevision !== undefined) patch.expectedRevision = queue.lastRevision;
        const mutationId = globalThis.crypto?.randomUUID?.() || `save_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        try {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
              saved = await write(queue.type, queue.id, { ...patch, mutationId }, queue.assignedTo);
              if (typeof saved?.updatedAt === "string") queue.lastVersion = saved.updatedAt;
              if (Number.isInteger(saved?.revision)) queue.lastRevision = saved.revision;
              break;
            } catch (error) {
              if (error.status === 400 || error.status === 403 || error.status === 404 || error.status === 409 || attempt === 2) throw error;
              await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
            }
          }
        } catch (error) {
          queue.pending = { ...patch, ...queue.pending };
          throw error;
        }
      }
      status(queue, "saved");
      queue.lastError = null;
      queue.waiters.splice(0).forEach(({ resolve }) => resolve(saved));
    } catch (error) {
      queue.lastError = error;
      status(queue, "failed");
      queue.waiters.splice(0).forEach(({ reject }) => reject(error));
    } finally {
      queue.running = false;
    }
  }
  function save(type, id, patch, assignedTo = "", immediate = false) {
    const queue = queueFor(type, id, assignedTo);
    queue.assignedTo = assignedTo || queue.assignedTo;
    if (typeof patch.expectedUpdatedAt === "string" && patch.expectedUpdatedAt > (queue.lastVersion || "")) queue.lastVersion = patch.expectedUpdatedAt;
    if (Number.isInteger(patch.expectedRevision) && patch.expectedRevision > (queue.lastRevision ?? -1)) queue.lastRevision = patch.expectedRevision;
    queue.pending = { ...queue.pending, ...patch };
    clearTimeout(queue.timer);
    queue.timer = null;
    if (globalThis.navigator?.onLine === false) {
      status(queue, "offline");
      return Promise.reject(new Error("You are offline. Changes are waiting to be saved."));
    }
    status(queue, "saving");
    const promise = new Promise((resolve, reject) => queue.waiters.push({ resolve, reject }));
    queue.timer = setTimeout(() => { void flushQueue(queue); }, immediate ? 0 : delay);
    return promise;
  }
  async function flush(type, id) {
    const queue = queues.get(keyOf(type, id));
    if (!queue) return;
    if (queue.running) {
      await new Promise((resolve) => {
        const check = () => queue.running ? setTimeout(check, 25) : resolve();
        check();
      });
    }
    await flushQueue(queue);
    if (Object.keys(queue.pending).length) throw queue.lastError || new Error("You are offline. Changes have not been saved yet.");
  }
  function flushAll() { queues.forEach((queue) => { if (Object.keys(queue.pending).length) void flushQueue(queue); }); }
  function hasPending() { return [...queues.values()].some((queue) => queue.running || Object.keys(queue.pending).length); }
  function clear() {
    queues.forEach((queue) => {
      clearTimeout(queue.timer);
      queue.pending = {};
      queue.waiters.splice(0).forEach(({ reject }) => reject(new Error("Session ended before the change was saved.")));
    });
    queues.clear();
  }
  return { save, flush, flushAll, hasPending, clear };
}

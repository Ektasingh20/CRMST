import { useCallback, useSyncExternalStore } from 'react';
import { createSampleBugs } from './bugData.js';
import { createClarifications } from './clarificationData.js';

const stores = new Map();
function getStore(kind, person) {
  const key = `crmst-it-${kind}-v1:${person}`;
  if (!stores.has(key)) {
    let records;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(saved) && saved.every(item => item.id && item.project && item.assignedTo && item.status && Array.isArray(item.activity) && Array.isArray(item.attachments) && (kind === 'bugs' ? item.title && item.date && item.reportedBy && Array.isArray(item.comments) : item.subject && item.at && item.askedBy && Array.isArray(item.replies)))) records = saved;
    } catch {}
    stores.set(key, { key, snapshot: { records: records || (kind === 'bugs' ? createSampleBugs() : createClarifications()), error: '' }, listeners: new Set() });
  }
  return stores.get(key);
}
// A shared frontend store keeps home-page totals and detail pages in sync,
// including when browser storage is unavailable or full.
export function useSupportRecords(kind, person) {
  const store = getStore(kind, person);
  const subscribe = useCallback(listener => { store.listeners.add(listener); return () => store.listeners.delete(listener); }, [store]);
  const getSnapshot = useCallback(() => store.snapshot, [store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setRecords = useCallback(updater => {
    const records = typeof updater === 'function' ? updater(store.snapshot.records) : updater;
    let error = '';
    try { localStorage.setItem(store.key, JSON.stringify(records)); }
    catch { error = 'Browser storage is unavailable or full. Changes remain available during this session.'; }
    store.snapshot = { records, error };
    store.listeners.forEach(listener => listener());
  }, [store]);
  return [snapshot.records, setRecords, snapshot.error];
}

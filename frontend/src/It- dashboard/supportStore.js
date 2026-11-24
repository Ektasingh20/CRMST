import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { fetchITSupportRecords, fetchITTeamMembers, fetchITSupportRecord, createITSupportRecord, updateITSupportRecord, addITSupportMessage, updateITClarificationAction } from '../../backendApi.js';

const stores = new Map();
let membersRequest;
let membersCache;
let membersCacheUntil = 0;
const MEMBERS_CACHE_MS = 60_000;
const storesByKey = key => {
  if (!stores.has(key)) stores.set(key, { records: [], error: '', loaded: false, loading: false, snapshot: { records: [], error: '', loaded: false }, listeners: new Set() });
  return stores.get(key);
};
function publish(store, records = store.records, error = store.error) {
  store.records = records; store.error = error;
  store.snapshot = { records, error, loaded: store.loaded };
  store.listeners.forEach(listener => listener());
}
async function getMembers() {
  if (membersCache && membersCacheUntil > Date.now()) return membersCache;
  membersRequest ||= fetchITTeamMembers().then(rows => {
    membersCache = Array.isArray(rows) ? rows : rows?.items || [];
    membersCacheUntil = Date.now() + MEMBERS_CACHE_MS;
    return membersCache;
  }).finally(() => { membersRequest = null; });
  return membersRequest;
}
export const fetchSupportMembers = getMembers;
function namesFor(records, kind, projects, members) {
  const projectById = new Map(projects.map(project => [String(project.id), project.name || project.projectName || project.id]));
  const memberById = new Map(members.map(member => [String(member.id), member.name || member.username || member.id]));
  return records.map(record => ({
    ...record,
    project: projectById.get(String(record.projectId)) || record.projectName || 'Assigned project',
    assignedTo: memberById.get(String(record.assignedTo)) || record.assignedTo || '',
    reportedBy: memberById.get(String(record.reportedBy)) || record.reportedBy || '',
    askedBy: memberById.get(String(record.askedBy)) || record.askedBy || '',
    date: String(record.date || record.at || '').slice(0, 10),
    attachments: [], comments: [], replies: [], activity: [],
    _projectId: record.projectId,
    _assignedToId: record.assignedTo,
  }));
}
export async function createSupportRecord(kind, values, projects) {
  const [members] = await Promise.all([getMembers()]);
  const project = projects.find(item => (item.name || item.projectName) === values.project);
  const member = members.find(item => item.name === values.assignedTo || item.id === values.assignedTo);
  if (!project?.id) throw new Error('Choose a project assigned to your IT workspace.');
  if (!member?.id) throw new Error('The selected assignee is not an active IT workspace member.');
  const body = kind === 'bugs'
    ? { title: values.title, projectId: project.id, priority: values.priority, assignedTo: member.id, description: values.description, steps: values.steps || '', expected: values.expected || '', actual: values.actual || '' }
    : { subject: values.subject, question: values.question, projectId: project.id, priority: values.priority, assignedTo: member.id };
  const saved = await createITSupportRecord(kind, body);
  return { ...values, ...saved, project: values.project, assignedTo: member.name, _projectId: project.id, _assignedToId: member.id, reportedBy: kind === 'bugs' ? (members.find(row => String(row.id) === String(saved.reportedBy))?.name || values.reportedBy || '') : '', askedBy: kind === 'clarifications' ? (members.find(row => String(row.id) === String(saved.askedBy))?.name || values.askedBy || '') : '', date: String(saved.date || saved.at || '').slice(0, 10), attachments: [], comments: [], replies: [], activity: [] };
}
export async function patchSupportRecord(kind, item, changes) {
  const body = { ...changes };
  if (body.assignedTo) {
    const members = await getMembers();
    const member = members.find(row => row.name === body.assignedTo || row.id === body.assignedTo);
    if (!member) throw new Error('The selected assignee is not an active IT workspace member.');
    body.assignedTo = member.id;
  }
  const updated = await updateITSupportRecord(kind, item.id, body);
  const members = await getMembers();
  const assignee = members.find(row => String(row.id) === String(updated.assignedTo));
  return { ...item, ...updated, assignedTo: assignee?.name || item.assignedTo, _assignedToId: updated.assignedTo };
}
export async function postSupportMessage(kind, item, text) {
  const result = await addITSupportMessage(kind, item.id, text);
  const members = await getMembers();
  return { ...result, author: members.find(row => String(row.id) === String(result.authorId))?.name || '' };
}
export async function performClarificationAction(item, type, text) {
  const status = { send: 'Waiting for Reply', answer: 'Answered', close: 'Closed' }[type];
  if (!status) throw new Error('Unsupported clarification action.');
  const updated = await updateITSupportRecord('clarifications', item.id, { status });
  return { ...item, ...updated };
}
export function useSupportRecords(kind, person, projects = []) {
  const key = `crmst-it-${kind}-api-v1:${person}`;
  const store = storesByKey(key);
  const subscribe = useCallback(listener => { store.listeners.add(listener); return () => store.listeners.delete(listener); }, [store]);
  const getSnapshot = useCallback(() => store.snapshot, [store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (store.loaded || store.loading) return;
    store.loading = true;
    Promise.all([fetchITSupportRecords(kind), getMembers()]).then(([records, members]) => {
      store.loaded = true; publish(store, namesFor(records, kind, projects, members), '');
    }).catch(error => publish(store, [], error.message || `Could not load ${kind}.`))
      .finally(() => { store.loading = false; store.listeners.forEach(listener => listener()); });
  }, [kind, projects, store]);
  const setRecords = useCallback(updater => {
    const records = typeof updater === 'function' ? updater(store.records) : updater;
    publish(store, records);
  }, [store]);
  return [snapshot.records, setRecords, snapshot.error, snapshot.loaded];
}
export async function loadSupportDetails(kind, item, members) {
  const detail = await fetchITSupportRecord(kind, item.id);
  const nameById = new Map(members.map(member => [String(member.id), member.name || member.id]));
  const mapped = rows => (rows || []).map(row => ({ ...row, author: nameById.get(String(row.authorId)) || row.authorId || '' }));
  return { ...(kind === 'bugs' ? { comments: mapped(detail.comments) } : { replies: mapped(detail.replies) }), activity: mapped(detail.activity), attachments: detail.attachments || [] };
}

import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { validatePdf, employeeKey, storedProject, projectResponse } from '../utils/projectData.js';

const records = new Map();
const doc = path => ({
  id: path.split('/').at(-1), path,
  collection: name => collection(`${path}/${name}`),
  get: async () => ({ exists: records.has(path), data: () => records.get(path) }),
  listCollections: async () => [...new Set([...records.keys()].filter(key => key.startsWith(`${path}/`)).map(key => key.slice(path.length + 1).split('/')[0]))].map(name => collection(`${path}/${name}`)),
});
function collection(path, filter) {
  return {
    id: path.split('/').at(-1),
    doc: name => doc(`${path}/${name}`),
    where: (field, op, value) => collection(path, data => data[field] === value),
    limit() { return this; },
    get: async () => ({ docs: [...records].filter(([key, data]) => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1 && (!filter || filter(data))).map(([key, data]) => ({ ref: doc(key), data: () => data })) }),
  };
}
const db = {
  collection,
  batch: () => { const writes = []; return { set: (ref, data) => writes.push([ref.path, data]), create: (ref, data) => writes.push([ref.path, data]), commit: async () => writes.forEach(([path, data]) => records.set(path, data)) }; },
  runTransaction: async callback => callback({ get: ref => ref.get(), set: (ref, data) => records.set(ref.path, data) }),
};
const employee = { id: 'it_01', name: 'Same Name', dept: 'IT', role: 'Full Stack Developer' };
mock.module('firebase-admin/firestore', { namedExports: { getFirestore: () => db } });
mock.module('../models/User.js', { defaultExport: { findOne: async query => query.id === employee.id ? employee : null } });
mock.module('../middleware/auth.js', { namedExports: { authenticate: (req, res, next) => next() } });
const { default: router } = await import('../routes/projects.js');
const admin = { id: 'admin_01', role: 'Admin' };
async function invoke(method, path, user, body = {}, params = {}) {
  const layer = router.stack.find(item => item.route?.path === path && item.route.methods[method]);
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await layer.route.stack[0].handle({ user, body, params }, response);
  return response;
}

test('PDF validation rejects renamed images, oversized files and non-PDF data', () => {
  for (const body of [ { name: 'a.pdf', dataUrl: 'data:application/pdf;base64,aGVsbG8=' }, { name: 'a.png', dataUrl: 'data:image/png;base64,AAAA' }, { name: 'a.pdf', dataUrl: `data:application/pdf;base64,${Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64')}` } ]) assert.throws(() => validatePdf(body));
  assert.notEqual(employeeKey(employee), employeeKey({ ...employee, id: 'it_02' }));
});

test('Admin uploads PDF to ImageKit, stores only verified URLs, and IT can list and accept its project', async () => {
  process.env.IMAGEKIT_PRIVATE_KEY = 'test-only-key';
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://upload.imagekit.io/api/v1/files/upload');
    assert.equal(options.body.get('file').type, 'application/pdf');
    return { ok: true, json: async () => ({ url: 'https://ik.imagekit.io/test/brief.pdf', fileId: 'pdf-1' }) };
  });
  try {
    const upload = await invoke('post', '/pdf', admin, { name: 'brief.pdf', dataUrl: `data:application/pdf;base64,${Buffer.from('%PDF-1.4\n%%EOF').toString('base64')}` });
    assert.equal(upload.code, 200);
    assert.equal(records.size, 0);
    const body = { projectName: 'Customer Portal', client: 'Client', assignedEmployeeId: employee.id, startDate: '2026-09-29', expectedDelivery: '2026-10-30', priority: 'Medium', documents: [upload.body], description: 'Brief', requiredFeatures: 'Features', pagesModules: 'Pages', technologyRequirements: 'React', designRequirements: 'Existing theme', referenceWebsites: 'https://example.com', specialInstructions: 'Instructions' };
    assert.equal((await invoke('post', '/', employee, body)).code, 403);
    assert.equal((await invoke('post', '/', admin, { ...body, assignedEmployeeId: 'missing' })).code, 400);
    assert.equal((await invoke('post', '/', admin, { ...body, documents: [{ url: 'https://evil.example/file.pdf' }] })).code, 400);
    const created = await invoke('post', '/', admin, body);
    assert.equal(created.code, 201);
    assert.equal(created.body.status, 'New');
    const saved = created.body;
    const path = `Project/${saved.employeeKey}/${saved.id}/Project Data`;
    assert.ok(records.has(path));
    for (const key of ['id', 'projectId', 'employeeKey', 'assignedEmployeeId', 'assignedEmployeeName', 'createdById', 'service', 'scopeFiles', 'clientBudget']) assert.equal(key in records.get(path), false, key);
    assert.equal(records.get(path).startDate, body.startDate);
    assert.equal(records.get(path).expectedDelivery, body.expectedDelivery);
    assert.equal(saved.documents[0].url, 'https://ik.imagekit.io/test/brief.pdf');
    assert.equal('receipt' in saved.documents[0], false);
    assert.equal(JSON.stringify(saved).includes('base64'), false);
    assert.equal((await invoke('get', '/', employee)).body.length, 1);
    const stranger = { ...employee, id: 'it_02' };
    assert.equal((await invoke('get', '/', stranger)).body.length, 0);
    const params = { employeeKey: saved.employeeKey, id: saved.id };
    assert.equal((await invoke('patch', '/:employeeKey/:id', stranger, { action: 'accept' }, params)).code, 400);
    assert.equal(records.get(path).status, 'New');
    assert.equal((await invoke('patch', '/:employeeKey/:id', employee, { action: 'accept' }, params)).body.status, 'Active');
    assert.equal((await invoke('get', '/', employee)).body[0].status, 'Active');
    assert.equal((await invoke('patch', '/:employeeKey/:id', employee, { update: { status: 'Completed', remarks: 'Delivered', completionDate: '2026-09-29', allTasksCompleted: true, files: [] } }, params)).body.status, 'Completed');
    assert.equal((await invoke('get', '/', admin)).body[0].status, 'Completed');
    const wrongOwner = await invoke('post', '/pdf', stranger, { name: 'brief.pdf', dataUrl: `data:application/pdf;base64,${Buffer.from('%PDF-1.4\n%%EOF').toString('base64')}` });
    assert.equal((await invoke('post', '/', admin, { ...body, documents: [wrongOwner.body] })).code, 400);
  } finally { fetchMock.mock.restore(); delete process.env.IMAGEKIT_PRIVATE_KEY; records.clear(); }
});


test('compact storage removes empty containers and derives completed fields without losing history or dates', () => {
  const source = { id: 'PRJ-1', projectId: 'PRJ-1', employeeKey: 'Employee--it_01', assignedEmployeeId: 'it_01', assignedEmployeeName: 'Employee', createdById: 'admin', status: 'Completed', executionStatus: 'Completed', progress: 100, allTasksCompleted: true, statusRemarks: 'Delivered', completionRemarks: 'Delivered', completionDate: '2026-09-30', startDate: '2026-09-29', expectedDelivery: '2026-09-30', description: '', scopeFiles: { description: [], designRequirements: [{ name: 'design.pdf', url: 'https://ik.imagekit.io/test/design.pdf' }] }, statusHistory: [{ id: 'entry', progress: 0, allTasksCompleted: false, files: [], completionDate: null }] };
  const stored = storedProject(source);
  assert.equal(stored.executionStatus, undefined);
  assert.equal(stored.completionRemarks, undefined);
  assert.equal(stored.progress, undefined);
  assert.equal(stored.description, undefined);
  assert.equal(stored.scopeFiles.description, undefined);
  assert.equal(stored.scopeFiles.designRequirements[0].name, 'design.pdf');
  assert.equal(stored.statusHistory[0].progress, 0);
  assert.equal(stored.statusHistory[0].allTasksCompleted, false);
  assert.equal(stored.completionDate, source.completionDate);
  const response = projectResponse(stored, { assignedEmployeeId: 'it_01', assignedEmployeeName: 'Employee' }, 'Employee--it_01', 'PRJ-1');
  assert.equal(response.id, source.id);
  assert.equal(response.progress, 100);
  assert.equal(response.completionRemarks, 'Delivered');
  assert.equal(source.description, '');
});

test('project API rejects team-only and unchecked custom assignees', async () => {
  const original = { ...employee };
  try {
    for (const role of ['Junior Developer', 'Intern', 'QA Engineer']) {
      employee.role = role;
      employee.canAssignProjects = false;
      const result = await invoke('post', '/', admin, { assignedEmployeeId: employee.id });
      assert.equal(result.code, 400);
      assert.match(result.body.error, /not eligible/);
    }
  } finally { delete employee.canAssignProjects; Object.assign(employee, original); }
});

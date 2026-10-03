import express from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getFirestore } from 'firebase-admin/firestore';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import { isAdmin } from '../utils/roles.js';
import { canReceiveProject } from '../../frontend/src/itUserRoles.js';
import { employeeKey, isIT, storedProject, projectResponse, projectFields, scopeKeys, userId, validatePdf } from '../utils/projectData.js';
import { applyProjectStatus } from '../../frontend/src/It- dashboard/projectStatus.js';

const router = express.Router();
router.use(authenticate);
router.use((req, res, next) => isAdmin(req.user) || isIT(req.user) ? next() : res.status(403).json({ error: 'Admin or IT access required.' }));
const root = () => getFirestore().collection('Project');
const receiptSecret = () => process.env.IMAGEKIT_PRIVATE_KEY;
function filesFromReceipts(files, user) {
  if (!Array.isArray(files) || files.length > 30) throw new Error('Invalid PDF attachments.');
  return files.map(file => {
    const receipt = jwt.verify(file.receipt, receiptSecret(), { algorithms: ['HS256'], audience: 'project-pdf' });
    if (receipt.owner !== userId(user)) throw new Error('Invalid PDF owner.');
    return receipt.file;
  });
}

router.post('/pdf', async (req, res) => {
  try {
    const bytes = validatePdf(req.body);
    if (!receiptSecret()) return res.status(503).json({ error: 'ImageKit is not configured.' });
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'application/pdf' }), req.body.name);
    form.append('fileName', req.body.name);
    form.append('folder', '/projects');
    form.append('useUniqueFileName', 'true');
    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${receiptSecret()}:`).toString('base64')}` }, body: form, signal: AbortSignal.timeout(60000) });
    const result = await response.json();
    if (!response.ok || !result.url || !result.fileId) return res.status(502).json({ error: 'PDF upload failed. Please try again.' });
    const file = { name: req.body.name, type: 'application/pdf', size: bytes.length, url: result.url, fileId: result.fileId };
    res.json({ ...file, receipt: jwt.sign({ owner: userId(req.user), file }, receiptSecret(), { audience: 'project-pdf', expiresIn: '24h' }) });
  } catch (error) { res.status(400).json({ error: error.message || 'Unable to upload PDF.' }); }
});

router.get('/', async (req, res) => {
  try {
    const employees = await (isAdmin(req.user) ? root() : root().where('assignedEmployeeId', '==', userId(req.user))).get();
    const groups = await Promise.all(employees.docs.map(async employee => {
      const collections = await employee.ref.listCollections();
      return Promise.all(collections.map(async collection => {
        const snapshot = await collection.doc('Project Data').get();
        return snapshot.exists ? projectResponse(snapshot.data(), employee.data(), employee.ref.id, collection.id) : null;
      }));
    }));
    res.json(groups.flat().filter(Boolean).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
  } catch { res.status(500).json({ error: 'Unable to load projects.' }); }
});

router.post('/', async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Only Admin can create projects.' });
  try {
    const employee = await User.findOne({ id: String(req.body.assignedEmployeeId || '') }) || await User.findOne({ _id: String(req.body.assignedEmployeeId || '') });
    if (!employee || !isIT(employee)) return res.status(400).json({ error: 'Choose an existing IT employee.' });
    if (!canReceiveProject(employee)) return res.status(400).json({ error: 'This IT employee is not eligible for direct project assignment.' });
    const documents = filesFromReceipts(req.body.documents || [], req.user);
    const scopeFiles = Object.fromEntries(scopeKeys.map(key => [key, filesFromReceipts(req.body.scopeFiles?.[key] || [], req.user)]));
    const fields = projectFields(req.body, documents, scopeFiles);
    const projectId = `PRJ-${new Date().getFullYear()}-${crypto.randomUUID()}`;
    // Reuse the employee's existing folder even when their display name changes.
    const existing = await root().where('assignedEmployeeId', '==', userId(employee)).limit(1).get();
    const employeeRef = existing.docs[0]?.ref || root().doc(employeeKey(employee));
    const now = new Date().toISOString();
    const project = { ...fields, id: projectId, projectId, employeeKey: employeeRef.id, assignedEmployeeId: userId(employee), assignedEmployeeName: employee.name || employee.username, documents, scopeFiles, status: 'New', createdById: userId(req.user), createdAt: now, updatedAt: now };
    const batch = getFirestore().batch();
    batch.set(employeeRef, { assignedEmployeeId: userId(employee), assignedEmployeeName: project.assignedEmployeeName }, { merge: true });
    batch.create(employeeRef.collection(projectId).doc('Project Data'), storedProject(project));
    await batch.commit();
    res.status(201).json(project);
  } catch (error) { res.status(400).json({ error: error.message || 'Unable to save project.' }); }
});

router.patch('/:employeeKey/:id', async (req, res) => {
  try {
    if ([req.params.employeeKey, req.params.id].some(value => !value || value.includes('/'))) throw new Error('Invalid project path.');
    const ref = root().doc(req.params.employeeKey).collection(req.params.id).doc('Project Data');
    const saved = await getFirestore().runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('Project not found.');
      const employee = await transaction.get(root().doc(req.params.employeeKey));
      if (!employee.exists) throw new Error('Employee assignment not found.');
      const project = projectResponse(snapshot.data(), employee.data(), req.params.employeeKey, req.params.id);
      if (!isAdmin(req.user) && project.assignedEmployeeId !== userId(req.user)) throw new Error('This project is assigned to another employee.');
      let next;
      if (req.body.action === 'accept' || req.body.action === 'reject') {
        if (project.status !== 'New') throw new Error('This project has already been reviewed.');
        next = { ...project, status: req.body.action === 'accept' ? 'Active' : 'Rejected' };
      } else {
        const update = req.body.update || {};
        if (!['Active', 'Completed'].includes(project.status)) throw new Error('Accept the project before updating progress.');
        next = applyProjectStatus(project, { status: update.status, progress: update.progress, remarks: String(update.remarks || '').slice(0, 5000), completionDate: update.completionDate || '', allTasksCompleted: update.allTasksCompleted === true, files: filesFromReceipts(update.files || [], req.user) });
      }
      next.updatedAt = new Date().toISOString();
      transaction.set(ref, storedProject(next));
      return next;
    });
    res.json(saved);
  } catch (error) { res.status(400).json({ error: error.message || 'Unable to update project.' }); }
});
export default router;

import test from 'node:test';
import assert from 'node:assert/strict';
import { getUploadedProjectFiles } from './projectFiles.js';

test('preserves all six attachments, including repeated filenames', () => {
  const documents = Array.from({ length: 6 }, (_, i) => ({ name: 'brief.pdf', dataUrl: `data:application/pdf;base64,${i}` }));
  const files = getUploadedProjectFiles({ documents });
  assert.equal(files.length, 6);
  assert.equal(new Set(files.map((file) => file.id)).size, 6);
  assert.deepEqual(files.map((file) => file.dataUrl), documents.map((file) => file.dataUrl));
});

test('includes scope attachments and keeps their requirement labels', () => {
  const files = getUploadedProjectFiles({ documents: ['legacy.pdf'], scopeFiles: {
    description: [{ name: 'brief.pdf' }], requiredFeatures: { name: 'brief.pdf' },
  } });
  assert.equal(files.length, 3);
  assert.equal(files[1].category, 'Project description');
  assert.equal(files[2].category, 'Required features');
  assert.equal(new Set(files.map((file) => file.id)).size, 3);
});

test('handles projects without uploaded files', () => {
  assert.deepEqual(getUploadedProjectFiles({}), []);
  assert.deepEqual(getUploadedProjectFiles({ documents: [null], scopeFiles: { description: null } }), []);
});

import { withMonuSampleDocuments } from './monuSampleDocuments.js';
import { existsSync } from 'node:fs';

test('Monu demo supplies six real PDF assets without changing the saved record', () => {
  const original = { name: 'monu crane service', documents: ['legacy.pdf'], description: 'Custom description' };
  const demo = withMonuSampleDocuments(original);
  const files = getUploadedProjectFiles(demo);
  assert.equal(files.length, 6);
  assert.equal(demo.description, 'Custom description');
  assert.deepEqual(original.documents, ['legacy.pdf']);
  assert.ok(files.every((file) => file.sample && existsSync(`frontend/public${file.dataUrl}`)));
});

test('sample documents never replace real uploads or affect other projects', () => {
  const real = { name: 'monu crane service', documents: [{ name: 'actual.pdf', dataUrl: 'data:application/pdf;base64,AA' }] };
  assert.equal(withMonuSampleDocuments(real), real);
  const other = { name: 'Other project' };
  assert.equal(withMonuSampleDocuments(other), other);
});

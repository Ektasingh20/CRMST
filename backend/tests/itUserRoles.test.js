import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmployment } from '../utils/itUserRoles.js';
import { canReceiveProject } from '../../frontend/src/itUserRoles.js';
test('IT role defaults, custom opt-in, and team-only roles are enforced', () => {
  for (const role of ['Full Stack Developer', 'Software Developer', 'Junior Developer', 'Intern', 'QA Engineer']) {
    const expected = ['Full Stack Developer', 'Software Developer'].includes(role);
    const user = { dept: 'IT', ...normalizeEmployment({ dept: 'IT', role }) };
    assert.equal(canReceiveProject(user), expected);
  }
  assert.equal(canReceiveProject({ dept: 'IT', ...normalizeEmployment({ dept: 'IT', role: 'QA Engineer', canAssignProjects: true }) }), true);
  for (const role of ['Junior Developer', 'Intern']) assert.equal(canReceiveProject({ dept: 'IT', role, canAssignProjects: true }), false);
  assert.equal(canReceiveProject({ dept: 'IT', role: 'Full Stack Developer', status: 'Inactive' }), false);
  assert.equal(canReceiveProject({ dept: 'CRM', role: 'Full Stack Developer', canAssignProjects: true }), false);
  assert.throws(() => normalizeEmployment({ dept: 'IT', role: 'Admin' }));
  assert.throws(() => normalizeEmployment({ dept: 'IT', role: 'QA', canAssignProjects: 'false' }));
  assert.throws(() => normalizeEmployment({ dept: 'IT', role: ' ' }));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWorkload, workloadColor, withWorkloads } from './workload.js';
import { assignTeam, createTeamState } from './teamData.js';
const member = { id: 'ekta', name: 'Ekta Singh' };
const bug = (priority, status = 'Open', assignedTo = member.name) => ({ priority, status, assignedTo });
const project = (priority, team = ['ekta'], status = 'Active') => ({ priority, status, team: team.map(memberId => ({ memberId })) });
test('counts only open/in-progress bugs belonging to the member', () => {
  const result = calculateWorkload(member, [bug('Low'), bug('Medium'), bug('High', 'In Progress'), bug('Critical'), bug('Critical', 'Resolved'), bug('Critical', 'Open', 'Someone else')]);
  assert.equal(result.bugPoints, 11);
  assert.ok(Math.abs(result.workload - 55) < 1e-9);
  assert.equal(result.openBugs.length, 4);
});
test('splits active project points across members and excludes inactive projects', () => {
  const result = calculateWorkload(member, [], [project('Low'), project('Medium', ['ekta', 'priya']), project('High', ['ekta', 'priya', 'rahul']), project('Critical', ['ekta', 'priya']), project('Critical', ['ekta'], 'Completed'), project('Critical', [], 'Active'), project('High', ['priya']), project('High', ['ekta'], 'New')]);
  assert.equal(result.projectPoints, 10);
  assert.equal(result.workload, 50);
  assert.equal(calculateWorkload(member, [], [project('Urgent')]).projectPoints, 8);
});
test('availability and bar boundaries use the requested distinct thresholds', () => {
  const bugs = [bug('Critical'), bug('Critical'), bug('Critical'), bug('Medium')];
  assert.equal(calculateWorkload(member, bugs).workload, 85);
  assert.equal(calculateWorkload(member, bugs).availability, 'Busy');
  assert.equal(calculateWorkload({ ...member, onLeave: true }, bugs).availability, 'On Leave');
  assert.equal(calculateWorkload(member).availability, 'Available');
  for (const [value, expected] of [[59.9, 'green'], [60, 'amber'], [85, 'amber'], [85.1, 'red'], [125, 'red']]) assert.equal(workloadColor(value), expected);
  assert.equal(calculateWorkload(member, Array.from({ length: 5 }, () => bug('Critical'))).workload, 125);
});
test('saved assignment redistributes workload for both existing and added members', () => {
  const state = createTeamState();
  const before = withWorkloads(state);
  const original = state.projects[0];
  const updated = assignTeam(state, original.id, { ...original, team: [...original.team, { memberId: 'neha', role: 'Developer' }] });
  const after = withWorkloads(updated);
  assert.equal(after.members[0].projectPoints - before.members[0].projectPoints, -0.5);
  assert.ok(Math.abs(after.members[4].projectPoints - before.members[4].projectPoints - 1.5) < 1e-9);
  assert.equal(state.projects[0].team.length, 3);
  assert.ok(state.members.every(item => !('workload' in item) && !('availability' in item)));
});

test('demo assignments cover every Team Overview workload and availability condition', () => {
  const state = withWorkloads(createTeamState());
  const byId = Object.fromEntries(state.members.map(member => [member.id, member]));
  assert.equal(byId.vikram.workload, 0);
  assert.equal(byId.vikram.availability, 'Available');
  assert.ok(byId.aman.workload > 0 && byId.aman.workload < 60);
  assert.equal(byId.aman.color, 'green');
  assert.equal(byId.neha.workload, 60);
  assert.equal(byId.neha.color, 'amber');
  assert.equal(byId.neha.availability, 'Available');
  assert.ok(byId.priya.workload > 60 && byId.priya.workload < 85);
  assert.equal(byId.sana.workload, 85);
  assert.equal(byId.sana.color, 'amber');
  assert.equal(byId.sana.availability, 'Busy');
  assert.ok(byId.ekta.workload > 100);
  assert.equal(byId.ekta.color, 'red');
  assert.equal(byId.ekta.availability, 'Busy');
  assert.equal(byId.arjun.workload, 85);
  assert.equal(byId.arjun.availability, 'On Leave');
  assert.deepEqual(new Set(state.members.map(member => member.role)), new Set(['Developer', 'Designer', 'Lead', 'Tester']));
});

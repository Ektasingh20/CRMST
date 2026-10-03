import test from 'node:test';
import assert from 'node:assert/strict';
import { assignTeam, createTeamState, memberStats, teamSummary, dateLabel, dashboardProjects, projectProgress } from './teamData.js';
test('assignments update member project lists without mutating the original data', () => {
  const state = createTeamState();
  const updated = assignTeam(state, 'team-p3', { team: [{ memberId: 'neha', role: 'Lead' }], startDate: '2026-09-25', dueDate: '2026-09-30', priority: 'High', notes: ' Coordinate delivery. ' });
  assert.equal(state.projects[2].team.length, 0);
  assert.equal(updated.projects[2].notes, 'Coordinate delivery.');
  assert.ok(memberStats(updated, updated.members[4]).projects.some(project => project.id === 'team-p3'));
  assert.deepEqual(updated.tasks, state.tasks);
});
test('assignment rejects missing members, due dates, invalid roles and reversed dates', () => {
  const state = createTeamState();
  const valid = { team: [{ memberId: 'ekta', role: 'Developer' }], startDate: '2026-09-25', dueDate: '2026-09-30', priority: 'Medium', notes: '' };
  for (const changes of [{ team: [] }, { dueDate: '' }, { dueDate: '2026-09-20' }, { team: [{ memberId: 'unknown', role: 'Lead' }] }, { team: [{ memberId: 'ekta', role: 'Other' }] }]) assert.throws(() => assignTeam(state, 'team-p1', { ...valid, ...changes }));
});
test('summaries use the fixed demo date, open tasks and Monday week boundary', () => {
  const state = createTeamState();
  assert.deepEqual(teamSummary(state), [8, 17, 2, 17]);
  assert.equal(memberStats(state, state.members[0]).status, 'Delayed');
  assert.equal(memberStats({ ...state, bugs: Array.from({ length: 4 }, () => ({ assignedTo: 'Priya Mehta', status: 'Open', priority: 'Critical' })) }, state.members[1]).status, 'At Risk');
  assert.equal(dateLabel('2026-09-25'), '25 Sept 2026');
});

test('mock tasks belong to projects assigned to their members', () => {
  const state = createTeamState();
  for (const task of state.tasks) assert.ok(state.projects.find(project => project.id === task.projectId).team.some(item => item.memberId === task.memberId));
});

test('dashboard and team pages share project IDs, tasks, bugs, teams and progress', () => {
  const state = createTeamState();
  const dashboard = dashboardProjects(state);
  assert.deepEqual(dashboard.map(project => project.id), state.projects.map(project => project.id));
  for (const project of dashboard) {
    assert.deepEqual(project.team, state.projects.find(item => item.id === project.id).team);
    assert.equal(project.tasks.length, state.tasks.filter(task => task.projectId === project.id).length);
    const expected = project.tasks.length ? Math.round(project.tasks.filter(task => task.status === 'Done').length / project.tasks.length * 100) : 0;
    assert.equal(projectProgress(state, project.id), expected);
  }
  for (const bug of state.bugs) assert.ok(dashboard.some(project => project.name === bug.project));
});
test('removing a member leaves their project tasks unassigned without deleting work', () => {
  const state = createTeamState();
  const project = state.projects[0];
  const next = assignTeam(state, project.id, { ...project, team: project.team.filter(item => item.memberId !== 'ekta') });
  assert.equal(next.tasks.length, state.tasks.length);
  assert.ok(next.tasks.filter(task => task.projectId === project.id).every(task => task.memberId !== 'ekta'));
  assert.ok(state.tasks.some(task => task.projectId === project.id && task.memberId === 'ekta'));
});

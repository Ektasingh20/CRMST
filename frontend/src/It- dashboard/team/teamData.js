import { calculateWorkload } from './workload.js';
import { createSampleBugs } from '../bugData.js';
// One frontend demo workspace is shared by all IT project and team pages.
export const TEAM_DEMO_MODE = import.meta.env.VITE_IT_DASHBOARD_DEMO_MODE === 'true';
export const MOCK_TODAY = '2026-09-29';
export const TEAM_ROLES = ['Lead', 'Developer', 'Tester', 'Designer'];
import { members } from './teamMembers.js';
export { members };
export const projects = [
  { id: 'team-p1', name: 'Customer Support Workspace', client: 'System Technologies', priority: 'High', startDate: '2026-09-15', dueDate: '2026-09-30', status: 'In Progress', notes: 'Prepare the support team handover.', team: [{ memberId: 'ekta', role: 'Developer' }, { memberId: 'rahul', role: 'Lead' }, { memberId: 'aman', role: 'Tester' }] },
  { id: 'team-p2', name: 'Learning Analytics Dashboard', client: 'Learning Labs', priority: 'High', startDate: '2026-09-20', dueDate: '2026-10-05', status: 'In Progress', notes: '', team: [{ memberId: 'priya', role: 'Designer' }, { memberId: 'neha', role: 'Developer' }, { memberId: 'sana', role: 'Tester' }] },
  { id: 'team-p3', name: 'Employee Self Service Portal', client: 'Ajmer Operations', priority: 'Urgent', startDate: '2026-09-18', dueDate: '2026-09-25', status: 'Open', notes: '', team: [] },
  { id: 'team-p4', name: 'Client Onboarding Website', client: 'Northstar Studio', priority: 'Low', startDate: '2026-09-10', dueDate: '2026-09-28', status: 'Completed', notes: 'Approved and delivered.', team: [{ memberId: 'arjun', role: 'Developer' }, { memberId: 'priya', role: 'Designer' }] },

  // Real assignment inputs cover workload colors and availability boundaries.
  // Neha: 12 points (60%); Sana: 17 points (85%); Vikram: no assignments (0%).
  ...[
    ['team-p5', 'Payment Gateway Recovery', 'Critical', ['ekta']],
    ['team-p6', 'Production Access Audit', 'Critical', ['ekta']],
    ['team-p7', 'Design System Refresh', 'Medium', ['priya']],
    ['team-p8', 'Reporting API Upgrade', 'High', ['neha']],
    ['team-p9', 'Customer Import Tools', 'Medium', ['neha']],
    ['team-p10', 'Release Regression Suite', 'Critical', ['sana']],
    ['team-p11', 'Checkout Acceptance Testing', 'High', ['sana']],
    ['team-p12', 'Accessibility Handover', 'Low', ['sana', 'arjun']],
    ['team-p13', 'Infrastructure Migration', 'Critical', ['arjun']],
    ['team-p14', 'Backup Recovery Plan', 'Critical', ['arjun']],
  ].map(([id, name, priority, memberIds]) => ({
    id, name, client: 'System Technologies', priority,
    startDate: '2026-09-29', dueDate: '2026-10-15', status: 'In Progress',
    notes: 'Sample assignment for workload planning.',
    team: memberIds.map(memberId => ({ memberId, role: members.find(member => member.id === memberId).role })),
  })),
];
const originalTasks = members.slice(0, 7).flatMap((member, index) => [
  { id: `${member.id}-1`, memberId: member.id, projectId: ['team-p1', 'team-p2', 'team-p1', 'team-p1', 'team-p2', 'team-p4', 'team-p2'][index], title: ['Build ticket detail view', 'Review dashboard layouts', 'Review release checklist', 'Verify support workflows', 'Implement analytics filters', 'Publish onboarding pages', 'Test analytics exports'][index], status: 'Done', dueDate: '2026-09-28', completedAt: index === 0 ? '2026-09-25' : '2026-09-28', updatedAt: '2026-09-28' },
  { id: `${member.id}-2`, memberId: member.id, projectId: ['team-p1', 'team-p2', 'team-p1', 'team-p1', 'team-p2', 'team-p4', 'team-p2'][index], title: ['Resolve ticket assignment bug', 'Finalize empty states', 'Coordinate integration review', 'Retest priority defects', 'Add report export', 'Review handover notes', 'Run regression checks'][index], status: index === 5 ? 'Done' : 'In Progress', dueDate: index === 0 || index === 3 ? '2026-09-25' : '2026-10-02', completedAt: index === 5 ? '2026-09-25' : null, updatedAt: index === 5 ? '2026-09-25' : '2026-09-29' },
]);
export const tasks = [...originalTasks, ...projects.slice(4).flatMap((project, index) => project.team.flatMap(item => [
  { id: `${project.id}-${item.memberId}-plan`, projectId: project.id, memberId: item.memberId, title: `Plan ${project.name}`, status: 'Done', dueDate: MOCK_TODAY, completedAt: MOCK_TODAY, updatedAt: MOCK_TODAY },
  { id: `${project.id}-${item.memberId}-deliver`, projectId: project.id, memberId: item.memberId, title: `Deliver ${project.name}`, status: index % 2 ? 'Open' : 'In Progress', dueDate: project.dueDate, updatedAt: MOCK_TODAY },
]))];
export const bugs = createSampleBugs();
export function dashboardProjects(state) {
  return state.projects.map(project => ({
    ...project, frontendDemo: true, projectName: project.name,
    documents: project.documents?.length ? project.documents : [
      { name: 'Sample Project Brief.pdf', url: '/demo-documents/sample-project-brief.pdf', type: 'application/pdf', sample: true },
      { name: 'Sample QA Checklist.pdf', url: '/demo-documents/sample-qa-checklist.pdf', type: 'application/pdf', sample: true },
    ],
    status: project.status === 'Open' ? 'New' : project.status === 'In Progress' ? 'Active' : project.status,
    due: project.dueDate, expectedDelivery: project.dueDate,
    service: 'Web Application Development', description: project.notes || `Deliver ${project.name} with the assigned team.`,
    assignedEmployeeName: project.team.map(item => state.members.find(member => member.id === item.memberId)?.name).filter(Boolean).join(', ') || 'Unassigned',
    tasks: state.tasks.filter(task => task.projectId === project.id).map(task => ({ ...task, assignedTo: state.members.find(member => member.id === task.memberId)?.name || 'Unassigned' })),
    bugs: state.bugs.filter(bug => bug.project === project.name),
  }));
}
export const createTeamState = () => structuredClone({ members, projects, tasks, bugs });
export function dateLabel(value) {
  if (!value) return 'Not set';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${Number(day)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'][Number(month)-1]} ${year}`;
}
export function memberStats(state, member) {
  const assigned = state.tasks.filter(task => task.memberId === member.id);
  const done = assigned.filter(task => task.status === 'Done').length;
  const overdue = assigned.filter(task => task.status !== 'Done' && task.dueDate < MOCK_TODAY).length;
  return { projects: state.projects.filter(project => project.team.some(item => item.memberId === member.id)), tasks: assigned, done, active: assigned.length - done, overdue, progress: assigned.length ? Math.round(done / assigned.length * 100) : 0, lastUpdate: assigned.map(task => task.updatedAt).sort().at(-1), status: overdue ? 'Delayed' : calculateWorkload(member, state.bugs, state.projects).workload >= 85 ? 'At Risk' : 'On Track' };
}
export function projectProgress(state, id) {
  const project = state.projects.find(item => item.id === id);
  if (project?.status === 'Completed') return 100;
  if (project?.progress != null) return project.progress;
  const assigned = state.tasks.filter(task => task.projectId === id);
  return assigned.length ? Math.round(assigned.filter(task => task.status === 'Done').length / assigned.length * 100) : 0;
}
export function teamSummary(state) {
  return [state.members.length, state.tasks.filter(task => task.status !== 'Done').length, state.tasks.filter(task => task.status !== 'Done' && task.dueDate < MOCK_TODAY).length, state.tasks.filter(task => task.status === 'Done' && task.completedAt >= '2026-09-28' && task.completedAt <= MOCK_TODAY).length];
}
export function assignTeam(state, projectId, values) {
  if (!values.team.length && !values.allowEmpty) throw new Error('Select at least one team member.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.dueDate) || Number.isNaN(Date.parse(values.dueDate))) throw new Error('Choose a due date.');
  if (values.startDate && values.startDate > values.dueDate) throw new Error('Due date must be on or after the start date.');
  if (!['Low','Medium','High','Critical','Urgent'].includes(values.priority)) throw new Error('Choose a priority.');
  if (new Set(values.team.map(item => item.memberId)).size !== values.team.length || values.team.some(item => !state.members.some(member => member.id === item.memberId) || !TEAM_ROLES.includes(item.role) && item.role !== state.members.find(member => member.id === item.memberId)?.role)) throw new Error('Choose valid members and team roles.');
  if (!state.projects.some(project => project.id === projectId)) throw new Error('Project not found.');
  return { ...state, tasks: state.tasks.map(task => task.projectId === projectId && !values.team.some(item => item.memberId === task.memberId) ? { ...task, memberId: null } : task), projects: state.projects.map(project => project.id === projectId ? { ...project, team: values.team.map(item => ({ ...item })), startDate: values.startDate, dueDate: values.dueDate, priority: values.priority, notes: values.notes.trim() } : project) };
}

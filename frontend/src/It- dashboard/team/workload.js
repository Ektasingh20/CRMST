const normalize = value => String(value || '').trim().toLowerCase();
const BUG_POINTS = { low: 1, medium: 2, high: 3, critical: 5 };
const PROJECT_POINTS = { low: 2, medium: 4, high: 6, critical: 8, urgent: 8 };
export const isOpenBug = bug => ['open', 'in progress'].includes(normalize(bug.status));
export const isActiveProject = project => ['active', 'open', 'in progress'].includes(normalize(project.status));
export const workloadColor = value => value < 60 ? 'green' : value <= 85 ? 'amber' : 'red';
export function calculateWorkload(member, bugs = [], projects = []) {
  const openBugs = bugs.filter(bug => isOpenBug(bug) && (bug.memberId === member.id || normalize(bug.assignedTo) === normalize(member.name)));
  const bugPoints = openBugs.reduce((sum, bug) => sum + (BUG_POINTS[normalize(bug.priority)] || 0), 0);
  const projectPoints = projects.reduce((sum, project) => {
    const team = [...new Set((project.team || []).map(item => item.memberId))];
    return isActiveProject(project) && team.includes(member.id)
      ? sum + (PROJECT_POINTS[normalize(project.priority)] || 0) / team.length : sum;
  }, 0);
  const workload = (bugPoints + projectPoints) / 20 * 100;
  return { workload, bugPoints, projectPoints, openBugs, availability: member.onLeave ? 'On Leave' : workload >= 85 ? 'Busy' : 'Available', color: workloadColor(workload) };
}
export function withWorkloads(state) {
  return { ...state, members: state.members.map(member => ({ ...member, ...calculateWorkload(member, state.bugs, state.projects) })) };
}
export const workloadLabel = value => Number(value.toFixed(1));

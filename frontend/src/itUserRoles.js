export const IT_ROLES = ['Full Stack Developer', 'Junior Developer', 'Intern', 'Software Developer'];
const normalize = value => String(value || '').trim().toLowerCase();
export const isITDepartment = user => [user?.dept, user?.department, user?.role].some(value => normalize(value) === 'it');
export function defaultProjectEligibility(role) {
  return ['full stack developer', 'software developer'].includes(normalize(role));
}
export function canReceiveProject(user) {
  if (!isITDepartment(user) || ['inactive', 'disabled'].includes(normalize(user?.status))) return false;
  if (['junior developer', 'intern'].includes(normalize(user?.role))) return false;
  return typeof user?.canAssignProjects === 'boolean' ? user.canAssignProjects : defaultProjectEligibility(user?.role);
}

export function isTeamOnlyITUser(user) {
  return isITDepartment(user)
    && !['inactive', 'disabled'].includes(normalize(user?.status))
    && !canReceiveProject(user)
    && (['junior developer', 'intern'].includes(normalize(user?.role)) || user?.canAssignProjects === false);
}

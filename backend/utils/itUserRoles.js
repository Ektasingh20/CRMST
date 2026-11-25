import { ROLES, isAllowedRole } from './roles.js';
import { IT_ROLES, defaultProjectEligibility } from '../../frontend/src/itUserRoles.js';

export function normalizeEmployment(payload) {
  const role = String(payload.role || '').trim();
  const isIT = String(payload.dept || '').trim().toLowerCase() === 'it';
  if (!isIT) {
    if (!isAllowedRole(role)) throw new Error('Choose a valid employee role.');
    return { role, itWorkspaceRole: '', canAssignProjects: false };
  }
  if (!role || role.length > 80 || ([...ROLES, 'Administrator', 'Super Admin', 'Superadmin', 'CRM_Executive'].some(value => value.toLowerCase() === role.toLowerCase()) && role.toLowerCase() !== 'it')) {
    throw new Error('Choose a valid IT job role (up to 80 characters).');
  }
  if (payload.canAssignProjects !== undefined && typeof payload.canAssignProjects !== 'boolean') throw new Error('Project assignment permission must be true or false.');
  const requestedWorkspace = String(payload.itWorkspaceRole || '').trim();
  const legacyTeamRole = ['it team', 'junior developer', 'intern'].includes(role.toLowerCase());
  const itWorkspaceRole = requestedWorkspace || (legacyTeamRole ? 'IT Team' : 'IT Head');
  if (!['IT Head', 'IT Team'].includes(itWorkspaceRole)) throw new Error('Choose IT Head or IT Team workspace access.');
  const standardRole = IT_ROLES.find(value => value.toLowerCase() === role.toLowerCase());
  const canAssignProjects = itWorkspaceRole === 'IT Head'
    && (payload.canAssignProjects ?? defaultProjectEligibility(standardRole || role));
  return {
    role: standardRole || role,
    itWorkspaceRole,
    canAssignProjects,
  };
}

import { ROLES, isAllowedRole } from './roles.js';
import { IT_ROLES, defaultProjectEligibility } from '../../frontend/src/itUserRoles.js';

export function normalizeEmployment(payload) {
  const role = String(payload.role || '').trim();
  const isIT = String(payload.dept || '').trim().toLowerCase() === 'it';
  if (!isIT) {
    if (!isAllowedRole(role)) throw new Error('Choose a valid employee role.');
    return { role, canAssignProjects: false };
  }
  if (!role || role.length > 80 || ([...ROLES, 'Administrator', 'Super Admin', 'Superadmin', 'CRM_Executive'].some(value => value.toLowerCase() === role.toLowerCase()) && role.toLowerCase() !== 'it')) {
    throw new Error('Choose a valid IT job role (up to 80 characters).');
  }
  if (payload.canAssignProjects !== undefined && typeof payload.canAssignProjects !== 'boolean') throw new Error('Project assignment permission must be true or false.');
  const standardRole = IT_ROLES.find(value => value.toLowerCase() === role.toLowerCase());
  return { role: standardRole || role, canAssignProjects: standardRole ? defaultProjectEligibility(standardRole) : payload.canAssignProjects === true };
}

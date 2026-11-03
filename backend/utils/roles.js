export const ROLES = ["Admin", "Operations", "Operation", "HR", "CRM Executive", "IT", "Trainer", "Student"];

export function isAdmin(user) {
  return String(user?.role || "").trim().toLowerCase() === "admin";
}

const roleAndDepartment = (user) => [user?.role, user?.dept, user?.department]
  .map((value) => String(value || "").trim().toLowerCase());

export function isHrUser(user) {
  return roleAndDepartment(user).some((value) => value === "hr" || value.startsWith("hr "));
}

export function canAccessUserDirectory(user) {
  // Every authenticated staff dashboard except Student can read the shared
  // employee roster. Non-HR/Admin callers receive a limited directory view.
  return !roleAndDepartment(user).includes("student");
}

export function canCreateEmployeeUsers(user) {
  return isAdmin(user) || isHrUser(user);
}

export function canCreateLeads(user) {
  return isAdmin(user) || ["operations", "crm executive", "crm_executive"].includes(String(user?.role || "").trim().toLowerCase());
}

export function isAllowedRole(role) {
  return ROLES.map((item) => item.toLowerCase()).includes(String(role || "").trim().toLowerCase());
}

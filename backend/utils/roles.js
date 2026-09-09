export const ROLES = ["Admin", "Operations", "Operation", "HR", "CRM Executive", "IT", "Trainer", "Student"];

export function isAdmin(user) {
  return String(user?.role || "").trim().toLowerCase() === "admin";
}

export function canCreateLeads(user) {
  return isAdmin(user) || ["operations", "crm executive", "crm_executive"].includes(String(user?.role || "").trim().toLowerCase());
}

export function isAllowedRole(role) {
  return ROLES.map((item) => item.toLowerCase()).includes(String(role || "").trim().toLowerCase());
}

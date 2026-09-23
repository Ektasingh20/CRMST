export function mergeCallListRows(incoming, current = []) {
  const rows = new Map();
  for (const row of [...incoming, ...current]) {
    const key = `${row.listType || "list"}:${row.id || row._id}`;
    if (!rows.has(key)) rows.set(key, row);
  }
  return [...rows.values()];
}

export const TRAINING_CALL_LIST_PROGRAMS = [
  "Front End Development Foundation",
  "Back End Development",
  "Full Stack Development",
  "Video Editing",
  "AutoCAD (2D & 3D)",
  "Wordpress Web Design",
  "Android App Development",
  "VFX & ANIMATION",
  "Graphics & Visual Designing",
  "Adobe Photoshop",
  "CorelDraw",
  "Digital marketing",
  "Adobe Illustrator",
  "3D INTERIOR EXTERIOR DESIGN",
];
export const SERVICE_CALL_LIST_SERVICES = [
  "Website Development",
  "Android & iOS App Development",
  "Graphic Designing",
  "Branding & Brand Promotion",
  "Digital Marketing",
  "VFX & Animation",
  "CRM Solutions",
  "Cloud Solutions",
  "Marketing Tools & Automation",
  "Content Creation & Copywriting",
  "UI/UX Design",
  "Social Media Management",
  "E-commerce Development & Management",
  "Performance Marketing",
  "Influencer Marketing",
  "Photography & Videography",
  "Public Relations (PR)",
  "Bulk Marketing (Highlighted Service)",
];
export const CALL_STATUS_OPTIONS = ["Select Status", "Pending", "Follow Up", "Completed"];
export const CALL_LIST_INTEREST_STATUS_OPTIONS = ["Select Status", "Interested", "Not Interested"];
export const normalizeCallStatus = (value) => CALL_STATUS_OPTIONS.includes(value) ? value : "Select Status";
export const normalizeInterestStatus = (value) => CALL_LIST_INTEREST_STATUS_OPTIONS.includes(value) ? value : "Select Status";
export const normalizeCallProgram = (value) => /^(it services?|it training|-)$/i.test(String(value || "").trim()) ? "" : String(value || "").trim();
export const callListPrograms = (type) => type === "training" ? TRAINING_CALL_LIST_PROGRAMS : type === "services" ? SERVICE_CALL_LIST_SERVICES : [...new Set([...SERVICE_CALL_LIST_SERVICES, ...TRAINING_CALL_LIST_PROGRAMS])];
export function matchesCallListFilters(row, { search = "", program = "All", callStatus = "All", interest = "All", date = "", employee = "All", listType = "All" } = {}) {
  const query = search.trim().toLowerCase();
  const name = String(row.name || "").toLowerCase();
  const contact = String(row.contact || row.number || row.phone || "");
  const digits = query.replace(/\D/g, "");
  const matchesSearch = !query || name.includes(query) || contact.toLowerCase().includes(query)
    || (digits.length > 0 && /^[+\d\s().-]+$/.test(query) && contact.replace(/\D/g, "").includes(digits));
  return matchesSearch
    && (program === "All" || normalizeCallProgram(row.program) === program)
    && (callStatus === "All" || normalizeCallStatus(row.callStatus) === callStatus)
    && (interest === "All" || normalizeInterestStatus(row.interestStatus) === interest)
    && (!date || String(row.date || "").slice(0, 10) === date)
    && (employee === "All" || String(row.assignedTo || "") === String(employee))
    && (listType === "All" || row.listType === listType);
}

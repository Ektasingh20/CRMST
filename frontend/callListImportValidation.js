import { normalizeCallListDate } from "./callListDate.js";

export function normalizeCallImportPhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

export function validateCallImportRows(sourceRows) {
  const issues = [];
  const normalized = [];
  const firstPhoneRow = new Map();
  if (!Array.isArray(sourceRows) || !sourceRows.length) {
    return { rows: [], issues: [{ row: 0, field: "File", message: "Add at least one contact row." }] };
  }
  if (sourceRows.length > 2000) {
    issues.push({ row: 0, field: "File", message: "Upload at most 2,000 contact rows at once." });
  }
  sourceRows.forEach((source, index) => {
    const raw = source && typeof source === "object" ? source : {};
    const row = Number.isSafeInteger(raw.excelRow) && raw.excelRow >= 2 ? raw.excelRow : index + 2;
    const name = String(raw.name ?? "").trim();
    const rawPhone = raw.contact ?? raw.number ?? raw.phone ?? "";
    const contact = normalizeCallImportPhone(rawPhone);
    const hasDate = Object.hasOwn(raw, "date");
    const date = hasDate ? normalizeCallListDate(raw.date) : "";
    if (!name) issues.push({ row, field: "Name", message: "Enter a name." });
    else if (name.length > 200) issues.push({ row, field: "Name", message: "Use 200 characters or fewer." });
    if (!contact) issues.push({ row, field: "Number", message: "Enter a valid 10-digit Indian mobile number." });
    if (hasDate && !date) issues.push({ row, field: "Date", message: "Enter a real date as DD-MM-YYYY or YYYY-MM-DD." });
    if (contact) {
      const earlier = firstPhoneRow.get(contact);
      if (earlier) issues.push({ row, field: "Number", message: `Duplicate of Excel row ${earlier}.` });
      else firstPhoneRow.set(contact, row);
    }
    normalized.push({ ...raw, name, contact, ...(hasDate ? { date } : {}) });
  });
  return { rows: normalized, issues };
}

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export const isValidIndianMobile = (value) => /^[6-9]\d{9}$/.test(String(value || "").trim());
export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
export const isValidPan = (value) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(value || "").trim().toUpperCase());
export const isValidIfsc = (value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value || "").trim().toUpperCase());
export const isValidBankAccount = (value) => /^\d{6,18}$/.test(String(value || "").trim());
export const isValidPersonName = (value) => /^[\p{L}][\p{L}\p{M} .'-]*$/u.test(String(value || "").trim());
export const isValidRelationship = isValidPersonName;
export const isValidBankText = (value) => /^[\p{L}\p{N}][\p{L}\p{M}\p{N} &(),.'/+:-]*$/u.test(String(value || "").trim());

export function isValidAadhaar(value) {
  const aadhaar = String(value || "").trim();
  if (!/^[2-9]\d{11}$/.test(aadhaar)) return false;
  let checksum = 0;
  [...aadhaar].reverse().forEach((digit, index) => {
    checksum = VERHOEFF_D[checksum][VERHOEFF_P[index % 8][Number(digit)]];
  });
  return checksum === 0;
}

export function isValidProfileDob(value, today = new Date().toISOString().slice(0, 10)) {
  const dob = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || dob < "1900-01-01" || dob > today) return false;
  const date = new Date(`${dob}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dob;
}

const pad = (value) => String(value).padStart(2, "0");

// Spreadsheet date cells are Excel serials; CSV dates arrive as text.
export function normalizeCallListDate(value) {
  let year;
  let month;
  let day;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    year = value.getUTCFullYear();
    month = value.getUTCMonth() + 1;
    day = value.getUTCDate();
  } else if (typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 2958465) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    year = date.getUTCFullYear();
    month = date.getUTCMonth() + 1;
    day = date.getUTCDate();
  } else {
    const text = String(value ?? "").trim();
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T\d{2}:\d{2}.*)?$/.exec(text);
    const dayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
    if (iso) [, year, month, day] = iso.map(Number);
    else if (dayFirst) [, day, month, year] = dayFirst.map(Number);
    else return "";
  }
  const checked = new Date(Date.UTC(year, month - 1, day));
  if (checked.getUTCFullYear() !== Number(year) || checked.getUTCMonth() + 1 !== Number(month)
    || checked.getUTCDate() !== Number(day)) return "";
  return `${year}-${pad(month)}-${pad(day)}`;
}

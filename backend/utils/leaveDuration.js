export function leaveDaysInclusive(from, to) {
  const parse = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? date.getTime() : null;
  };
  const start = parse(from);
  const end = parse(to);
  if (start === null || end === null || end < start) return null;
  return Math.round((end - start) / 86400000) + 1;
}

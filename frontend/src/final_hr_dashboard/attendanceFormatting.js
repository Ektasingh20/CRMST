export function formatAttendanceTime(value) {
  if (!value) return "00:00:00";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "00:00:00" : parsed.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function formatAttendanceDuration(milliseconds) {
  const value = Number(milliseconds);
  const seconds = Number.isFinite(value) ? Math.floor(Math.max(0, value) / 1000) : 0;
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((part) => String(part).padStart(2, "0")).join(":");
}

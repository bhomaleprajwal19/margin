// Small date helpers. Dates from the API are "YYYY-MM-DD" (no timezone), so parse them as local.
export function parseDay(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysFromToday(iso, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseDay(iso) - start) / 86_400_000);
}

export function relativeDue(iso, today = new Date()) {
  if (!iso) return "";
  const diff = daysFromToday(iso, today);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff < 0) return `${-diff}d late`;
  if (diff < 7) return parseDay(iso).toLocaleDateString(undefined, { weekday: "short" });
  return parseDay(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function longToday(today = new Date()) {
  return today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

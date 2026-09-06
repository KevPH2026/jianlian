/** Calendar week helpers (Monday-start, Asia/Shanghai business week). */

export function startOfWeek(date = new Date(), timeZone = "Asia/Shanghai"): Date {
  // Build YYYY-MM-DD in the target zone, then find Monday 00:00 of that local week.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  const weekday = get("weekday"); // Mon, Tue, ...
  const weekdayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = weekdayIndex[weekday] ?? 0;
  // Approximate local midnight as UTC+8 fixed offset for Shanghai (no DST).
  const localMidnightMs = Date.UTC(y, m - 1, d) - 8 * 60 * 60 * 1000;
  return new Date(localMidnightMs - offset * 24 * 60 * 60 * 1000);
}

export function endOfWeek(date = new Date(), timeZone = "Asia/Shanghai"): Date {
  const start = startOfWeek(date, timeZone);
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
}

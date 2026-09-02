export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(value?: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function digitsPhone(phone?: string | null): string {
  return (phone || "").replace(/\D/g, "");
}

export function phonesMatch(a?: string | null, b?: string | null): boolean {
  const da = digitsPhone(a);
  const db = digitsPhone(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const tail = (s: string) => s.slice(-10);
  return da.length >= 10 && db.length >= 10 && tail(da) === tail(db);
}

export function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export type ContactKey = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  company?: string | null;
};

export function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function normalizePhone(phone?: string | null): string {
  const raw = (phone || "").trim();
  if (!raw) return "";
  const plus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return plus ? `+${digits}` : digits;
}

export function normalizeNameCompany(
  name?: string | null,
  company?: string | null
): string {
  return `${(name || "").trim().toLowerCase()}|${(company || "").trim().toLowerCase()}`;
}

/** 去重优先级：邮箱 → 电话 → 姓名+公司。 */
export function findDuplicate<T extends ContactKey>(
  existing: T[],
  incoming: ContactKey
): T | undefined {
  const email = normalizeEmail(incoming.email);
  if (email) {
    const hit = existing.find((c) => normalizeEmail(c.email) === email);
    if (hit) return hit;
  }
  const incomingDigits = (incoming.phone || "").replace(/\D/g, "");
  if (incomingDigits.length >= 6) {
    const key = incomingDigits.length >= 11 ? incomingDigits.slice(-11) : incomingDigits;
    const hit = existing.find((c) => {
      const p = (c.phone || "").replace(/\D/g, "");
      if (p.length < 6) return false;
      const k = p.length >= 11 ? p.slice(-11) : p;
      return k === key;
    });
    if (hit) return hit;
  }
  const name = (incoming.name || "").trim();
  const company = (incoming.company || "").trim();
  if (name && company) {
    const key = normalizeNameCompany(name, company);
    const hit = existing.find(
      (c) =>
        (c.name || "").trim() &&
        (c.company || "").trim() &&
        normalizeNameCompany(c.name, c.company) === key
    );
    if (hit) return hit;
  }
  return undefined;
}

export function mergeContactFields<T extends Record<string, unknown>>(
  existing: T,
  incoming: Partial<T>
): T {
  const out = { ...existing };
  for (const [k, v] of Object.entries(incoming)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    const cur = (out as Record<string, unknown>)[k];
    if (cur === undefined || cur === null || cur === "") {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

import { normalizeStage, STAGES, type Stage } from "./stages";

export type CsvContactRow = {
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  stage: Stage;
  notes: string;
};

export type ExistingContact = {
  id?: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type DedupMatch = {
  rowIndex: number;
  row: CsvContactRow;
  matchedBy: "email" | "phone" | "name+company" | null;
  existing?: ExistingContact;
};

const HEADER_MAP: Record<string, keyof Omit<CsvContactRow, "tags" | "stage"> | "tags" | "stage"> = {
  name: "name",
  姓名: "name",
  company: "company",
  公司: "company",
  title: "title",
  职位: "title",
  email: "email",
  邮箱: "email",
  phone: "phone",
  电话: "phone",
  mobile: "phone",
  source: "source",
  来源: "source",
  tags: "tags",
  标签: "tags",
  stage: "stage",
  阶段: "stage",
  notes: "notes",
  备注: "notes",
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      // skip
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export function splitTags(raw: string): string[] {
  return raw
    .split(/[;|,，、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function normalizeEmail(email?: string | null): string | null {
  const v = (email || "").trim().toLowerCase();
  return v.includes("@") ? v : null;
}

export function phoneDigits(phone?: string | null): string {
  return (phone || "").replace(/\D/g, "");
}

/** Canonical key: last 11 digits so +86 / local mobile numbers collide. */
export function phoneKey(phone?: string | null): string | null {
  const digits = phoneDigits(phone);
  if (digits.length < 6) return null;
  return digits.length >= 11 ? digits.slice(-11) : digits;
}

export function normalizePhone(phone?: string | null): string | null {
  return phoneKey(phone);
}

export function normalizeNameCompany(name?: string | null, company?: string | null): string {
  return `${(name || "").trim().toLowerCase()}|${(company || "").trim().toLowerCase()}`;
}

export function rowsToContacts(grid: string[][]): CsvContactRow[] {
  if (grid.length === 0) return [];
  const headers = grid[0].map((h) => HEADER_MAP[h.trim().toLowerCase()] || HEADER_MAP[h.trim()] || null);
  const out: CsvContactRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const line = grid[i];
    const rec: Record<string, string> = {};
    headers.forEach((key, idx) => {
      if (key) rec[key] = (line[idx] || "").trim();
    });
    const name = rec.name || "";
    if (!name) continue;
    out.push({
      name,
      company: rec.company || "",
      title: rec.title || "",
      email: rec.email || "",
      phone: rec.phone || "",
      source: rec.source || "csv",
      tags: splitTags(rec.tags || ""),
      stage: normalizeStage(rec.stage),
      notes: rec.notes || "",
    });
  }
  return out;
}

export function parseContactCsv(text: string): CsvContactRow[] {
  return rowsToContacts(parseCsv(text));
}

export function dedupKey(row: { email?: string | null; phone?: string | null; name?: string | null; company?: string | null }): {
  email: string | null;
  phone: string | null;
  nameCompany: string;
} {
  return {
    email: normalizeEmail(row.email),
    phone: normalizePhone(row.phone),
    nameCompany: normalizeNameCompany(row.name, row.company),
  };
}

/**
 * Dedup priority: email, then phone, then name+company.
 * First existing match wins. Incoming rows also collapse against each other.
 */
export function dedupContacts<T extends ExistingContact>(
  incoming: CsvContactRow[],
  existing: T[]
): {
  creates: CsvContactRow[];
  updates: { row: CsvContactRow; existing: T; matchedBy: "email" | "phone" | "name+company" }[];
  skipped: DedupMatch[];
} {
  const emailMap = new Map<string, T>();
  const phoneMap = new Map<string, T>();
  const nameMap = new Map<string, T>();
  for (const e of existing) {
    const email = normalizeEmail(e.email);
    const phone = normalizePhone(e.phone);
    const nc = normalizeNameCompany(e.name, e.company);
    if (email && !emailMap.has(email)) emailMap.set(email, e);
    if (phone && !phoneMap.has(phone)) phoneMap.set(phone, e);
    if (nc !== "|" && !nameMap.has(nc)) nameMap.set(nc, e);
  }

  const creates: CsvContactRow[] = [];
  const updates: { row: CsvContactRow; existing: T; matchedBy: "email" | "phone" | "name+company" }[] = [];
  const skipped: DedupMatch[] = [];
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  const seenNc = new Set<string>();

  incoming.forEach((row, rowIndex) => {
    const email = normalizeEmail(row.email);
    const phone = normalizePhone(row.phone);
    const nc = normalizeNameCompany(row.name, row.company);

    const matchEmail = email ? emailMap.get(email) : undefined;
    const matchPhone = !matchEmail && phone ? phoneMap.get(phone) : undefined;
    const matchName = !matchEmail && !matchPhone && nc !== "|" ? nameMap.get(nc) : undefined;
    const existingHit = matchEmail || matchPhone || matchName;
    const matchedBy = matchEmail ? "email" : matchPhone ? "phone" : matchName ? "name+company" : null;

    const dupInFile =
      (email && seenEmail.has(email)) ||
      (phone && seenPhone.has(phone)) ||
      (nc !== "|" && seenNc.has(nc));

    if (dupInFile && !existingHit) {
      skipped.push({ rowIndex, row, matchedBy: matchedBy || (email && seenEmail.has(email) ? "email" : phone && seenPhone.has(phone) ? "phone" : "name+company") });
      return;
    }

    if (email) seenEmail.add(email);
    if (phone) seenPhone.add(phone);
    if (nc !== "|") seenNc.add(nc);

    if (existingHit) {
      updates.push({ row, existing: existingHit, matchedBy: matchedBy! });
      if (email) emailMap.set(email, existingHit);
      if (phone) phoneMap.set(phone, existingHit);
    } else {
      creates.push(row);
    }
  });

  return { creates, updates, skipped };
}

export function toCsv(rows: Array<Record<string, string | number | boolean | null | undefined>>): string {
  const headers = ["name", "company", "title", "email", "phone", "source", "tags", "stage", "notes", "score", "doNotContact"];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

export { STAGES };

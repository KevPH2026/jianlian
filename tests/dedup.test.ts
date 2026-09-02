import { describe, expect, it } from "vitest";
import { findDuplicate, mergeContactFields, normalizeEmail, normalizePhone } from "@/lib/dedup";

const pool = [
  { id: "1", email: "Ada@Corp.com", phone: "+1 (415) 555-0100", name: "Ada Lovelace", company: "Corp" },
  { id: "2", email: "bob@x.com", phone: "8613800138000", name: "Bob", company: "X Ltd" },
  { id: "3", email: null, phone: null, name: "Chen Wei", company: "Zhonghe Auto" },
];

describe("dedup", () => {
  it("normalizes email case and trim", () => {
    expect(normalizeEmail("  ADA@corp.com ")).toBe("ada@corp.com");
  });

  it("normalizes phone digits", () => {
    expect(normalizePhone("+1 (415) 555-0100")).toBe("+14155550100");
    expect(normalizePhone("138-0013-8000")).toBe("13800138000");
  });

  it("matches by email first", () => {
    const hit = findDuplicate(pool, { email: "ada@corp.com", phone: "999", name: "Other", company: "Z" });
    expect(hit?.id).toBe("1");
  });

  it("falls back to phone when email missing", () => {
    const hit = findDuplicate(pool, { email: "", phone: "+86 138 0013 8000", name: "Bobby", company: "Y" });
    expect(hit?.id).toBe("2");
  });

  it("falls back to name+company", () => {
    const hit = findDuplicate(pool, { name: "chen wei", company: "zhonghe auto" });
    expect(hit?.id).toBe("3");
  });

  it("does not match name without company", () => {
    const hit = findDuplicate(pool, { name: "Chen Wei", company: "" });
    expect(hit).toBeUndefined();
  });

  it("merges only blank fields", () => {
    const merged = mergeContactFields(
      { email: "a@x.com", phone: "", name: "Ada" },
      { email: "b@x.com", phone: "123", name: "Ada L" }
    );
    expect(merged.email).toBe("a@x.com");
    expect(merged.phone).toBe("123");
    expect(merged.name).toBe("Ada");
  });
});

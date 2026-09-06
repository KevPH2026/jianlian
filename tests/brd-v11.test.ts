import { describe, expect, it } from "vitest";
import { STAGES, canHandoffProposal, isStage } from "../src/lib/stages";
import { INTENT_TEMPLATES, CUIYUE_FOOTER, intentForStage } from "../src/lib/intent-templates";
import { buildSuggestedNextLine } from "../src/lib/suggest";
import { bookingCountsInWeek } from "../src/lib/bookings";
import { startOfWeek, endOfWeek } from "../src/lib/week";

describe("BRD v1.1 stages", () => {
  it("includes 对齐中", () => {
    expect(STAGES).toContain("对齐中");
    expect(isStage("对齐中")).toBe(true);
  });

  it("handoff only for 已回复 / 对齐中", () => {
    expect(canHandoffProposal("已回复")).toBe(true);
    expect(canHandoffProposal("对齐中")).toBe(true);
    expect(canHandoffProposal("跟进中")).toBe(false);
  });
});

describe("四意图模板", () => {
  it("has 破冰/价值/催约/停损", () => {
    expect(INTENT_TEMPLATES.map((t) => t.intent)).toEqual(["破冰", "价值", "催约", "停损"]);
  });

  it("催约 includes 登记已约 footer", () => {
    const cui = INTENT_TEMPLATES.find((t) => t.intent === "催约")!;
    expect(cui.body).toContain(CUIYUE_FOOTER);
    expect(cui.body).toContain("登记已约");
  });

  it("maps stages to intents", () => {
    expect(intentForStage("新线索")).toBe("破冰");
    expect(intentForStage("已触达")).toBe("价值");
    expect(intentForStage("已回复")).toBe("催约");
  });
});

describe("建议下一句", () => {
  it("never returns empty draft", () => {
    const out = buildSuggestedNextLine({
      contact: { name: "", company: "", stage: "新线索" },
      recentMessages: [],
      templates: [],
    });
    expect(out.draft.trim().length).toBeGreaterThan(0);
    expect(out.body.trim().length).toBeGreaterThan(0);
    expect(out.subject.trim().length).toBeGreaterThan(0);
  });

  it("uses intent template when available", () => {
    const out = buildSuggestedNextLine({
      contact: { name: "晓雯", company: "GlowLab", stage: "已回复", productInterest: "冷启动" },
      recentMessages: [{ direction: "inbound", body: "下周可以聊" }],
      templates: INTENT_TEMPLATES.map((t) => ({ name: t.name, subject: t.subject, body: t.body })),
      intent: "催约",
    });
    expect(out.intent).toBe("催约");
    expect(out.draft).toContain("晓雯");
    expect(out.draft).toContain("登记已约");
  });
});

describe("Booking weekly metric", () => {
  it("excludes cancelled; reschedule does not create new count logic", () => {
    const start = startOfWeek(new Date("2026-09-06T12:00:00+08:00"));
    const end = endOfWeek(new Date("2026-09-06T12:00:00+08:00"));
    const inWeek = { createdAt: new Date(start.getTime() + 3600_000), cancelledAt: null };
    const cancelled = { createdAt: new Date(start.getTime() + 3600_000), cancelledAt: new Date() };
    const lastWeek = { createdAt: new Date(start.getTime() - 3600_000), cancelledAt: null };
    expect(bookingCountsInWeek(inWeek, start, end)).toBe(true);
    expect(bookingCountsInWeek(cancelled, start, end)).toBe(false);
    expect(bookingCountsInWeek(lastWeek, start, end)).toBe(false);
  });
});

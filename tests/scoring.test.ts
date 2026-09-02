import { describe, expect, it } from "vitest";
import { leadScoreAndTier, leadTierFromBantIcp } from "../src/lib/scoring";

describe("BANT+ICP 分层", () => {
  it("BANT>=3 且 ICP>=7 为热", () => {
    expect(leadTierFromBantIcp(3, 7)).toBe("HOT");
    expect(leadTierFromBantIcp(4, 10)).toBe("HOT");
  });
  it("BANT<=1 且 ICP<=3 为冷", () => {
    expect(leadTierFromBantIcp(1, 3)).toBe("COLD");
    expect(leadTierFromBantIcp(0, 0)).toBe("COLD");
  });
  it("其余为温", () => {
    expect(leadTierFromBantIcp(2, 5)).toBe("WARM");
    expect(leadTierFromBantIcp(3, 5)).toBe("WARM");
    expect(leadTierFromBantIcp(1, 8)).toBe("WARM");
  });
  it("leadScoreAndTier 使用 BANT 与 ICP", () => {
    const hot = leadScoreAndTier({
      title: "CEO",
      company: "Acme",
      email: "a@x.com",
      icpScore: 8,
      bantBudget: true,
      bantAuthority: true,
      bantNeed: true,
    });
    expect(hot.leadTier).toBe("HOT");
    expect(hot.bant).toBe(3);
    const cold = leadScoreAndTier({ icpScore: 2 });
    expect(cold.leadTier).toBe("COLD");
  });
});

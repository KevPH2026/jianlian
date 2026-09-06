export type BantFlags = {
  budget?: boolean;
  authority?: boolean;
  need?: boolean;
  timeline?: boolean;
};

export type ScoreInput = {
  email?: string | null;
  title?: string | null;
  phone?: string | null;
  company?: string | null;
  country?: string | null;
  productInterest?: string | null;
  targetMarkets?: string[] | string | null;
  icpScore?: number | null;
  bantBudget?: boolean;
  bantAuthority?: boolean;
  bantNeed?: boolean;
  bantTimeline?: boolean;
};

/** DTC decision makers first; 采购/procure kept secondary. */
const TITLE_RE =
  /(ceo|founder|cmo|growth|marketing|brand|主理人|品牌|vp|director|负责人|head of|manager|老板|总监|采购|purchas|procure)/i;

export function bantCount(b: BantFlags): number {
  return [b.budget, b.authority, b.need, b.timeline].filter(Boolean).length;
}

/** BANT≥3 且 ICP≥7 → 热；BANT≤1 且 ICP≤3 → 冷；其余为温。 */
export function leadTierFromBantIcp(bant: number, icp: number): "HOT" | "WARM" | "COLD" {
  const icpClamped = Math.max(0, Math.min(10, Number.isFinite(icp) ? icp : 0));
  const bantClamped = Math.max(0, Math.min(4, bant));
  if (bantClamped >= 3 && icpClamped >= 7) return "HOT";
  if (bantClamped <= 1 && icpClamped <= 3) return "COLD";
  return "WARM";
}

function parseMarkets(targetMarkets?: string[] | string | null): string[] {
  return Array.isArray(targetMarkets)
    ? targetMarkets
    : String(targetMarkets || "")
        .split(/[,，]/)
        .map((x) => x.trim())
        .filter(Boolean);
}

/** Match ICP segment against country OR loosely in productInterest/company. */
function marketsMatch(input: ScoreInput, markets: string[]): boolean {
  if (!markets.length) return false;
  const blobs = [input.country, input.productInterest, input.company]
    .map((x) => String(x || "").toLowerCase())
    .filter(Boolean);
  if (!blobs.length) return false;
  return markets.some((m) => {
    const mm = m.toLowerCase();
    return blobs.some((b) => b.includes(mm) || mm.includes(b));
  });
}

export function suggestIcpScore(input: ScoreInput): number {
  let s = 3;
  if (input.title && TITLE_RE.test(String(input.title))) s += 2;
  if (input.company?.trim()) s += 1;
  if (input.email && String(input.email).includes("@")) s += 1;
  if (input.productInterest?.trim()) s += 1;
  const markets = parseMarkets(input.targetMarkets);
  if (marketsMatch(input, markets)) s += 2;
  return Math.max(0, Math.min(10, s));
}

/** 兼容旧调用：0-100 本地规则分。 */
export function scoreContact(input: ScoreInput): number {
  let score = 0;
  if (input.email && String(input.email).includes("@")) score += 30;
  if (input.title && TITLE_RE.test(String(input.title))) score += 40;
  if (input.phone && String(input.phone).replace(/\D/g, "").length >= 6) score += 15;
  if (input.company && String(input.company).trim().length > 0) score += 15;
  return Math.min(100, score);
}

export function leadScoreAndTier(input: ScoreInput): {
  score: number;
  icpScore: number;
  leadTier: "HOT" | "WARM" | "COLD";
  bant: number;
} {
  const icp =
    input.icpScore != null && Number.isFinite(Number(input.icpScore))
      ? Math.max(0, Math.min(10, Number(input.icpScore)))
      : suggestIcpScore(input);
  const bant = bantCount({
    budget: !!input.bantBudget,
    authority: !!input.bantAuthority,
    need: !!input.bantNeed,
    timeline: !!input.bantTimeline,
  });
  return { score: scoreContact(input), icpScore: icp, leadTier: leadTierFromBantIcp(bant, icp), bant };
}

export function titleMatchesDecisionMaker(title?: string | null): boolean {
  return !!title && TITLE_RE.test(String(title));
}

export function leadTierFromScore(score: number): "HOT" | "WARM" | "COLD" {
  if (score >= 7) return "HOT";
  if (score >= 4) return "WARM";
  return "COLD";
}

export const STAGES = [
  { value: "NEW", label: "新线索" },
  { value: "CONTACTED", label: "已触达" },
  { value: "REPLIED", label: "已回复" },
  { value: "FOLLOWING", label: "跟进中" },
  { value: "DO_NOT_CONTACT", label: "勿联系" },
] as const;

export type StageValue = (typeof STAGES)[number]["value"];

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.value, s.label])
);

export const TIERS = [
  { value: "HOT", label: "热" },
  { value: "WARM", label: "温" },
  { value: "COLD", label: "冷" },
] as const;

export const TIER_LABEL: Record<string, string> = {
  HOT: "热",
  WARM: "温",
  COLD: "冷",
};

export const DEFAULT_SEQUENCE_OFFSETS = [0, 3, 7, 14] as const;

export const STALLED_DAYS = 5;
export const EMAIL_WORD_LIMIT = 200;
export const WA_WORD_LIMIT = 100;
export const DEFAULT_RATE_PER_HOUR = 20;

export const STAGE_SET = new Set<string>(STAGES.map((s) => s.value));

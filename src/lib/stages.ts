export const STAGES = ["新线索", "已触达", "已回复", "跟进中", "勿联系"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_COLORS: Record<Stage, string> = {
  新线索: "bg-sky-50 text-sky-700 border-sky-200",
  已触达: "bg-amber-50 text-amber-700 border-amber-200",
  已回复: "bg-emerald-50 text-emerald-700 border-emerald-200",
  跟进中: "bg-violet-50 text-violet-700 border-violet-200",
  勿联系: "bg-slate-100 text-slate-500 border-slate-200",
};

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export function normalizeStage(value?: string | null): Stage {
  if (value && isStage(value)) return value;
  return "新线索";
}

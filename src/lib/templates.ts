import { EMAIL_WORD_LIMIT, WA_WORD_LIMIT } from "./constants";

export type TemplateVars = {
  name?: string | null;
  company?: string | null;
  title?: string | null;
};

const TOKEN = /\{\{\s*(name|company|title)\s*\}\}/gi;

export function renderTemplate(tpl: string, vars: TemplateVars): string {
  return (tpl || "").replace(TOKEN, (_, key: string) => {
    const v = vars[key.toLowerCase() as keyof TemplateVars];
    return v == null ? "" : String(v);
  });
}

export function extractTemplateVars(tpl: string): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*(name|company|title)\s*\}\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tpl || ""))) found.add(m[1].toLowerCase());
  return [...found];
}

export function wordCount(text: string): number {
  const cleaned = (text || "").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function emailLengthHint(body: string) {
  const words = wordCount(body);
  return { words, max: EMAIL_WORD_LIMIT, ok: words < EMAIL_WORD_LIMIT, channel: "email" as const };
}

export function waLengthHint(body: string) {
  const words = wordCount(body);
  return { words, max: WA_WORD_LIMIT, ok: words < WA_WORD_LIMIT, channel: "whatsapp" as const };
}

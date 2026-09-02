export type TemplateVars = {
  name?: string | null;
  company?: string | null;
  title?: string | null;
};

const PLACEHOLDER = /\{\{\s*(name|company|title)\s*\}\}/gi;

export function interpolateTemplate(text: string, vars: TemplateVars): string {
  const map: Record<string, string> = {
    name: vars.name?.trim() || "",
    company: vars.company?.trim() || "",
    title: vars.title?.trim() || "",
  };
  return text.replace(PLACEHOLDER, (_, key: string) => map[key.toLowerCase()] ?? "");
}

export function previewTemplate(
  subject: string,
  body: string,
  vars: TemplateVars
): { subject: string; body: string } {
  return {
    subject: interpolateTemplate(subject, vars),
    body: interpolateTemplate(body, vars),
  };
}

export function missingPlaceholders(text: string, vars: TemplateVars): string[] {
  const missing: string[] = [];
  const seen = new Set<string>();
  text.replace(PLACEHOLDER, (full, key: string) => {
    const k = key.toLowerCase();
    if (!seen.has(k) && !(vars as Record<string, string | null | undefined>)[k]) {
      missing.push(k);
      seen.add(k);
    }
    return full;
  });
  return missing;
}

export function wordCount(text: string): number {
  const cleaned = (text || "").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

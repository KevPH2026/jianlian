import { interpolateTemplate } from "./template";
import { intentForStage, findIntentTemplate, INTENT_TEMPLATES, type IntentTemplateSeed } from "./intent-templates";
import type { IntentName } from "./constants";

export type SuggestMessage = {
  direction: string;
  body: string;
  channel?: string;
};

export type SuggestContact = {
  name: string;
  company: string;
  title?: string | null;
  stage: string;
  productInterest?: string | null;
  tags?: string[];
};

export type SuggestInput = {
  contact: SuggestContact;
  recentMessages: SuggestMessage[];
  templates: Array<{ name: string; subject: string; body: string }>;
  intent?: IntentName | string | null;
};

export type SuggestResult = {
  intent: IntentName;
  subject: string;
  body: string;
  draft: string;
  source: "template" | "fallback";
};

function summarizeInbound(messages: SuggestMessage[]): string {
  const inbound = messages.filter((m) => m.direction === "inbound");
  const recent = (inbound.length ? inbound : messages).slice(-3);
  if (!recent.length) return "";
  const first = recent[recent.length - 1];
  const line = (first.body || "").trim().replace(/\s+/g, " ");
  if (!line) return "";
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

function fallbackDraft(contact: SuggestContact, intent: IntentName, inboundSummary: string): string {
  const name = contact.name || "你好";
  const company = contact.company || "贵司";
  const interest = contact.productInterest || "增长对齐";
  const replyHint = inboundSummary
    ? `你提到「${inboundSummary}」，`
    : "";
  switch (intent) {
    case "破冰":
      return `Hi ${name},\n\n我是 dtc.lab，想和 ${company} 简单认识一下，看看近期是否在看 ${interest}。\n\n方便回一句方向即可。\n\nThanks / 谢谢。`;
    case "价值":
      return `Hi ${name},\n\n${replyHint}我们可以先用一页诊断对齐 ${company} 的 ${interest} 目标与预算边界。\n\n需要的话我发一版短摘要给你内部讨论。\n\nThanks / 谢谢。`;
    case "催约":
      return `Hi ${name},\n\n${replyHint}想约 15 分钟和 ${company} 对齐提案边界——你回一个大致时段即可。\n\nThanks / 谢谢。\n\n【操作提示】对方口头/书面同意时间后，到线索页点「登记已约」。`;
    case "停损":
      return `Hi ${name},\n\n关于 ${company} 的跟进先停一下。若近期不看 ${interest}，我就从列表拿掉；若仍有兴趣，回「继续」+ 时段即可。\n\nThanks / 谢谢。`;
    default:
      return `Hi ${name},\n\n想跟进一下 ${company} 关于 ${interest} 的进展，方便回一句吗？\n\nThanks / 谢谢。`;
  }
}

export function buildSuggestedNextLine(input: SuggestInput): SuggestResult {
  const intent = (input.intent && INTENT_TEMPLATES.some((t) => t.intent === input.intent)
    ? (input.intent as IntentName)
    : intentForStage(input.contact.stage)) as IntentName;

  const vars = {
    name: input.contact.name,
    company: input.contact.company,
    title: input.contact.title || "",
  };
  const inboundSummary = summarizeInbound(input.recentMessages);
  const tpl =
    findIntentTemplate(input.templates, intent) ||
    (INTENT_TEMPLATES.find((t) => t.intent === intent) as IntentTemplateSeed | undefined);

  let subject = "";
  let body = "";
  let source: "template" | "fallback" = "fallback";

  if (tpl) {
    subject = interpolateTemplate(tpl.subject, vars);
    body = interpolateTemplate(tpl.body, vars);
    source = "template";
    if (inboundSummary && intent !== "破冰") {
      // Light context injection after greeting line
      const lines = body.split("\n");
      const insertAt = Math.min(2, lines.length);
      lines.splice(insertAt, 0, "", `（参考对方最近一句：${inboundSummary}）`);
      body = lines.join("\n");
    }
  } else {
    body = fallbackDraft(input.contact, intent, inboundSummary);
    subject = `${input.contact.company || "跟进"} — ${intent}`;
  }

  // Never empty
  const draft = (body || fallbackDraft(input.contact, intent, inboundSummary)).trim();
  const safeSubject = (subject || `${intent} · ${input.contact.name || "线索"}`).trim();

  return {
    intent,
    subject: safeSubject || "跟进",
    body: draft || fallbackDraft(input.contact, intent, inboundSummary),
    draft: draft || "Hi，想跟进一下，方便回一句吗？",
    source,
  };
}

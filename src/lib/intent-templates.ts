import type { IntentName } from "./constants";

export const CUIYUE_FOOTER =
  "【操作提示】对方口头/书面同意时间后，到线索页点「登记已约」。";

export type IntentTemplateSeed = {
  intent: IntentName;
  name: string;
  subject: string;
  body: string;
};

export const INTENT_TEMPLATES: IntentTemplateSeed[] = [
  {
    intent: "破冰",
    name: "破冰",
    subject: "{{company}} × dtc.lab — 认识一下 {{name}}",
    body: `Hi {{name}},

我是 dtc.lab，帮 DTC / 独立站品牌做冷启动与增长资产。看到 {{company}} 在相关品类的动作，想简单打个招呼——不推销一堆方案，先确认你们最近是否在看增长/内容/投放对齐。

若方向不对，直接说一声即可。

Thanks / 谢谢。`,
  },
  {
    intent: "价值",
    name: "价值",
    subject: "{{company}}：一页增长诊断可以怎么用",
    body: `Hi {{name}},

接着上次：很多品牌卡在「有线索但提案对不齐预算与目标」。我们通常会用一页诊断对齐：品类、客群、投放漏斗、30 天可验证的资产。

若 {{company}} 方便，我可以按你们现状改一版短摘要，供内部讨论用——仍不默认外发任何材料。

Thanks / 谢谢。`,
  },
  {
    intent: "催约",
    name: "催约",
    subject: "{{name}}，约 15 分钟对齐可以吗？",
    body: `Hi {{name}},

想确认一下：{{company}} 这边是否方便约 15 分钟，对齐预算、目标与提案边界？我们只谈增长与可交付物，不谈供货交期。

你回一个大致时段即可。

Thanks / 谢谢。

${CUIYUE_FOOTER}`,
  },
  {
    intent: "停损",
    name: "停损",
    subject: "{{company}} — 最后确认是否继续",
    body: `Hi {{name}},

前几封关于增长对齐的邮件先停一下。若 {{company}} 近期不看这块，我就先从跟进列表拿掉，避免打扰。

若仍有兴趣，回一个「继续」+ 方便时段即可。

Thanks / 谢谢。`,
  },
];

/** Map stage → default intent for 建议下一句 */
export function intentForStage(stage: string): IntentName {
  switch (stage) {
    case "新线索":
      return "破冰";
    case "已触达":
      return "价值";
    case "已回复":
    case "跟进中":
      return "催约";
    case "对齐中":
      return "催约";
    case "勿联系":
      return "停损";
    default:
      return "破冰";
  }
}

export function findIntentTemplate(
  templates: Array<{ name: string; subject: string; body: string }>,
  intent: IntentName
) {
  return templates.find((t) => t.name === intent || t.name.includes(intent)) || null;
}

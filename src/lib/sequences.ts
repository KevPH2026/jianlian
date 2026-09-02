export const DEFAULT_SEQUENCE_STEPS = [
  {
    order: 0,
    dayOffset: 0,
    isNurture: false,
    subject: "{{company}} 合作机会 — 自我介绍",
    body: `Hi {{name}},

我是负责 {{company}} 所在市场的客户经理。看到贵司在相关品类上的需求，想介绍我们可稳定供货的方案与交期。

方便本周用 15 分钟沟通规格与目标数量吗？

谢谢。`,
  },
  {
    order: 1,
    dayOffset: 3,
    isNurture: false,
    subject: "{{name}}，补充一点对 {{company}} 有用的信息",
    body: `Hi {{name}},

跟进上次邮件。我们服务同类采购团队时，通常能在交期与 MOQ 上给出更灵活的组合，也方便对接 {{title}} 关注的质量文件。

若当前不在采购窗口，回我一句时间即可。`,
  },
  {
    order: 2,
    dayOffset: 7,
    isNurture: false,
    subject: "{{company}} 同行如何推进同类项目",
    body: `Hi {{name}},

简单分享：近期同类进口商先小批量试样、再锁定长期柜量，把质量风险压到最低。

如果 {{company}} 也在评估供应商，我可以把试样流程和周期发你。`,
  },
  {
    order: 3,
    dayOffset: 14,
    isNurture: false,
    subject: "最后跟进 {{company}} / {{name}}",
    body: `Hi {{name}},

这是本轮最后一封跟进。若暂时不需要，我先不打扰，后续有新品或价格变动再同步。

也可直接回复你方便的渠道（邮件即可）。祝顺利。`,
  },
] as const;

export type EnrollmentStatusLike = "ACTIVE" | "PAUSED" | "COMPLETED" | "NURTURE";

export function pauseOnReply(status: EnrollmentStatusLike): {
  status: EnrollmentStatusLike;
  pauseReason?: string;
} {
  if (status === "ACTIVE" || status === "NURTURE") {
    return { status: "PAUSED", pauseReason: "reply" };
  }
  return { status };
}

export function pauseOnDoNotContact(status: EnrollmentStatusLike): {
  status: EnrollmentStatusLike;
  pauseReason?: string;
} {
  if (status === "ACTIVE" || status === "NURTURE") {
    return { status: "PAUSED", pauseReason: "doNotContact" };
  }
  return { status };
}

export function shouldPauseEnrollment(opts: {
  doNotContact?: boolean;
  stage?: string;
  hasReply?: boolean;
}): { pause: boolean; reason: "reply" | "doNotContact" | null } {
  if (opts.doNotContact || opts.stage === "DO_NOT_CONTACT") {
    return { pause: true, reason: "doNotContact" };
  }
  if (opts.hasReply) return { pause: true, reason: "reply" };
  return { pause: false, reason: null };
}

export function afterStepSent(input: {
  currentStep: number;
  steps: { dayOffset: number; isNurture?: boolean }[];
  enrolledAt: Date;
}): {
  status: EnrollmentStatusLike;
  currentStep: number;
  nextSendAt: Date | null;
} {
  const nextIndex = input.currentStep + 1;
  if (nextIndex >= input.steps.length) {
    return { status: "NURTURE", currentStep: nextIndex, nextSendAt: null };
  }
  const next = input.steps[nextIndex];
  const nextSendAt = new Date(
    input.enrolledAt.getTime() + next.dayOffset * 24 * 60 * 60 * 1000
  );
  return { status: "ACTIVE", currentStep: nextIndex, nextSendAt };
}

export function stepDueAt(enrolledAt: Date, dayOffset: number): Date {
  return new Date(enrolledAt.getTime() + dayOffset * 24 * 60 * 60 * 1000);
}

import { describe, expect, it } from "vitest";
import {
  applyInboundReply,
  pauseOnDoNotContact,
  pauseOnReply,
  parseSteps,
  advanceAfterStep,
  shouldPauseOnReply,
} from "../src/lib/sequence";

describe("序列：回复自动暂停", () => {
  it("pauseOnReply 将 active 设为 paused/replied", () => {
    const next = pauseOnReply({ status: "active", currentStep: 0 });
    expect(next.status).toBe("paused");
    expect(next.pausedReason).toBe("replied");
  });

  it("applyInboundReply 只暂停 active 报名", () => {
    const result = applyInboundReply([
      { id: "a", status: "active", currentStep: 0 },
      { id: "b", status: "completed", currentStep: 3 },
      { id: "c", status: "paused", currentStep: 1, pausedReason: "doNotContact" },
    ]);
    expect(result[0].status).toBe("paused");
    expect(result[0].pausedReason).toBe("replied");
    expect(result[1].status).toBe("completed");
    expect(result[2].pausedReason).toBe("doNotContact");
  });

  it("doNotContact 优先暂停", () => {
    const r = shouldPauseOnReply({ status: "active", currentStep: 0 }, { doNotContact: true });
    expect(r.pause).toBe(true);
    expect(r.reason).toBe("doNotContact");
    const next = pauseOnDoNotContact({ status: "active", currentStep: 1 });
    expect(next.pausedReason).toBe("doNotContact");
  });

  it("parseSteps 解析 day0 邮件 + 等待 + 跟进", () => {
    const steps = parseSteps([
      { type: "email", templateId: "t1" },
      { type: "wait", waitDays: 3 },
      { type: "email", templateId: "t2" },
    ]);
    expect(steps).toHaveLength(3);
    expect(steps[1]).toEqual({ type: "wait", waitDays: 3 });
  });

  it("advanceAfterStep 在 wait 步计算 nextRunAt", () => {
    const now = new Date("2026-09-03T00:00:00.000Z");
    const steps = parseSteps([
      { type: "email", templateId: "t1" },
      { type: "wait", waitDays: 3 },
      { type: "email", templateId: "t2" },
    ]);
    const after0 = advanceAfterStep({ status: "active", currentStep: 0 }, steps, now);
    expect(after0.currentStep).toBe(1);
    expect(after0.nextRunAt?.toISOString()).toBe("2026-09-06T00:00:00.000Z");
  });
});

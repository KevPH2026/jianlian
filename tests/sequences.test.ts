import { describe, expect, it } from "vitest";
import {
  afterStepSent,
  pauseOnDoNotContact,
  pauseOnReply,
  shouldPauseEnrollment,
} from "@/lib/sequences";

describe("pause-on-reply", () => {
  it("pauses active enrollment on reply", () => {
    expect(pauseOnReply("ACTIVE")).toEqual({ status: "PAUSED", pauseReason: "reply" });
  });

  it("pauses nurture on reply", () => {
    expect(pauseOnReply("NURTURE").status).toBe("PAUSED");
  });

  it("leaves already paused/completed unchanged", () => {
    expect(pauseOnReply("PAUSED")).toEqual({ status: "PAUSED" });
    expect(pauseOnReply("COMPLETED")).toEqual({ status: "COMPLETED" });
  });

  it("pauses on do-not-contact", () => {
    expect(pauseOnDoNotContact("ACTIVE")).toEqual({
      status: "PAUSED",
      pauseReason: "doNotContact",
    });
  });

  it("shouldPauseEnrollment reasons", () => {
    expect(shouldPauseEnrollment({ hasReply: true })).toEqual({ pause: true, reason: "reply" });
    expect(shouldPauseEnrollment({ stage: "DO_NOT_CONTACT" }).reason).toBe("doNotContact");
    expect(shouldPauseEnrollment({ doNotContact: true }).pause).toBe(true);
    expect(shouldPauseEnrollment({}).pause).toBe(false);
  });

  it("moves to nurture after last step", () => {
    const steps = [{ dayOffset: 0 }, { dayOffset: 3 }, { dayOffset: 7 }, { dayOffset: 14 }];
    const enrolledAt = new Date("2026-01-01T00:00:00Z");
    const after3 = afterStepSent({ currentStep: 3, steps, enrolledAt });
    expect(after3.status).toBe("NURTURE");
    expect(after3.nextSendAt).toBeNull();
  });

  it("schedules next send from enrolledAt + offset", () => {
    const steps = [{ dayOffset: 0 }, { dayOffset: 3 }, { dayOffset: 7 }, { dayOffset: 14 }];
    const enrolledAt = new Date("2026-01-01T00:00:00Z");
    const after0 = afterStepSent({ currentStep: 0, steps, enrolledAt });
    expect(after0.status).toBe("ACTIVE");
    expect(after0.currentStep).toBe(1);
    expect(after0.nextSendAt?.toISOString()).toBe("2026-01-04T00:00:00.000Z");
  });
});

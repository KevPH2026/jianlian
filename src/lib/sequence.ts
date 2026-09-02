export type SequenceStep =
  | { type: "wait"; waitDays: number }
  | { type: "email"; templateId: string }
  | { type: "whatsapp"; body: string };

export type EnrollmentLike = {
  status: string;
  currentStep: number;
  pausedReason?: string | null;
};

export type ContactLike = {
  doNotContact?: boolean | null;
};

export function parseSteps(raw: unknown): SequenceStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: SequenceStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const t = (item as { type?: string }).type;
    if (t === "wait") {
      const waitDays = Number((item as { waitDays?: number }).waitDays || 0);
      steps.push({ type: "wait", waitDays: Number.isFinite(waitDays) ? waitDays : 0 });
    } else if (t === "email") {
      const templateId = String((item as { templateId?: string }).templateId || "");
      if (templateId) steps.push({ type: "email", templateId });
    } else if (t === "whatsapp") {
      const body = String((item as { body?: string }).body || "");
      steps.push({ type: "whatsapp", body });
    }
  }
  return steps;
}

export function shouldPauseOnReply(enrollment: EnrollmentLike, contact: ContactLike): {
  pause: boolean;
  reason: string | null;
  status: string;
} {
  if (contact.doNotContact) {
    return { pause: true, reason: "doNotContact", status: "paused" };
  }
  if (enrollment.status === "paused" || enrollment.status === "completed") {
    return { pause: false, reason: enrollment.pausedReason || null, status: enrollment.status };
  }
  return { pause: false, reason: null, status: enrollment.status };
}

export function pauseOnReply(enrollment: EnrollmentLike): EnrollmentLike {
  return {
    ...enrollment,
    status: "paused",
    pausedReason: "replied",
  };
}

export function pauseOnDoNotContact(enrollment: EnrollmentLike): EnrollmentLike {
  return {
    ...enrollment,
    status: "paused",
    pausedReason: "doNotContact",
  };
}

export function applyInboundReply<T extends EnrollmentLike>(enrollments: T[]): T[] {
  return enrollments.map((e) => {
    if (e.status === "active") {
      return { ...e, status: "paused", pausedReason: "replied" };
    }
    return e;
  });
}

export function nextRunAt(from: Date, waitDays: number): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + Math.max(0, waitDays));
  return d;
}

export function advanceAfterStep(
  enrollment: EnrollmentLike,
  steps: SequenceStep[],
  now = new Date()
): { status: string; currentStep: number; nextRunAt: Date | null } {
  const nextIndex = enrollment.currentStep + 1;
  if (nextIndex >= steps.length) {
    return { status: "completed", currentStep: nextIndex, nextRunAt: null };
  }
  const step = steps[nextIndex];
  if (step.type === "wait") {
    return {
      status: "active",
      currentStep: nextIndex,
      nextRunAt: nextRunAt(now, step.waitDays),
    };
  }
  return { status: "active", currentStep: nextIndex, nextRunAt: now };
}

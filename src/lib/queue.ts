/**
 * Soft Redis / BullMQ helpers for serverless.
 * Never connect at module load; skip enqueue when REDIS_URL is unset.
 */

export function hasRedis(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export function redisConnectionFromEnv(): { host: string; port: number; password?: string } | null {
  const raw = process.env.REDIS_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      password: u.password ? decodeURIComponent(u.password) : undefined,
    };
  } catch {
    console.warn("[queue] invalid REDIS_URL, skip enqueue");
    return null;
  }
}

/** Enqueue a BullMQ job; no-op with log when Redis is unavailable. */
export async function enqueueSendJob(
  name: string,
  data: Record<string, unknown> = {}
): Promise<"queued" | "skipped"> {
  const connection = redisConnectionFromEnv();
  if (!connection) {
    console.warn(`[queue] REDIS_URL missing — skip enqueue "${name}" (worker/cron will poll)`);
    return "skipped";
  }
  try {
    const { Queue } = await import("bullmq");
    const queue = new Queue("jianlian-send", { connection });
    try {
      await queue.add(name, data, { removeOnComplete: 100, removeOnFail: 100 });
    } finally {
      await queue.close().catch(() => undefined);
    }
    return "queued";
  } catch (err) {
    console.warn(`[queue] enqueue "${name}" failed:`, err instanceof Error ? err.message : err);
    return "skipped";
  }
}

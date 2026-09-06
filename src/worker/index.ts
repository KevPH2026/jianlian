import { processCampaigns, processDueSequences } from "../lib/send";
import { findContactsByEmail, recordInboundReply } from "../lib/inbox";
import { hasRedis, redisConnectionFromEnv } from "../lib/queue";

async function tick() {
  const seq = await processDueSequences(20);
  const camp = await processCampaigns(20);
  if (seq || camp) {
    console.log(`[worker] sequences=${seq} campaigns=${camp} dryRun=${!process.env.SMTP_HOST}`);
  }
  await pollImap().catch((err) => console.warn("[imap]", err?.message || err));
}

async function pollImap() {
  const host = process.env.IMAP_HOST;
  if (!host) return;
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host,
    port: Number(process.env.IMAP_PORT || 993),
    secure: String(process.env.IMAP_SECURE || "true") !== "false",
    auth: {
      user: process.env.IMAP_USER || "",
      pass: process.env.IMAP_PASS || "",
    },
    logger: false,
  });
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const unseen = await client.search({ seen: false });
      const ids = Array.isArray(unseen) ? unseen.slice(0, 20) : [];
      for await (const msg of client.fetch(ids, { envelope: true, source: true })) {
        const from = msg.envelope?.from?.[0]?.address || "";
        const subject = msg.envelope?.subject || "";
        const contacts = from ? await findContactsByEmail(from) : [];
        for (const contact of contacts) {
          const body = `主题: ${subject}`;
          await recordInboundReply({
            contactId: contact.id,
            channel: "email",
            body,
            subject,
          });
        }
        if (msg.uid) {
          await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

async function main() {
  console.log("建联 worker 启动");
  let worker: { close: () => Promise<void> } | null = null;
  let queue: { close: () => Promise<void> } | null = null;

  const connection = redisConnectionFromEnv();
  if (connection && hasRedis()) {
    const { Queue, Worker } = await import("bullmq");
    const q = new Queue("jianlian-send", { connection });
    queue = q;
    await q.add("tick", {}, { repeat: { every: 15_000 }, removeOnComplete: 50, removeOnFail: 50 });
    const w = new Worker(
      "jianlian-send",
      async () => {
        await tick();
      },
      { connection, concurrency: 1 }
    );
    worker = w;
    w.on("failed", (job, err) => {
      console.error("job failed", job?.name, err);
    });
    console.log("[worker] BullMQ connected via REDIS_URL");
  } else {
    console.warn("[worker] REDIS_URL missing — polling with setInterval only (no BullMQ)");
  }

  await tick();
  setInterval(() => {
    tick().catch((e) => console.error(e));
  }, 20_000);

  const shutdown = async () => {
    if (worker) await worker.close();
    if (queue) await queue.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// src/lib/email-queue.ts
import { prisma } from "@/lib/prisma";
import { qstash } from "./qstash";

export type EmailJobType = "ORDER_CONFIRMATION" | "ORDER_READY";

export async function queueEmailJob(opts: {
  type: EmailJobType;
  to: string;
  orderId?: string;
  storeId?: string;
  userId?: string;
}) {
  const { type, to, orderId, storeId, userId } = opts;

  if (!to) {
    // silently skip if no email; you can log if you want
    return null;
  }

  // 1) Create DB record first
  const email = await prisma.email.create({
    data: {
      type,
      to,
      subject: "", // will be filled by worker when it builds the email
      status: "PENDING",
      attempts: 0,
      lastError: null,
      orderId: orderId ?? null,
      storeId: storeId ?? null,
      userId: userId ?? null,
    },
  });

  // 2) Push job to QStash with just emailId
  await qstash.publishJSON({
    url: `${process.env.BASE_URL}/api/qstash/email-worker`,
    body: {
      emailId: email.id,
    },
  });

  return email;
}

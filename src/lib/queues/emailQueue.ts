// src/lib/queues/emailQueue.ts
import { Client } from "@upstash/qstash";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

type EnqueueOrderConfirmationArgs = {
  tenantId: string;
  orderId: string;
  userId: string;
};

export async function enqueueOrderConfirmationEmail(
  args: EnqueueOrderConfirmationArgs,
) {
  await qstash.publishJSON({
    url: `${process.env.BASE_URL}/api/qstash/order-confirmation`,
    body: {
      type: "ORDER_CONFIRMATION",
      tenantId: args.tenantId,
      orderId: args.orderId,
      userId: args.userId,
      // If you really want, you can also pass email address here,
      // but orderId+tenantId is enough to look everything up.
    },
  });
}

export async function enqueueOrderReadyEmail(payload: {
  tenantId: string;
  to: string;
  customerName: string;
  storeName: string;
  orderId: string;
  pickupCode: string;
  fulfilmentType: "COLLECTION" | "DELIVERY";
}) {
  await qstash.publishJSON({
    url: `${process.env.BASE_URL}/api/qstash/order-ready-email`,
    body: {
      type: "order_ready",
      ...payload,
    },
  });
}

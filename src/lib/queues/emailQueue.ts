// src/lib/queues/emailQueue.ts
import { Client } from "@upstash/qstash";

type EnqueueOrderConfirmationArgs = {
  tenantId: string;
  orderId: string;
  userId: string;
};

type EnqueueOrderReadyEmailArgs = {
  tenantId: string;
  to: string;
  customerName: string;
  storeName: string;
  orderId: string;
  pickupCode: string;
  fulfilmentType: "COLLECTION" | "DELIVERY";
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getAppUrl() {
  const raw =
    process.env.APP_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const withScheme =
    raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `http://${raw}`;

  return withScheme.replace(/\/$/, "");
}

function getQstashClient() {
  return new Client({
    token: getRequiredEnv("QSTASH_TOKEN"),
    baseUrl: process.env.QSTASH_URL || undefined,
  });
}

function buildUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppUrl()}${cleanPath}`;
}

export async function enqueueOrderConfirmationEmail({
  tenantId,
  orderId,
  userId,
}: EnqueueOrderConfirmationArgs) {
  const qstash = getQstashClient();
  const destinationUrl = buildUrl("/api/qstash/order-confirmation");

  const result = await qstash.publishJSON({
    url: destinationUrl,
    retries: 5,
    body: {
      type: "ORDER_CONFIRMATION",
      tenantId,
      orderId,
      userId,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("[emailQueue] order confirmation job queued", {
      destinationUrl,
      tenantId,
      orderId,
      userId,
      messageId: result.messageId,
    });
  }

  return result;
}

export async function enqueueOrderReadyEmail({
  tenantId,
  to,
  customerName,
  storeName,
  orderId,
  pickupCode,
  fulfilmentType,
}: EnqueueOrderReadyEmailArgs) {
  const qstash = getQstashClient();
  const destinationUrl = buildUrl("/api/qstash/order-ready-email");

  const result = await qstash.publishJSON({
    url: destinationUrl,
    retries: 5,
    body: {
      type: "ORDER_READY",
      tenantId,
      to,
      customerName,
      storeName,
      orderId,
      pickupCode,
      fulfilmentType,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("[emailQueue] order ready job queued", {
      destinationUrl,
      tenantId,
      to,
      orderId,
      messageId: result.messageId,
    });
  }

  return result;
}
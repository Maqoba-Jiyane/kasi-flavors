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
  const appUrl = getAppUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${appUrl}${cleanPath}`;
}

export async function enqueueOrderConfirmationEmail({
  tenantId,
  orderId,
  userId,
}: EnqueueOrderConfirmationArgs) {
  const qstash = getQstashClient();

  const destinationUrl = buildUrl("/api/qstash/order-confirmation");

  return qstash.publishJSON({
    url: destinationUrl,
    body: {
      type: "ORDER_CONFIRMATION",
      tenantId,
      orderId,
      userId,
    },
  });
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

  return qstash.publishJSON({
    url: destinationUrl,
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
}
// app/api/qstash/order-confirmation-email/route.ts
import { buildOrderConfirmationEmail } from "@/lib/email/templates";
import { sendWithTransport } from "@/lib/email/transport";
import { getTenantEmailConfig } from "@/lib/tenant-email-config";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger"; // your structured logger

export async function POST(req: Request) {
  const jobId = req.headers.get("upstash-job-id") ?? "unknown";

  try {
    const body = await req.json();

    const {
      tenantId,
      to,
      customerName,
      storeName,
      orderId,
      pickupCode,
      trackingToken,
      fulfilmentType,
      items,
      totalCents,
    } = body;

    const tenantConfig = await getTenantEmailConfig(tenantId);

    const email = buildOrderConfirmationEmail({
      tenantConfig,
      to,
      customerName,
      storeName,
      orderId,
      pickupCode,
      trackingToken,
      fulfilmentType,
      items,
      totalCents,
    });

    await sendWithTransport(email);

    logger.info("Email sent", {
      jobId,
      tenantId,
      template: "order_confirmation",
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    logger.error("Email send failed", {
      jobId,
      template: "order_confirmation",
      // No PII, no HTML.
      error: err instanceof Error ? err.message : "Unknown error",
    });

    // Let QStash handle retries based on non-2xx status
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

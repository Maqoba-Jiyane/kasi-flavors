// app/api/qstash/order-ready-email/route.ts
import { buildOrderReadyEmail } from "@/lib/email/templates";
import { sendWithTransport } from "@/lib/email/transport";
import { getTenantEmailConfig } from "@/lib/tenant-email-config";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

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
      fulfilmentType,
    } = body;

    const tenantConfig = await getTenantEmailConfig(tenantId);

    const email = buildOrderReadyEmail({
      tenantConfig,
      to,
      customerName,
      storeName,
      orderId,
      pickupCode,
      fulfilmentType,
    });

    await sendWithTransport(email);

    logger.info("Email sent", {
      jobId,
      tenantId,
      template: "order_ready",
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    logger.error("Email send failed", {
      jobId,
      template: "order_ready",
      error: err instanceof Error ? err.message : "Unknown error",
    });

    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

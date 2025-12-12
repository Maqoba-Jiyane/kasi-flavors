// app/api/qstash/order-confirmation/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantEmailConfig } from "@/lib/tenant-email-config";
import { buildOrderConfirmationEmail } from "@/lib/email/templates";
import { sendWithTransport } from "@/lib/email/transport";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const jobId = req.headers.get("upstash-job-id") ?? "unknown";

  try {
    const { tenantId, orderId, userId } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        items: true,
        customer: true,
      },
    });

    if (!order || order.customerId !== userId || !order.customer) {
      logger.warn("Order not found or user mismatch for email job", {
        jobId,
        tenantId,
        orderId,
        userId,
      });
      // Don't retry forever for invalid jobs
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const tenantConfig = await getTenantEmailConfig(tenantId);

    // 1) Create email record as PENDING
    const emailRecord = await prisma.email.create({
      data: {
        type: "ORDER_CONFIRMATION",
        to: order.customerEmail || order.customer.email,
        subject: "", // will be filled after build
        status: "PENDING",
        orderId: order.id,
        storeId: order.storeId,
        userId: order.customerId,
      },
    });

    const built = buildOrderConfirmationEmail({
      tenantConfig,
      to: order.customerEmail || order.customer.email,
      customerName: order.customer.name ?? "",
      storeName: order.store.name,
      orderId: order.id,
      pickupCode: order.pickupCode,
      trackingToken: order.trackingToken,
      fulfilmentType: order.fulfilmentType,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        totalCents: i.totalCents,
      })),
      totalCents: order.totalCents,
    });

    // 2) Update email subject now that it's built
    await prisma.email.update({
      where: { id: emailRecord.id },
      data: { subject: built.subject },
    });

    // 3) Send email
    await sendWithTransport(built);

    await prisma.email.update({
      where: { id: emailRecord.id },
      data: { status: "SENT" },
    });

    logger.info("Order confirmation email sent", {
      jobId,
      tenantId,
      orderId,
      emailId: emailRecord.id,
      template: "order_confirmation",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("Order confirmation email failed", {
      jobId,
      error: err instanceof Error ? err.message : "Unknown error",
    });

    // Non-2xx will cause QStash to retry according to its policy
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

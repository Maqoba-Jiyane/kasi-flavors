// app/api/qstash/order-confirmation/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantEmailConfig } from "@/lib/tenant-email-config";
import { buildOrderConfirmationEmail } from "@/lib/email/templates";
import { sendWithTransport } from "@/lib/email/transport";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function getJobId(req: Request) {
  return (
    req.headers.get("upstash-message-id") ||
    req.headers.get("upstash-job-id") ||
    req.headers.get("x-job-id") ||
    "unknown"
  );
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRetryableEmailError(error: unknown) {
  if (!(error instanceof Error)) return true;

  const message = error.message.toLowerCase();

  return (
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("econnrefused") ||
    message.includes("socket") ||
    message.includes("timeout")
  );
}

export async function POST(req: Request) {
  const jobId = getJobId(req);

  let emailRecordId: string | null = null;

  try {
    const body = await req.json();

    const tenantId = asString(body?.tenantId);
    const orderId = asString(body?.orderId);
    const userId = asString(body?.userId);

    if (!tenantId || !orderId || !userId) {
      logger.warn("Missing order confirmation email job fields", {
        jobId,
        tenantId,
        orderId,
        userId,
      });

      // Bad job payload. Do not retry forever.
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        items: true,
        customer: true,
      },
    });

    if (!order) {
      logger.warn("Order not found for email job", {
        jobId,
        tenantId,
        orderId,
        userId,
      });

      // Invalid job. Do not retry forever.
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 400 },
      );
    }

    if (order.customerId !== userId) {
      logger.warn("Order user mismatch for email job", {
        jobId,
        tenantId,
        orderId,
        userId,
        orderCustomerId: order.customerId,
      });

      // Invalid job. Do not retry forever.
      return NextResponse.json(
        { ok: false, error: "User mismatch" },
        { status: 400 },
      );
    }

    const recipientEmail = order.customerEmail || order.customer?.email;

    if (!recipientEmail) {
      logger.warn("Order has no recipient email", {
        jobId,
        tenantId,
        orderId,
        userId,
      });

      // Invalid job. Do not retry forever.
      return NextResponse.json(
        { ok: false, error: "Missing recipient email" },
        { status: 400 },
      );
    }

    const alreadySent = await prisma.email.findFirst({
      where: {
        type: "ORDER_CONFIRMATION",
        orderId: order.id,
        to: recipientEmail,
        status: "SENT",
      },
      select: {
        id: true,
      },
    });

    if (alreadySent) {
      logger.info("Order confirmation email already sent", {
        jobId,
        tenantId,
        orderId,
        emailId: alreadySent.id,
      });

      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Email already sent",
      });
    }

    const tenantConfig = await getTenantEmailConfig(tenantId);

    const built = buildOrderConfirmationEmail({
      tenantConfig,
      to: recipientEmail,
      customerName: order.customerName || order.customer?.name || "there",
      storeName: order.store.name,
      orderId: order.id,
      pickupCode: order.pickupCode,
      trackingToken: order.trackingToken,
      fulfilmentType: order.fulfilmentType,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        totalCents: item.totalCents,
      })),
      totalCents: order.totalCents,
    });

    const emailRecord = await prisma.email.create({
      data: {
        type: "ORDER_CONFIRMATION",
        to: recipientEmail,
        subject: built.subject,
        status: "PENDING",
        orderId: order.id,
        storeId: order.storeId,
        userId: order.customerId,
      },
    });

    emailRecordId = emailRecord.id;

    try {
      await sendWithTransport(built);

      await prisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status: "SENT",
          lastError: null,
        },
      });

      logger.info("Order confirmation email sent", {
        jobId,
        tenantId,
        orderId,
        emailId: emailRecord.id,
        template: "order_confirmation",
      });

      return NextResponse.json({ ok: true });
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Unknown email send error";

      await prisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status: "FAILED",
          lastError: message,
          attempts: {
            increment: 1,
          },
        },
      });

      logger.error("Order confirmation email transport failed", {
        jobId,
        tenantId,
        orderId,
        emailId: emailRecord.id,
        error: message,
      });

      if (isRetryableEmailError(sendError)) {
        return NextResponse.json(
          { ok: false, error: "Retryable email transport error" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { ok: false, error: "Non-retryable email transport error" },
        { status: 400 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logger.error("Order confirmation email job failed", {
      jobId,
      emailRecordId,
      error: message,
    });

    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

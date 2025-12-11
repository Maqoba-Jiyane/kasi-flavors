// app/api/qstash/email-worker/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildOrderConfirmationEmail,
  buildOrderReadyEmail,
  sendRawEmail,
} from "@/lib/email";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(req: Request) {
  const bodyText = await req.text();

  let payload: { emailId?: string };
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailId = payload.emailId;
  if (!emailId) {
    return NextResponse.json({ error: "Missing emailId" }, { status: 400 });
  }

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      order: {
        include: {
          items: true,
          store: true,
        },
      },
      store: true,
      user: true,
    },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  // Mark as SENDING + increment attempts
  await prisma.email.update({
    where: { id: email.id },
    data: {
      status: "SENDING",
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  try {
    let subject: string;
    let html: string;

    switch (email.type) {
      case "ORDER_CONFIRMATION": {
        if (!email.order || !email.order.store) {
          throw new Error("Order / store missing for ORDER_CONFIRMATION");
        }

        const built = buildOrderConfirmationEmail({
          to: email.to,
          customerName: email.order.customerName ?? "",
          storeName: email.order.store.name,
          orderId: email.order.id,
          pickupCode: email.order.pickupCode,
          fulfilmentType: email.order.fulfilmentType,
          totalCents: email.order.totalCents,
          items: email.order.items,
          trackingToken: email.order.trackingToken,
        });

        subject = built.subject;
        html = built.html;
        break;
      }
      case "ORDER_READY": {
        if (!email.order || !email.order.store) {
          throw new Error("Order / store missing for ORDER_READY");
        }

        const built = buildOrderReadyEmail({
          to: email.to,
          customerName: email.order.customerName ?? "",
          storeName: email.order.store.name,
          orderId: email.order.id,
          pickupCode: email.order.pickupCode,
          fulfilmentType: email.order.fulfilmentType,
        });

        subject = built.subject;
        html = built.html;
        break;
      }
      default:
        throw new Error(`Unknown email type: ${email.type}`);
    }

    await sendRawEmail({ to: email.to, subject, html });

    await prisma.email.update({
      where: { id: email.id },
      data: {
        status: "SENT",
        subject,
        lastError: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Email worker failed:", err);
    await prisma.email.update({
      where: { id: email.id },
      data: {
        status: "FAILED",
        lastError: err?.message ?? "Unknown error",
      },
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// Wrap with QStash signature verification for App Router
export const POST = verifySignatureAppRouter(handler);

// lib/queues/whatsappQueue.ts
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationWhatsApp } from "@/lib/twilio/orderNotifications";
import { sendOrderReadyWhatsApp } from "@/lib/twilio/orderNotifications";

type EnqueueOrderConfirmationWhatsAppArgs = {
  orderId: string;
  userId: string;
};

/**
 * Thin abstraction so you can later swap implementation to a real queue (QStash, worker, etc).
 * For now, this fetches the order + store + phone and calls Twilio directly.
 */
export async function enqueueOrderConfirmationWhatsApp(
  args: EnqueueOrderConfirmationWhatsAppArgs
) {
  const { orderId, userId } = args;

  // Fetch the order + store + phone
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId: userId },
    include: {
      store: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!order) {
    console.warn("[whatsappQueue] order not found for WhatsApp confirmation", {
      orderId,
      userId,
    });
    return;
  }

  const phone = order.customerPhone?.trim();
  if (!phone) {
    // No phone, nothing to do
    console.info(
      "[whatsappQueue] skipping WhatsApp order confirmation: no phone on order",
      {
        orderId,
      }
    );
    return;
  }

  const storeName = order.store?.name || "Kasi Flavors";
  const fullName = order.customerName || "";
  const firstName = fullName.split(" ")[0] || fullName;

  const shortOrderId = order.id.slice(-6).toUpperCase();

  try {
    await sendOrderConfirmationWhatsApp({
      toPhone: phone,
      customerName: firstName,
      storeName,
      shortOrderId,
      fulfilmentType:
        order.fulfilmentType === "DELIVERY" ? "DELIVERY" : "COLLECTION",
    });
  } catch (err) {
    // Best-effort only; we do NOT want to break anything if WhatsApp fails
    console.error(
      "[whatsappQueue] failed to send order confirmation via WhatsApp",
      {
        orderId,
        message: (err as any)?.message,
      }
    );
  }
}

type EnqueueOrderReadyWhatsAppArgs = {
  customerName: string;
  fulfilmentType: "COLLECTION" | "DELIVERY";
  orderId: string;
  pickupCode?: string | null;
  storeName: string;
  to: string; // phone
  status: "READY_FOR_COLLECTION" | "OUT_FOR_DELIVERY";
};

export async function enqueueOrderReadyWhatsApp(
  args: EnqueueOrderReadyWhatsAppArgs
) {
  const {
    customerName,
    fulfilmentType,
    orderId,
    pickupCode,
    storeName,
    to,
    status,
  } = args;

  const phone = to.trim();
  if (!phone) {
    console.info(
      "[whatsappQueue] skipping ready WhatsApp: no phone provided",
      { orderId }
    );
    return;
  }

  const shortOrderId = orderId.slice(-6).toUpperCase();
  const firstName = (customerName || "").split(" ")[0] || customerName;

  try {
    await sendOrderReadyWhatsApp({
      toPhone: phone,
      customerName: firstName,
      storeName,
      shortOrderId,
      pickupCode: pickupCode ?? undefined,
      fulfilmentType,
      status,
    });
  } catch (err) {
    console.error(
      "[whatsappQueue] failed to send order ready WhatsApp",
      {
        orderId,
        message: (err as any)?.message,
      }
    );
  }
}

// src/app/(dashboard)/owner/store/orders/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { chargePlatformFeeOnCompletion } from "@/lib/billing";
import { enqueueOrderReadyEmail } from "@/lib/queues/emailQueue";
import { enqueueOrderReadyWhatsApp } from "@/lib/queues/whatsappQueue";

const ALLOWED_READY_FROM_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREPARATION",
];

export async function markOrderReady(
  orderId: string,
  mode: "COLLECTION" | "DELIVERY",
) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  if (!user?.store?.id) {
    throw new Error("Store not linked");
  }

  // Find order scoped to this store
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: user.store.id,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Enforce allowed transitions
  if (!ALLOWED_READY_FROM_STATUSES.includes(order.status)) {
    // You can either throw or silently ignore; throwing is clearer for now.
    throw new Error("Cannot mark this order as ready from its current status");
  }

  const newStatus: OrderStatus =
    mode === "COLLECTION" ? "READY_FOR_COLLECTION" : "OUT_FOR_DELIVERY";

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: newStatus,
    },
  });

  // Only send email if we have a customerEmail
  if (order.customerEmail) {
    try {
      // await sendOrderReadyEmail({
      //   to: order.customerEmail,
      //   orderId: order.id,
      //   customerName: order.customerName || "Walk-in",
      //   storeName: user.store.name ?? "Your Store",
      //   fulfilmentType: order.fulfilmentType,
      //   pickupCode: order.pickupCode,
      // });

      await enqueueOrderReadyEmail({
        customerName: user.name, fulfilmentType: order.fulfilmentType, orderId: order.id, pickupCode: order.pickupCode, storeName: "Kasi Store", tenantId: order.storeId, to: user.email
      })
    } catch (err) {
      console.error("Failed to send order ready email", err);
      // Do not roll back status if email fails
    }
  }

  // Optional but recommended for consistency:
  revalidatePath("/owner/store/orders");

  return updated;
}

const VALID_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREPARATION",
  "READY_FOR_COLLECTION",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["READY_FOR_COLLECTION", "OUT_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_COLLECTION: ["COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // final
  CANCELLED: [], // final
};

export async function updateOrderStatus(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const statusValue = formData.get("status");

  if (!orderId || !statusValue) {
    throw new Error("Missing orderId or status");
  }

  const nextStatusRaw = String(statusValue);

  // 1) Validate nextStatus is a known enum value
  if (!VALID_STATUSES.includes(nextStatusRaw as OrderStatus)) {
    throw new Error("Invalid status value");
  }

  const nextStatus = nextStatusRaw as OrderStatus;

  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  // 2) Ensure this owner actually has a store
  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });

  if (!store) {
    throw new Error("No store linked to this account");
  }

  // 3) Make sure the order belongs to this store owner
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: store.id,
    },
    include: {
      store: true,
    },
  });

  if (!order) {
    throw new Error("Order not found for this store owner");
  }

  const previousStatus = order.status;

  // 4) Enforce allowed transitions
  const allowedNext = ALLOWED_TRANSITIONS[previousStatus] || [];
  if (!allowedNext.includes(nextStatus)) {
    return {
      success: false,
      error: `Cannot change status from ${previousStatus} to ${nextStatus}`,
    };
  }  

  // 5) Update the status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
    },
  });

  // 6) If order just became COMPLETED, charge platform fee
  if (nextStatus === "COMPLETED" && previousStatus !== "COMPLETED") {
    await chargePlatformFeeOnCompletion(order.id);
  }

  // 7) Decide if we should send "order ready" email
  const becameReadyForCollection =
    nextStatus === "READY_FOR_COLLECTION" &&
    previousStatus !== "READY_FOR_COLLECTION";


  const becameOutForDelivery =
    nextStatus === "OUT_FOR_DELIVERY" &&
    previousStatus !== "OUT_FOR_DELIVERY";

  const shouldSendReadyEmail =
    (becameReadyForCollection || becameOutForDelivery) &&
    !!order.customerEmail;

  if (shouldSendReadyEmail) {
    try {
      await enqueueOrderReadyEmail({
        customerName: user.name, fulfilmentType: order.fulfilmentType, orderId: order.id, pickupCode: order.pickupCode, storeName: order.store.name, tenantId: order.storeId, to: order.customerEmail || user.email
      })
    } catch (err) {
      console.error("Failed to send order ready email", err);
      // don't break the status update if email fails
    }
  }

const shouldSendReadyWhatsApp =
  (becameReadyForCollection || becameOutForDelivery) &&
  !!order.customerPhone; // or order.customerPhone / order.customer?.phone depending on your model

if (shouldSendReadyWhatsApp) {
  try {
    await enqueueOrderReadyWhatsApp({
      customerName: user.name,
      fulfilmentType: order.fulfilmentType,
      orderId: order.id,
      pickupCode: order.pickupCode,
      storeName: order.store.name,
      to: order.customerPhone!, // adjust to whatever field you store the phone on
      status: becameOutForDelivery
        ? "OUT_FOR_DELIVERY"
        : "READY_FOR_COLLECTION",
    });
  } catch (err) {
    console.error("Failed to send order ready WhatsApp", err);
    // don't break the status update if WhatsApp fails
  }
}


  // 7) Refresh the orders page on the server
  revalidatePath("/owner/store/orders");

  return {
    success: true,
    error: `Status changed from ${previousStatus} to ${nextStatus}`,
  };
}


export async function confirmOrderWithCode(formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const orderId = (formData.get("orderId") as string | "").trim();
  const rawCode = (formData.get("code") as string | "").trim();

  if (!orderId || !rawCode) {
    // Silent no-op (MVP); can wire to form error state later
    return;
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });

  if (!store) return;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: store.id,
    },
  });

  if (!order) {
    // Not this store's order or does not exist
    return;
  }

  // Only allow confirmation at the final step
  if (
    order.status !== "READY_FOR_COLLECTION" &&
    order.status !== "OUT_FOR_DELIVERY"
  ) {
    return;
  }

  const code = rawCode;
  if (order.pickupCode !== code) {
    // Wrong code – ignore for now (no timing difference / error leak)
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  // Charge platform fee for this completed order
  await chargePlatformFeeOnCompletion(orderId);

  revalidatePath("/owner/store/orders");
}
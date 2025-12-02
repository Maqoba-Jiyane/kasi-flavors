// src/app/(dashboard)/owner/store/orders/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { sendOrderReadyEmail } from "@/lib/email";
import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function markOrderReady(
  orderId: string,
  mode: "COLLECTION" | "DELIVERY"
) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  if (!user?.store?.id) {
    throw new Error("Store not linked");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: user.store?.id },
  });

  if (!order) throw new Error("Order not found");

  const newStatus =
    mode === "COLLECTION" ? "READY_FOR_COLLECTION" : "OUT_FOR_DELIVERY";

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: newStatus },
  });

  await sendOrderReadyEmail({ to: order.customerEmail || "",orderId: order.id,
    // phone: order.customerPhone,
    customerName: order.customerName || 'Walk-in',
    storeName: user.store?.name ?? "Your Store",
    fulfilmentType: order.fulfilmentType,
    pickupCode: order.pickupCode,
  });

  return updated;
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const statusValue = formData.get("status");

  if (!orderId || !statusValue) {
    throw new Error("Missing orderId or status");
  }

  const nextStatus = statusValue as OrderStatus;

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  if (user.role !== "STORE_OWNER") {
    throw new Error("Not authorised");
  }

  const store = await prisma.store.findUnique({
    where: {
      ownerId: user.id
    }
  })

  // Make sure the order belongs to this store owner
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: store?.id,
    },
    include: {
      store: true,
    },
  });

  if (!order) {
    throw new Error("Order not found for this store owner: ");
  }

  const previousStatus = order.status;

  // TODO: If you want, enforce allowed transitions here (e.g. can't go from PENDING -> COMPLETED directly)

  // Update the status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
    },
  });

  // Decide if we should send "order ready" email
  const becameReadyForCollection =
    nextStatus === "READY_FOR_COLLECTION" &&
    previousStatus !== "READY_FOR_COLLECTION";

  const becameOutForDelivery =
    nextStatus === "OUT_FOR_DELIVERY" && previousStatus !== "OUT_FOR_DELIVERY";

  const shouldSendReadyEmail =
    (becameReadyForCollection || becameOutForDelivery) && !!order.customerEmail;

    console.log('updateOrderStatus: ', shouldSendReadyEmail, order.customerEmail)

  if (shouldSendReadyEmail) {
    try {
      await sendOrderReadyEmail({
        to: order.customerEmail!,
        customerName: order.customerName || 'Walk-in',
        storeName: order.store.name,
        orderId: order.id,
        pickupCode: order.pickupCode,
        fulfilmentType: order.fulfilmentType,
      });
    } catch (err) {
      console.error("Failed to send order ready email", err);
      // Don't break the status update if email fails
    }
  }

  // Refresh the orders page on the server
  revalidatePath("/owner/store/orders");
}

export async function confirmOrderWithCode(formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);
  if (!user) throw new Error("Not authenticated");

  const orderId = formData.get("orderId") as string | null;
  const rawCode = (formData.get("code") as string | "").trim();

  if (!orderId || !rawCode) {
    // Silent no-op for now – can be enhanced later with form state
    return;
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });

  if (!store) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order || order.storeId !== store.id) {
    // Not this store’s order – ignore
    return;
  }

  // Only allow confirmation at the final step
  if (
    order.status !== "READY_FOR_COLLECTION" &&
    order.status !== "OUT_FOR_DELIVERY"
  ) {
    return;
  }

  // Codes are usually digits; keep comparison simple
  const code = rawCode;
  if (order.pickupCode !== code) {
    // Wrong code – do nothing (MVP). Later we can track attempts / show error.
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  revalidatePath("/owner/store/orders");
}
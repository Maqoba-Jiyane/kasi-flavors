// src/app/(dashboard)/owner/store/orders/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { enqueueOrderReadyEmail } from "@/lib/queues/emailQueue";
import { enqueueOrderReadyWhatsApp } from "@/lib/queues/whatsappQueue";
import { applyOrderPriceAdjustmentLedgerTx } from "@/lib/orders/order-adjustments";

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
        customerName: user.name,
        fulfilmentType: order.fulfilmentType,
        orderId: order.id,
        pickupCode: order.pickupCode,
        storeName: "Kasi Store",
        tenantId: order.storeId,
        to: user.email,
      });
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
  READY_FOR_COLLECTION: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // final
  CANCELLED: [], // final
};

export async function updateOrderStatus(formData: FormData) {
  const orderId = String(formData.get("orderId") || "").trim();
  const statusValue = formData.get("status");

  if (!orderId || !statusValue) {
    return {
      success: false,
      error: "Missing orderId or status.",
    };
  }

  const nextStatusRaw = String(statusValue);

  if (!VALID_STATUSES.includes(nextStatusRaw as OrderStatus)) {
    return {
      success: false,
      error: "Invalid status value.",
    };
  }

  const nextStatus = nextStatusRaw as OrderStatus;

  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
    },
  });

  if (!store) {
    return {
      success: false,
      error: "No store linked to this account.",
    };
  }

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
    return {
      success: false,
      error: "Order not found for this store owner.",
    };
  }

  const previousStatus = order.status;

  const allowedNext = ALLOWED_TRANSITIONS[previousStatus] || [];

  if (!allowedNext.includes(nextStatus)) {
    return {
      success: false,
      error: `Cannot change status from ${previousStatus} to ${nextStatus}.`,
    };
  }

  /**
   * Important rule:
   * Customer-created collection orders must be completed using the pickup code.
   * Manual orders can be completed without code.
   */
  const requiresPickupCodeToComplete =
    order.source !== "MANUAL" &&
    order.fulfilmentType === "COLLECTION" &&
    previousStatus === "READY_FOR_COLLECTION" &&
    nextStatus === "COMPLETED";

  if (requiresPickupCodeToComplete) {
    return {
      success: false,
      error: "Enter the customer pickup code before completing this order.",
    };
  }

await prisma.$transaction(async (tx) => {
  const updatedOrder = await tx.order.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      completedAt: nextStatus === "COMPLETED" ? new Date() : order.completedAt,
    },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
    },
  });

  if (updatedOrder.status === "COMPLETED") {
    await applyOrderPriceAdjustmentLedgerTx({
      tx,
      orderId: updatedOrder.id,
    });
  }
});

  const becameReadyForCollection =
    nextStatus === "READY_FOR_COLLECTION" &&
    previousStatus !== "READY_FOR_COLLECTION";

  const becameOutForDelivery =
    nextStatus === "OUT_FOR_DELIVERY" && previousStatus !== "OUT_FOR_DELIVERY";

  const shouldSendReadyEmail =
    (becameReadyForCollection || becameOutForDelivery) && !!order.customerEmail;

  if (shouldSendReadyEmail) {
    try {
      await enqueueOrderReadyEmail({
        tenantId: order.storeId,
        to: order.customerEmail!,
        customerName: order.customerName || "there",
        fulfilmentType: order.fulfilmentType,
        orderId: order.id,
        pickupCode: order.pickupCode,
        storeName: order.store.name,
      });
    } catch (err) {
      console.error("Failed to enqueue order ready email", err);
    }
  }

  const shouldSendReadyWhatsApp =
    (becameReadyForCollection || becameOutForDelivery) && !!order.customerPhone;

  if (shouldSendReadyWhatsApp) {
    try {
      await enqueueOrderReadyWhatsApp({
        to: order.customerPhone!,
        customerName: order.customerName || "there",
        fulfilmentType: order.fulfilmentType,
        orderId: order.id,
        pickupCode: order.pickupCode,
        storeName: order.store.name,
        status: becameOutForDelivery
          ? "OUT_FOR_DELIVERY"
          : "READY_FOR_COLLECTION",
      });
    } catch (err) {
      console.error("Failed to enqueue order ready WhatsApp", err);
    }
  }

  revalidatePath("/owner/store/orders");

  return {
    success: true,
    error: `Status changed from ${previousStatus} to ${nextStatus}.`,
  };
}

export async function confirmOrderWithCode(formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const orderId = String(formData.get("orderId") || "").trim();
  const rawCode = String(formData.get("code") || "").trim();

  if (!orderId || !rawCode) {
    return {
      success: false,
      error: "Order ID and confirmation code are required.",
    };
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
    },
  });

  if (!store) {
    return {
      success: false,
      error: "No store linked to this account.",
    };
  }

  const code = rawCode.trim();

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        storeId: store.id,
      },
      select: {
        id: true,
        storeId: true,
        status: true,
        source: true,
        pickupCode: true,
        fulfilmentType: true,
        paymentMethod: true,
        completedAt: true,
      },
    });

    if (!order) {
      return {
        success: false as const,
        error: "Order not found for this store.",
      };
    }

    if (order.source === "MANUAL") {
      return {
        success: false as const,
        error:
          "Manual orders do not require customer pickup code confirmation.",
      };
    }

    const canConfirm =
      order.status === "READY_FOR_COLLECTION" ||
      order.status === "OUT_FOR_DELIVERY";

    if (!canConfirm) {
      return {
        success: false as const,
        error: "This order is not ready to be confirmed yet.",
      };
    }

    if (order.pickupCode !== code) {
      return {
        success: false as const,
        error: "Invalid confirmation code.",
      };
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "COMPLETED",
        completedAt: order.completedAt ?? new Date(),
      },
      select: {
        id: true,
        fulfilmentType: true,
        paymentMethod: true,
      },
    });

    const shouldApplyLedger =
      updatedOrder.paymentMethod === "CASH_ON_COLLECTION" ||
      updatedOrder.paymentMethod === "CASH_ON_DELIVERY";

    if (shouldApplyLedger) {
      await applyOrderPriceAdjustmentLedgerTx({
        tx,
        orderId: updatedOrder.id,
      });
    }

    return {
      success: true as const,
      error: null,
    };
  });

  revalidatePath("/owner/store/orders");

  return result;
}

export async function completeDelivery(formData: FormData) {
  const user = await getCurrentUser();
  // Allow both STORE_OWNER and DELIVERY roles
  assertRole(user, ["STORE_OWNER", "DELIVERY"]);

  const orderId = (formData.get("orderId") as string | "").trim();
  const rawCode = (formData.get("code") as string | "").trim();

  if (!orderId || !rawCode) {
    return {
      success: false,
      error: "Missing order ID or delivery code",
    };
  }

  // For couriers, check if they're assigned to this store
  let storeId: string | null = null;
  if (user.role === "DELIVERY") {
    const courier = await prisma.courier.findUnique({
      where: { userId: user.id },
      select: { storeId: true, isActive: true },
    });
    if (!courier || !courier.isActive) {
      return {
        success: false,
        error: "Courier not found or inactive",
      };
    }
    storeId = courier.storeId;
  } else {
    // For store owners
    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });
    if (!store) {
      return {
        success: false,
        error: "Store not found",
      };
    }
    storeId = store.id;
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      storeId: storeId,
      fulfilmentType: "DELIVERY", // Only delivery orders
    },
  });

  if (!order) {
    return {
      success: false,
      error: "Order not found",
    };
  }

  // Only allow completion when order is out for delivery
  if (order.status !== "OUT_FOR_DELIVERY") {
    return {
      success: false,
      error: "Order must be out for delivery to complete",
    };
  }

  const code = rawCode;
  if (order.pickupCode !== code) {
    return {
      success: false,
      error: "Incorrect delivery code",
    };
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      select: {
        id: true,
        fulfilmentType: true,
        paymentMethod: true,
      },
    });

    if (
      order.fulfilmentType === "COLLECTION" &&
      order.paymentMethod === "CASH_ON_COLLECTION"
    ) {
      await applyOrderPriceAdjustmentLedgerTx({
        tx,
        orderId: order.id,
      });
    }
  });
}

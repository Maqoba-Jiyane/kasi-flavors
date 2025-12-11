// src/lib/billing.ts
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";

// You can move this to your shared constants file:
const PLATFORM_FEE_RATE = 0.10; // 10% of order.totalCents

/**
 * Charge the platform fee for an order that has reached COMPLETED.
 *
 * - No-ops if the order:
 *   - does not exist,
 *   - is not COMPLETED,
 *   - already has platformFeePaid = true,
 *   - or the fee would be <= 0.
 * - Runs in a single transaction to keep:
 *   - Order.platformFeeCents / platformFeePaid
 *   - Store.creditCents
 *   - LedgerEntry
 *   in sync.
 */
export async function chargePlatformFeeOnCompletion(orderId: string): Promise<void> {
  if (!orderId) return;

  await prisma.$transaction(async (tx) => {
    // 1) Load order with current status and fee flags
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            id: true,
            creditCents: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      // No order – nothing to do
      return;
    }

    // Only charge on COMPLETED orders
    if (order.status !== "COMPLETED") {
      return;
    }

    // Avoid double-charging if already paid
    if (order.platformFeePaid) {
      return;
    }

    // 2) Determine fee
    let platformFeeCents = order.platformFeeCents ?? 0;

    if (!platformFeeCents) {
      // Compute from totalCents using your business rule
      platformFeeCents = Math.round(order.totalCents * PLATFORM_FEE_RATE);
    }

    // If zero or negative, mark as "paid" but do not touch ledger/credit
    if (platformFeeCents <= 0) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          platformFeeCents: 0,
          platformFeePaid: true,
        },
      });
      return;
    }

    // 3) Get current store balance
    const currentBalance = order.store.creditCents ?? 0;
    const newBalance = currentBalance - platformFeeCents;

    // 4) Create ledger entry + update store + mark order as fee-paid
    await tx.ledgerEntry.create({
      data: {
        storeId: order.store.id,
        type: "FEE_DEBIT",
        status: "COMPLETED",
        orderId: order.id,
        amountCents: platformFeeCents,
        balanceCents: newBalance,
        note: `Platform fee (${(PLATFORM_FEE_RATE * 100).toFixed(0)}%) on order ${order.id.slice(-6)}`,
      },
    });

    await tx.store.update({
      where: { id: order.store.id },
      data: {
        creditCents: newBalance,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        platformFeeCents,
        platformFeePaid: true,
      },
    });
  });
}

// src/lib/orders/order-adjustments.ts

import type { Prisma } from "@prisma/client";
import { applyLedgerEntryTx } from "@/lib/ledger";

type PrismaTx = Prisma.TransactionClient;

type OrderItemForAdjustment = {
  quantity: number;
  baseUnitCents: number;
  unitCents: number;
};

function calculateOrderAdjustmentCents(items: OrderItemForAdjustment[]) {
  return items.reduce((sum, item) => {
    const differencePerUnit = item.unitCents - item.baseUnitCents;
    return sum + differencePerUnit * item.quantity;
  }, 0);
}

export async function applyOrderPriceAdjustmentLedgerTx({
  tx,
  orderId,
}: {
  tx: PrismaTx;
  orderId: string;
}) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      storeId: true,
      platformFeePaid: true,
      items: {
        select: {
          quantity: true,
          baseUnitCents: true,
          unitCents: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found for price adjustment ledger");
  }

  if (order.platformFeePaid) {
    return null;
  }

  const adjustmentCents = calculateOrderAdjustmentCents(order.items);

  if (adjustmentCents === 0) {
    await tx.order.update({
      where: { id: order.id },
      data: {
        platformFeeCents: 0,
        platformFeePaid: true,
      },
    });

    return null;
  }

  if (adjustmentCents > 0) {
    const entry = await applyLedgerEntryTx(tx, {
      storeId: order.storeId,
      type: "FEE_DEBIT",
      amountCents: adjustmentCents,
      orderId: order.id,
      note: "Platform price adjustment fee charged on completed order.",
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        platformFeeCents: adjustmentCents,
        platformFeePaid: true,
      },
    });

    return entry;
  }

  const discountCents = Math.abs(adjustmentCents);

  const entry = await applyLedgerEntryTx(tx, {
    storeId: order.storeId,
    type: "REFUND",
    amountCents: discountCents,
    orderId: order.id,
    note: "Platform discount credited to store on completed order.",
  });

  await tx.order.update({
    where: { id: order.id },
    data: {
      platformFeeCents: -discountCents,
      platformFeePaid: true,
    },
  });

  return entry;
}
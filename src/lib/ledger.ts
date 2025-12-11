// src/lib/ledger.ts
import { prisma } from "@/lib/prisma";
import type { LedgerType, LedgerStatus, LedgerEntry } from "@prisma/client";

type ApplyLedgerEntryArgs = {
  storeId: string;
  type: LedgerType;
  amountCents: number;          // must be > 0
  orderId?: string | null;
  note?: string | null;
};

/**
 * Apply a single ledger entry and update store.creditCents atomically.
 * Allows negative balances.
 *
 * Sign rules (effect on creditCents when status = COMPLETED):
 * - TOPUP, REFUND      => +amountCents
 * - FEE_DEBIT, PAYOUT  => -amountCents
 * - FEE_RESERVE        => 0 (no balance change, informational)
 * - ADJUSTMENT         => can be handled later with a separate helper
 */
export async function applyLedgerEntry({
  storeId,
  type,
  amountCents,
  orderId,
  note,
}: ApplyLedgerEntryArgs): Promise<LedgerEntry> {
  if (!storeId) {
    throw new Error("storeId is required for ledger entry");
  }
  if (!amountCents || amountCents <= 0) {
    throw new Error("amountCents must be positive");
  }

  // Decide how this affects creditCents
  let delta = 0;

  switch (type) {
    case "TOPUP":
    case "REFUND":
      delta = amountCents; // +credit
      break;
    case "FEE_DEBIT":
    case "PAYOUT":
      delta = -amountCents; // -credit
      break;
    case "FEE_RESERVE":
      delta = 0; // informational only
      break;
    case "ADJUSTMENT":
      // For now, we skip ADJUSTMENT to avoid ambiguity.
      // You can later add a signed variant if needed.
      throw new Error(
        "ADJUSTMENT not supported in applyLedgerEntry yet – handle explicitly",
      );
    default: {
      const _exhaustiveCheck: never = type;
      throw new Error(`Unsupported ledger type: ${String(type)}`);
    }
  }

  const status: LedgerStatus = "COMPLETED";

  const entry = await prisma.$transaction(async (tx) => {
    // 1) Load store credit
    const store = await tx.store.findUnique({
      where: { id: storeId },
      select: { creditCents: true },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    const currentBalance = store.creditCents ?? 0;

    // 2) Compute new balance (allowed to go negative)
    const newBalance = currentBalance + delta;

    // 3) Create ledger entry with snapshot
    const created = await tx.ledgerEntry.create({
      data: {
        storeId,
        type,
        status,
        orderId: orderId ?? null,
        amountCents,
        balanceCents: newBalance,
        note: note ?? null,
      },
    });

    // 4) Update store credit
    await tx.store.update({
      where: { id: storeId },
      data: {
        creditCents: newBalance,
      },
    });

    return created;
  });

  return entry;
}

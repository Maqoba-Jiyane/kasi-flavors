// src/lib/ledger.ts
import { prisma } from "@/lib/prisma";
import type {
  LedgerType,
  LedgerStatus,
  LedgerEntry,
  Prisma,
} from "@prisma/client";

type ApplyLedgerEntryArgs = {
  storeId: string;
  type: LedgerType;
  amountCents: number;
  orderId?: string | null;
  note?: string | null;
};

type PrismaTx = Prisma.TransactionClient;

function getLedgerDelta(type: LedgerType, amountCents: number) {
  switch (type) {
    /**
     * Positive movement:
     * These increase the store's current weekly balance.
     *
     * ORDER_CREDIT:
     * Kasi Flavors received an online payment and now owes the store.
     *
     * TOPUP:
     * Store paid Kasi Flavors to settle a negative balance.
     *
     * REFUND / DISCOUNT_CREDIT:
     * Store is being credited.
     */
    case "ORDER_CREDIT":
    case "SETTLEMENT_PAYMENT":
    case "REFUND":
    case "DISCOUNT_CREDIT":
      return amountCents;

    /**
     * Negative movement:
     * These reduce the store's current weekly balance.
     *
     * FEE_DEBIT:
     * Store owes platform fees.
     *
     * PAYOUT:
     * Kasi Flavors paid the store, so the balance reduces.
     */
    case "FEE_DEBIT":
    case "PAYOUT":
      return -amountCents;

    /**
     * Informational only.
     * Does not affect current balance.
     */
    case "FEE_RESERVE":
      return 0;

    case "ADJUSTMENT":
      throw new Error(
        "ADJUSTMENT is not supported in applyLedgerEntry yet. Use a dedicated signed adjustment helper.",
      );

    default: {
      const _exhaustiveCheck: never = type;
      throw new Error(`Unsupported ledger type: ${String(_exhaustiveCheck)}`);
    }
  }
}

function validateLedgerInput({ storeId, amountCents }: ApplyLedgerEntryArgs) {
  if (!storeId) {
    throw new Error("storeId is required for ledger entry");
  }

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("amountCents must be a positive number");
  }
}

export async function applyLedgerEntryTx(
  tx: PrismaTx,
  args: ApplyLedgerEntryArgs,
): Promise<LedgerEntry> {
  validateLedgerInput(args);

  const { storeId, type, amountCents, orderId, note } = args;

  const delta = getLedgerDelta(type, amountCents);
  const status: LedgerStatus = "COMPLETED";

  const store = await tx.store.findUnique({
    where: { id: storeId },
    select: {
      creditCents: true,
    },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  const currentBalance = store.creditCents ?? 0;
  const newBalance = currentBalance + delta;

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

  await tx.store.update({
    where: { id: storeId },
    data: {
      creditCents: newBalance,
    },
  });

  return created;
}

export async function applyLedgerEntry(
  args: ApplyLedgerEntryArgs,
): Promise<LedgerEntry> {
  return prisma.$transaction((tx) => applyLedgerEntryTx(tx, args));
}
"use server";

import { prisma } from "@/lib/prisma";
import { createTopupSession } from "@/lib/billing/payments";
import { getRequiredSettlementPaymentCents } from "@/lib/billing/settlement";
import { assertRole, getCurrentUser } from "@/lib/auth";

export async function createSettlementPaymentSession(amountCents: number) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findFirst({
    where: { ownerId: user.id },
    select: {
      id: true,
      creditCents: true,
    },
  });

  if (!store) {
    throw new Error("Store not found for current user.");
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Invalid settlement payment amount.");
  }

  const currentBalanceCents = store.creditCents ?? 0;
  const requiredAmountCents =
    getRequiredSettlementPaymentCents(currentBalanceCents);

  if (requiredAmountCents <= 0) {
    throw new Error("No settlement payment is required right now.");
  }

  if (amountCents !== requiredAmountCents) {
    throw new Error("Settlement payment amount must match the required amount.");
  }

  const baseUrl =
    process.env.APP_URL ||
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    throw new Error("APP_URL or BASE_URL is not configured.");
  }

  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  const settlementPayment = await prisma.ledgerEntry.create({
    data: {
      storeId: store.id,
      amountCents,
      status: "PENDING",
      type: "SETTLEMENT_PAYMENT",
      balanceCents: currentBalanceCents,
      note: "Store settlement payment via Yoco.",
    },
  });

  const successUrl = `${cleanBaseUrl}/owner/store/billing?settlementPaymentId=${settlementPayment.id}`;
  const cancelUrl = `${cleanBaseUrl}/owner/store/billing?settlementPaymentId=${settlementPayment.id}&cancelled=1`;

  const session = await createTopupSession({
    amountCents,
    currency: "ZAR",
    successUrl,
    cancelUrl,
    externalId: settlementPayment.id,
    metadata: {
      topupId: settlementPayment.id,
      settlementPaymentId: settlementPayment.id,
      storeId: store.id,
      ownerId: user.id,
      type: "settlement_payment",
    },
  });

  await prisma.ledgerEntry.update({
    where: { id: settlementPayment.id },
    data: {
      provider: "YOCO",
      checkoutId: session.checkoutId,
    },
  });

  return { redirectUrl: session.checkoutUrl };
}
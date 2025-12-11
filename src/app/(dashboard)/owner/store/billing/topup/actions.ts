"use server";

import { prisma } from "@/lib/prisma";
import { createTopupSession } from "@/lib/billing/payments";
import { getRequiredTopupCents } from "@/lib/billing/topUp"; // keep as-is if your file is named topUp.ts
import { assertRole, getCurrentUser } from "@/lib/auth";

/**
 * Server action for starting a topup checkout for the current store owner.
 */
export async function createTopupCheckoutSession(amountCents: number) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }

  // Ensure only store owners can top up
  assertRole(user, ["STORE_OWNER"]);

  // Load the store for this owner
  const store = await prisma.store.findFirst({
    where: { ownerId: user.id },
  });

  if (!store) {
    throw new Error("Store not found for current user.");
  }

  // Basic amount validation
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Invalid topup amount.");
  }

  const currentBalanceCents = store.creditCents ?? 0;
  const minCents = getRequiredTopupCents(currentBalanceCents);

  if (amountCents < minCents) {
    throw new Error("Topup amount is below the required minimum.");
  }

  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is not configured.");
  }

  // 1) Create ledger entry for this topup so we can reconcile via webhook
  const topup = await prisma.ledgerEntry.create({
    data: {
      storeId: store.id,
      amountCents,
      status: "PENDING", // PENDING | COMPLETED | FAILED
      type: "TOPUP",
      note: "Store topup via Yoco",
      // provider / checkoutId will be attached after we get them from Yoco
    },
  });

  const successUrl = `${baseUrl}/owner/store/orders?topupId=${topup.id}`;
  const cancelUrl = `${baseUrl}/owner/store/billing/topup?topupId=${topup.id}`;

  // 2) Create Yoco checkout session -> gives us checkoutId + redirectUrl
  const session = await createTopupSession({
    amountCents,
    currency: "ZAR",
    successUrl,
    cancelUrl,
    externalId: topup.id, // optional, helps reconcile via Yoco if they send it back
    metadata: {
      topupId: topup.id,
      storeId: store.id,
      ownerId: user.id,
      type: "store_topup",
    },
  });

  // 3) Store the provider + checkout id so webhooks can match this entry later
  await prisma.ledgerEntry.update({
    where: { id: topup.id },
    data: {
      provider: "YOCO",           // make sure your schema has this field
      checkoutId: session.checkoutId, // and this one
    },
  });

  return { redirectUrl: session.checkoutUrl };
}

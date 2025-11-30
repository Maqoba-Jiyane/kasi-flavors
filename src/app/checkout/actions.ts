"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { randomUUID } from "crypto";

const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
});

const checkoutSchema = z.object({
  storeSlug: z.string().min(1),
  items: z.array(cartItemSchema).min(1),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email(), // 👈 add email if you want explicit email field
  fulfilmentType: z.enum(["COLLECTION", "DELIVERY"]),
  address: z.string().optional(),
  note: z.string().optional(),
});

function generatePickupCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function placeOrderAction(formData: FormData) {
  const rawItems = formData.get("items");
  let parsedItems: unknown = [];
  const trackingToken = randomUUID();

  try {
    parsedItems = rawItems ? JSON.parse(String(rawItems)) : [];
  } catch {
    throw new Error("Invalid items payload");
  }

  const data = {
    storeSlug: String(formData.get("storeSlug") || ""),
    items: parsedItems,
    fullName: String(formData.get("fullName") || ""),
    phone: String(formData.get("phone") || ""),
    email: formData.get("email") ? String(formData.get("email")) : undefined,
    fulfilmentType: String(formData.get("fulfilmentType") || ""),
    address: formData.get("address")
      ? String(formData.get("address"))
      : undefined,
    note: formData.get("note") ? String(formData.get("note")) : undefined,
  };

  const payload = checkoutSchema.parse(data);

  const store = await prisma.store.findUnique({
    where: { slug: payload.storeSlug },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  const productIds = payload.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id },
  });

  if (products.length !== productIds.length) {
    throw new Error("Some items are invalid for this store");
  }

  // Calculate totals
  let totalCents = 0;
  const itemsWithPricing = payload.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const lineTotal = product.priceCents * item.quantity;
    totalCents += lineTotal;
    return { product, quantity: item.quantity, lineTotal };
  });

  const now = new Date();
  const estimatedReadyAt = new Date(
    now.getTime() + store.avgPrepTimeMinutes * 60_000
  );
  const pickupCode = generatePickupCode();

  const order = await prisma.order.create({
    data: {
      storeId: store.id,
      customerName: payload.fullName,
      customerPhone: payload.phone ?? null,
      customerEmail: payload.email,
      fulfilmentType: payload.fulfilmentType,
      paymentMethod: "CASH_ON_DELIVERY",
      totalCents,
      deliveryAddress:
        payload.fulfilmentType === "DELIVERY" ? payload.address ?? "" : null,
      note: payload.note,
      pickupCode,
      trackingToken,
      estimatedReadyAt,
      items: {
        create: itemsWithPricing.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          unitCents: i.product.priceCents,
          totalCents: i.lineTotal,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  // 🔔 Send confirmation email if we have an email address
  if (payload.email) {
    try {
      await sendOrderConfirmationEmail({
        to: payload.email,
        customerName: payload.fullName,
        storeName: store.name,
        orderId: order.id,
        pickupCode: order.pickupCode,
        trackingToken,
        fulfilmentType: order.fulfilmentType,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          totalCents: i.totalCents,
        })),
        totalCents: order.totalCents,
      });
    } catch (err) {
      console.error("Failed to send order confirmation email", err);
      // MVP: we don't fail the order, just log.
    }
  }

  redirect(`/orders/${order.id}`);
}

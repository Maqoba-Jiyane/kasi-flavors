// lib/orders.ts
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { format } from "date-fns";

export type CheckoutItem = { productId: string; quantity: number };

function generatePickupCode(): string {
  // 6-digit numeric, zero padded
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOrderFromPayload(args: {
  storeId: string;
  items: CheckoutItem[];
  fullName: string;
  phone?: string | null;
  email: string;
  fulfilmentType: "COLLECTION" | "DELIVERY";
  note?: string | null;
}) {
  const { storeId, items, fullName, phone, email, fulfilmentType, note } =
    args;

  // Basic validation
  if (!storeId) throw new Error("Missing store id");
  if (!items || !Array.isArray(items) || items.length === 0)
    throw new Error("Cart empty");
  if (!fullName) throw new Error("Missing name");
  if (!email) throw new Error("Missing email");

  // Find store
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error("Store not found");

  // Find products and validate they belong to store
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id },
  });

  if (products.length === 0)
    throw new Error("No products found for this order");

  // Map product id -> product
  const prodMap = new Map(products.map((p) => [p.id, p]));

  // Calculate totals and build item snapshots
  let totalCents = 0;
  const orderItemsData = items.map((i) => {
    const product = prodMap.get(i.productId);
    if (!product) {
      throw new Error(`Product ${i.productId} not found in store`);
    }
    const qty = Math.max(1, Number(i.quantity) || 1);
    const unitCents = product.priceCents;
    const totalItemCents = unitCents * qty;
    totalCents += totalItemCents;

    return {
      productId: product.id,
      name: product.name,
      quantity: qty,
      unitCents,
      totalCents: totalItemCents,
    };
  });

  // Pickup code
  const pickupCode = generatePickupCode();

  // Estimate ready at = now + store.avgPrepTimeMinutes
  const estimatedReadyAt = new Date();
  estimatedReadyAt.setMinutes(
    estimatedReadyAt.getMinutes() + (store.avgPrepTimeMinutes || 25)
  );
  const trackingToken = randomUUID();

  // Create order + items in a transaction
  const created = await prisma.order.create({
    data: {
      store: { connect: { id: store.id } },
      customerName: fullName,
      customerPhone: phone ?? "",
      fulfilmentType, customerEmail: email,
      paymentMethod: "CASH_ON_DELIVERY",
      status: "PENDING",
      totalCents,
      deliveryAddress: fulfilmentType === "DELIVERY" ? "" : null,
      note: note ?? null,
      pickupCode,
      trackingToken,
      estimatedReadyAt,
      items: {
        create: orderItemsData.map((it) => ({
          productId: it.productId,
          name: it.name,
          quantity: it.quantity,
          unitCents: it.unitCents,
          totalCents: it.totalCents,
        })),
      },
    },
    include: {
      items: true,
      store: true,
    },
  });

  return created;
}

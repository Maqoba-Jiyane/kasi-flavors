// lib/manual-orders.ts
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

type ManualLine = { productId: string; quantity: number };

export async function createManualOrder({
  ownerId,           // string: the currently authenticated store owner id
  storeId,           // string: the store id (you can infer from ownerId server-side)
  items,             // ManualLine[]
  note,              // optional note
  fulfilmentType = "COLLECTION", // "COLLECTION" | "DELIVERY"
  customerName,      // optional
  customerPhone,     // optional
}: {
  ownerId: string;
  storeId: string;
  items: ManualLine[];
  note?: string;
  fulfilmentType?: "COLLECTION" | "DELIVERY";
  customerName?: string;
  customerPhone?: string;
}) {
  if (!ownerId) throw new Error("ownerId required");
  if (!storeId) throw new Error("storeId required");
  if (!items || items.length === 0) throw new Error("No items provided");

  // fetch products for validation
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId },
  });

  if (products.length === 0) throw new Error("No products found");

  const prodMap = new Map(products.map((p) => [p.id, p]));
  let totalCents = 0;
  const orderItems = items.map((it) => {
    const p = prodMap.get(it.productId);
    if (!p) throw new Error(`Product ${it.productId} not found in store`);
    const qty = Math.max(1, Number(it.quantity) || 1);
    const unitCents = p.priceCents;
    const totalItemCents = unitCents * qty;
    totalCents += totalItemCents;
    return {
      productId: p.id,
      name: p.name,
      quantity: qty,
      unitCents,
      totalCents: totalItemCents,
    };
  });

  // generate pickup code and estimate
  const pickupCode = Math.floor(100000 + Math.random() * 900000).toString();
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  const estimatedReadyAt = new Date();
  estimatedReadyAt.setMinutes(estimatedReadyAt.getMinutes() + (store?.avgPrepTimeMinutes ?? 25));
  const trackingToken = randomUUID();
  const created = await prisma.order.create({
    data: {
      store: { connect: { id: storeId } },
      // no customerId — manual order
      customerName: customerName ?? "Walk-in",
      customerPhone: customerPhone ?? "",
      fulfilmentType,
      paymentMethod: "CASH_ON_DELIVERY",
      status: "PENDING",
      source: "MANUAL",
      createdByOwnerId: ownerId,
      totalCents,
      note: note ?? null,
      trackingToken,
      pickupCode,
      estimatedReadyAt,
      items: {
        create: orderItems.map((it) => ({
          productId: it.productId,
          name: it.name,
          quantity: it.quantity,
          unitCents: it.unitCents,
          totalCents: it.totalCents,
        })),
      },
    },
    include: { items: true, store: true },
  });

  return created;
}

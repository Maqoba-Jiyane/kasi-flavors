// lib/manual-orders.ts
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

type ManualLine = { productId: string; quantity: number };

const MAX_ITEMS_PER_ORDER = 10;
const MAX_QTY_PER_ITEM = 5;

export async function createManualOrder({
  ownerId,           // string: the currently authenticated store owner id
  storeId,           // string: the store id (you can infer from ownerId server-side)
  items,             // ManualLine[]
  note,              // optional note
  fulfilmentType = "COLLECTION", // "COLLECTION" | "DELIVERY"
  customerName,      // optional
  customerPhone,     // optional
  customerEmail,     // optional
}: {
  ownerId: string;
  storeId: string;
  items: ManualLine[];
  note?: string;
  fulfilmentType?: "COLLECTION" | "DELIVERY";
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}) {
  // -------- BASIC VALIDATION --------
  if (!ownerId) throw new Error("ownerId required");
  if (!storeId) throw new Error("storeId required");

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No items provided");
  }

  if (items.length > MAX_ITEMS_PER_ORDER) {
    throw new Error("Too many items in order");
  }

  // Normalise / validate text fields
  let safeCustomerName = (customerName ?? "Walk-in").trim();
  let safeCustomerPhone = (customerPhone ?? "").trim();
  let safeNote = (note ?? "").trim();

  if (safeCustomerName.length === 0) {
    safeCustomerName = "Walk-in";
  }
  if (safeCustomerName.length > 120) {
    safeCustomerName = safeCustomerName.slice(0, 120);
  }

  if (safeCustomerPhone.length > 20) {
    safeCustomerPhone = safeCustomerPhone.slice(0, 20);
  }

  if (safeNote.length > 500) {
    safeNote = safeNote.slice(0, 500);
  }

  // -------- FETCH PRODUCTS (TENANT-SAFE) --------
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId },
  });

  if (products.length === 0) throw new Error("No products found");

  const prodMap = new Map(products.map((p) => [p.id, p]));

  // -------- BUILD ORDER ITEMS & TOTAL --------
  let totalCents = 0;

  const orderItems = items.map((it) => {
    const p = prodMap.get(it.productId);
    if (!p) throw new Error(`Product ${it.productId} not found in store`);

    // quantity: ensure integer, >=1 and <= MAX_QTY_PER_ITEM
    const rawQty = Number(it.quantity);
    const baseQty = Number.isFinite(rawQty) ? Math.floor(rawQty) : 1;
    const qty = Math.max(1, Math.min(MAX_QTY_PER_ITEM, baseQty));

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

  // -------- PICKUP CODE, ESTIMATE, TRACKING --------
  const pickupCode = Math.floor(100000 + Math.random() * 900000).toString();

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  const estimatedReadyAt = new Date();
  estimatedReadyAt.setMinutes(
    estimatedReadyAt.getMinutes() + (store?.avgPrepTimeMinutes ?? 25),
  );

  const trackingToken = randomUUID();

  // -------- CREATE ORDER --------
  const created = await prisma.order.create({
    data: {
      store: { connect: { id: storeId } },
      // manual order: no customerId
      customerName: safeCustomerName,
      customerPhone: safeCustomerPhone,
      customerEmail: customerEmail,
      fulfilmentType,
      paymentMethod:
        fulfilmentType === "DELIVERY"
          ? "CASH_ON_DELIVERY"
          : "CASH_ON_COLLECTION",
      status: "PENDING",
      source: "MANUAL",
      createdByOwnerId: ownerId,
      totalCents,
      note: safeNote.length ? safeNote : null,
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

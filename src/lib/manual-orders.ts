// lib/manual-orders.ts
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { applyPriceAdjustment } from "./pricing";

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

  // pull store up front so we can honor its price adjustment settings
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error("Store not found");
  const storeAny = store as any; // for TS, fields added in schema may not exist yet

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

  const rawQty = Number(it.quantity);
  const baseQty = Number.isFinite(rawQty) ? Math.floor(rawQty) : 1;
  const qty = Math.max(1, Math.min(MAX_QTY_PER_ITEM, baseQty));

  const baseUnitCents = p.priceCents;

  let unitCents = baseUnitCents;

  if ((p as any).priceAdjustmentEnabled && (p as any).priceAdjustmentPercent) {
    unitCents = applyPriceAdjustment(
      unitCents,
      (p as any).priceAdjustmentEnabled,
      (p as any).priceAdjustmentPercent,
    );
  }

  if (storeAny.priceAdjustmentEnabled && storeAny.priceAdjustmentPercent) {
    unitCents = applyPriceAdjustment(
      unitCents,
      storeAny.priceAdjustmentEnabled,
      storeAny.priceAdjustmentPercent,
    );
  }

  const totalItemCents = unitCents * qty;
  totalCents += totalItemCents;

  return {
    productId: p.id,
    name: p.name,
    quantity: qty,
    baseUnitCents,
    unitCents,
    totalCents: totalItemCents,
  };
});

  // -------- PICKUP CODE, ESTIMATE, TRACKING --------
  // Manual orders shouldn't require a customer-facing pickup code, but the
  // `pickupCode` field is non-null and unique in the schema. Generate a
  // store-internal unique token prefixed with "MANUAL-" so it won't be used
  // by customers, and remains unique.
  const pickupCode = `MANUAL-${randomUUID().split("-")[0].toUpperCase()}`;

  const estimatedReadyAt = new Date();
  estimatedReadyAt.setMinutes(
    estimatedReadyAt.getMinutes() + (store.avgPrepTimeMinutes ?? 25),
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
      // Manual orders: start immediately in preparation rather than pending,
      // and use an internal pickup token (customers won't need it).
      status: "IN_PREPARATION",
      source: "MANUAL",
      createdByOwnerId: ownerId,
      totalCents,
      note: safeNote.length ? safeNote : null,
      trackingToken,
      pickupCode,
      // Ensure unique idempotency key for manual orders to avoid null-unique issues
      idempotencyKey: randomUUID(),
      estimatedReadyAt,
items: {
  create: orderItems.map((it) => ({
    product: {
      connect: {
        id: it.productId,
      },
    },
    name: it.name,
    quantity: it.quantity,
    baseUnitCents: it.baseUnitCents,
    unitCents: it.unitCents,
    totalCents: it.totalCents,
  })),
},
    },
    include: { items: true, store: true },
  });

  return created;
}

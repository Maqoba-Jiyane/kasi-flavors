import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { applyPriceAdjustment } from "./pricing";

const MAX_ITEMS = 5;
const MAX_QTY_PER_ITEM = 5;

function clampQuantity(value: unknown) {
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty)) return 1;
  return Math.max(1, Math.min(MAX_QTY_PER_ITEM, qty));
}

export async function createOrderFromPayload(args: {
  storeId: string;
  items: { productId: string; quantity: number }[];
  fullName: string;
  phone?: string | null;
  email: string;
  fulfilmentType: "COLLECTION" | "DELIVERY";
  note?: string | null;
  customerId?: string | null;
  idempotencyKey?: string;
  paymentMethod?: "CASH_ON_DELIVERY" | "CASH_ON_COLLECTION" | "ONLINE_PAYMENT";
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryFeeCents?: number;
}) {
  const {
    storeId,
    items,
    fullName,
    phone,
    email,
    fulfilmentType,
    note,
    customerId,
    idempotencyKey,
    paymentMethod = "ONLINE_PAYMENT",
    deliveryAddress,
    deliveryLat,
    deliveryLng,
    deliveryFeeCents = 0,
  } = args;

  if (!storeId) throw new Error("Missing store id");
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart empty");
  }
  if (items.length > MAX_ITEMS) {
    throw new Error(`Maximum ${MAX_ITEMS} items allowed per order`);
  }
  if (!fullName.trim()) throw new Error("Missing name");
  if (!email.trim()) throw new Error("Missing email");

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      avgPrepTimeMinutes: true,
      priceAdjustmentEnabled: true,
      priceAdjustmentPercent: true,
      onlinePaymentsEnabled: true,
      cashOnCollectionEnabled: true,
      supportsDelivery: true,
    },
  });

  if (!store) throw new Error("Store not found");

  if (paymentMethod === "ONLINE_PAYMENT" && !store.onlinePaymentsEnabled) {
    throw new Error("Online payments are not available for this store");
  }

  if (
    paymentMethod === "CASH_ON_COLLECTION" &&
    (!store.cashOnCollectionEnabled || fulfilmentType !== "COLLECTION")
  ) {
    throw new Error("Cash on collection is not available for this order");
  }

  if (paymentMethod === "CASH_ON_DELIVERY") {
    throw new Error("Cash on delivery is not available yet");
  }

  if (fulfilmentType === "DELIVERY" && !store.supportsDelivery) {
    throw new Error("This store does not offer delivery");
  }

  const activeOrderCount = await prisma.order.count({
    where: {
      storeId: store.id,
      status: {
        in: ["PENDING", "ACCEPTED", "IN_PREPARATION", "READY_FOR_COLLECTION"],
      },
    },
  });

  const productIds = Array.from(new Set(items.map((item) => item.productId)));

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      storeId: store.id,
      isAvailable: true,
    },
    select: {
      id: true,
      name: true,
      priceCents: true,
      priceAdjustmentEnabled: true,
      priceAdjustmentPercent: true,
    },
  });

  if (products.length === 0) {
    throw new Error("No products found for this order");
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  let subtotalCents = 0;

  const orderItemsData = items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new Error(`Product ${item.productId} not found in store`);
    }

    const quantity = clampQuantity(item.quantity);

    const baseUnitCents = product.priceCents;

    let unitCents = baseUnitCents;

    if (product.priceAdjustmentEnabled && product.priceAdjustmentPercent) {
      unitCents = applyPriceAdjustment(
        unitCents,
        product.priceAdjustmentEnabled,
        product.priceAdjustmentPercent,
      );
    }

    if (store.priceAdjustmentEnabled && store.priceAdjustmentPercent) {
      unitCents = applyPriceAdjustment(
        unitCents,
        store.priceAdjustmentEnabled,
        store.priceAdjustmentPercent,
      );
    }

    const totalItemCents = unitCents * quantity;
    subtotalCents += totalItemCents;

    return {
      productId: product.id,
      name: product.name,
      quantity,
      baseUnitCents,
      unitCents,
      totalCents: totalItemCents,
    };
  });

  const safeDeliveryFeeCents =
    Number.isFinite(deliveryFeeCents) && deliveryFeeCents > 0
      ? Math.round(deliveryFeeCents)
      : 0;

  const totalCents = subtotalCents + safeDeliveryFeeCents;

  const pickupCode = generatePickupCode();
  const trackingToken = randomUUID();

  const estimatedReadyAt = new Date();
  estimatedReadyAt.setMinutes(
    estimatedReadyAt.getMinutes() +
      (store.avgPrepTimeMinutes || 25) * (activeOrderCount + 1),
  );

  let customerRelation = undefined;

  if (customerId) {
    customerRelation = { connect: { id: customerId } };
  } else {
    const customer = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (customer) {
      customerRelation = { connect: { id: customer.id } };
    }
  }

  const created = await prisma.order.create({
    data: {
      store: { connect: { id: store.id } },
      customer: customerRelation,

      customerName: fullName.trim(),
      customerPhone: phone || null,
      customerEmail: email.trim(),

      fulfilmentType,
      paymentMethod,

      // For online payment, keep PENDING until Yoco confirms payment.
      status: "PENDING",

      totalCents,
      deliveryFeeCents: safeDeliveryFeeCents > 0 ? safeDeliveryFeeCents : null,
      deliveryAddress:
        deliveryAddress || (fulfilmentType === "DELIVERY" ? "" : null),
      deliveryLat: deliveryLat ?? null,
      deliveryLng: deliveryLng ?? null,
      note: note?.trim() || null,

      pickupCode,
      trackingToken,
      estimatedReadyAt,
      idempotencyKey: idempotencyKey ?? randomUUID(),

      platformFeeCents: 0,
      platformFeePaid: false,

      items: {
        create: orderItemsData.map((item) => ({
          product: {
            connect: {
              id: item.productId,
            },
          },
          name: item.name,
          quantity: item.quantity,
          baseUnitCents: item.baseUnitCents,
          unitCents: item.unitCents,
          totalCents: item.totalCents,
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

function generatePickupCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

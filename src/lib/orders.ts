import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const MAX_ITEMS = 5;
const MAX_QTY_PER_ITEM = 5;

export async function createOrderFromPayload(args: {
  storeId: string;
  items: { productId: string; quantity: number }[];
  fullName: string;
  phone?: string | null;
  email: string;
  fulfilmentType: "COLLECTION" | "DELIVERY";
  note?: string | null;
  customerId?: string | null;
  idempotencyKey?: string; // 👈 NEW
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
  } = args;

  // Basic validation
  if (!storeId) throw new Error("Missing store id");
  if (!items || !Array.isArray(items) || items.length === 0)
    throw new Error("Cart empty");
  if (!fullName) throw new Error("Missing name");
  if (!email) throw new Error("Missing email");

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  
  if (!store) throw new Error("Store not found");

  const count = await prisma.order.count({
    where: {
      storeId: store.id,
      NOT: {
        status: "COMPLETED"
      }
    }
  })

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id },
  });

  if (products.length === 0)
    throw new Error("No products found for this order");

  const prodMap = new Map(products.map((p) => [p.id, p]));

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

  const pickupCode = generatePickupCode();
  const estimatedReadyAt = new Date();
  estimatedReadyAt.setMinutes(
    (estimatedReadyAt.getMinutes() + (store.avgPrepTimeMinutes || 25) * (count + 1))
  );
  const trackingToken = randomUUID();

  // If you still want to fallback by email:
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
      customerName: fullName,
      customerPhone: phone ?? "",
      customerEmail: email,
      fulfilmentType,
      paymentMethod: "CASH_ON_DELIVERY",
      status: "PENDING",
      totalCents,
      deliveryAddress: fulfilmentType === "DELIVERY" ? "" : null,
      note: note ?? null,
      pickupCode,
      trackingToken,
      estimatedReadyAt,
      idempotencyKey: idempotencyKey ?? null,
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

function generatePickupCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

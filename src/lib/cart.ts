// lib/cart.ts
import { prisma } from "@/lib/prisma";
import { MAX_QTY_PER_ITEM, MIN_QTY_PER_ITEM } from "./constants";

export type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  storeId: string;
};

export type Cart = {
  storeId: string | null;
  items: CartItem[];
};

const MAX_ITEMS_PER_CART = 5; // keep same behaviour as old cookie logic

export function getEmptyCart(): Cart {
  return { storeId: null, items: [] };
}

/**
 * Normalize raw quantities and enforce min/max limits.
 */
function normalizeQuantity(raw: unknown): number {
  const n = Number(raw);
  const base = Number.isFinite(n) ? Math.floor(n) : MIN_QTY_PER_ITEM;
  return Math.max(MIN_QTY_PER_ITEM, Math.min(MAX_QTY_PER_ITEM, base));
}

/**
 * Read the cart for a given user from the database.
 *
 * Returns a Cart shape that matches your previous cookie-based version:
 * - storeId is inferred from the first item's storeId (or null if empty)
 * - items are limited and quantities are clamped
 */
export async function getCartForUser(userId: string): Promise<Cart> {
  if (!userId) {
    return getEmptyCart();
  }

  const cart = await prisma.cart.findFirst({
    where: { customerId: userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              priceCents: true,
              storeId: true,
              isAvailable: true,
            },
          },
        },
      },
    },
  });

  if (!cart || !cart.items.length) {
    return getEmptyCart();
  }

  // Filter out items whose product no longer exists or is unavailable
  const validItems = cart.items.filter((ci) => ci.product && ci.product.isAvailable);

  if (!validItems.length) {
    return getEmptyCart();
  }

  // Enforce a maximum number of distinct line items (same as cookie version)
  const limited = validItems.slice(0, MAX_ITEMS_PER_CART);

  const mapped: CartItem[] = limited.map((ci) => ({
    productId: ci.productId,
    name: ci.product.name,
    priceCents: ci.product.priceCents,
    quantity: normalizeQuantity(ci.quantity),
    storeId: ci.product.storeId,
  }));

  const storeId = mapped[0]?.storeId ?? null;

  return {
    storeId,
    items: mapped,
  };
}

/**
 * Clear the cart for a user (used after successful order, or "clear cart" action).
 */
export async function clearCartForUser(userId: string): Promise<void> {
  if (!userId) return;

  // Find all carts for this user (you probably only have one, but this is safe)
  const carts = await prisma.cart.findMany({
    where: { customerId: userId },
    select: { id: true },
  });

  if (!carts.length) return;

  const cartIds = carts.map((c) => c.id);

  // Delete items first, then carts
  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: { cartId: { in: cartIds } },
    }),
    prisma.cart.deleteMany({
      where: { id: { in: cartIds } },
    }),
  ]);
}

/**
 * Compute totals for a cart.
 */
export function calculateCartTotals(cart: Cart) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalCents = cart.items.reduce(
    (sum, item) => sum + item.quantity * item.priceCents,
    0,
  );

  return { itemCount, subtotalCents };
}

export function formatPrice(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

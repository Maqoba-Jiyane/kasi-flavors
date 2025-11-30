// lib/cart.ts
import { cookies } from "next/headers";

export const CART_COOKIE = "kasi_cart";

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

export function getEmptyCart(): Cart {
  return { storeId: null, items: [] };
}

export async function readCartFromCookies(): Promise<Cart> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CART_COOKIE)?.value;

  if (!raw) return getEmptyCart();

  try {
    const parsed = JSON.parse(raw) as Cart;
    if (!parsed || !Array.isArray(parsed.items)) return getEmptyCart();
    return parsed;
  } catch {
    return getEmptyCart();
  }
}

export async function writeCartToCookies(cart: Cart) {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    // You can tweak these for prod:
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function calculateCartTotals(cart: Cart) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalCents = cart.items.reduce(
    (sum, item) => sum + item.quantity * item.priceCents,
    0
  );

  return { itemCount, subtotalCents };
}

export function formatPrice(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

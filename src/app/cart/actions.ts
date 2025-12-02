// app/(public)/cart/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import {
  readCartFromCookies,
  writeCartToCookies,
  getEmptyCart,
} from "@/lib/cart";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface CartDataProps{
  productId: string,
  quantity: number
}

// ADD TO CART
export async function addToCart(productId: string, quantity: number) {

  if (!productId) return;

  // Look up product to get price + name + storeId
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      priceCents: true,
      storeId: true,
    },
  });

  if (!product) {
    return;
  }

  let cart = await readCartFromCookies();

  // Enforce single-store cart: if different store, reset cart to new store
  if (cart.storeId && cart.storeId !== product.storeId) {
    cart = {
      storeId: product.storeId,
      items: [],
    };
  }

  if (!cart.storeId) {
    cart.storeId = product.storeId;
  }

  const existingIndex = cart.items.findIndex(
    (item) => item.productId === product.id
  );

  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += quantity;
  } else {
    cart.items.push({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      quantity,
      storeId: product.storeId,
    });
  }

  writeCartToCookies(cart);

  // Revalidate cart page and optional store page
  revalidatePath("/cart");
}

// UPDATE QUANTITY
export async function updateCartItem(formData: FormData) {
  const productId = formData.get("productId") as string | null;
  const quantityStr = (formData.get("quantity") as string | "").trim();

  if (!productId) return;

  const quantity = Math.max(0, Number(quantityStr) || 0);

  let cart = await readCartFromCookies();

  if (!cart.items.length) return;

  const idx = cart.items.findIndex((i) => i.productId === productId);
  if (idx < 0) return;

  if (quantity === 0) {
    cart.items.splice(idx, 1);
  } else {
    cart.items[idx].quantity = quantity;
  }

  if (cart.items.length === 0) {
    cart = getEmptyCart();
  }

  writeCartToCookies(cart);
  revalidatePath("/cart");
}

// REMOVE ITEM
export async function removeCartItem(formData: FormData) {
  const productId = formData.get("productId") as string | null;
  if (!productId) return;

  let cart = await readCartFromCookies();

  cart.items = cart.items.filter((i) => i.productId !== productId);

  if (cart.items.length === 0) {
    cart = getEmptyCart();
  }

  writeCartToCookies(cart);
  revalidatePath("/cart");
}

// CLEAR CART
export async function clearCart() {
  writeCartToCookies(getEmptyCart());
  revalidatePath("/cart");
  redirect("/cart");
}

// app/(public)/cart/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MAX_QTY_PER_ITEM, MIN_QTY_PER_ITEM } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";

// helper to clamp quantity
function normalizeQuantity(raw: unknown): number {
  const n = Number(raw);
  const base = Number.isFinite(n) ? Math.floor(n) : MIN_QTY_PER_ITEM;
  return Math.max(MIN_QTY_PER_ITEM, Math.min(MAX_QTY_PER_ITEM, base));
}

const MAX_ITEMS_PER_CART = 5;
type AddToCartResult =
  | { success: true }
  | {
      success: false;
      errorCode: "UNAUTHENTICATED" | "NOT_AVAILABLE" | "MAX_ITEMS_EXCEEDED";
      message: string;
    };

// ADD TO CART (DB-backed)
export async function addToCart(
  productId: string,
  quantity: number
): Promise<AddToCartResult> {
  
  if (!productId) {
    return {
      success: false,
      errorCode: "NOT_AVAILABLE",
      message: "Invalid product.",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      errorCode: "UNAUTHENTICATED",
      message: "Please sign in to add items to your cart.",
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, storeId: true, isAvailable: true },
  });

  if (!product || !product.isAvailable) {
    return {
      success: false,
      errorCode: "NOT_AVAILABLE",
      message: "This item is no longer available.",
    };
  }

  const safeQty = normalizeQuantity(quantity);

  const result = await prisma.$transaction(async (tx) => {
    let cart = await tx.cart.findFirst({
      where: { customerId: user.id },
      include: {
        items: {
          include: {
            product: { select: { storeId: true } },
          },
        },
      },
    });

    if (!cart) {
      cart = await tx.cart.create({
        data: { customerId: user.id },
        include: {
          items: {
            include: {
              product: { select: { storeId: true } },
            },
          },
        },
      });
    }

    const existingStoreId = cart.items[0]?.product.storeId ?? null;
    if (existingStoreId && existingStoreId !== product.storeId) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      cart.items = [];
    }

    const distinctProductIds = new Set(cart.items.map((ci) => ci.productId));
    const isNewProduct = !distinctProductIds.has(product.id);

    if (isNewProduct && distinctProductIds.size >= MAX_ITEMS_PER_CART) {
      return {
        success: false as const,
        errorCode: "MAX_ITEMS_EXCEEDED" as const,
        message: "You’ve reached the maximum number of items in your cart.",
      };
    }

    await tx.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: product.id,
        },
      },
      update: { quantity: { increment: safeQty } },
      create: {
        cartId: cart.id,
        productId: product.id,
        quantity: safeQty,
      },
    });

    return { success: true as const };
  });

  revalidatePath("/cart");
  return result;
}

// UPDATE QUANTITY
export async function updateCartItem(formData: FormData) {
  const productId = formData.get("productId") as string | null;
  const quantityStr = (formData.get("quantity") as string | "").trim();

  if (!productId) return;

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const raw = Number(quantityStr);
  const safeQty = Math.max(0, Number.isFinite(raw) ? Math.floor(raw) : 0);

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({
      where: { customerId: user.id },
      select: { id: true },
    });

    if (!cart) return;

    if (safeQty === 0) {
      // remove this item
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId,
        },
      });
      return;
    }

    const clampedQty = Math.max(
      MIN_QTY_PER_ITEM,
      Math.min(MAX_QTY_PER_ITEM, safeQty)
    );

    await tx.cartItem.updateMany({
      where: {
        cartId: cart.id,
        productId,
      },
      data: {
        quantity: clampedQty,
      },
    });
  });

  revalidatePath("/cart");
}

// REMOVE ITEM
export async function removeCartItem(formData: FormData) {
  const productId = formData.get("productId") as string | null;
  if (!productId) return;

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({
      where: { customerId: user.id },
      select: { id: true },
    });

    if (!cart) return;

    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });
  });

  revalidatePath("/cart");
}

// CLEAR CART
export async function clearCart() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({
      where: { customerId: user.id },
      select: { id: true },
    });

    if (!cart) return;

    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // optionally delete the cart row itself
    // await tx.cart.delete({ where: { id: cart.id } });
  });

  revalidatePath("/cart");
}

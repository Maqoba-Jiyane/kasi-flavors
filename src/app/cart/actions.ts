"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MAX_QTY_PER_ITEM, MIN_QTY_PER_ITEM } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";

const MAX_ITEMS_PER_CART = 5;

type AddToCartResult =
  | { success: true }
  | {
      success: false;
      errorCode:
        | "UNAUTHENTICATED"
        | "NOT_AVAILABLE"
        | "MAX_ITEMS_EXCEEDED"
        | "INVALID_PRODUCT";
      message: string;
    };

function normalizeQuantity(raw: unknown): number {
  const n = Number(raw);
  const base = Number.isFinite(n) ? Math.floor(n) : MIN_QTY_PER_ITEM;

  return Math.max(MIN_QTY_PER_ITEM, Math.min(MAX_QTY_PER_ITEM, base));
}

function isValidObjectId(value: unknown) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function revalidateCart() {
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function addToCart(
  productId: string,
  quantity: number,
): Promise<AddToCartResult> {
  if (!isValidObjectId(productId)) {
    return {
      success: false,
      errorCode: "INVALID_PRODUCT",
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
    select: {
      id: true,
      storeId: true,
      isAvailable: true,
      store: {
        select: {
          id: true,
          isOpen: true,
          approvalStatus: true,
        },
      },
    },
  });

  if (
    !product ||
    !product.isAvailable ||
    !product.store ||
    product.store.approvalStatus !== "APPROVED"
  ) {
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
            product: {
              select: {
                id: true,
                storeId: true,
              },
            },
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
              product: {
                select: {
                  id: true,
                  storeId: true,
                },
              },
            },
          },
        },
      });
    }

    const existingStoreId = cart.items[0]?.product?.storeId ?? null;

    if (existingStoreId && existingStoreId !== product.storeId) {
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      cart.items = [];
    }

    const distinctProductIds = new Set(
      cart.items.map((item) => item.productId),
    );

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
      update: {
        quantity: {
          increment: safeQty,
        },
      },
      create: {
        cartId: cart.id,
        productId: product.id,
        quantity: safeQty,
      },
    });

    return { success: true as const };
  });

  revalidateCart();

  return result;
}

export async function updateCartItem(formData: FormData) {
  const productId = String(formData.get("productId") || "").trim();
  const quantityStr = String(formData.get("quantity") || "").trim();

  if (!isValidObjectId(productId)) return;

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const rawQty = Number(quantityStr);
  const safeQty = Number.isFinite(rawQty) ? Math.floor(rawQty) : 0;

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findFirst({
      where: { customerId: user.id },
      select: { id: true },
    });

    if (!cart) return;

    if (safeQty <= 0) {
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
      Math.min(MAX_QTY_PER_ITEM, safeQty),
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

  revalidateCart();
}

export async function removeCartItem(formData: FormData) {
  const productId = String(formData.get("productId") || "").trim();

  if (!isValidObjectId(productId)) return;

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

  revalidateCart();
}

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
  });

  revalidateCart();
}
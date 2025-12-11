"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MenuItemCard, MenuItem } from "@/components/MenuItemCard";
import { CartSummaryBar } from "@/components/CartSummaryBar";

type CartItem = {
  productId: string;
  quantity: number;
};

interface StoreMenuClientProps {
  storeSlug: string;
  products: MenuItem[];
}

export function StoreMenuClient({
  storeSlug,
  products,
}: StoreMenuClientProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const router = useRouter();

  // Helper to load cart from server (cookie)
  async function loadCartFromServer() {
    try {
      const res = await fetch("/api/customers/orders", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      // Expecting shape: { success: true, cart: Array<{ productId, quantity, ... }> }
      if (!data?.cart || !Array.isArray(data.cart)) {
        return;
      }

      const cartItemsArray: CartItem[] = data.cart.map(
        (item: { productId: string; quantity: number }) => ({
          productId: item.productId,
          quantity: item.quantity,
        }),
      );

      setCart(cartItemsArray);
    } catch {
      // Fail silently on network errors – UI just shows empty cart in that case
    }
  }

  // Initial load from cookie-backed API
  useEffect(() => {
    loadCartFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddToCart = async (productId: string, quantity: number) => {
    // Optimistic local update (optional)
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { productId, quantity }];
    });

    // After the server action runs inside MenuItemCard,
    // refresh from server so we respect server-side clamping / validation.
    await loadCartFromServer();
  };

  const { itemCount, totalCents } = useMemo(() => {
    let count = 0;
    let total = 0;

    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      count += item.quantity;
      total += product.priceCents * item.quantity;
    }

    return { itemCount: count, totalCents: total };
  }, [cart, products]);

  const handleCheckout = () => {
    router.push("/cart");
  };

  return (
    <>
      <div className="space-y-3">
        {products.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-300">
            No items yet. Store owner must add products.
          </p>
        ) : (
          products.map((item) => (
            <MenuItemCard key={item.id} item={item} onAdd={handleAddToCart} />
          ))
        )}
      </div>

      <CartSummaryBar
        itemCount={itemCount}
        totalCents={totalCents}
        onCheckout={handleCheckout}
      />
    </>
  );
}

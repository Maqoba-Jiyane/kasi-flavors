"use client";

import { useState, useMemo } from "react";
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

  const handleAddToCart = (productId: string, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { productId, quantity }];
    });
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
    if (cart.length === 0) return;

    // MVP: pass cart via query string.
    // For large carts, you would store this server-side or in DB instead.
    const itemsParam = encodeURIComponent(JSON.stringify(cart));
    router.push(`/checkout?storeSlug=${storeSlug}&items=${itemsParam}`);
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

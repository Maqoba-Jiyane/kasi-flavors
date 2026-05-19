"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MenuItemCard, MenuItem } from "@/components/MenuItemCard";
import { CartSummaryBar } from "@/components/CartSummaryBar";
import Link from "next/link";

type CartItem = {
  productId: string;
  quantity: number;
};

interface StoreMenuClientProps {
  storeSlug: string;
  products: MenuItem[];
}

export function StoreMenuClient({ storeSlug, products }: StoreMenuClientProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const router = useRouter();

  async function loadCartFromServer() {
    try {
      const res = await fetch("/api/customers/orders", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();

      if (!data?.cart || !Array.isArray(data.cart)) return;

      const cartItemsArray: CartItem[] = data.cart.map(
        (item: { productId: string; quantity: number }) => ({
          productId: item.productId,
          quantity: item.quantity,
        })
      );

      setCart(cartItemsArray);
    } catch {
      // Keep UI usable even when cart sync fails.
    }
  }

  useEffect(() => {
    loadCartFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddToCart = async (productId: string, quantity: number) => {
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
      {products.length === 0 ? (
        <div className="rounded-[2rem] border border-black/10 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kasi-black text-3xl">
            🍟
          </div>

          <h3 className="mt-5 text-2xl font-black text-kasi-black">
            No menu items yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/60">
            This store has not added products yet. Check back soon or browse
            other kasi food spots.
          </p>

          <Link href="/" className="mt-6 inline-flex kf-btn-primary">
            Browse other stores
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((item) => (
            <MenuItemCard key={item.id} item={item} onAdd={handleAddToCart} />
          ))}
        </div>
      )}

      <CartSummaryBar
        itemCount={itemCount}
        totalCents={totalCents}
        onCheckout={handleCheckout}
      />
    </>
  );
}
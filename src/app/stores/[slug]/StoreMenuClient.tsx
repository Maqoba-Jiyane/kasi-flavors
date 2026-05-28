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

type MenuCategoryGroup = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  products: MenuItem[];
};

function normalizeCategory(item: MenuItem) {
  const name = item.categoryName?.trim() || "Menu";
  const slug =
    item.categorySlug?.trim() ||
    name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "menu";

  return {
    id: item.categoryId || slug,
    name,
    slug,
    sortOrder:
      typeof item.categorySortOrder === "number" ? item.categorySortOrder : 999,
  };
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
        }),
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

  const categoryGroups = useMemo<MenuCategoryGroup[]>(() => {
    const map = new Map<string, MenuCategoryGroup>();

    for (const item of products) {
      const category = normalizeCategory(item);

      const existing = map.get(category.id);

      if (existing) {
        existing.products.push(item);
      } else {
        map.set(category.id, {
          id: category.id,
          name: category.name,
          slug: category.slug,
          sortOrder: category.sortOrder,
          products: [item],
        });
      }
    }

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        products: group.products.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name);
      });
  }, [products]);

const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

const activeCategory = useMemo(() => {
  if (categoryGroups.length === 0) return null;

  if (!activeCategoryId) {
    return categoryGroups[0];
  }

  return (
    categoryGroups.find((group) => group.id === activeCategoryId) ??
    categoryGroups[0]
  );
}, [categoryGroups, activeCategoryId]);

  const handleAddToCart = async (productId: string, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);

      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
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
      const product = products.find((product) => product.id === item.productId);
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
        <div className="space-y-5">
          <div className="sticky top-0 z-20 -mx-1 overflow-x-auto bg-kasi-cream/95 px-1 py-3 backdrop-blur">
            <div className="flex gap-2">
              {categoryGroups.map((group) => {
                const isActive = activeCategory?.id === group.id;

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveCategoryId(group.id)}
                    className={[
                      "shrink-0 rounded-full border-2 px-4 py-2 text-xs font-black uppercase tracking-wide transition",
                      isActive
                        ? "border-kasi-green bg-kasi-green text-white shadow-sm"
                        : "border-black/10 bg-white text-kasi-black hover:border-kasi-green hover:text-kasi-green",
                    ].join(" ")}
                  >
                    {group.name}
                    <span
                      className={[
                        "ml-2 rounded-full px-2 py-0.5 text-[10px]",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-kasi-cream text-black/50",
                      ].join(" ")}
                    >
                      {group.products.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeCategory && (
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                    Menu category
                  </p>

                  <h2 className="text-2xl font-black tracking-tight text-kasi-black">
                    {activeCategory.name}
                  </h2>
                </div>

                <p className="text-xs font-black uppercase tracking-wide text-black/45">
                  {activeCategory.products.length} item
                  {activeCategory.products.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="grid gap-4">
                {activeCategory.products.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAdd={handleAddToCart}
                  />
                ))}
              </div>
            </section>
          )}
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

"use client";

import { addToCart } from "@/app/cart/actions";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  isAvailable: boolean;

  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categorySortOrder?: number | null;
};

interface MenuItemCardProps {
  item: MenuItem;
  storeIsOpen: boolean;
  onAdd: (itemId: string, quantity: number) => void;
}

function formatPrice(priceCents: number) {
  return `R ${(priceCents / 100).toFixed(2)}`;
}

export function MenuItemCard({ item, storeIsOpen, onAdd }: MenuItemCardProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleAdd = async () => {
    if (!storeIsOpen) {
      toast.error("This store is currently closed.");
      return;
    }

    if (!item.isAvailable || isAdding) return;

    setIsAdding(true);
    setJustAdded(false);

    try {
      const res = await addToCart(item.id, quantity);

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      onAdd(item.id, quantity);

      setJustAdded(true);
      successTimeoutRef.current = setTimeout(() => setJustAdded(false), 1200);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to add item to cart", err);
      }

      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const canChangeQty = storeIsOpen && item.isAvailable && !isAdding;
  const canClickAdd = storeIsOpen && item.isAvailable && !isAdding;

  return (
    <div
      className={`group overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${
        !item.isAvailable ? "opacity-70 grayscale-[0.2]" : ""
      }`}
    >
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        {/* Image */}
        {item.imageUrl ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-kasi-cream sm:h-28 sm:w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />

            {!item.isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide text-kasi-black">
                  Sold out
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-kasi-black text-3xl sm:h-28 sm:w-28">
            🍟
          </div>
        )}

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-1 text-base font-black tracking-tight text-kasi-black sm:text-lg">
                  {item.name}
                </h3>

                <span
                  className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                    item.isAvailable
                      ? "bg-kasi-green/10 text-kasi-green"
                      : "bg-black/10 text-black/50"
                  }`}
                >
                  {item.isAvailable ? "Available" : "Sold out"}
                </span>
              </div>

              <span className="shrink-0 rounded-full bg-golden-yellow px-3 py-1.5 text-sm font-black text-kasi-black">
                {formatPrice(item.priceCents)}
              </span>
            </div>

            {item.description ? (
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-black/60">
                {item.description}
              </p>
            ) : (
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-black/50">
                Freshly prepared by this local kasi food spot.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Quantity */}
            <div className="inline-flex w-fit items-center rounded-full border-2 border-black/10 bg-kasi-cream p-1">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-kasi-black transition hover:bg-golden-yellow disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!canChangeQty}
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <span className="min-w-9 px-2 text-center text-sm font-black text-kasi-black">
                {quantity}
              </span>

              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-kasi-black transition hover:bg-golden-yellow disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setQuantity((q) => q + 1)}
                disabled={!canChangeQty}
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Add */}
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canClickAdd}
              aria-busy={isAdding || undefined}
              aria-live="polite"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-kasi-green px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-street-orange active:scale-95 disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/40"
            >
              {isAdding && (
                <span
                  className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
                  aria-hidden="true"
                />
              )}

              {!isAdding && justAdded && (
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}

              <span
                className={`mt-1 inline-flex items-center text-white rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                  !storeIsOpen
                    ? "bg-black/10 text-black/50"
                    : item.isAvailable
                      ? "bg-kasi-green/10 text-kasi-green"
                      : "bg-black/10 text-black/50"
                }`}
              >
                {!storeIsOpen
                  ? "Store closed"
                  : item.isAvailable
                    ? "Available"
                    : "Sold out"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { addToCart } from "@/app/cart/actions";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  isAvailable: boolean;
};

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (itemId: string, quantity: number) => void;
}

function formatPrice(priceCents: number) {
  return `R ${(priceCents / 100).toFixed(2)}`;
}

export function MenuItemCard({ item, onAdd }: MenuItemCardProps) {
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
    if (!item.isAvailable || isAdding) return;
  
    setIsAdding(true);
    setJustAdded(false);
  
    try {
      const res = await addToCart(item.id, quantity);
  
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      
  
      // Only update UI if server confirmed success
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

  const canChangeQty = item.isAvailable && !isAdding;
  const canClickAdd = item.isAvailable && !isAdding;

  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Image */}
      {item.imageUrl ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium uppercase text-slate-400 dark:bg-slate-800">
          No image
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {item.name}
            </h3>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
              {formatPrice(item.priceCents)}
            </span>
          </div>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">
              {item.description}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          {/* Availability */}
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              item.isAvailable
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {item.isAvailable ? "Available" : "Sold out"}
          </span>

          {/* Quantity + Add */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 text-xs dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                className="px-2 py-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:text-slate-50"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!canChangeQty}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="px-2 text-slate-800 dark:text-slate-50">
                {quantity}
              </span>
              <button
                type="button"
                className="px-2 py-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:text-slate-50"
                onClick={() => setQuantity((q) => q + 1)}
                disabled={!canChangeQty}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!canClickAdd}
              aria-busy={isAdding || undefined}
              aria-live="polite"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              {isAdding && (
                <span
                  className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
                  aria-hidden="true"
                />
              )}
              {!isAdding && justAdded && (
                <span
                  className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/20 text-[9px]"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
              <span className={isAdding ? "opacity-90" : undefined}>
                {!item.isAvailable
                  ? "Sold out"
                  : isAdding
                  ? "Adding…"
                  : justAdded
                  ? "Added"
                  : "Add"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

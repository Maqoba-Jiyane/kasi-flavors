"use client";

import { addToCart } from "@/app/cart/actions";
import { useState } from "react";

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

  const handleAdd = async() => {
    if (!item.isAvailable) return;
    await addToCart(item.id, quantity)
    onAdd(item.id, quantity);
  };

  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Image */}
      {item.imageUrl ?
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
        : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium uppercase text-slate-400 dark:bg-slate-800">
            No image
          </div>
        )
      }

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
                disabled={!item.isAvailable}
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
                disabled={!item.isAvailable}
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!item.isAvailable}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

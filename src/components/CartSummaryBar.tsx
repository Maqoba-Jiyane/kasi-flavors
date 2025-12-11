"use client";

import { useState } from "react";

interface CartSummaryBarProps {
  itemCount: number;
  totalCents: number;
  onCheckout: () => void | Promise<void>;
}

function formatPrice(priceCents: number) {
  return `R ${(priceCents / 100).toFixed(2)}`;
}

export function CartSummaryBar({
  itemCount,
  totalCents,
  onCheckout,
}: CartSummaryBarProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const hasItems = itemCount > 0;

  const handleCheckoutClick = async () => {
    if (!hasItems || isCheckingOut) return;

    try {
      setIsCheckingOut(true);
      // Support both sync and async onCheckout
      await Promise.resolve(onCheckout());
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Option A: hide entirely when empty (most common pattern)
  if (!hasItems) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl shadow-slate-900/20 backdrop-blur sm:px-0 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
            Cart
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {itemCount} item{itemCount > 1 ? "s" : ""} ·{" "}
            {formatPrice(totalCents)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCheckoutClick}
          disabled={!hasItems || isCheckingOut}
          aria-busy={isCheckingOut || undefined}
          aria-disabled={!hasItems || isCheckingOut || undefined}
          aria-label={
            isCheckingOut
              ? "Opening cart"
              : "View cart and proceed to checkout"
          }
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-150 hover:-translate-y-[1px] hover:bg-emerald-700 hover:shadow-xl active:translate-y-[1px] active:shadow-md disabled:translate-y-0 disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
        >
          {isCheckingOut && (
            <span
              className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
              aria-hidden="true"
            />
          )}
          <span className={isCheckingOut ? "opacity-90" : undefined}>
            {isCheckingOut ? "Opening cart…" : "View cart →"}
          </span>
        </button>
      </div>
    </div>
  );
}

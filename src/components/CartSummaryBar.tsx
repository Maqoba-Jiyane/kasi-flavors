"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";

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
      await Promise.resolve(onCheckout());
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!hasItems) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-kasi-black/95 px-4 py-3 shadow-2xl backdrop-blur sm:px-0">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-golden-yellow text-kasi-black">
            <ShoppingCart className="h-5 w-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wide text-golden-yellow">
              Your order
            </span>

            <span className="text-sm font-black text-white sm:text-base">
              {itemCount} item{itemCount > 1 ? "s" : ""} ·{" "}
              {formatPrice(totalCents)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCheckoutClick}
          disabled={!hasItems || isCheckingOut}
          aria-busy={isCheckingOut || undefined}
          aria-disabled={!hasItems || isCheckingOut || undefined}
          aria-label={
            isCheckingOut ? "Opening cart" : "View cart and proceed to checkout"
          }
          className="inline-flex items-center justify-center gap-2 rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-street-orange active:translate-y-0 disabled:translate-y-0 disabled:bg-white/20 disabled:text-white/50"
        >
          {isCheckingOut && (
            <span
              className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
              aria-hidden="true"
            />
          )}

          <span>{isCheckingOut ? "Opening…" : "View cart →"}</span>
        </button>
      </div>
    </div>
  );
}
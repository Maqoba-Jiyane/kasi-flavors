"use client";

interface CartSummaryBarProps {
  itemCount: number;
  totalCents: number;
  onCheckout: () => void;
}

function formatPrice(priceCents: number) {
  return `R ${(priceCents / 100).toFixed(2)}`;
}

export function CartSummaryBar({
  itemCount,
  totalCents,
  onCheckout,
}: CartSummaryBarProps) {
  // if (itemCount === 0) return null;

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
          onClick={onCheckout}
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700"
        >
          View Cart →
        </button>
      </div>
    </div>
  );
}

'use client';

import Link from "next/link";

export type Store = {
  id: string;
  name: string;
  slug: string;
  area: string;
  city: string;
  description?: string | null;
  avgPrepTimeMinutes: number;
  isOpen: boolean;
};

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const CardInner = (
    <>
      {/* Top section */}
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {store.name}
            </h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {store.area} · {store.city}
            </p>
          </div>

          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              store.isOpen
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60"
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
            }`}
          >
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
            {store.isOpen ? "Open" : "Closed"}
          </span>
        </div>

        {store.description && (
          <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {store.description}
          </p>
        )}
      </div>

      {/* Bottom strip */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        <div className="flex items-center gap-2">
          {Number.isFinite(store.avgPrepTimeMinutes) && store.avgPrepTimeMinutes > 0 && (
            <span className="inline-flex h-6 items-center rounded-full bg-white px-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 shadow-sm dark:bg-slate-950">
              ~ {store.avgPrepTimeMinutes} min prep
            </span>
          )}
        </div>

        {store.isOpen ? (
          <span className="text-xs font-semibold text-emerald-600 group-hover:text-emerald-700 dark:text-emerald-400">
            View menu →
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Closed — not taking orders
          </span>
        )}
      </div>
    </>
  );

  const baseClass =
    "relative flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition dark:border-slate-800 dark:bg-slate-900";

  // OPEN: clickable, hover lift
  if (store.isOpen) {
    return (
      <Link
        href={`/stores/${store.slug}`}
        className={`${baseClass} group hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-emerald-400`}
      >
        {CardInner}
      </Link>
    );
  }

  // CLOSED: not a link (better UX + accessibility)
  return (
    <div
      className={`${baseClass} opacity-70`}
      aria-disabled="true"
    >
      {/* Optional: subtle overlay label */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-transparent" />
      {CardInner}
    </div>
  );
}

"use client";

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
  supportsDelivery?: boolean;
  supportsCollection?: boolean;
};

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const hasPrepTime =
    Number.isFinite(store.avgPrepTimeMinutes) && store.avgPrepTimeMinutes > 0;

  const CardInner = (
    <>
      {/* Top visual strip */}
      <div className="relative overflow-hidden rounded-t-2xl bg-kasi-black px-4 py-4 text-white">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-street-orange/80 blur-2xl" />
        <div className="absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-kasi-green/70 blur-2xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-3xl shadow-sm">
            🍔
          </div>

          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${
              store.isOpen
                ? "bg-kasi-green text-white ring-white/15"
                : "bg-white/10 text-white/70 ring-white/15"
            }`}
          >
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
            {store.isOpen ? "Open now" : "Closed"}
          </span>
        </div>

        <div className="relative mt-4">
          <h3 className="line-clamp-1 text-xl font-black tracking-tight text-white">
            {store.name}
          </h3>

          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/65">
            {store.area} · {store.city}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {store.description ? (
          <p className="line-clamp-2 text-sm font-medium leading-6 text-black/65">
            {store.description}
          </p>
        ) : (
          <p className="line-clamp-2 text-sm font-medium leading-6 text-black/65">
            Local kasi food spot serving bold flavors from the streets.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {hasPrepTime ? (
            <span className="inline-flex items-center rounded-full bg-kasi-cream px-3 py-1 text-[11px] font-black uppercase tracking-wide text-kasi-black ring-1 ring-black/10">
              ~ {store.avgPrepTimeMinutes} min prep
            </span>
          ) : null}

          {store.supportsCollection ? (
            <span className="inline-flex items-center rounded-full bg-golden-yellow/25 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-kasi-black ring-1 ring-golden-yellow/40">
              Collection
            </span>
          ) : null}

          {store.supportsDelivery ? (
            <span className="inline-flex items-center rounded-full bg-kasi-green/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-kasi-green ring-1 ring-kasi-green/20">
              Delivery
            </span>
          ) : null}
        </div>
      </div>

      {/* CTA strip */}
      <div className="border-t border-black/10 bg-white px-4 py-3">
        {store.isOpen ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wide text-black/45">
              Skip the queue
            </span>

            <span className="inline-flex items-center rounded-full bg-kasi-green px-4 py-2 text-xs font-black text-white transition group-hover:bg-street-orange">
              View menu →
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wide text-black/45">
              Not taking orders
            </span>

            <span className="inline-flex items-center rounded-full bg-black/10 px-4 py-2 text-xs font-black text-black/55">
              Closed
            </span>
          </div>
        )}
      </div>
    </>
  );

  const baseClass =
    "relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition";

  if (store.isOpen) {
    return (
      <Link
        href={`/stores/${store.slug}`}
        className={`${baseClass} group hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-kasi-green focus:ring-offset-2`}
      >
        {CardInner}
      </Link>
    );
  }

  return (
    <div
      className={`${baseClass} opacity-75 grayscale-[0.25]`}
      aria-disabled="true"
    >
      {CardInner}
    </div>
  );
}
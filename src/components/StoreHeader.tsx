import Link from "next/link";

type StoreHeaderProps = {
  name: string;
  area: string;
  city: string;
  isOpen: boolean;
  avgPrepTimeMinutes: number;
  priceAdjustmentEnabled?: boolean;
  priceAdjustmentPercent?: number;
  ogImageUrl?: string | null;
};

export function StoreHeader({
  name,
  area,
  city,
  isOpen,
  avgPrepTimeMinutes,
  priceAdjustmentEnabled,
  priceAdjustmentPercent,
  ogImageUrl,
}: StoreHeaderProps) {
  const hasPrepTime =
    Number.isFinite(avgPrepTimeMinutes) && avgPrepTimeMinutes > 0;

  const hasOgImage = !!ogImageUrl?.trim();

  return (
    <header className="relative overflow-hidden border-b border-black/10 bg-kasi-black text-white">
      {hasOgImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url("${ogImageUrl}")`,
            }}
            aria-hidden="true"
          />

          <div
            className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/70 to-black/85"
            aria-hidden="true"
          />

          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,189,11,0.20),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(0,107,43,0.25),transparent_32%)]"
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute -left-20 top-8 h-56 w-56 rounded-full bg-street-orange blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-kasi-green blur-3xl" />
          <div className="absolute left-1/2 top-10 h-40 w-40 rounded-full bg-golden-yellow blur-3xl" />
        </div>
      )}

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/75 backdrop-blur transition hover:bg-white hover:text-kasi-black"
        >
          ← Back to stores
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${
                  isOpen
                    ? "bg-kasi-green text-white ring-white/15"
                    : "bg-white/10 text-white/70 ring-white/15"
                }`}
              >
                <span className="mr-1.5 h-2 w-2 rounded-full bg-current" />
                {isOpen ? "Open now" : "Closed"}
              </span>

              {hasPrepTime ? (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/75 ring-1 ring-white/10">
                  ~ {avgPrepTimeMinutes} min prep
                </span>
              ) : null}

              {priceAdjustmentEnabled && priceAdjustmentPercent != null ? (
                <span className="inline-flex items-center rounded-full bg-golden-yellow px-3 py-1 text-xs font-black uppercase tracking-wide text-kasi-black">
                  {priceAdjustmentPercent > 0
                    ? `${priceAdjustmentPercent}% markup included`
                    : `${Math.abs(priceAdjustmentPercent)}% discount included`}
                </span>
              ) : null}
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-none tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
              {name}
            </h1>

            <p className="mt-3 text-base font-bold uppercase tracking-wide text-white/70">
              {area} · {city}
            </p>

            <p className="mt-5 max-w-2xl text-sm font-medium leading-6 text-white/75 sm:text-base">
              Order your favourites online, skip the queue, and collect when
              your meal is ready.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-black uppercase tracking-wide text-golden-yellow">
              Kasi Flavors
            </p>

            <p className="mt-2 text-2xl font-black leading-none">
              Fast & easy
            </p>

            <p className="mt-2 max-w-[220px] text-sm font-medium leading-6 text-white/65">
              Add items to cart and checkout in a few taps.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
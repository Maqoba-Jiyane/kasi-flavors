// app/page.tsx
import { prisma } from "@/lib/prisma";
import { StoreCard } from "@/components/StoreCard";
import { getCurrentUserMinimal } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Order kasi food online",
  description:
    "Discover local kasi food spots near you. Skip the queue, order kota, chips, bunny chow and more online for collection or delivery.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Order kasi food online | Kasi Flavors",
    description:
      "Browse kasi restaurants by area and city. Skip the queue and order kota, bunny chow, shisanyama and more for collection or delivery.",
    url: "/",
    images: [
      {
        url: "/og-image-home.png",
        width: 1200,
        height: 630,
        alt: "Kasi Flavors home – skip the queue and order online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Order kasi food online | Kasi Flavors",
    description:
      "Find nearby kasi spots and order kota, chips, bunny chow and more online.",
    images: ["/og-image-home.png"],
  },
  robots: { index: true, follow: true },
};

type SearchParams = {
  q?: string;
  city?: string;
  area?: string;
  showClosed?: string;
  fulfillment?: string;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const city = (sp.city ?? "").trim();
  const area = (sp.area ?? "").trim();
  const showClosed = sp.showClosed === "1";
  const fulfillment = (sp.fulfillment ?? "").trim();

  const user = await getCurrentUserMinimal();

  if (user?.role === "STORE_OWNER") {
    redirect("/owner/store/orders");
  }

  if (user?.role !== "ADMIN") {
    redirect("/become-a-partner");
  }

  const allStoresForFilters = await prisma.store.findMany({
    select: { city: true, area: true },
  });

  const cityOptions = Array.from(
    new Set(allStoresForFilters.map((s) => s.city).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const areaOptions = Array.from(
    new Set(
      allStoresForFilters
        .filter((s) => (city ? s.city === city : true))
        .map((s) => s.area)
        .filter((a) => a && a.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const fulfillmentWhere =
    fulfillment === "delivery"
      ? { supportsDelivery: true }
      : fulfillment === "collection"
        ? { supportsCollection: true }
        : {};

  const stores = await prisma.store.findMany({
    where: {
      ...(city ? { city } : {}),
      ...(area ? { area } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { area: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(showClosed ? {} : { isOpen: true }),
      ...fulfillmentWhere,
    },
    orderBy: [{ isOpen: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      area: true,
      city: true,
      description: true,
      avgPrepTimeMinutes: true,
      isOpen: true,
      supportsDelivery: true,
      supportsCollection: true,
    },
  });

  const mapped = stores.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    area: s.area,
    city: s.city,
    description: s.description ?? undefined,
    avgPrepTimeMinutes: s.avgPrepTimeMinutes,
    isOpen: s.isOpen,
    supportsDelivery: s.supportsDelivery,
    supportsCollection: s.supportsCollection,
  }));

  return (
    <main className="min-h-screen overflow-hidden bg-kasi-cream">
      {/* Hero */}
      <section className="relative border-b border-black/10 bg-kasi-black text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-street-orange blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-kasi-green blur-3xl" />
          <div className="absolute right-1/3 top-20 h-40 w-40 rounded-full bg-golden-yellow blur-3xl" />
        </div>

        <div className="kf-container relative py-12 sm:py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="kf-pill border-white/10 bg-white/10 text-white">
                Real flavors. Real kasi.
              </span>

              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-7xl">
                Skip the queue.{" "}
                <span className="text-kasi-green">Order online.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/75 sm:text-lg">
                Find nearby kasi food spots, browse menus, and order kota,
                chips, bunny chow, shisanyama and more for collection or
                delivery.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href="#stores" className="kf-btn-primary">
                  Find food near me
                </a>
                <a
                  href="#filters"
                  className="inline-flex items-center justify-center rounded-full border-2 border-white/20 bg-white/10 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white hover:text-kasi-black"
                >
                  Browse stores
                </a>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <p className="text-2xl">🍟</p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    Fresh kota & chips
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <p className="text-2xl">🛍️</p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    Easy pickup
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <p className="text-2xl">📍</p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    Local spots
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border-4 border-white bg-kasi-cream p-5 text-kasi-black shadow-2xl rotate-1">
                <div className="rounded-[1.5rem] bg-kasi-black p-5 text-white">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-kasi-green px-3 py-1 text-xs font-black uppercase">
                      Kasi born
                    </span>
                    <span className="text-3xl">🌶️</span>
                  </div>

                  <div className="mt-8">
                    <p className="text-sm font-bold uppercase tracking-wide text-golden-yellow">
                      Today&apos;s craving
                    </p>
                    <h2 className="mt-2 text-4xl font-black leading-none">
                      Loaded Kota
                    </h2>
                    <p className="mt-3 text-sm text-white/70">
                      Chips, egg, sausage, sauce and street flavor from local
                      kitchens near you.
                    </p>
                  </div>

                  <div className="mt-8 rounded-2xl bg-white p-4 text-kasi-black">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase text-black/50">
                          Fast & easy
                        </p>
                        <p className="text-lg font-black">
                          Order. Pay. Collect.
                        </p>
                      </div>
                      <div className="rounded-full bg-street-orange px-4 py-2 text-sm font-black text-white">
                        Hot
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 hidden rounded-2xl bg-golden-yellow px-5 py-3 text-sm font-black text-kasi-black shadow-lg sm:block">
                Bold flavors 🔥
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section id="filters" className="kf-container -mt-6 relative z-10">
        <div className="kf-card p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-kasi-green">
                Find your next meal
              </p>
              <h2 className="text-2xl font-black tracking-tight text-kasi-black">
                Browse kasi food spots
              </h2>
            </div>

            <p className="text-sm font-medium text-black/55">
              {mapped.length} {mapped.length === 1 ? "store" : "stores"} found
            </p>
          </div>

          <form
            method="get"
            action="/"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="lg:col-span-2">
              <label className="kf-label">Search</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search store, kota, chips, area…"
                className="kf-input"
              />
            </div>

            <div>
              <label className="kf-label">City</label>
              <select name="city" defaultValue={city} className="kf-input">
                <option value="">All cities</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="kf-label">Area</label>
              <select name="area" defaultValue={area} className="kf-input">
                <option value="">All areas</option>
                {areaOptions.length === 0 ? (
                  <option value="" disabled>
                    {city ? "No areas found" : "Select a city first"}
                  </option>
                ) : null}
                {areaOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <label className="kf-label">Order type</label>
              <select
                name="fulfillment"
                defaultValue={fulfillment}
                className="kf-input"
              >
                <option value="">Collection or delivery</option>
                <option value="collection">Collection only</option>
                <option value="delivery">Delivery available</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-black/70">
                <input
                  type="checkbox"
                  name="showClosed"
                  value="1"
                  defaultChecked={showClosed}
                  className="h-4 w-4 accent-kasi-green"
                />
                Show closed stores
              </label>

              <div className="flex gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border-2 border-black/15 bg-white px-4 py-2.5 text-sm font-extrabold text-kasi-black transition hover:border-kasi-black"
                >
                  Reset
                </Link>
                <button type="submit" className="kf-btn-secondary py-2.5">
                  Apply filters
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Brand strip */}
      <section className="kf-container mt-8">
        <div className="grid gap-3 rounded-[2rem] bg-kasi-black p-4 text-white sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-2xl">🍔</p>
            <h3 className="mt-2 font-black">Bold flavors</h3>
            <p className="mt-1 text-sm text-white/65">
              Real food from local kasi kitchens.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-2xl">⚡</p>
            <h3 className="mt-2 font-black">Fast & easy</h3>
            <p className="mt-1 text-sm text-white/65">
              Order online and collect without the stress.
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-2xl">🏪</p>
            <h3 className="mt-2 font-black">Kasi born</h3>
            <p className="mt-1 text-sm text-white/65">
              Built to help local food businesses grow.
            </p>
          </div>
        </div>
      </section>

      {/* Results */}
      <section id="stores" className="kf-container py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Available now
            </p>
            <h2 className="text-2xl font-black tracking-tight text-kasi-black sm:text-3xl">
              Local food spots
            </h2>
          </div>
        </div>

        {mapped.length === 0 ? (
          <div className="kf-card p-6 text-sm font-medium text-black/65">
            <p className="text-lg font-black text-kasi-black">
              No stores found{city ? ` in ${city}` : ""}
              {area ? ` (${area})` : ""}.
            </p>
            <p className="mt-2">
              Try a different search, remove filters, or check again later.
            </p>

            <Link href="/" className="mt-5 inline-flex kf-btn-primary">
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mapped.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

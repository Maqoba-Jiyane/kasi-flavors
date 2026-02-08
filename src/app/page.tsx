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
    "Discover local kasi spots near you. Order kota, bunny chow, shisanyama and more for collection or delivery from your favourite township kitchens.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Order kasi food online | Kasi Flavors",
    description:
      "Browse kasi restaurants by area and city. Order kota, bunny chow, shisanyama and more for collection or delivery in your neighbourhood.",
    url: "/",
    images: [
      {
        url: "/og-image-home.png",
        width: 1200,
        height: 630,
        alt: "Kasi Flavors home – browse kasi spots and order online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Order kasi food online | Kasi Flavors",
    description:
      "Find nearby kasi spots and order kota, bunny chow, shisanyama and more for quick collection or delivery.",
    images: ["/og-image-home.png"],
  },
  robots: { index: true, follow: true },
};

type SearchParams = {
  q?: string;
  city?: string;
  area?: string;
  showClosed?: string; // "1" shows closed too
  fulfillment?: string; // "delivery" | "collection" | ""
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
  const fulfillment = (sp.fulfillment ?? "").trim(); // delivery|collection

  const user = await getCurrentUserMinimal();
  if (user?.role === "STORE_OWNER") redirect("/owner/store/orders");

  // Build filter options (city/area lists)
  const allStoresForFilters = await prisma.store.findMany({
    select: { city: true, area: true },
  });

  const cityOptions = Array.from(
    new Set(allStoresForFilters.map((s) => s.city).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const areaOptions = Array.from(
    new Set(
      allStoresForFilters
        .filter((s) => (city ? s.city === city : true))
        .map((s) => s.area)
        .filter((a) => a && a.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Fulfillment filter (only applied if field exists in DB)
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

      // NEW (make sure you added these to Prisma model)
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
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Kasi Flavors
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Order from your favourite kasi spots – kota, bunny chow, all in one
            place.
          </p>
        </header>

        {/* Filters */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form
            method="get"
            action="/"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Search
              </label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search store, kota, shisanyama, area…"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                City
              </label>
              <select
                name="city"
                defaultValue={city}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">All cities</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Tip: pick a city to narrow areas.
              </p>
            </div>

            {/* Area */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Area
              </label>
              <select
                name="area"
                defaultValue={area}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
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

            {/* Fulfillment */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Fulfillment
              </label>
              <select
                name="fulfillment"
                defaultValue={fulfillment}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Any</option>
                <option value="collection">Collection only</option>
                <option value="delivery">Delivery available</option>
              </select>
            </div>

            {/* Show closed + Actions */}
            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  name="showClosed"
                  value="1"
                  defaultChecked={showClosed}
                  className="h-4 w-4"
                />
                Show closed stores
              </label>

              <div className="ml-auto flex gap-2">
                <Link
                  href="/"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Reset
                </Link>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Apply
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Results */}
        <section>
          {mapped.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              No stores found{city ? ` in ${city}` : ""}
              {area ? ` (${area})` : ""}. Try a different search or remove
              filters.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mapped.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

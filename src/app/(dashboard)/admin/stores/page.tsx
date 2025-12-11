// app/(dashboard)/admin/stores/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Store, User } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  // Admin layout will add the template suffix: "%s | Admin | Kasi Flavors"
  title: "Stores",
  description:
    "View and manage all stores on the Kasi Flavors platform, including owners, locations, status, and recent performance.",
  alternates: {
    // Ignore ?range= filters – keep a single canonical
    canonical: "/admin/stores",
  },
  openGraph: {
    type: "website",
    title: "Stores | Admin | Kasi Flavors",
    description:
      "Admin view of all Kasi Flavors stores with owners, status, order volume, and revenue by date range.",
    url: "/admin/stores",
  },
  twitter: {
    card: "summary",
    title: "Stores | Admin | Kasi Flavors",
    description:
      "Manage stores, link owners, and see store performance across the Kasi Flavors platform.",
  },
  // robots: handled at the admin layout level (noindex, nofollow)
};

type RangeOption = "7d" | "30d" | "all";

interface AdminStoresPageProps {
  searchParams?: Promise<{ range?: string }>;
}

function formatPrice(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

function getRangeStart(range: RangeOption, now: Date): Date | null {
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return null;
  }
}

// Small slug helper
function slugifyBase(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** SERVER ACTION: create a new store for an existing owner user */
export async function createStore(formData: FormData) {
  "use server";

  const current = await getCurrentUser();
  assertRole(current, ["ADMIN"]);

  const name = (formData.get("name") as string | "").trim();
  const ownerEmail = (formData.get("ownerEmail") as string | "")
    .trim()
    .toLowerCase();
  const city = (formData.get("city") as string | "").trim();
  const area = (formData.get("area") as string | "").trim();
  const address = (formData.get("address") as string | "").trim();

  if (!name || !ownerEmail || !city || !address) {
    throw new Error(
      "Missing required fields (name, owner email, city, address)."
    );
  }

  // Owner must already exist in the system (Clerk-created user)
  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!owner) {
    throw new Error(
      `Owner user with email "${ownerEmail}" not found. Ask them to sign up first.`
    );
  }

  // Ensure they are STORE_OWNER
  if (owner.role !== "STORE_OWNER") {
    await prisma.user.update({
      where: { id: owner.id },
      data: { role: "STORE_OWNER" },
    });
  }

  // Generate unique slug
  const baseSlug = slugifyBase(name) || "store";
  let slug = baseSlug;
  let counter = 1;

  // Ensure slug is unique
  // (For low volume this loop is fine; if you ever have thousands of stores, we can optimise)
  while (true) {
    const existing = await prisma.store.findUnique({
      where: { slug },
    });
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }

  await prisma.store.create({
    data: {
      name,
      slug,
      description: null,
      address,
      city,
      area,
      avgPrepTimeMinutes: 25,
      isOpen: true,
      ownerId: owner.id,
    },
  });

  // Refresh this page so the new store appears in the list
  revalidatePath("/admin/stores");
  redirect("/admin/stores");
}

export default async function AdminStoresPage({
  searchParams,
}: AdminStoresPageProps) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const now = new Date();
  const range = await searchParams;
  const rangeParam = (range as RangeOption | undefined) ?? "30d";
  const rangeStart = getRangeStart(rangeParam, now);

  // Fetch all stores with owner
  const stores = await prisma.store.findMany({
    include: {
      owner: true,
    },
    orderBy: { name: "asc" },
  });

  // Fetch orders once for this range
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ordersWhere: any = {};
  if (rangeStart) {
    ordersWhere.createdAt = { gte: rangeStart };
  }

  const orders = await prisma.order.findMany({
    where: ordersWhere,
    orderBy: { createdAt: "desc" },
  });

  type StoreAgg = {
    store: Store & { owner: User };
    orders: number;
    revenueCents: number;
    lastOrderAt?: Date | null;
  };

  const aggMap = new Map<string, StoreAgg>();

  // Initialize entries so stores with no orders still show
  stores.forEach((s) => {
    aggMap.set(s.id, {
      store: s,
      orders: 0,
      revenueCents: 0,
      lastOrderAt: null,
    });
  });

  // Aggregate orders into stores
  orders.forEach((o) => {
    const entry = aggMap.get(o.storeId);
    if (!entry) return;

    entry.orders += 1;
    entry.revenueCents += o.totalCents;
    if (!entry.lastOrderAt || o.createdAt > entry.lastOrderAt) {
      entry.lastOrderAt = o.createdAt;
    }
  });

  const rows = Array.from(aggMap.values()).sort(
    (a, b) => b.revenueCents - a.revenueCents
  );

  return (
    <main className="space-y-5">
      {/* Top bar with title & Add store */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Stores
        </h1>
        <Link
          href="/admin/stores/new"
          className="hidden md:inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Add store
        </Link>
      </div>

      {/* Mobile list */}
      <section className="space-y-3 md:hidden">
        {rows.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="mb-3">No stores found.</p>
            <Link
              href="/admin/stores/new"
              className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Add store
            </Link>
          </div>
        )}

        {rows.map(({ store, orders, revenueCents, lastOrderAt }) => {
          const ownerName =
            store.owner?.name || store.owner?.email || "Unknown owner";
          const location = store.area
            ? `${store.area}, ${store.city}`
            : store.city;
          const lastOrderLabel = lastOrderAt
            ? lastOrderAt.toLocaleString("en-ZA", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "No orders yet";

          return (
            <article
              key={store.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <header className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {store.name}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {store.slug}
                  </p>
                </div>
                <span
                  className={[
                    "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    store.isOpen
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                  ].join(" ")}
                >
                  {store.isOpen ? "Open" : "Closed"}
                </span>
              </header>

              <div className="mb-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <p>{ownerName}</p>
                <p>{location}</p>
                <p>
                  <span className="font-medium">{orders}</span> orders ·{" "}
                  <span className="font-medium">
                    {revenueCents > 0 ? formatPrice(revenueCents) : "R 0.00"}
                  </span>
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  Last order: {lastOrderLabel}
                </p>
              </div>

              <footer className="mt-2">
                <Link
                  href={`/admin/stores/${store.id}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Manage store
                </Link>
              </footer>
            </article>
          );
        })}
      </section>

      {/* Desktop table */}
      <section className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Store</th>
              <th className="px-3 py-2 text-left font-medium">Owner</th>
              <th className="px-3 py-2 text-left font-medium">Location</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Orders</th>
              <th className="px-3 py-2 text-right font-medium">Revenue</th>
              <th className="px-3 py-2 text-right font-medium">Last order</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400"
                >
                  No stores found.
                </td>
              </tr>
            )}

            {rows.map(({ store, orders, revenueCents, lastOrderAt }) => {
              const ownerName =
                store.owner?.name + " " + store.owner.name ||
                store.owner?.email ||
                "—";
              const ownerEmail = store.owner?.email || null;
              const location = store.area
                ? `${store.area}, ${store.city}`
                : store.city;

              return (
                <tr key={store.id}>
                  {/* Store name */}
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                    <div className="flex flex-col">
                      <span className="font-medium">{store.name}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {store.slug}
                      </span>
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    <div className="flex flex-col">
                      <span>{ownerName}</span>
                      {ownerEmail && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {ownerEmail}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {location}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2 text-center">
                    <span
                      className={[
                        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        store.isOpen
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                      ].join(" ")}
                    >
                      {store.isOpen ? "Open" : "Closed"}
                    </span>
                  </td>

                  {/* Orders */}
                  <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                    {orders}
                  </td>

                  {/* Revenue */}
                  <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                    {revenueCents > 0 ? formatPrice(revenueCents) : "—"}
                  </td>

                  {/* Last order */}
                  <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                    {lastOrderAt
                      ? lastOrderAt.toLocaleString("en-ZA", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/stores/${store.id}`}
                      className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Sticky Add button for mobile */}
      <Link
        href="/admin/stores/new"
        className="fixed inset-x-4 bottom-4 z-20 inline-flex h-11 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white shadow-lg hover:bg-slate-800 active:scale-[0.98] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 md:hidden"
      >
        Add store
      </Link>
    </main>
  );
}

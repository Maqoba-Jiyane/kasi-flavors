// app/(dashboard)/admin/overview/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { Order, Store } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  // Admin layout applies template: "%s | Admin | Kasi Flavors"
  title: "Platform overview",
  description:
    "See platform-wide orders, revenue, prep times, and store performance across all Kasi Flavors stores.",
  alternates: {
    // Ignore ?range= filters – keep a single canonical
    canonical: "/admin/overview",
  },
  openGraph: {
    type: "website",
    title: "Platform overview | Admin | Kasi Flavors",
    description:
      "Monitor platform-wide performance including orders, revenue, active stores, and average prep times across Kasi Flavors.",
    url: "/admin/overview",
  },
  twitter: {
    card: "summary",
    title: "Platform overview | Admin | Kasi Flavors",
    description:
      "Admin view of global orders, revenue and store activity across the Kasi Flavors platform.",
  },
  // robots are already handled at the admin layout level (noindex, nofollow)
};

type RangeOption = "7d" | "30d" | "all";

interface AdminOverviewPageProps {
  searchParams?: Promise<{ range?: string }>;
}

export function formatPrice(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

function minutesBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 60000;
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

export default async function AdminOverviewPage({
  searchParams,
}: AdminOverviewPageProps) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const now = new Date();
  const range = await searchParams
  const rangeParam = (range?.range as RangeOption | undefined) ?? "30d";
  const rangeStart = getRangeStart(rangeParam, now);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (rangeStart) {
    where.createdAt = { gte: rangeStart };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      store: true,
    },
    orderBy: { createdAt: "desc" },
    take: rangeParam === "7d" ? 500 : 2000,
  });

  const stores = await prisma.store.findMany();

  const totalOrders = orders.length;
  const totalRevenueCents = orders.reduce(
    (sum, o) => sum + o.totalCents,
    0
  );
  const avgOrderValueCents =
    totalOrders > 0 ? totalRevenueCents / totalOrders : 0;

  // Unique stores that actually had orders in this range
  const storeIdsWithOrders = new Set(orders.map((o) => o.storeId));
  const activeStoreCount = storeIdsWithOrders.size;
  const totalStoreCount = stores.length;

  // Status breakdown (platform-wide)
  const statusCounts: Record<Order["status"], number> = {
    PENDING: 0,
    ACCEPTED: 0,
    IN_PREPARATION: 0,
    READY_FOR_COLLECTION: 0,
    OUT_FOR_DELIVERY: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  orders.forEach((o) => {
    statusCounts[o.status] += 1;
  });

  const activeStatuses = (
    Object.keys(statusCounts) as Order["status"][]
  ).filter((s) => statusCounts[s] > 0);

  const maxStatusCount =
    activeStatuses.length > 0
      ? Math.max(...activeStatuses.map((s) => statusCounts[s]))
      : 0;

  // Average prep time for completed orders
  const completedWithTime = orders.filter(
    (o) => o.completedAt !== null
  );

  const avgPrepMinutes =
    completedWithTime.length > 0
      ? completedWithTime.reduce(
          (sum, o) => sum + minutesBetween(o.createdAt, o.completedAt!),
          0
        ) / completedWithTime.length
      : 0;

  // Per-store aggregation
  type StoreAgg = {
    store: Store;
    orders: number;
    revenueCents: number;
    avgOrderCents: number;
    lastOrderAt?: Date | null;
  };

  const storeAggMap = new Map<string, StoreAgg>();

  orders.forEach((o) => {
    const key = o.storeId;
    const existing =
      storeAggMap.get(key) ??
      ({
        store: o.store,
        orders: 0,
        revenueCents: 0,
        avgOrderCents: 0,
        lastOrderAt: null,
      } as StoreAgg);

    existing.orders += 1;
    existing.revenueCents += o.totalCents;
    if (!existing.lastOrderAt || o.createdAt > existing.lastOrderAt) {
      existing.lastOrderAt = o.createdAt;
    }

    storeAggMap.set(key, existing);
  });

  const perStore = Array.from(storeAggMap.values()).map((s) => ({
    ...s,
    avgOrderCents:
      s.orders > 0 ? Math.round(s.revenueCents / s.orders) : 0,
  }));

  // Sort by revenue desc
  const topStores = [...perStore].sort(
    (a, b) => b.revenueCents - a.revenueCents
  );

  const rangeLabel =
    rangeParam === "7d"
      ? "Last 7 days"
      : rangeParam === "30d"
      ? "Last 30 days"
      : "All time";

  return (
    <main>
      <div className="space-y-6">
        {/* Header + Range */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Platform overview
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {rangeLabel} across all stores.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              Range:
            </span>
            <RangeChip href="/admin/overview?range=7d" active={rangeParam === "7d"}>
              7 days
            </RangeChip>
            <RangeChip
              href="/admin/overview?range=30d"
              active={rangeParam === "30d"}
            >
              30 days
            </RangeChip>
            <RangeChip
              href="/admin/overview?range=all"
              active={rangeParam === "all"}
            >
              All time
            </RangeChip>
          </div>
        </header>

        {/* Summary cards */}
        <section className="grid gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Total revenue"
            value={formatPrice(totalRevenueCents)}
            helper={`${totalOrders} orders`}
          />
          <SummaryCard
            label="Avg order value"
            value={formatPrice(Math.round(avgOrderValueCents))}
            helper={totalOrders > 0 ? "Per order" : "No orders"}
          />
          <SummaryCard
            label="Stores active"
            value={`${activeStoreCount} / ${totalStoreCount}`}
            helper="Stores with orders in this range"
          />
          <SummaryCard
            label="Avg prep time"
            value={
              completedWithTime.length > 0
                ? `${Math.round(avgPrepMinutes)} min`
                : "—"
            }
            helper={
              completedWithTime.length > 0
                ? `${completedWithTime.length} completed orders`
                : "No completed orders"
            }
          />
        </section>

        {/* Status breakdown */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Status breakdown
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            How orders are distributed by status across the platform.
          </p>

          {activeStatuses.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No orders in this range.
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-xs">
              {activeStatuses.map((status) => {
                const count = statusCounts[status];
                const widthPct =
                  maxStatusCount > 0
                    ? Math.max(8, (count / maxStatusCount) * 100)
                    : 0;

                const label = status
                  .toLowerCase()
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());

                return (
                  <div
                    key={status}
                    className="flex items-center gap-3"
                  >
                    <div className="w-40 text-[11px] text-slate-600 dark:text-slate-300">
                      {label}
                    </div>
                    <div className="flex-1">
                      <div className="relative h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 dark:bg-emerald-400"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-10 text-right text-[11px] text-slate-600 dark:text-slate-300">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Per-store table */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Stores performance
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Orders and revenue per store in this range.
          </p>

          {topStores.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No stores with orders in this range.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 text-xs dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      Store
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Location
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Orders
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Revenue
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Avg order
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Last order
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {topStores.map((s) => (
                    <tr key={s.store.id}>
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                        {s.store.name}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {s.store.area
                          ? `${s.store.area}, ${s.store.city}`
                          : s.store.city}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {s.orders}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {formatPrice(s.revenueCents)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {formatPrice(s.avgOrderCents)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                        {s.lastOrderAt
                          ? s.lastOrderAt.toLocaleString("en-ZA", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  helper?: string;
}

function SummaryCard({ label, value, helper }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </p>
      {helper && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
}

import Link from "next/link";

interface RangeChipProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

function RangeChip({ href, active, children }: RangeChipProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition",
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400/80 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

// app/(dashboard)/admin/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { Order, Store } from "@prisma/client";
import React from "react";

type RangeOption = "7d" | "30d" | "all";

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

interface AdminOverviewPageProps {
  searchParams?: Promise<{ range?: string }>;
}

export default async function AdminOverviewPage({
  searchParams,
}: AdminOverviewPageProps) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const now = new Date();
  const range = await searchParams;
  const rangeParam = (range?.range as RangeOption | undefined) ?? "30d";
  const rangeStart = getRangeStart(rangeParam, now);

  // base where for orders depending on range
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
  const totalRevenueCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const avgOrderValueCents = totalOrders > 0 ? totalRevenueCents / totalOrders : 0;

  // Unique stores that had orders in this range
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

  const activeStatuses = (Object.keys(statusCounts) as Order["status"][]).filter(
    (s) => statusCounts[s] > 0
  );

  const maxStatusCount =
    activeStatuses.length > 0 ? Math.max(...activeStatuses.map((s) => statusCounts[s])) : 0;

  // Average prep time for completed orders
  const completedWithTime = orders.filter((o) => o.completedAt !== null);

  const avgPrepMinutes =
    completedWithTime.length > 0
      ? completedWithTime.reduce((sum, o) => sum + minutesBetween(o.createdAt, o.completedAt!), 0) /
        completedWithTime.length
      : 0;

  // Per-store aggregation built from orders
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

  // Create a list for ALL stores: fill missing ones with defaults (zero orders)
  const allStoreRows: StoreAgg[] = stores.map((s) => {
    const agg = storeAggMap.get(s.id);
    if (agg) {
      return {
        ...agg,
        avgOrderCents: agg.orders > 0 ? Math.round(agg.revenueCents / agg.orders) : 0,
      };
    }
    return {
      store: s,
      orders: 0,
      revenueCents: 0,
      avgOrderCents: 0,
      lastOrderAt: null,
    };
  });

  // sort by revenue desc, but keep stores with zero revenue at the bottom
  const topStores = [...allStoreRows].sort((a, b) => b.revenueCents - a.revenueCents);

  const rangeLabel = rangeParam === "7d" ? "Last 7 days" : rangeParam === "30d" ? "Last 30 days" : "All time";

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header + Range + Add store button */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Platform overview</h1>
            <p className="text-xs text-slate-500 dark:text-slate-300">{rangeLabel} across all stores.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Range:</span>
              <RangeChip href="/admin/overview?range=7d" active={rangeParam === "7d"}>7 days</RangeChip>
              <RangeChip href="/admin/overview?range=30d" active={rangeParam === "30d"}>30 days</RangeChip>
              <RangeChip href="/admin/overview?range=all" active={rangeParam === "all"}>All time</RangeChip>
            </div>

            {/* Add store mini button */}
            <Link
              href="/admin/stores/new"
              className="ml-2 inline-flex items-center gap-2 rounded-full border border-emerald-600 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100"
              title="Add new store"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add store
            </Link>
          </div>
        </header>

        {/* Summary cards */}
        <section className="grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Total revenue" value={formatPrice(totalRevenueCents)} helper={`${totalOrders} orders`} />
          <SummaryCard label="Avg order value" value={formatPrice(Math.round(avgOrderValueCents))} helper={totalOrders > 0 ? "Per order" : "No orders"} />
          <SummaryCard label="Stores active" value={`${activeStoreCount} / ${totalStoreCount}`} helper="Stores with orders in this range" />
          <SummaryCard
            label="Avg prep time"
            value={completedWithTime.length > 0 ? `${Math.round(avgPrepMinutes)} min` : "—"}
            helper={completedWithTime.length > 0 ? `${completedWithTime.length} completed orders` : "No completed orders"}
          />
        </section>

        {/* Status breakdown */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Status breakdown</h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">How orders are distributed by status across the platform.</p>

          {activeStatuses.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No orders in this range.</p>
          ) : (
            <div className="mt-3 space-y-2 text-xs">
              {activeStatuses.map((status) => {
                const count = statusCounts[status];
                const widthPct = maxStatusCount > 0 ? Math.max(8, (count / maxStatusCount) * 100) : 0;
                const label = status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-40 text-[11px] text-slate-600 dark:text-slate-300">{label}</div>
                    <div className="flex-1">
                      <div className="relative h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 dark:bg-emerald-400" style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                    <div className="w-10 text-right text-[11px] text-slate-600 dark:text-slate-300">{count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Stores grid */}
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Stores</h2>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Overview of all stores on the platform.</p>
            </div>
          </div>

          {topStores.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No stores found.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topStores.map((row) => (
                <article key={row.store.id} className="overflow-hidden rounded-xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{row.store.name}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {row.store.area ? `${row.store.area}, ${row.store.city}` : row.store.city}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.store.isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            <span className="inline-block h-2 w-2 rounded-full bg-current" />
                            {row.store.isOpen ? "Open" : "Closed"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                        <div>
                          <div className="text-[11px]">Orders</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{row.orders}</div>
                        </div>
                        <div>
                          <div className="text-[11px]">Revenue</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{formatPrice(row.revenueCents)}</div>
                        </div>
                        <div>
                          <div className="text-[11px]">Avg order</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{row.avgOrderCents ? formatPrice(row.avgOrderCents) : "—"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Link href={`/admin/stores/${row.store.id}`} className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300">
                      Manage
                    </Link>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {row.lastOrderAt ? new Date(row.lastOrderAt).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "No recent orders"}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* Small components used above */

interface SummaryCardProps {
  label: string;
  value: string;
  helper?: string;
}

function SummaryCard({ label, value, helper }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</p>
      {helper && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{helper}</p>}
    </div>
  );
}

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

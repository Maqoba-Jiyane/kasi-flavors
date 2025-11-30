// app/(dashboard)/owner/store/analytics/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { Order, OrderItem } from "@prisma/client";
import Link from "next/link";

type RangeOption = "7d" | "30d" | "all";

interface StoreAnalyticsPageProps {
    searchParams: Promise<{ range?: string }>;
}

function formatPrice(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

function minutesBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 60000;
}

// Compute start date based on range param
function getRangeStart(range: RangeOption, now: Date): Date | null {
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return null; // no limit
  }
}

export default async function StoreAnalyticsPage({
  searchParams,
}: StoreAnalyticsPageProps) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  if (!user) {
    throw new Error("Not authenticated");
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });

  if (!store) {
    throw new Error("No store linked to this account");
  }

  const now = new Date();
  const { range } = await searchParams
  const rangeParam = (range as RangeOption | undefined) ?? "30d";
  const rangeStart = getRangeStart(rangeParam, now);

  const where: any = { storeId: store.id };
  if (rangeStart) {
    where.createdAt = { gte: rangeStart };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: rangeParam === "7d" ? 200 : 500,
  });

  const totalOrders = orders.length;
  const totalRevenueCents = orders.reduce(
    (sum, o) => sum + o.totalCents,
    0
  );
  const avgOrderValueCents =
    totalOrders > 0 ? totalRevenueCents / totalOrders : 0;

  // Status breakdown
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

  // Active kitchen load: PENDING + ACCEPTED + IN_PREPARATION
  const activeKitchenLoad =
    statusCounts.PENDING +
    statusCounts.ACCEPTED +
    statusCounts.IN_PREPARATION;

  // Average prep time (createdAt -> completedAt)
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

  // Top products
  type ProductAgg = {
    name: string;
    quantity: number;
    revenueCents: number;
  };

  const productMap = new Map<string, ProductAgg>();

  orders.forEach((o) => {
    o.items.forEach((item: OrderItem) => {
      const key = item.name; // snapshot name is enough for MVP
      const existing = productMap.get(key) ?? {
        name: item.name,
        quantity: 0,
        revenueCents: 0,
      };

      existing.quantity += item.quantity;
      existing.revenueCents += item.totalCents;

      productMap.set(key, existing);
    });
  });

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Orders per day (simple trend)
  type DayAgg = { date: string; count: number };

  const dayMap = new Map<string, DayAgg>();

  orders.forEach((o) => {
    const d = o.createdAt;
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const existing = dayMap.get(key) ?? { date: key, count: 0 };
    existing.count += 1;
    dayMap.set(key, existing);
  });

  const daily = Array.from(dayMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const recentDaily =
    rangeParam === "7d"
      ? daily.slice(-7)
      : rangeParam === "30d"
      ? daily.slice(-14) // last 14 days view for 30d / all
      : daily.slice(-14);

  const maxDailyCount =
    recentDaily.length > 0
      ? Math.max(...recentDaily.map((d) => d.count))
      : 0;

  const rangeLabel =
    rangeParam === "7d"
      ? "Last 7 days"
      : rangeParam === "30d"
      ? "Last 30 days"
      : "All time";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header + Range selector */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {rangeLabel} for{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {store.name}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              Range:
            </span>
            <RangeChip
              href="/owner/store/analytics?range=7d"
              active={rangeParam === "7d"}
            >
              7 days
            </RangeChip>
            <RangeChip
              href="/owner/store/analytics?range=30d"
              active={rangeParam === "30d"}
            >
              30 days
            </RangeChip>
            <RangeChip
              href="/owner/store/analytics?range=all"
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
            label="Avg prep time"
            value={
              completedWithTime.length > 0
                ? `${Math.round(avgPrepMinutes)} min`
                : "—"
            }
            helper={
              completedWithTime.length > 0
                ? `${completedWithTime.length} completed`
                : "No completed orders"
            }
          />
          <SummaryCard
            label="Active kitchen load"
            value={String(activeKitchenLoad)}
            helper="Pending / accepted / in prep"
          />
        </section>

        {/* Trend: orders per day */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Orders per day
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Simple daily view of orders to see your busy days.
          </p>

          {recentDaily.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No orders in this range.
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-[11px]">
              {recentDaily.map((d) => {
                const widthPct =
                  maxDailyCount > 0
                    ? Math.max(8, (d.count / maxDailyCount) * 100)
                    : 0;

                const niceDate = new Date(d.date + "T00:00:00").toLocaleDateString(
                  "en-ZA",
                  { day: "2-digit", month: "short" }
                );

                return (
                  <div
                    key={d.date}
                    className="flex items-center gap-3"
                  >
                    <div className="w-16 text-slate-600 dark:text-slate-300">
                      {niceDate}
                    </div>
                    <div className="flex-1">
                      <div className="relative h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-sky-500 dark:bg-sky-400"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-8 text-right text-slate-700 dark:text-slate-200">
                      {d.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Status breakdown */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Status breakdown
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            How your orders are distributed by status in this range.
          </p>

          {activeStatuses.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No orders.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
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
                    className="flex items-center gap-3 text-xs"
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

        {/* Top products */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Top products
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Best sellers by quantity in this range.
          </p>

          {topProducts.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No product data.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 text-xs dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Product</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Qty sold
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {topProducts.map((p) => (
                    <tr key={p.name}>
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                        {p.name}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {p.quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {formatPrice(p.revenueCents)}
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

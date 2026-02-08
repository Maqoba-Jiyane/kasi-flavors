// app/(dashboard)/owner/store/analytics/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { Metadata } from "next";
import Link from "next/link";
import type { Order, OrderItem, Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Store analytics",
  description:
    "View your store’s revenue, order volume, fulfilment performance, fees, and top products on the Kasi Flavors analytics dashboard.",
  alternates: { canonical: "/owner/store/analytics" },
  openGraph: {
    type: "website",
    title: "Store analytics | Kasi Flavors",
    description:
      "Track completed revenue, fees, net, completion rates, fulfilment performance, and top products for your store.",
    url: "/owner/store/analytics",
  },
  twitter: {
    card: "summary",
    title: "Store analytics | Kasi Flavors",
    description:
      "Analyze completed revenue, fees, net, fulfilment, and product performance for your store.",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

type RangeOption = "7d" | "30d" | "all";

interface StoreAnalyticsPageProps {
  searchParams: Promise<{ range?: string }>;
}

function formatMoney(cents: number) {
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
      return null;
  }
}

function pct(n: number) {
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n * 100)}%`;
}

function humanizeStatus(status: Order["status"]) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type OrderWithItems = Order & { items: OrderItem[] };

function sumCents(orders: OrderWithItems[], pick: (o: OrderWithItems) => number) {
  return orders.reduce((sum, o) => sum + pick(o), 0);
}

function avgMinutesFromDates(pairs: Array<{ start: Date; end: Date }>) {
  if (pairs.length === 0) return 0;
  const total = pairs.reduce((sum, p) => sum + minutesBetween(p.start, p.end), 0);
  return total / pairs.length;
}

type Bucket = {
  label: string;
  orders: number;
  completed: number;
  cancelled: number;
  completedRevenueCents: number;
  feesPaidCents: number;
  feesOutstandingCents: number;
  avgFulfilmentMins: number; // createdAt -> completedAt (completed only)
};

function buildBucket(label: string, orders: OrderWithItems[]): Bucket {
  const completed = orders.filter((o) => o.status === "COMPLETED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");

  const completedRevenueCents = sumCents(completed, (o) => o.totalCents);

  const feesPaidCents = completed.reduce((sum, o) => {
    // if platformFeeCents might be null in your model, guard:
    const fee = (o as unknown as { platformFeeCents?: number | null }).platformFeeCents ?? 0;
    const paid = (o as unknown as { platformFeePaid?: boolean | null }).platformFeePaid ?? false;
    return sum + (paid ? fee : 0);
  }, 0);

  const feesOutstandingCents = completed.reduce((sum, o) => {
    const fee = (o as unknown as { platformFeeCents?: number | null }).platformFeeCents ?? 0;
    const paid = (o as unknown as { platformFeePaid?: boolean | null }).platformFeePaid ?? false;
    return sum + (!paid ? fee : 0);
  }, 0);

  const fulfilPairs = completed
    .filter((o) => o.completedAt)
    .map((o) => ({ start: o.createdAt, end: o.completedAt! }));

  const avgFulfilmentMins = avgMinutesFromDates(fulfilPairs);

  return {
    label,
    orders: orders.length,
    completed: completed.length,
    cancelled: cancelled.length,
    completedRevenueCents,
    feesPaidCents,
    feesOutstandingCents,
    avgFulfilmentMins,
  };
}

export default async function StoreAnalyticsPage({ searchParams }: StoreAnalyticsPageProps) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });

  if (!store) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            No store linked to this account
          </h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            This owner account does not have a store configured yet.
          </p>
          <div className="mt-3">
            <Link
              href="/owner/store/overview"
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to overview →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const now = new Date();
  const { range } = await searchParams;
  const rangeParam = (range as RangeOption | undefined) ?? "30d";
  const rangeStart = getRangeStart(rangeParam, now);

  const where: Prisma.OrderWhereInput = {
    storeId: store.id,
    ...(rangeStart ? { createdAt: { gte: rangeStart } } : {}),
  };

  const orders: OrderWithItems[] = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: rangeParam === "7d" ? 250 : 800,
  });

  const totalOrders = orders.length;

  // Outcomes
  const completedOrders = orders.filter((o) => o.status === "COMPLETED");
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");

  const completedCount = completedOrders.length;
  const cancelledCount = cancelledOrders.length;

  const completionRate = totalOrders > 0 ? completedCount / totalOrders : 0;
  const cancelRate = totalOrders > 0 ? cancelledCount / totalOrders : 0;

  // Completed revenue only (gross)
  const completedRevenueCents = sumCents(completedOrders, (o) => o.totalCents);

  // Fees paid vs outstanding (based on platformFeePaid + platformFeeCents)
  const feesPaidCents = completedOrders.reduce((sum, o) => {
    const fee = (o as unknown as { platformFeeCents?: number | null }).platformFeeCents ?? 0;
    const paid = (o as unknown as { platformFeePaid?: boolean | null }).platformFeePaid ?? false;
    return sum + (paid ? fee : 0);
  }, 0);

  const feesOutstandingCents = completedOrders.reduce((sum, o) => {
    const fee = (o as unknown as { platformFeeCents?: number | null }).platformFeeCents ?? 0;
    const paid = (o as unknown as { platformFeePaid?: boolean | null }).platformFeePaid ?? false;
    return sum + (!paid ? fee : 0);
  }, 0);

  const netPaidCents = completedRevenueCents - feesPaidCents;

  // Fulfilment time (createdAt -> completedAt), completed only
  const fulfilPairs = completedOrders
    .filter((o) => o.completedAt)
    .map((o) => ({ start: o.createdAt, end: o.completedAt! }));
  const avgFulfilmentMins = avgMinutesFromDates(fulfilPairs);

  // Ready ETA (estimate) (createdAt -> estimatedReadyAt), where estimatedReadyAt exists
  const readyPairs = orders
    .filter((o) => o.estimatedReadyAt)
    .map((o) => ({ start: o.createdAt, end: o.estimatedReadyAt! }));
  const avgReadyEtaMins = avgMinutesFromDates(readyPairs);

  // Active pipeline counts (actionability)
  const ACTIVE_PIPELINE: Order["status"][] = [
    "PENDING",
    "ACCEPTED",
    "IN_PREPARATION",
    "READY_FOR_COLLECTION",
    "OUT_FOR_DELIVERY",
  ];
  const activeNow = orders.filter((o) => ACTIVE_PIPELINE.includes(o.status));

  // "Stuck" heuristics (simple MVP)
  const STUCK_KITCHEN_MIN = 30; // tweak later
  const STUCK_DELIVERY_MIN = 45; // tweak later

  const nowMs = now.getTime();

  const stuckKitchen = activeNow.filter((o) => {
    if (!["PENDING", "ACCEPTED", "IN_PREPARATION"].includes(o.status)) return false;
    const ageMin = (nowMs - o.createdAt.getTime()) / 60000;
    return ageMin >= STUCK_KITCHEN_MIN;
  });

  const stuckDelivery = activeNow.filter((o) => {
    if (o.status !== "OUT_FOR_DELIVERY") return false;
    const ageMin = (nowMs - o.createdAt.getTime()) / 60000;
    return ageMin >= STUCK_DELIVERY_MIN;
  });

  // Fulfilment split: DELIVERY vs COLLECTION
  const deliveryOrders = orders.filter((o) => o.fulfilmentType === "DELIVERY");
  const collectionOrders = orders.filter((o) => o.fulfilmentType === "COLLECTION");

  const deliveryBucket = buildBucket("Delivery", deliveryOrders);
  const collectionBucket = buildBucket("Collection", collectionOrders);

  // Payment split: COD vs ONLINE
  // Your code elsewhere uses "ONLINE_PAYMENT" and "CASH_ON_DELIVERY"
  const codOrders = orders.filter((o) => (o as any).paymentMethod === "CASH_ON_DELIVERY");
  const onlineOrders = orders.filter((o) => (o as any).paymentMethod === "ONLINE_PAYMENT");

  const codBucket = buildBucket("Cash on delivery", codOrders);
  const onlineBucket = buildBucket("Online payment", onlineOrders);

  const codShareOrders = totalOrders > 0 ? codOrders.length / totalOrders : 0;
  const codCompletedRevenueCents = sumCents(
    codOrders.filter((o) => o.status === "COMPLETED"),
    (o) => o.totalCents,
  );
  const codShareRevenue = completedRevenueCents > 0 ? codCompletedRevenueCents / completedRevenueCents : 0;

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
  for (const o of orders) statusCounts[o.status] += 1;

  const activeStatuses = (Object.keys(statusCounts) as Order["status"][]).filter(
    (s) => statusCounts[s] > 0,
  );
  const maxStatusCount =
    activeStatuses.length > 0 ? Math.max(...activeStatuses.map((s) => statusCounts[s])) : 0;

  // Orders per day trend (count + completed revenue)
  type DayAgg = { date: string; count: number; completedRevenueCents: number };
  const dayMap = new Map<string, DayAgg>();

  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
    const existing = dayMap.get(key) ?? { date: key, count: 0, completedRevenueCents: 0 };
    existing.count += 1;
    if (o.status === "COMPLETED") existing.completedRevenueCents += o.totalCents;
    dayMap.set(key, existing);
  }

  const daily = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const recentDaily =
    rangeParam === "7d"
      ? daily.slice(-7)
      : daily.slice(-14); // show last 14 for 30d/all

  const maxDailyCount = recentDaily.length > 0 ? Math.max(...recentDaily.map((d) => d.count)) : 0;

  const busiest =
    recentDaily.length > 0 ? [...recentDaily].sort((a, b) => b.count - a.count)[0] : null;
  const quietest =
    recentDaily.length > 0 ? [...recentDaily].sort((a, b) => a.count - b.count)[0] : null;

  // Top products (by revenue first; more useful than qty-only)
  type ProductAgg = { name: string; quantity: number; revenueCents: number };
  const productMap = new Map<string, ProductAgg>();

  for (const o of orders) {
    for (const item of o.items) {
      const key = item.name;
      const existing = productMap.get(key) ?? { name: item.name, quantity: 0, revenueCents: 0 };
      existing.quantity += item.quantity;
      // If order isn't completed, you can decide whether to include. For now: include completed only for "top products"
      if (o.status === "COMPLETED") existing.revenueCents += item.totalCents;
      productMap.set(key, existing);
    }
  }

  const topProducts = Array.from(productMap.values())
    .filter((p) => p.revenueCents > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 8);

  const rangeLabel =
    rangeParam === "7d" ? "Last 7 days" : rangeParam === "30d" ? "Last 30 days" : "All time";

  const niceDate = (isoYYYYMMDD: string) =>
    new Date(`${isoYYYYMMDD}T00:00:00`).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
    });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header + Range selector */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Analytics</h1>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {rangeLabel} for{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">{store.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Range:</span>
            <RangeChip href="/owner/store/analytics?range=7d" active={rangeParam === "7d"}>
              7 days
            </RangeChip>
            <RangeChip href="/owner/store/analytics?range=30d" active={rangeParam === "30d"}>
              30 days
            </RangeChip>
            <RangeChip href="/owner/store/analytics?range=all" active={rangeParam === "all"}>
              All time
            </RangeChip>
          </div>
        </header>

        {/* Summary cards (trustworthy numbers) */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Completed revenue"
            value={formatMoney(completedRevenueCents)}
            helper={`${completedCount} completed · excludes pending/cancelled`}
          />
          <SummaryCard
            label="Fees paid"
            value={formatMoney(feesPaidCents)}
            helper={
              feesOutstandingCents > 0
                ? `Outstanding: ${formatMoney(feesOutstandingCents)}`
                : "No outstanding fees"
            }
          />
          <SummaryCard
            label="Net revenue (paid)"
            value={formatMoney(netPaidCents)}
            helper="Completed revenue minus fees paid"
          />
          <SummaryCard
            label="Completion rate"
            value={totalOrders > 0 ? pct(completionRate) : "—"}
            helper={`${totalOrders} total · cancelled: ${pct(cancelRate)}`}
          />
        </section>

        {/* Operational health (actionable) */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Active orders now"
            value={String(activeNow.length)}
            helper="Pending / accepted / in prep / ready / out"
          />
          <SummaryCard
            label="Stuck in kitchen"
            value={String(stuckKitchen.length)}
            helper={`≥ ${STUCK_KITCHEN_MIN} min in pending/accepted/in prep`}
          />
          <SummaryCard
            label="Stuck on delivery"
            value={String(stuckDelivery.length)}
            helper={`≥ ${STUCK_DELIVERY_MIN} min out for delivery`}
          />
          <SummaryCard
            label="COD share"
            value={totalOrders > 0 ? pct(codShareOrders) : "—"}
            helper={
              completedRevenueCents > 0
                ? `COD revenue share: ${pct(codShareRevenue)}`
                : "No completed revenue yet"
            }
          />
        </section>

        {/* Timing */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Avg fulfilment time"
            value={completedCount > 0 ? `${Math.round(avgFulfilmentMins)} min` : "—"}
            helper={completedCount > 0 ? `${completedCount} completed orders` : "No completed orders"}
          />
          <SummaryCard
            label="Avg ready ETA (estimate)"
            value={readyPairs.length > 0 ? `${Math.round(avgReadyEtaMins)} min` : "—"}
            helper={readyPairs.length > 0 ? `${readyPairs.length} orders with ETA` : "No ETA data"}
          />
          <SummaryCard
            label="Delivery vs collection"
            value={`${deliveryOrders.length} / ${collectionOrders.length}`}
            helper="Delivery orders / Collection orders"
          />
          <SummaryCard
            label="Cancel rate"
            value={totalOrders > 0 ? pct(cancelRate) : "—"}
            helper={`${cancelledCount} cancelled`}
          />
        </section>

        {/* Fulfilment split */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Fulfilment split
              </h2>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Compare delivery vs collection performance and revenue (completed only).
              </p>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 text-xs dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Orders</th>
                  <th className="px-3 py-2 text-right font-medium">Completed</th>
                  <th className="px-3 py-2 text-right font-medium">Completed revenue</th>
                  <th className="px-3 py-2 text-right font-medium">Avg fulfilment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {[deliveryBucket, collectionBucket].map((b) => {
                  const completedRate = b.orders > 0 ? b.completed / b.orders : 0;
                  return (
                    <tr key={b.label}>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                        {b.label}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {b.orders}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {b.completed} <span className="text-slate-400">({pct(completedRate)})</span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {formatMoney(b.completedRevenueCents)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {b.completed > 0 ? `${Math.round(b.avgFulfilmentMins)} min` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payment breakdown */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Payment breakdown
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Cash on delivery (COD) can increase delivery risk and cash handling. Track it.
          </p>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 text-xs dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Method</th>
                  <th className="px-3 py-2 text-right font-medium">Orders</th>
                  <th className="px-3 py-2 text-right font-medium">Completed</th>
                  <th className="px-3 py-2 text-right font-medium">Completed revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {[codBucket, onlineBucket].map((b) => {
                  const completedRate = b.orders > 0 ? b.completed / b.orders : 0;
                  return (
                    <tr key={b.label}>
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                        {b.label}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {b.orders}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {b.completed} <span className="text-slate-400">({pct(completedRate)})</span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {formatMoney(b.completedRevenueCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(onlineOrders.length === 0 || codOrders.length === 0) && (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Tip: As you add more orders, this table becomes more useful.
            </p>
          )}
        </section>

        {/* Trend: orders per day */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Orders per day</h2>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Quick view of order volume (and completed revenue) by day.
              </p>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {busiest ? (
                <span className="mr-3">
                  Busiest:{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {niceDate(busiest.date)} ({busiest.count})
                  </span>
                </span>
              ) : null}
              {quietest ? (
                <span>
                  Quietest:{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {niceDate(quietest.date)} ({quietest.count})
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          {recentDaily.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No orders in this range.</p>
          ) : (
            <div className="mt-3 space-y-2 text-[11px]">
              {recentDaily.map((d) => {
                const widthPct =
                  maxDailyCount > 0 ? Math.max(8, (d.count / maxDailyCount) * 100) : 0;

                return (
                  <div key={d.date} className="flex items-center gap-3">
                    <div className="w-16 text-slate-600 dark:text-slate-300">{niceDate(d.date)}</div>
                    <div className="flex-1">
                      <div className="relative h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-sky-500 dark:bg-sky-400"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        Completed revenue:{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {formatMoney(d.completedRevenueCents)}
                        </span>
                      </div>
                    </div>
                    <div className="w-8 text-right text-slate-700 dark:text-slate-200">{d.count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Status breakdown */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Status breakdown
              </h2>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Distribution of orders by status in this range.
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
              <div>
                Active now:{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {activeNow.length}
                </span>
              </div>
              <div>
                Completed:{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {completedCount}
                </span>{" "}
                · Cancelled:{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {cancelledCount}
                </span>
              </div>
            </div>
          </div>

          {activeStatuses.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No orders.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {activeStatuses.map((status) => {
                const count = statusCounts[status];
                const widthPct =
                  maxStatusCount > 0 ? Math.max(8, (count / maxStatusCount) * 100) : 0;

                return (
                  <div key={status} className="flex items-center gap-3 text-xs">
                    <div className="w-40 text-[11px] text-slate-600 dark:text-slate-300">
                      {humanizeStatus(status)}
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

        {/* Top products (by completed revenue) */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Top products</h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Ranked by completed revenue (more meaningful than qty-only).
          </p>

          {topProducts.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No product data yet.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 text-xs dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Product</th>
                    <th className="px-3 py-2 text-right font-medium">Qty sold</th>
                    <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {topProducts.map((p) => (
                    <tr key={p.name}>
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{p.name}</td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {p.quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-200">
                        {formatMoney(p.revenueCents)}
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
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</p>
      {helper && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{helper}</p>
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

// app/(dashboard)/owner/store/analytics/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { Metadata } from "next";
import Link from "next/link";
import type { Order, OrderItem, Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Store analytics",
  description:
    "View your store’s revenue, order volume, collection performance, fees, and top products on the Kasi Flavors analytics dashboard.",
  alternates: { canonical: "/owner/store/analytics" },
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

type OrderWithItems = Order & { items: OrderItem[] };

function formatMoney(cents: number) {
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

function sumCents(
  orders: OrderWithItems[],
  pick: (order: OrderWithItems) => number,
) {
  return orders.reduce((sum, order) => sum + pick(order), 0);
}

function avgMinutesFromDates(pairs: Array<{ start: Date; end: Date }>) {
  if (pairs.length === 0) return 0;

  const total = pairs.reduce(
    (sum, pair) => sum + minutesBetween(pair.start, pair.end),
    0,
  );

  return total / pairs.length;
}

export default async function StoreAnalyticsPage({
  searchParams,
}: StoreAnalyticsPageProps) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });

  if (!store) {
    return (
      <main className="min-h-screen bg-kasi-cream px-4 py-6">
        <div className="mx-auto max-w-3xl rounded-4xl border border-black/10 bg-white p-6 text-sm shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Store setup
          </p>

          <h1 className="mt-2 text-2xl font-black text-kasi-black">
            No store linked to this account
          </h1>

          <p className="mt-2 text-sm font-medium leading-6 text-black/60">
            This owner account does not have a store configured yet.
          </p>

          <div className="mt-4">
            <Link
              href="/owner/store/overview"
              className="inline-flex rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange"
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

  const rangeParam: RangeOption =
    range === "7d" || range === "30d" || range === "all"
      ? range
      : "30d";

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

  const completedOrders = orders.filter(
    (order) => order.status === "COMPLETED",
  );

  const cancelledOrders = orders.filter(
    (order) => order.status === "CANCELLED",
  );

  const completedCount = completedOrders.length;
  const cancelledCount = cancelledOrders.length;

  const completionRate = totalOrders > 0 ? completedCount / totalOrders : 0;
  const cancelRate = totalOrders > 0 ? cancelledCount / totalOrders : 0;

  const completedRevenueCents = sumCents(
    completedOrders,
    (order) => order.totalCents,
  );

  const feesPaidCents = completedOrders.reduce((sum, order) => {
    const fee =
      (order as unknown as { platformFeeCents?: number | null })
        .platformFeeCents ?? 0;

    const paid =
      (order as unknown as { platformFeePaid?: boolean | null })
        .platformFeePaid ?? false;

    return sum + (paid ? fee : 0);
  }, 0);

  const feesOutstandingCents = completedOrders.reduce((sum, order) => {
    const fee =
      (order as unknown as { platformFeeCents?: number | null })
        .platformFeeCents ?? 0;

    const paid =
      (order as unknown as { platformFeePaid?: boolean | null })
        .platformFeePaid ?? false;

    return sum + (!paid ? fee : 0);
  }, 0);

  const netPaidCents = completedRevenueCents - feesPaidCents;

  const fulfilPairs = completedOrders
    .filter((order) => order.completedAt)
    .map((order) => ({
      start: order.createdAt,
      end: order.completedAt!,
    }));

  const avgFulfilmentMins = avgMinutesFromDates(fulfilPairs);

  const readyPairs = orders
    .filter((order) => order.estimatedReadyAt)
    .map((order) => ({
      start: order.createdAt,
      end: order.estimatedReadyAt!,
    }));

  const avgReadyEtaMins = avgMinutesFromDates(readyPairs);

  const ACTIVE_PIPELINE: Order["status"][] = [
    "PENDING",
    "ACCEPTED",
    "IN_PREPARATION",
    "READY_FOR_COLLECTION",
  ];

  const activeNow = orders.filter((order) =>
    ACTIVE_PIPELINE.includes(order.status),
  );

  const STUCK_KITCHEN_MIN = 30;
  const nowMs = now.getTime();

  const stuckKitchen = activeNow.filter((order) => {
    if (!["PENDING", "ACCEPTED", "IN_PREPARATION"].includes(order.status)) {
      return false;
    }

    const ageMin = (nowMs - order.createdAt.getTime()) / 60000;
    return ageMin >= STUCK_KITCHEN_MIN;
  });

  const onlineOrders = orders.filter(
    (order) => (order as any).paymentMethod === "ONLINE_PAYMENT",
  );

  const payOnCollectionOrders = orders.filter(
    (order) =>
      (order as any).paymentMethod === "PAY_ON_COLLECTION" ||
      (order as any).paymentMethod === "CASH_ON_DELIVERY",
  );

  const onlineCompleted = onlineOrders.filter(
    (order) => order.status === "COMPLETED",
  );

  const payOnCollectionCompleted = payOnCollectionOrders.filter(
    (order) => order.status === "COMPLETED",
  );

  const onlineRevenueCents = sumCents(
    onlineCompleted,
    (order) => order.totalCents,
  );

  const payOnCollectionRevenueCents = sumCents(
    payOnCollectionCompleted,
    (order) => order.totalCents,
  );

  const payOnCollectionShareOrders =
    totalOrders > 0 ? payOnCollectionOrders.length / totalOrders : 0;

  const payOnCollectionShareRevenue =
    completedRevenueCents > 0
      ? payOnCollectionRevenueCents / completedRevenueCents
      : 0;

  const statusCounts: Partial<Record<Order["status"], number>> = {};

  for (const order of orders) {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
  }

  const displayStatuses: Order["status"][] = [
    "PENDING",
    "ACCEPTED",
    "IN_PREPARATION",
    "READY_FOR_COLLECTION",
    "COMPLETED",
    "CANCELLED",
  ];

  const activeStatuses = displayStatuses.filter(
    (status) => (statusCounts[status] || 0) > 0,
  );

  const maxStatusCount =
    activeStatuses.length > 0
      ? Math.max(...activeStatuses.map((status) => statusCounts[status] || 0))
      : 0;

  type DayAgg = {
    date: string;
    count: number;
    completedRevenueCents: number;
  };

  const dayMap = new Map<string, DayAgg>();

  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);

    const existing = dayMap.get(key) ?? {
      date: key,
      count: 0,
      completedRevenueCents: 0,
    };

    existing.count += 1;

    if (order.status === "COMPLETED") {
      existing.completedRevenueCents += order.totalCents;
    }

    dayMap.set(key, existing);
  }

  const daily = Array.from(dayMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const recentDaily = rangeParam === "7d" ? daily.slice(-7) : daily.slice(-14);

  const maxDailyCount =
    recentDaily.length > 0
      ? Math.max(...recentDaily.map((day) => day.count))
      : 0;

  const busiest =
    recentDaily.length > 0
      ? [...recentDaily].sort((a, b) => b.count - a.count)[0]
      : null;

  const quietest =
    recentDaily.length > 0
      ? [...recentDaily].sort((a, b) => a.count - b.count)[0]
      : null;

  type ProductAgg = {
    name: string;
    quantity: number;
    revenueCents: number;
  };

  const productMap = new Map<string, ProductAgg>();

  for (const order of orders) {
    for (const item of order.items) {
      const existing = productMap.get(item.name) ?? {
        name: item.name,
        quantity: 0,
        revenueCents: 0,
      };

      existing.quantity += item.quantity;

      if (order.status === "COMPLETED") {
        existing.revenueCents += item.totalCents;
      }

      productMap.set(item.name, existing);
    }
  }

  const topProducts = Array.from(productMap.values())
    .filter((product) => product.revenueCents > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 8);

  const rangeLabel =
    rangeParam === "7d"
      ? "Last 7 days"
      : rangeParam === "30d"
        ? "Last 30 days"
        : "All time";

  const niceDate = (isoYYYYMMDD: string) =>
    new Date(`${isoYYYYMMDD}T00:00:00`).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
    });

  return (
    <main className="py-2">
      <div className="space-y-5">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Analytics
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
              Store analytics
            </h1>

            <p className="mt-2 text-sm font-medium text-black/60">
              {rangeLabel} for{" "}
              <span className="font-black text-kasi-black">{store.name}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-4xl border border-black/10 bg-white p-4 shadow-sm">
            <span className="text-xs font-black uppercase tracking-wide text-black/45">
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

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Completed revenue"
            value={formatMoney(completedRevenueCents)}
            helper={`${completedCount} completed · excludes pending/cancelled`}
            tone="success"
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
            label="Net revenue"
            value={formatMoney(netPaidCents)}
            helper="Completed revenue minus fees paid"
            tone="success"
          />

          <SummaryCard
            label="Completion rate"
            value={totalOrders > 0 ? pct(completionRate) : "—"}
            helper={`${totalOrders} total · cancelled: ${pct(cancelRate)}`}
          />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Active collection orders"
            value={String(activeNow.length)}
            helper="Pending / accepted / in prep / ready"
          />

          <SummaryCard
            label="Stuck in kitchen"
            value={String(stuckKitchen.length)}
            helper={`≥ ${STUCK_KITCHEN_MIN} min in pending/accepted/in prep`}
            tone={stuckKitchen.length > 0 ? "danger" : "default"}
          />

          <SummaryCard
            label="Avg fulfilment"
            value={
              completedCount > 0 ? `${Math.round(avgFulfilmentMins)} min` : "—"
            }
            helper={
              completedCount > 0
                ? `${completedCount} completed orders`
                : "No completed orders"
            }
          />

          <SummaryCard
            label="Avg ready ETA"
            value={
              readyPairs.length > 0 ? `${Math.round(avgReadyEtaMins)} min` : "—"
            }
            helper={
              readyPairs.length > 0
                ? `${readyPairs.length} orders with ETA`
                : "No ETA data"
            }
          />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Pay on collection"
            value={totalOrders > 0 ? pct(payOnCollectionShareOrders) : "—"}
            helper={
              completedRevenueCents > 0
                ? `Revenue share: ${pct(payOnCollectionShareRevenue)}`
                : "No completed revenue yet"
            }
          />

          <SummaryCard
            label="Online payments"
            value={String(onlineOrders.length)}
            helper={`${onlineCompleted.length} completed · ${formatMoney(
              onlineRevenueCents,
            )}`}
          />

          <SummaryCard
            label="Cancelled orders"
            value={String(cancelledCount)}
            helper={`Cancel rate: ${totalOrders > 0 ? pct(cancelRate) : "—"}`}
            tone={cancelledCount > 0 ? "danger" : "default"}
          />

          <SummaryCard
            label="Top product count"
            value={String(topProducts.length)}
            helper="Products with completed revenue"
          />
        </section>

        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Payment behaviour
          </p>

          <h2 className="mt-1 text-xl font-black text-kasi-black">
            Payment breakdown
          </h2>

          <p className="mt-1 text-xs font-medium text-black/50">
            Track how customers prefer to pay for collection orders.
          </p>

          <AnalyticsTable
            columns={["Method", "Orders", "Completed", "Completed revenue"]}
            rows={[
              [
                "Pay on collection",
                String(payOnCollectionOrders.length),
                `${payOnCollectionCompleted.length} (${pct(
                  payOnCollectionOrders.length > 0
                    ? payOnCollectionCompleted.length /
                        payOnCollectionOrders.length
                    : 0,
                )})`,
                formatMoney(payOnCollectionRevenueCents),
              ],
              [
                "Online payment",
                String(onlineOrders.length),
                `${onlineCompleted.length} (${pct(
                  onlineOrders.length > 0
                    ? onlineCompleted.length / onlineOrders.length
                    : 0,
                )})`,
                formatMoney(onlineRevenueCents),
              ],
            ]}
          />
        </section>

        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Daily trend
              </p>

              <h2 className="mt-1 text-xl font-black text-kasi-black">
                Orders per day
              </h2>

              <p className="mt-1 text-xs font-medium text-black/50">
                Quick view of order volume and completed revenue by day.
              </p>
            </div>

            <div className="text-xs font-medium text-black/55">
              {busiest ? (
                <span className="mr-3">
                  Busiest:{" "}
                  <span className="font-black text-kasi-black">
                    {niceDate(busiest.date)} ({busiest.count})
                  </span>
                </span>
              ) : null}

              {quietest ? (
                <span>
                  Quietest:{" "}
                  <span className="font-black text-kasi-black">
                    {niceDate(quietest.date)} ({quietest.count})
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          {recentDaily.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-kasi-cream p-4 text-sm font-medium text-black/60">
              No orders in this range.
            </p>
          ) : (
            <div className="mt-4 space-y-3 text-xs">
              {recentDaily.map((day) => {
                const widthPct =
                  maxDailyCount > 0
                    ? Math.max(8, (day.count / maxDailyCount) * 100)
                    : 0;

                return (
                  <div
                    key={day.date}
                    className="grid gap-2 sm:grid-cols-[80px_1fr_40px] sm:items-center"
                  >
                    <div className="font-black uppercase tracking-wide text-black/50">
                      {niceDate(day.date)}
                    </div>

                    <div>
                      <div className="relative h-3 overflow-hidden rounded-full bg-kasi-cream">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-kasi-green"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>

                      <div className="mt-1 text-[11px] font-medium text-black/50">
                        Completed revenue:{" "}
                        <span className="font-black text-kasi-black">
                          {formatMoney(day.completedRevenueCents)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-black text-kasi-black">
                      {day.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Order status
              </p>

              <h2 className="mt-1 text-xl font-black text-kasi-black">
                Status breakdown
              </h2>

              <p className="mt-1 text-xs font-medium text-black/50">
                Distribution of collection orders by status in this range.
              </p>
            </div>

            <div className="rounded-2xl bg-kasi-cream px-4 py-3 text-right text-xs font-bold text-black/55">
              <div>
                Active now:{" "}
                <span className="font-black text-kasi-black">
                  {activeNow.length}
                </span>
              </div>

              <div>
                Completed:{" "}
                <span className="font-black text-kasi-black">
                  {completedCount}
                </span>{" "}
                · Cancelled:{" "}
                <span className="font-black text-kasi-black">
                  {cancelledCount}
                </span>
              </div>
            </div>
          </div>

          {activeStatuses.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-kasi-cream p-4 text-sm font-medium text-black/60">
              No orders.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {activeStatuses.map((status) => {
                const count = statusCounts[status] || 0;

                const widthPct =
                  maxStatusCount > 0
                    ? Math.max(8, (count / maxStatusCount) * 100)
                    : 0;

                return (
                  <div
                    key={status}
                    className="grid gap-2 sm:grid-cols-[180px_1fr_40px] sm:items-center"
                  >
                    <div className="text-xs font-black uppercase tracking-wide text-black/55">
                      {humanizeStatus(status)}
                    </div>

                    <div className="relative h-3 overflow-hidden rounded-full bg-kasi-cream">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-street-orange"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>

                    <div className="text-right text-xs font-black text-kasi-black">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Menu performance
          </p>

          <h2 className="mt-1 text-xl font-black text-kasi-black">
            Top products
          </h2>

          <p className="mt-1 text-xs font-medium text-black/50">
            Ranked by completed revenue. This is more useful than quantity only.
          </p>

          {topProducts.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-kasi-cream p-4 text-sm font-medium text-black/60">
              No product data yet.
            </p>
          ) : (
            <AnalyticsTable
              columns={["Product", "Qty sold", "Revenue"]}
              rows={topProducts.map((product) => [
                product.name,
                String(product.quantity),
                formatMoney(product.revenueCents),
              ])}
            />
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
  tone?: "default" | "success" | "danger";
}

function SummaryCard({
  label,
  value,
  helper,
  tone = "default",
}: SummaryCardProps) {
  const valueClass =
    tone === "success"
      ? "text-kasi-green"
      : tone === "danger"
        ? "text-red-600"
        : "text-kasi-black";

  return (
    <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-street-orange">
        {label}
      </p>

      <p className={`mt-2 text-2xl font-black ${valueClass}`}>{value}</p>

      {helper && (
        <p className="mt-2 text-xs font-medium leading-5 text-black/55">
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
        "inline-flex items-center rounded-full border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide transition",
        active
          ? "border-kasi-green bg-kasi-green text-white"
          : "border-black/10 bg-white text-black/60 hover:border-kasi-green hover:text-kasi-green",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function AnalyticsTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-kasi-black text-white">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  className={[
                    "px-4 py-3 font-black uppercase tracking-wide text-white/70",
                    index === 0 ? "text-left" : "text-right",
                  ].join(" ")}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-black/10 bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-kasi-cream">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${rowIndex}-${cellIndex}`}
                    className={[
                      "px-4 py-3 font-bold text-black/70",
                      cellIndex === 0 ? "text-left text-kasi-black" : "text-right",
                    ].join(" ")}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
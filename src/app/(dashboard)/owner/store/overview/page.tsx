// app/(dashboard)/owner/store/overview/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { OrderStatus } from "@prisma/client";
import Link from "next/link";

const ACTIVE_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREPARATION",
  "READY_FOR_COLLECTION",
  "OUT_FOR_DELIVERY",
];

function formatMoney(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

function formatDateTime(d: Date) {
  return d.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: OrderStatus) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function StoreOverviewPage() {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      creditCents: true,
      isOpen: true,
      city: true,
      area: true,
    },
  });

  if (!store) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            No store linked to this account
          </h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            This owner account does not have a store configured yet. Please
            contact support or complete your store setup.
          </p>
        </div>
      </main>
    );
  }

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const last7DaysStart = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  );

  // Load last 7 days of orders for this store (includes today)
  const ordersLast7 = await prisma.order.findMany({
    where: {
      storeId: store.id,
      createdAt: { gte: last7DaysStart },
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500, // safety cap
  });

  const activeOrders = ordersLast7.filter((o) =>
    ACTIVE_STATUSES.includes(o.status),
  );

  const todayOrders = ordersLast7.filter(
    (o) => o.createdAt >= todayStart,
  );

  const totalTodayCents = todayOrders.reduce(
    (sum, o) => sum + o.totalCents,
    0,
  );

  const total7DaysCents = ordersLast7.reduce(
    (sum, o) => sum + o.totalCents,
    0,
  );

  const completed7 = ordersLast7.filter((o) => o.status === "COMPLETED");
  const avgOrderValue7 =
    completed7.length > 0
      ? completed7.reduce((sum, o) => sum + o.totalCents, 0) /
        completed7.length
      : 0;

  // Orders by status (last 7 days)
  const statusCounts = ordersLast7.reduce<Record<OrderStatus, number>>(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {
      PENDING: 0,
      ACCEPTED: 0,
      IN_PREPARATION: 0,
      READY_FOR_COLLECTION: 0,
      OUT_FOR_DELIVERY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    },
  );

  // Top items in last 7 days
  const itemTotals = new Map<
    string,
    { name: string; qty: number; revenueCents: number }
  >();

  for (const order of ordersLast7) {
    for (const item of order.items) {
      const key = item.name;
      const existing = itemTotals.get(key) ?? {
        name: item.name,
        qty: 0,
        revenueCents: 0,
      };
      existing.qty += item.quantity;
      existing.revenueCents += item.totalCents;
      itemTotals.set(key, existing);
    }
  }

  const topItems = Array.from(itemTotals.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  const currentBalance = store.creditCents ?? 0;
  const isNegativeBalance = currentBalance < 0;

  const recentOrders = ordersLast7.slice(0, 8);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Store overview
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              Summary for{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {store.name}
              </span>{" "}
              · {store.area}, {store.city}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <Link
              href="/owner/store/orders"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              View orders →
            </Link>
            <Link
              href="/owner/store/billing"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Billing & balance →
            </Link>
          </div>
        </header>

        {/* Stat cards row */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Balance */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Balance
            </p>
            <p
              className={[
                "mt-1 text-lg font-semibold",
                isNegativeBalance
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-700 dark:text-emerald-300",
              ].join(" ")}
            >
              {formatMoney(currentBalance)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {isNegativeBalance
                ? "Negative balance – you’ll need to settle before opening."
                : "Used to pay platform fees on completed orders."}
            </p>
          </div>

          {/* Active orders */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Active orders (7 days)
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {activeOrders.length}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Pending, accepted, in preparation, ready or out for delivery.
            </p>
          </div>

          {/* Today’s sales */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Today&apos;s sales
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {formatMoney(totalTodayCents)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Across {todayOrders.length} order
              {todayOrders.length === 1 ? "" : "s"} today.
            </p>
          </div>

          {/* Last 7 days */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Last 7 days
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {formatMoney(total7DaysCents)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {ordersLast7.length} order
              {ordersLast7.length === 1 ? "" : "s"} · avg{" "}
              {ordersLast7.length > 0 ? formatMoney(avgOrderValue7) : "R 0.00"}
            </p>
          </div>
        </section>

        {/* Middle row: status breakdown + top items */}
        <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          {/* Orders by status */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Orders by status (last 7 days)
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {ordersLast7.length} total
              </span>
            </div>

            {ordersLast7.length === 0 ? (
              <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                No orders in the last 7 days yet.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    "PENDING",
                    "ACCEPTED",
                    "IN_PREPARATION",
                    "READY_FOR_COLLECTION",
                    "OUT_FOR_DELIVERY",
                    "COMPLETED",
                    "CANCELLED",
                  ] as OrderStatus[]
                ).map((status) => {
                  const count = statusCounts[status] || 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/50"
                    >
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                        {statusLabel(status)}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top items */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Top items (last 7 days)
            </h2>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Based on quantity and revenue.
            </p>

            {topItems.length === 0 ? (
              <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                No items sold in the last 7 days yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {topItems.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/50"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-50">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.qty} sold
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                        {formatMoney(item.revenueCents)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Recent orders list */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Recent orders
            </h2>
            <Link
              href="/owner/store/orders"
              className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              View all →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              No orders yet.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-[11px] text-slate-700 dark:text-slate-200">
                <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <tr>
                    <th className="py-1 pr-3">Order</th>
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Status</th>
                    <th className="py-1 pr-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-1 pr-3 whitespace-nowrap">
                        #{o.id.slice(-6)}
                      </td>
                      <td className="py-1 pr-3 whitespace-nowrap">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="py-1 pr-3 whitespace-nowrap">
                        {statusLabel(o.status)}
                      </td>
                      <td className="py-1 pr-3 text-right whitespace-nowrap">
                        {formatMoney(o.totalCents)}
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

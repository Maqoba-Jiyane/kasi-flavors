// app/(dashboard)/owner/store/orders/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { OwnerOrdersTable } from "@/components/dashboard/OwnerOrdersTable";
import Link from "next/link";
import type {
  Order,
  OrderItem,
  Prisma,
  LedgerEntry,
  LedgerType,
} from "@prisma/client";
import { LiveOrdersWatcher } from "@/components/dashboard/LiveOrdersWatcher";
import { AddManualOrderClient } from "@/components/dashboard/AddManualOrderClient";

type SortOption = "time_desc" | "time_asc" | "status";
type RangeOption = "7d" | "30d" | "all";
type ViewOption = "all" | "active" | "completed";

interface OwnerOrdersPageProps {
  searchParams?: Promise<{ sort?: string; range?: string; view?: string }>;
}

// Custom status order matching kitchen flow
const STATUS_ORDER: Record<Order["status"], number> = {
  PENDING: 1,
  ACCEPTED: 2,
  IN_PREPARATION: 3,
  READY_FOR_COLLECTION: 4,
  OUT_FOR_DELIVERY: 5,
  COMPLETED: 6,
  CANCELLED: 7,
};

const ACTIVE_STATUSES: Order["status"][] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREPARATION",
  "READY_FOR_COLLECTION",
  "OUT_FOR_DELIVERY",
];

const COMPLETED_STATUSES: Order["status"][] = ["COMPLETED", "CANCELLED"];

function sortByStatusThenTime(a: Order, b: Order) {
  const sa = STATUS_ORDER[a.status];
  const sb = STATUS_ORDER[b.status];

  if (sa !== sb) return sa - sb;

  // Within the same status: newest first
  return b.createdAt.getTime() - a.createdAt.getTime();
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

// Simple mapping for ledger type labels + signs
function getLedgerTypeLabel(type: LedgerType) {
  switch (type) {
    case "TOPUP":
      return "Top-up";
    case "REFUND":
      return "Refund";
    case "FEE_DEBIT":
      return "Platform fee";
    case "FEE_RESERVE":
      return "Fee reserve";
    case "PAYOUT":
      return "Payout";
    case "ADJUSTMENT":
      return "Adjustment";
    default:
      return type;
  }
}

function isCreditPositiveType(type: LedgerType) {
  return type === "TOPUP" || type === "REFUND";
}

export default async function OwnerOrdersPage({
  searchParams,
}: OwnerOrdersPageProps) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      creditCents: true,
    },
  });

  // Handle "no store" gracefully instead of throwing
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

  // 🔹 NEW: Load recent ledger entries for this store
  const ledgerEntries: LedgerEntry[] = await prisma.ledgerEntry.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 3, // show latest 10 in UI
  });

  const sort = await searchParams;
  const range = await searchParams;
  const view = await searchParams;
  // const { sort, range, view} = await searchParams

  const sortParam = (await (sort as SortOption | undefined)) ?? "time_desc";
  const rangeParam = (range as RangeOption | undefined) ?? "30d";
  const viewParam = (view as ViewOption | undefined) ?? "all";

  const now = new Date();
  const rangeStart = getRangeStart(rangeParam, now);

  // Typed where clause
  const where: Prisma.OrderWhereInput = {
    storeId: store.id,
    ...(rangeStart && { createdAt: { gte: rangeStart } }),
  };

  const prismaOrderBy: Prisma.OrderOrderByWithRelationInput =
    sortParam === "time_asc" ? { createdAt: "asc" } : { createdAt: "desc" };

  const ordersRaw = await prisma.order.findMany({
    where,
    orderBy: prismaOrderBy,
    include: {
      items: true,
    },
    take: 200, // safety cap
  });

  const products = await prisma.product.findMany({
    where: { storeId: store.id, isAvailable: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, priceCents: true },
  });

  let sorted: (Order & { items: OrderItem[] })[];

  if (sortParam === "status") {
    sorted = [...ordersRaw].sort(sortByStatusThenTime);
  } else {
    sorted = ordersRaw;
  }

  const latestOrderId = sorted.length > 0 ? sorted[0].id : null;

  // Filter by view
  let filtered = sorted;

  if (viewParam === "active") {
    filtered = sorted.filter((o) => ACTIVE_STATUSES.includes(o.status));
  } else if (viewParam === "completed") {
    filtered = sorted.filter((o) => COMPLETED_STATUSES.includes(o.status));
  }

  const mapped = filtered.map((o) => ({
    id: o.id,
    shortId: o.id.slice(-6),
    createdAt: o.createdAt,
    customerName: o.customerName,
    totalCents: o.totalCents,
    status: o.status,
    fulfilmentType: o.fulfilmentType,
    estimatedReadyAt: o.estimatedReadyAt ?? undefined,
    note: o.note,
    items: o.items.map((it) => ({
      id: it.id,
      name: it.name,
      quantity: it.quantity,
      unitCents: it.unitCents,
      totalCents: it.totalCents,
    })),
  }));

  const rangeLabel =
    rangeParam === "7d"
      ? "Last 7 days"
      : rangeParam === "30d"
      ? "Last 30 days"
      : "All time";

  const currentBalance = store.creditCents ?? 0;
  const isNegativeBalance = currentBalance < 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Header + Balance card */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                Orders
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                {rangeLabel} for{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {store.name}
                </span>
                .
              </p>
            </div>

            {/* 🔹 NEW: Store balance card */}
            <div className="mt-2 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* ...inside your component... */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Store balance
                </p>

                <p
                  className={[
                    "mt-0.5 text-base font-semibold",
                    isNegativeBalance
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-700 dark:text-emerald-300",
                  ].join(" ")}
                >
                  {formatMoney(currentBalance)}
                </p>

                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {isNegativeBalance
                    ? "Your balance is negative. You’ll need to top up before opening your store."
                    : "Positive balance available for platform fees."}
                </p>

                {isNegativeBalance && (
                  <div className="mt-2">
                    <Link
                      href="/owner/store/billing"
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      View billing
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls: Sort + Range + View */}
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Sort:</span>
              <FilterChip
                href={`/owner/store/orders?sort=time_desc&range=${rangeParam}&view=${viewParam}`}
                active={sortParam === "time_desc"}
              >
                Newest
              </FilterChip>
              <FilterChip
                href={`/owner/store/orders?sort=time_asc&range=${rangeParam}&view=${viewParam}`}
                active={sortParam === "time_asc"}
              >
                Oldest
              </FilterChip>
              <FilterChip
                href={`/owner/store/orders?sort=status&range=${rangeParam}&view=${viewParam}`}
                active={sortParam === "status"}
              >
                Status
              </FilterChip>
            </div>

            {/* Range */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Range:</span>
              <FilterChip
                href={`/owner/store/orders?sort=${sortParam}&range=7d&view=${viewParam}`}
                active={rangeParam === "7d"}
              >
                7 days
              </FilterChip>
              <FilterChip
                href={`/owner/store/orders?sort=${sortParam}&range=30d&view=${viewParam}`}
                active={rangeParam === "30d"}
              >
                30 days
              </FilterChip>
              <FilterChip
                href={`/owner/store/orders?sort=${sortParam}&range=all&view=${viewParam}`}
                active={rangeParam === "all"}
              >
                All time
              </FilterChip>
            </div>

            {/* View */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">View:</span>
              <FilterChip
                href={`/owner/store/orders?sort=${sortParam}&range=${rangeParam}&view=all`}
                active={viewParam === "all"}
              >
                All
              </FilterChip>
              <FilterChip
                href={`/owner/store/orders?sort=${sortParam}&range=${rangeParam}&view=active`}
                active={viewParam === "active"}
              >
                Active
              </FilterChip>
              <FilterChip
                href={`/owner/store/orders?sort=${sortParam}&range=${rangeParam}&view=completed`}
                active={viewParam === "completed"}
              >
                Completed
              </FilterChip>
            </div>
          </div>
        </header>

        {/* 🔹 NEW: Recent transactions panel */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Recent transactions
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Showing last {ledgerEntries.length} entries
            </span>
          </div>

          {ledgerEntries.length === 0 ? (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              No ledger activity yet. When you complete orders, pay fees, or top
              up, entries will show here.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-[11px] text-slate-700 dark:text-slate-200">
                <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <tr>
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Type</th>
                    <th className="py-1 pr-3">Order</th>
                    <th className="py-1 pr-3 text-right">Amount</th>
                    <th className="py-1 pr-3 text-right">Balance</th>
                    <th className="py-1 pr-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => {
                    const isPositive = isCreditPositiveType(entry.type);
                    const sign = isPositive
                      ? "+"
                      : entry.type === "FEE_RESERVE"
                      ? ""
                      : "−";

                    return (
                      <tr
                        key={entry.id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {getLedgerTypeLabel(entry.type)}
                        </td>
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {entry.orderId ? `#${entry.orderId.slice(-6)}` : "—"}
                        </td>
                        <td className="py-1 pr-3 text-right whitespace-nowrap">
                          <span
                            className={[
                              "font-medium",
                              isPositive
                                ? "text-emerald-700 dark:text-emerald-300"
                                : entry.type === "FEE_RESERVE"
                                ? "text-slate-600 dark:text-slate-300"
                                : "text-red-600 dark:text-red-400",
                            ].join(" ")}
                          >
                            {sign}
                            {formatMoney(entry.amountCents)}
                          </span>
                        </td>
                        <td className="py-1 pr-3 text-right whitespace-nowrap">
                          {entry.balanceCents != null
                            ? formatMoney(entry.balanceCents)
                            : "—"}
                        </td>
                        <td className="py-1 pr-3 max-w-xs truncate">
                          {entry.note || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Manual order form */}
        <AddManualOrderClient products={products} />

        {/* Live watcher: polls + refreshes + plays sound when new order arrives */}
        <LiveOrdersWatcher initialLatestOrderId={latestOrderId} />

        {/* Orders table */}
        <OwnerOrdersTable orders={mapped} />
      </div>
    </main>
  );
}

interface FilterChipProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

function FilterChip({ href, active, children }: FilterChipProps) {
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

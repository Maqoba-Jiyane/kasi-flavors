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
  OrderStatus,
} from "@prisma/client";
import { LiveOrdersWatcher } from "@/components/dashboard/LiveOrdersWatcher";
import { AddManualOrderClient } from "@/components/dashboard/AddManualOrderClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collection orders",
  description:
    "Manage incoming collection orders, track statuses, see recent transactions, and create manual orders in your Kasi Flavors store dashboard.",
  alternates: { canonical: "/owner/store/orders" },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

type SortOption = "time_desc" | "time_asc" | "status";
type RangeOption = "7d" | "30d" | "all";
type ViewOption = "all" | "active" | "completed";

interface OwnerOrdersPageProps {
  searchParams?: Promise<{ sort?: string; range?: string; view?: string }>;
}

const STATUS_ORDER: Record<OrderStatus, number> = {
  PENDING: 1,
  ACCEPTED: 2,
  IN_PREPARATION: 3,
  READY_FOR_COLLECTION: 4,
  COMPLETED: 5,
  CANCELLED: 6,

  // Keep only if your Prisma enum still contains it.
  // We do not use it in collection-first UI.
  OUT_FOR_DELIVERY: 99,
};

const ACTIVE_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREPARATION",
  "READY_FOR_COLLECTION",
];

const COMPLETED_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELLED"];

function sortByStatusThenTime(
  a: Order & { items: OrderItem[] },
  b: Order & { items: OrderItem[] },
) {
  const sa = STATUS_ORDER[a.status] ?? 99;
  const sb = STATUS_ORDER[b.status] ?? 99;

  if (sa !== sb) return sa - sb;

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

function getLedgerTypeLabel(type: LedgerType) {
  switch (type) {
    case "ORDER_CREDIT":
      return "Online order credit";
    case "DISCOUNT_CREDIT":
      return "Discount credit";
    case "SETTLEMENT_PAYMENT":
      return "Settlement payment";
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
  return (
    type === "ORDER_CREDIT" ||
    type === "DISCOUNT_CREDIT" ||
    type === "SETTLEMENT_PAYMENT" ||
    type === "REFUND"
  );
}

export default async function OwnerOrdersPage({
  searchParams,
}: OwnerOrdersPageProps) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, creditCents: true },
  });

  if (!store) {
    return (
      <main className="min-h-screen bg-kasi-cream px-4 py-6">
        <div className="mx-auto max-w-3xl rounded-4xl border border-black/10 bg-white p-6 text-sm text-black/70 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Store setup
          </p>

          <h1 className="mt-2 text-2xl font-black text-kasi-black">
            No store linked to this account
          </h1>

          <p className="mt-2 text-sm font-medium leading-6 text-black/60">
            This owner account does not have a store configured yet. Please
            complete your store setup.
          </p>

          <Link
            href="/become-a-partner"
            className="mt-5 inline-flex rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange"
          >
            Complete store setup
          </Link>
        </div>
      </main>
    );
  }

  const sp = (await searchParams) ?? {};

  const sortParam: SortOption =
    sp.sort === "time_asc" || sp.sort === "status" || sp.sort === "time_desc"
      ? (sp.sort as SortOption)
      : "time_desc";

  const rangeParam: RangeOption =
    sp.range === "7d" || sp.range === "30d" || sp.range === "all"
      ? (sp.range as RangeOption)
      : "30d";

  const viewParam: ViewOption =
    sp.view === "active" || sp.view === "completed" || sp.view === "all"
      ? (sp.view as ViewOption)
      : "all";

  const ledgerEntries: LedgerEntry[] = await prisma.ledgerEntry.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const now = new Date();
  const rangeStart = getRangeStart(rangeParam, now);

  const where: Prisma.OrderWhereInput = {
    storeId: store.id,

    ...(rangeStart ? { createdAt: { gte: rangeStart } } : {}),

    // Do not show unpaid online orders to the store owner.
    // Online orders become visible once Yoco confirms payment and the webhook
    // changes them from PENDING to ACCEPTED.
    NOT: {
      paymentMethod: "ONLINE_PAYMENT",
      status: "PENDING",
    },
  };

  const prismaOrderBy: Prisma.OrderOrderByWithRelationInput | undefined =
    sortParam === "status"
      ? undefined
      : sortParam === "time_asc"
        ? { createdAt: "asc" }
        : { createdAt: "desc" };

  const ordersRaw = await prisma.order.findMany({
    where,
    ...(prismaOrderBy ? { orderBy: prismaOrderBy } : {}),
    include: { items: true },
    take: 200,
  });

  const products = await prisma.product.findMany({
    where: { storeId: store.id, isAvailable: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, priceCents: true },
  });

  const sorted =
    sortParam === "status"
      ? [...ordersRaw].sort(sortByStatusThenTime)
      : ordersRaw;

  const latestOrderId = sorted.length > 0 ? sorted[0].id : null;

  let filtered = sorted;

  if (viewParam === "active") {
    filtered = sorted.filter((order) => ACTIVE_STATUSES.includes(order.status));
  }

  if (viewParam === "completed") {
    filtered = sorted.filter((order) =>
      COMPLETED_STATUSES.includes(order.status),
    );
  }

const mapped = filtered.map((order) => ({
  id: order.id,
  shortId: order.id.slice(-6),
  createdAt: order.createdAt,
  customerName: order.customerName,
  totalCents: order.totalCents,
  source: order.source,
  paymentMethod: order.paymentMethod,
  status: order.status,
  estimatedReadyAt: order.estimatedReadyAt ?? undefined,
  note: order.note,
  fulfilmentType: order.fulfilmentType,
  items: order.items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unitCents: item.unitCents,
    totalCents: item.totalCents,
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
    <main className="py-2">
      <div className="space-y-5">
        <header className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Collection orders
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
              Store orders
            </h1>

            <p className="mt-2 text-sm font-medium text-black/60">
              {rangeLabel} for{" "}
              <span className="font-black text-kasi-black">{store.name}</span>.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-[11px]">
              <FilterGroup label="Sort">
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
              </FilterGroup>

              <FilterGroup label="Range">
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
              </FilterGroup>

              <FilterGroup label="View">
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
              </FilterGroup>
            </div>
          </div>

          <div className="rounded-4xl border border-black/10 bg-kasi-black p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
              Current week balance
            </p>

            <p
              className={[
                "mt-2 text-4xl font-black tracking-tight",
                isNegativeBalance ? "text-red-300" : "text-kasi-green",
              ].join(" ")}
            >
              {formatMoney(currentBalance)}
            </p>

            <p className="mt-3 text-sm font-medium leading-6 text-white/65">
              {isNegativeBalance
                ? "Your current week balance is negative. If it remains negative at settlement time, you’ll need to pay the amount due."
                : currentBalance > 0
                  ? "Kasi Flavors currently owes this amount to your store for the current week."
                  : "Your current week balance is R0. There is nothing to settle right now."}
            </p>

            {isNegativeBalance && (
              <div className="mt-4">
                <Link
                  href="/owner/store/billing"
                  className="inline-flex rounded-full bg-street-orange px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-kasi-green"
                >
                  View settlement
                </Link>
              </div>
            )}
          </div>
        </header>

        <section className="rounded-4xl border border-black/10 bg-white p-5 text-xs shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Billing activity
              </p>
              <h2 className="mt-1 text-xl font-black text-kasi-black">
                Recent transactions
              </h2>
            </div>

            <span className="rounded-full bg-kasi-cream px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black/55">
              Last {ledgerEntries.length}
            </span>
          </div>

          {ledgerEntries.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-kasi-cream p-4 text-sm font-medium text-black/60">
              No ledger activity yet. When you complete orders, pay fees, or top
              up, entries will show here.
            </p>
          ) : (
            <>
              <div className="mt-4 space-y-2 md:hidden">
                {ledgerEntries.map((entry) => {
                  const isPositive = isCreditPositiveType(entry.type);
                  const sign = isPositive
                    ? "+"
                    : entry.type === "FEE_RESERVE"
                      ? ""
                      : "−";

                  return (
                    <article
                      key={entry.id}
                      className="rounded-2xl border border-black/10 bg-kasi-cream p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wide text-black/50">
                            {getLedgerTypeLabel(entry.type)}
                          </div>

                          <div className="mt-1 text-[11px] font-medium text-black/50">
                            {formatDateTime(entry.createdAt)}
                            {entry.orderId && (
                              <span className="ml-1">
                                · #{entry.orderId.slice(-6)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={[
                              "text-sm font-black",
                              isPositive
                                ? "text-kasi-green"
                                : entry.type === "FEE_RESERVE"
                                  ? "text-black/60"
                                  : "text-red-600",
                            ].join(" ")}
                          >
                            {sign}
                            {formatMoney(entry.amountCents)}
                          </div>

                          <div className="mt-1 text-[11px] font-medium text-black/50">
                            Balance:{" "}
                            {entry.balanceCents != null
                              ? formatMoney(entry.balanceCents)
                              : "—"}
                          </div>
                        </div>
                      </div>

                      {entry.note && (
                        <p className="mt-2 line-clamp-2 text-[11px] font-medium text-black/60">
                          {entry.note}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-[11px] text-black/70">
                  <thead className="border-b border-black/10 text-[10px] font-black uppercase tracking-wide text-black/40">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Order</th>
                      <th className="py-2 pr-3 text-right">Amount</th>
                      <th className="py-2 pr-3 text-right">Balance</th>
                      <th className="py-2 pr-3">Note</th>
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
                        <tr key={entry.id} className="border-t border-black/10">
                          <td className="whitespace-nowrap py-2 pr-3 font-medium">
                            {formatDateTime(entry.createdAt)}
                          </td>
                          <td className="whitespace-nowrap py-2 pr-3 font-medium">
                            {getLedgerTypeLabel(entry.type)}
                          </td>
                          <td className="whitespace-nowrap py-2 pr-3">
                            {entry.orderId
                              ? `#${entry.orderId.slice(-6)}`
                              : "—"}
                          </td>
                          <td className="whitespace-nowrap py-2 pr-3 text-right">
                            <span
                              className={[
                                "font-black",
                                isPositive
                                  ? "text-kasi-green"
                                  : entry.type === "FEE_RESERVE"
                                    ? "text-black/60"
                                    : "text-red-600",
                              ].join(" ")}
                            >
                              {sign}
                              {formatMoney(entry.amountCents)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap py-2 pr-3 text-right font-medium">
                            {entry.balanceCents != null
                              ? formatMoney(entry.balanceCents)
                              : "—"}
                          </td>
                          <td className="max-w-xs truncate py-2 pr-3">
                            {entry.note || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <AddManualOrderClient products={products} />
        <LiveOrdersWatcher initialLatestOrderId={latestOrderId} />
        <OwnerOrdersTable orders={mapped} />
      </div>
    </main>
  );
}

interface FilterGroupProps {
  label: string;
  children: React.ReactNode;
}

function FilterGroup({ label, children }: FilterGroupProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-black uppercase tracking-wide text-black/45">
        {label}:
      </span>
      {children}
    </div>
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
        "inline-flex items-center rounded-full border-2 px-3 py-1.5 text-[11px] font-black transition",
        active
          ? "border-kasi-green bg-kasi-green text-white"
          : "border-black/10 bg-white text-black/60 hover:border-kasi-green hover:text-kasi-green",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { OwnerOrdersTable } from "@/components/dashboard/OwnerOrdersTable";
import Link from "next/link";
import type { Order, OrderItem, Prisma } from "@prisma/client";
import { LiveOrdersWatcher } from "@/components/dashboard/LiveOrdersWatcher";

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

export default async function OwnerOrdersPage({
  searchParams,
}: OwnerOrdersPageProps) {
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

  const srchParams = await searchParams;

  const sortParam = (srchParams?.sort as SortOption | undefined) ?? "time_desc";
  const rangeParam = (srchParams?.range as RangeOption | undefined) ?? "30d";
  const viewParam = (srchParams?.view as ViewOption | undefined) ?? "all";

  const now = new Date();
  const rangeStart = getRangeStart(rangeParam, now);

  // Base where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { storeId: store.id };
  
  if (rangeStart) {
    where.createdAt = { gte: rangeStart };
  }

  // For time-based sorts we use Prisma orderBy,
  // for status sort we sort in JS afterwards.
  const prismaOrderBy: Prisma.OrderOrderByWithRelationInput =
    sortParam === "time_asc" ? { createdAt: "asc" } : { createdAt: "desc" };

  const ordersRaw = await prisma.order.findMany({
    where,
    orderBy: prismaOrderBy,
    include: {
      items: true,
    },
    take: 200,
  });

  let sorted: (Order & { items: OrderItem[] })[];

  if (sortParam === "status") {
    sorted = [...ordersRaw].sort(sortByStatusThenTime);
  } else {
    sorted = ordersRaw;
  }

  // Assuming `sorted` is your raw Prisma orders array (before mapping)
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        {/* 🔴 Live watcher: polls + refreshes + plays sound when new order arrives */}
      <LiveOrdersWatcher initialLatestOrderId={latestOrderId} />

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

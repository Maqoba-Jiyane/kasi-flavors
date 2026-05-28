// app/(dashboard)/owner/store/overview/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { OrderStatus } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";

export const metadata: Metadata = {
  title: "Store overview",
  description:
    "See a summary of your store’s balance, collection orders, sales, and top items in the Kasi Flavors owner dashboard.",
  alternates: {
    canonical: "/owner/store/overview",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

const ACTIVE_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREPARATION",
  "READY_FOR_COLLECTION",
];

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREPARATION",
  "READY_FOR_COLLECTION",
  "COMPLETED",
  "CANCELLED",
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

type SearchParams = {
  saved?: string;
  error?: string;
};

async function updateStoreSettings(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      slug: true,
      approvalStatus: true,
    },
  });

  if (!store) {
    redirect(
      "/owner/store/overview?error=" +
        encodeURIComponent("No store linked to this account."),
    );
  }

  const wantsToOpen = formData.get("isOpen") === "on";

  if (wantsToOpen && store.approvalStatus !== "APPROVED") {
    redirect(
      "/owner/store/overview?error=" +
        encodeURIComponent(
          "Your store must be approved before you can open for collection orders.",
        ),
    );
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      isOpen: wantsToOpen,
      supportsCollection: true,
    },
  });

  revalidateTag("stores", "max");
  revalidateTag("stores:open-collection", "max");
  revalidateTag("stores:all-collection", "max");
  revalidateTag(`store:${store.slug}`, "max");
  revalidateTag(`store-menu:${store.slug}`, "max");

  revalidatePath("/");
  revalidatePath("/owner/store/overview");
  revalidatePath(`/stores/${store.slug}`);

  redirect("/owner/store/overview?saved=1");
}

export default async function StoreOverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      creditCents: true,
      isOpen: true,
      approvalStatus: true,
      rejectionReason: true,
      city: true,
      area: true,
      supportsCollection: true,
    },
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
  const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const ordersLast7 = await prisma.order.findMany({
    where: {
      storeId: store.id,
      createdAt: { gte: last7DaysStart },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const activeOrders = ordersLast7.filter((order) =>
    ACTIVE_STATUSES.includes(order.status),
  );

  const todayOrders = ordersLast7.filter(
    (order) => order.createdAt >= todayStart,
  );

  const totalTodayCents = todayOrders.reduce(
    (sum, order) => sum + order.totalCents,
    0,
  );

  const total7DaysCents = ordersLast7.reduce(
    (sum, order) => sum + order.totalCents,
    0,
  );

  const completed7 = ordersLast7.filter(
    (order) => order.status === "COMPLETED",
  );

  const avgOrderValue7 =
    completed7.length > 0
      ? completed7.reduce((sum, order) => sum + order.totalCents, 0) /
        completed7.length
      : 0;

  const statusCounts = ordersLast7.reduce<Partial<Record<OrderStatus, number>>>(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {},
  );

  const itemTotals = new Map<
    string,
    { name: string; qty: number; revenueCents: number }
  >();

  for (const order of ordersLast7) {
    for (const item of order.items) {
      const existing = itemTotals.get(item.name) ?? {
        name: item.name,
        qty: 0,
        revenueCents: 0,
      };

      existing.qty += item.quantity;
      existing.revenueCents += item.totalCents;

      itemTotals.set(item.name, existing);
    }
  }

  const topItems = Array.from(itemTotals.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  const currentBalance = store.creditCents ?? 0;
  const isNegativeBalance = currentBalance < 0;
  const recentOrders = ordersLast7.slice(0, 8);
  const isApproved = store.approvalStatus === "APPROVED";

  return (
    <main className="py-2">
      <div className="space-y-5">
        {(sp.saved === "1" || sp.error) && (
          <div
            className={[
              "rounded-3xl border px-4 py-3 text-sm font-bold shadow-sm",
              sp.error
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-kasi-green/20 bg-kasi-green/10 text-kasi-green",
            ].join(" ")}
          >
            {sp.error ? sp.error : "Settings saved."}
          </div>
        )}

        <header className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Overview
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
              Store overview
            </h1>

            <p className="mt-2 text-sm font-medium text-black/60">
              Summary for{" "}
              <span className="font-black text-kasi-black">{store.name}</span>
              {" · "}
              {store.area ? `${store.area}, ` : ""}
              {store.city}
            </p>

            {store.approvalStatus === "PENDING_REVIEW" && (
              <div className="mt-4 rounded-2xl border border-golden-yellow/40 bg-golden-yellow/20 p-4 text-sm font-bold leading-6 text-kasi-black">
                Your store is under review. Kasi Flavors will verify your store
                details, menu, and location before it becomes visible to
                customers. You can continue preparing your menu while waiting.
              </div>
            )}

            {store.approvalStatus === "REJECTED" && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-600">
                Your store needs changes before approval.
                {store.rejectionReason ? (
                  <span className="mt-1 block">
                    Reason: {store.rejectionReason}
                  </span>
                ) : null}
              </div>
            )}

            {store.approvalStatus === "APPROVED" && (
              <div className="mt-4 rounded-2xl border border-kasi-green/20 bg-kasi-green/10 p-4 text-sm font-bold leading-6 text-kasi-green">
                Your store is approved. You can open for collection orders when
                you are ready.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-4xl border border-black/10 bg-white p-4 shadow-sm">
            <Link
              href="/owner/store/orders"
              className="inline-flex rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange"
            >
              View orders →
            </Link>

            <Link
              href="/owner/store/billing"
              className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-black"
            >
              Billing →
            </Link>
          </div>
        </header>

        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Store controls
              </p>

              <h2 className="mt-1 text-2xl font-black text-kasi-black">
                Store settings
              </h2>

              <p className="mt-1 text-sm font-medium text-black/55">
                Control whether customers can place collection orders from your
                store.
              </p>
            </div>
          </div>

          <form
            action={updateStoreSettings}
            className="mt-5 grid gap-4 sm:grid-cols-2"
          >
            <div className="rounded-3xl border border-black/10 bg-kasi-cream p-4">
              <p className="text-xs font-black uppercase tracking-wide text-black/45">
                Availability
              </p>

              <label className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-kasi-black">
                <input
                  type="checkbox"
                  name="isOpen"
                  defaultChecked={store.isOpen}
                  disabled={!isApproved}
                  className="h-4 w-4 accent-kasi-green disabled:opacity-40"
                />
                Open for collection orders
              </label>

              {!isApproved ? (
                <p className="mt-3 rounded-2xl bg-golden-yellow/25 p-3 text-xs font-bold leading-5 text-kasi-black">
                  Your store must be approved before it can open for orders.
                </p>
              ) : (
                <p className="mt-3 text-xs font-medium leading-5 text-black/55">
                  When closed, customers may see your approved store, but cannot
                  place orders.
                </p>
              )}

              {isNegativeBalance && (
                <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-600">
                  Your balance is negative. Consider keeping the store closed
                  until settled.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-black/10 bg-kasi-cream p-4">
              <p className="text-xs font-black uppercase tracking-wide text-black/45">
                Fulfilment
              </p>

              <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-kasi-black">
                Collection only
              </div>

              <p className="mt-3 text-xs font-medium leading-5 text-black/55">
                Kasi Flavors is starting with collection orders. Customers order
                online and collect when their food is ready.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-black/50">
                Tip: keep your store closed when you are not ready to prepare
                orders.
              </p>

              <button
                type="submit"
                className="rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-street-orange"
              >
                Save settings
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Balance"
            value={formatMoney(currentBalance)}
            description={
              isNegativeBalance
                ? "Negative balance — settle before opening."
                : "Used to pay platform fees."
            }
            tone={isNegativeBalance ? "danger" : "success"}
          />

          <StatCard
            label="Active orders"
            value={String(activeOrders.length)}
            description="Pending, accepted, in preparation, or ready for collection."
          />

          <StatCard
            label="Today’s sales"
            value={formatMoney(totalTodayCents)}
            description={`${todayOrders.length} order${
              todayOrders.length === 1 ? "" : "s"
            } today.`}
          />

          <StatCard
            label="Last 7 days"
            value={formatMoney(total7DaysCents)}
            description={`${ordersLast7.length} order${
              ordersLast7.length === 1 ? "" : "s"
            } · avg ${
              completed7.length > 0 ? formatMoney(avgOrderValue7) : "R 0.00"
            }`}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-4xl border border-black/10 bg-white p-5 text-xs shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                  Order health
                </p>

                <h2 className="mt-1 text-xl font-black text-kasi-black">
                  Orders by status
                </h2>
              </div>

              <span className="rounded-full bg-kasi-cream px-3 py-1 text-xs font-black uppercase tracking-wide text-black/50">
                {ordersLast7.length} total
              </span>
            </div>

            {ordersLast7.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-kasi-cream p-4 text-sm font-medium text-black/60">
                No orders in the last 7 days yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {ORDER_STATUSES.map((status) => {
                  const count = statusCounts[status] || 0;
                  if (count === 0) return null;

                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-2xl bg-kasi-cream px-4 py-3"
                    >
                      <span className="text-xs font-black uppercase tracking-wide text-black/55">
                        {statusLabel(status)}
                      </span>

                      <span className="rounded-full bg-kasi-black px-3 py-1 text-xs font-black text-white">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-4xl border border-black/10 bg-white p-5 text-xs shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Menu performance
            </p>

            <h2 className="mt-1 text-xl font-black text-kasi-black">
              Top items
            </h2>

            <p className="mt-1 text-xs font-medium text-black/50">
              Based on quantity and revenue from the last 7 days.
            </p>

            {topItems.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-kasi-cream p-4 text-sm font-medium text-black/60">
                No items sold in the last 7 days yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {topItems.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-kasi-cream px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-black text-kasi-black">
                        {item.name}
                      </p>

                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-black/45">
                        {item.qty} sold
                      </p>
                    </div>

                    <p className="rounded-full bg-golden-yellow px-3 py-1.5 text-xs font-black text-kasi-black">
                      {formatMoney(item.revenueCents)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-4xl border border-black/10 bg-white p-5 text-xs shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Recent activity
              </p>

              <h2 className="mt-1 text-xl font-black text-kasi-black">
                Recent orders
              </h2>
            </div>

            <Link
              href="/owner/store/orders"
              className="rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange"
            >
              View all →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-kasi-cream p-4 text-sm font-medium text-black/60">
              No orders yet.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-black/70">
                  <thead className="bg-kasi-black text-white">
                    <tr>
                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-white/70">
                        Order
                      </th>
                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-white/70">
                        Date
                      </th>
                      <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-white/70">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-white/70">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/10 bg-white">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-kasi-cream">
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-black text-kasi-black">
                          #{order.id.slice(-6)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          {formatDateTime(order.createdAt)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-bold">
                          {statusLabel(order.status)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-black text-kasi-black">
                          {formatMoney(order.totalCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  tone?: "default" | "success" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-kasi-green"
      : tone === "danger"
        ? "text-red-600"
        : "text-kasi-black";

  return (
    <div className="rounded-4xl border border-black/10 bg-white p-5 text-xs shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-street-orange">
        {label}
      </p>

      <p className={`mt-2 text-2xl font-black ${valueClass}`}>{value}</p>

      <p className="mt-2 text-xs font-medium leading-5 text-black/55">
        {description}
      </p>
    </div>
  );
}
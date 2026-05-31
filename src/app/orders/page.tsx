// app/orders/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import Link from "next/link";
import OrderActionsClient from "@/components/orders/OrderActionsClient";
import type { Order } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My orders",
  description:
    "View your active and past kasi food orders placed with your Kasi Flavors account.",
  alternates: { canonical: "/orders" },
  openGraph: {
    type: "website",
    title: "My orders | Kasi Flavors",
    description:
      "Track active orders and review your past kasi food orders on Kasi Flavors.",
    url: "/orders",
  },
  twitter: {
    card: "summary",
    title: "My orders | Kasi Flavors",
    description:
      "See your active and past kasi food orders linked to your Kasi Flavors account.",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

type Row = {
  id: string;
  shortId: string;
  createdAt: Date;
  status: Order["status"];
  fulfilmentType: Order["fulfilmentType"];
  paymentMethod: Order["paymentMethod"] | null;
  totalCents: number;
  pickupCode: string | null;
  estimatedReadyAt?: Date | null;
  store: { id: string; name: string; slug: string };
  note?: string | null;
  trackingToken: string | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitCents: number;
    totalCents: number;
  }[];
};

function formatPrice(cents: number) {
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

function formatTime(d?: Date | null) {
  if (!d) return "—";
  return d.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

function humanizeStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusPill({ status }: { status: string }) {
  const mapping: Record<string, string> = {
    PENDING: "bg-golden-yellow/25 text-kasi-black ring-golden-yellow/40",
    ACCEPTED: "bg-blue-50 text-blue-700 ring-blue-100",
    IN_PREPARATION: "bg-street-orange/10 text-street-orange ring-street-orange/20",
    READY_FOR_COLLECTION: "bg-kasi-green/10 text-kasi-green ring-kasi-green/20",
    OUT_FOR_DELIVERY: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    COMPLETED: "bg-black/10 text-black/60 ring-black/10",
    CANCELLED: "bg-red-50 text-red-600 ring-red-200",
  };

  const cls = mapping[status] ?? "bg-black/10 text-black/60 ring-black/10";

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1",
        cls,
      ].join(" ")}
    >
      {humanizeStatus(status)}
    </span>
  );
}

function humanizePaymentMethod(pm: string | null | undefined) {
  if (!pm) return "—";

  switch (pm) {
    case "CASH_ON_COLLECTION":
      return "Cash on collection";
    case "CASH_ON_DELIVERY":
      return "Cash on delivery";
    case "ONLINE_PAYMENT":
      return "Online payment";
    default:
      return pm
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

// ✅ Code visibility rules (matches the order page logic)
function shouldShowCode(row: Row) {
  if (!row.pickupCode) return false;
  // Hide internal/manual pickup codes from customer-facing UI
  if (row.pickupCode.startsWith("MANUAL-")) return false;

  if (row.fulfilmentType === "COLLECTION") {
    return row.status === "READY_FOR_COLLECTION" || row.status === "COMPLETED";
  }

  // DELIVERY
  return row.status === "OUT_FOR_DELIVERY" || row.status === "COMPLETED";
}

function codeLabel(fulfilmentType: Row["fulfilmentType"]) {
  return fulfilmentType === "COLLECTION" ? "Pickup code" : "Delivery code";
}

function itemsCount(items: Row["items"]) {
  return items.reduce((s, it) => s + it.quantity, 0);
}

const ACTIVE_STATUSES: Order["status"][] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREPARATION",
  "READY_FOR_COLLECTION",
  "OUT_FOR_DELIVERY",
];

const PAST_STATUSES: Order["status"][] = ["COMPLETED", "CANCELLED"];

function EmptyOrdersCard({
  title,
  text,
  showBrowseButton = false,
}: {
  title: string;
  text: string;
  showBrowseButton?: boolean;
}) {
  return (
    <div className="rounded-4xl border border-dashed border-black/15 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kasi-black text-3xl">
        🍟
      </div>

      <h3 className="mt-5 text-xl font-black text-kasi-black">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/60">
        {text}
      </p>

      {showBrowseButton && (
        <Link href="/" className="mt-5 inline-flex kf-btn-primary">
          Browse stores
        </Link>
      )}
    </div>
  );
}

function OrderMiniItems({ items }: { items: Row["items"] }) {
  return (
    <ul className="mt-3 divide-y divide-black/10 rounded-3xl bg-kasi-cream px-4 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="font-black text-kasi-black">
              {item.quantity}× {item.name}
            </p>

            <p className="mt-1 text-xs font-medium text-black/50">
              {formatPrice(item.unitCents)} each
            </p>
          </div>

          <p className="shrink-0 text-sm font-black text-kasi-black">
            {formatPrice(item.totalCents)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function isOnlinePaymentPending(row: Row) {
  return row.paymentMethod === "ONLINE_PAYMENT" && row.status === "PENDING";
}

function paymentStatusLabel(row: Row) {
  if (isOnlinePaymentPending(row)) {
    return "Payment pending";
  }

  if (row.paymentMethod === "ONLINE_PAYMENT") {
    return "Paid online";
  }

  return humanizePaymentMethod(row.paymentMethod);
}

export default async function OrdersPage() {
  const user = await getCurrentUser();
  assertRole(user, ["CUSTOMER", "ADMIN"]);

  // Optional: if your system allows orders by email fallback
  // (e.g. older orders before customerId existed), you can OR them in:
  // const where = {
  //   OR: [
  //     { customerId: user.id },
  //     ...(user.email ? [{ customerEmail: { equals: user.email, mode: "insensitive" as const } }] : []),
  //   ],
  // };

  const ordersRaw = await prisma.order.findMany({
    where: { customerId: user.id },
    select: {
      id: true,
      createdAt: true,
      status: true,
      fulfilmentType: true,
      paymentMethod: true,
      totalCents: true,
      trackingToken: true,
      pickupCode: true,
      estimatedReadyAt: true,
      note: true,
      store: { select: { id: true, name: true, slug: true } },
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          unitCents: true,
          totalCents: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const mapped: Row[] = ordersRaw.map((o) => ({
    id: o.id,
    shortId: o.id.slice(-6),
    createdAt: o.createdAt,
    status: o.status,
    fulfilmentType: o.fulfilmentType,
    paymentMethod: o.paymentMethod,
    totalCents: o.totalCents,
    trackingToken: o.trackingToken,
    pickupCode: o.pickupCode,
    estimatedReadyAt: o.estimatedReadyAt ?? undefined,
    store: { id: o.store.id, name: o.store.name, slug: o.store.slug },
    note: o.note ?? undefined,
    items: o.items.map((it) => ({
      id: it.id,
      name: it.name,
      quantity: it.quantity,
      unitCents: it.unitCents,
      totalCents: it.totalCents,
    })),
  }));

const paymentPending = mapped.filter(isOnlinePaymentPending);

const active = mapped.filter(
  (m) => ACTIVE_STATUSES.includes(m.status) && !isOnlinePaymentPending(m),
);

const past = mapped.filter((m) => PAST_STATUSES.includes(m.status));

const paidOrCompletedTotalCents = mapped
  .filter((order) => !isOnlinePaymentPending(order))
  .reduce((sum, order) => sum + order.totalCents, 0);

return (
  <main className="min-h-screen bg-kasi-cream px-4 py-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="overflow-hidden rounded-4xl border border-black/10 bg-white shadow-sm">
        <div className="h-2 bg-linear-to-r from-kasi-green via-street-orange to-golden-yellow" />

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              My orders
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
              Track your kasi food orders
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-black/60">
              View active orders, pickup codes, order history, and collection
              details linked to your Kasi Flavors account.
            </p>
          </div>

          <div className="rounded-3xl bg-kasi-cream px-4 py-3 text-left sm:text-right">
            <p className="text-xs font-black uppercase tracking-wide text-black/45">
              Signed in as
            </p>

            <p className="mt-1 max-w-60 truncate text-sm font-black text-kasi-black">
              {user.name ?? user.email}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Active
          </p>
          <p className="mt-2 text-3xl font-black text-kasi-black">
            {active.length}
          </p>
        </div>

        <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Past
          </p>
          <p className="mt-2 text-3xl font-black text-kasi-black">
            {past.length}
          </p>
        </div>

        <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Total spent
          </p>
          <p className="mt-2 text-3xl font-black text-kasi-green">
            {formatPrice(paidOrCompletedTotalCents)}
          </p>
        </div>
      </section>

      {paymentPending.length > 0 && (
  <section className="space-y-4">
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-street-orange">
          Payment required
        </p>

        <h2 className="text-2xl font-black tracking-tight text-kasi-black">
          Pending online payments
        </h2>
      </div>

      <p className="text-sm font-bold text-black/55">
        {paymentPending.length} pending
      </p>
    </div>

    <div className="space-y-4">
      {paymentPending.map((o) => {
        const count = itemsCount(o.items);

        return (
          <article
            key={o.id}
            className="rounded-4xl border border-golden-yellow/40 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-kasi-black px-3 py-1 font-mono text-[11px] font-black uppercase tracking-wide text-white">
                    #{o.shortId}
                  </span>

                  <span className="rounded-full bg-golden-yellow/25 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-kasi-black ring-1 ring-golden-yellow/40">
                    Payment pending
                  </span>
                </div>

                <h3 className="mt-3 text-xl font-black text-kasi-black">
                  {o.store.name}
                </h3>

                <p className="mt-1 text-xs font-medium text-black/50">
                  {formatDateTime(o.createdAt)} · {count} item
                  {count === 1 ? "" : "s"}
                </p>

                <p className="mt-3 rounded-2xl bg-kasi-cream p-3 text-xs font-bold leading-5 text-black/60">
                  This order will only be sent to the store after your online
                  payment is confirmed.
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-2xl font-black text-kasi-black">
                  {formatPrice(o.totalCents)}
                </p>

                <p className="mt-1 text-xs font-bold text-black/45">
                  Online payment
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href={`/orders/${o.id}`}
                className="inline-flex rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange"
              >
                Open order details
              </Link>

              <Link
                href="/checkout"
                className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-black"
              >
                Try payment again
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  </section>
)}

      {/* Active */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              In progress
            </p>

            <h2 className="text-2xl font-black tracking-tight text-kasi-black">
              Active orders
            </h2>
          </div>

          <p className="text-sm font-bold text-black/55">
            {active.length} active
          </p>
        </div>

        {active.length === 0 ? (
          <EmptyOrdersCard
            title="No active orders"
            text="You do not have any active orders right now. Browse nearby food spots and place a collection order when you are ready."
            showBrowseButton
          />
        ) : (
          <div className="space-y-4">
            {active.map((o) => {
              const showCode = shouldShowCode(o);
              const label = codeLabel(o.fulfilmentType);
              const count = itemsCount(o.items);

              return (
                <article
                  key={o.id}
                  className="overflow-hidden rounded-4xl border border-black/10 bg-white shadow-sm"
                >
                  <div className="h-1.5 bg-linear-to-r from-kasi-green via-street-orange to-golden-yellow" />

                  <div className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-kasi-black px-3 py-1 font-mono text-[11px] font-black uppercase tracking-wide text-white">
                            #{o.shortId}
                          </span>

                          <StatusPill status={o.status} />

                          <span className="rounded-full bg-kasi-cream px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black/50">
                            {o.fulfilmentType === "COLLECTION"
                              ? "Collection"
                              : "Delivery"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-xl font-black text-kasi-black">
                          {o.store.name}
                        </h3>

                        <p className="mt-1 text-xs font-medium text-black/50">
                          {formatDateTime(o.createdAt)} · {count} item
                          {count === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-2xl font-black text-kasi-green">
                          {formatPrice(o.totalCents)}
                        </p>

                        <p className="mt-1 text-xs font-bold text-black/45">
                          {paymentStatusLabel(o)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
                      <div className="rounded-3xl bg-kasi-cream p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-black/45">
                          ETA
                        </p>

                        <p className="mt-1 text-lg font-black text-kasi-black">
                          {formatTime(o.estimatedReadyAt)}
                        </p>
                      </div>

                      <div className="rounded-3xl bg-kasi-cream p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-black/45">
                          {label}
                        </p>

                        {showCode ? (
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <div className="rounded-2xl bg-kasi-black px-4 py-2 font-mono text-lg font-black tracking-[0.2em] text-white">
                              {o.pickupCode}
                            </div>

                            {o.trackingToken ? (
                              <OrderActionsClient
                                trackingToken={o.trackingToken}
                                pickupCode={o.pickupCode ?? ""}
                                storeSlug={o.store.slug}
                              />
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs font-medium leading-5 text-black/55">
                            Code will appear when the store marks your order{" "}
                            {o.fulfilmentType === "COLLECTION"
                              ? "Ready for collection"
                              : "Out for delivery"}
                            .
                          </p>
                        )}
                      </div>
                    </div>

                    <details className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
                      <summary className="cursor-pointer text-sm font-black text-kasi-black">
                        View items & details
                      </summary>

                      <OrderMiniItems items={o.items} />

                      {o.note && o.note.trim() !== "" && (
                        <div className="mt-3 rounded-3xl bg-kasi-cream p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-black/45">
                            Note to store
                          </p>

                          <p className="mt-1 text-sm font-medium leading-6 text-black/65">
                            {o.note}
                          </p>
                        </div>
                      )}

                      <div className="mt-3">
                        <Link
                          href={`/orders/${o.id}`}
                          className="inline-flex rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange"
                        >
                          Open order details →
                        </Link>
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Past */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              History
            </p>

            <h2 className="text-2xl font-black tracking-tight text-kasi-black">
              Past orders
            </h2>
          </div>

          <p className="text-sm font-bold text-black/55">
            {past.length} past
          </p>
        </div>

        {past.length === 0 ? (
          <EmptyOrdersCard
            title="No past orders yet"
            text="Completed and cancelled orders will appear here after you start ordering from Kasi Flavors."
          />
        ) : (
          <div className="grid gap-4">
            {past.map((o) => {
              const count = itemsCount(o.items);

              return (
                <article
                  key={o.id}
                  className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-kasi-black px-3 py-1 font-mono text-[11px] font-black uppercase tracking-wide text-white">
                          #{o.shortId}
                        </span>

                        <StatusPill status={o.status} />
                      </div>

                      <h3 className="mt-3 text-lg font-black text-kasi-black">
                        {o.store.name}
                      </h3>

                      <p className="mt-1 text-xs font-medium text-black/50">
                        {formatDateTime(o.createdAt)} · {count} item
                        {count === 1 ? "" : "s"} ·{" "}
                        {o.fulfilmentType === "COLLECTION"
                          ? "Collection"
                          : "Delivery"}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xl font-black text-kasi-black">
                        {formatPrice(o.totalCents)}
                      </p>

                      <p className="mt-1 text-xs font-bold text-black/45">
                        {paymentStatusLabel(o)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/orders/${o.id}`}
                      className="inline-flex rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange"
                    >
                      View details
                    </Link>

                    {o.status === "COMPLETED" &&
                      shouldShowCode(o) &&
                      o.pickupCode && (
                        <span className="rounded-full bg-kasi-cream px-3 py-2 text-[11px] font-bold text-black/55">
                          {codeLabel(o.fulfilmentType)}:{" "}
                          <span className="font-mono font-black text-kasi-black">
                            {o.pickupCode}
                          </span>
                        </span>
                      )}
                  </div>

                  <details className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
                    <summary className="cursor-pointer text-sm font-black text-kasi-black">
                      View items
                    </summary>

                    <OrderMiniItems items={o.items} />
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  </main>
);
}

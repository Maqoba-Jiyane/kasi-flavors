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
    PENDING: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100 dark:bg-yellow-950/40 dark:text-yellow-300 dark:ring-yellow-900/60",
    ACCEPTED:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
    IN_PREPARATION:
      "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60",
    READY_FOR_COLLECTION:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    OUT_FOR_DELIVERY:
      "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60",
    COMPLETED:
      "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    CANCELLED:
      "bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
  };
  const cls =
    mapping[status] ??
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${cls}`}
    >
      {humanizeStatus(status)}
    </span>
  );
}

function humanizePaymentMethod(pm: string | null | undefined) {
  if (!pm) return "—";
  switch (pm) {
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

  const active = mapped.filter((m) => ACTIVE_STATUSES.includes(m.status));
  const past = mapped.filter((m) => PAST_STATUSES.includes(m.status));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              My orders
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              Recent orders placed with your account
            </p>
          </div>
          <div className="text-right text-xs">
            <div className="text-slate-500 dark:text-slate-400">Signed in as</div>
            <div className="font-medium text-slate-900 dark:text-slate-50">
              {user.name ?? user.email}
            </div>
          </div>
        </header>

        {/* Active */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Active orders
          </h2>

          {active.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              You don&apos;t have any active orders right now.
              <div className="mt-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Browse stores
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((o) => {
                const showCode = shouldShowCode(o);
                const label = codeLabel(o.fulfilmentType);
                const count = itemsCount(o.items);

                return (
                  <article
                    key={o.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                              #{o.shortId}
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {o.store.name}
                            </div>
                            <StatusPill status={o.status} />
                          </div>

                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatDateTime(o.createdAt)} · {count} item(s)
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {formatPrice(o.totalCents)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {o.fulfilmentType}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {humanizePaymentMethod(o.paymentMethod as any)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        <div className="text-slate-500 dark:text-slate-400">ETA:</div>
                        <div className="font-medium text-slate-700 dark:text-slate-200">
                          {formatTime(o.estimatedReadyAt)}
                        </div>

                        <div className="text-slate-400">·</div>

                        <div className="text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            {label}
                          </span>

                          {showCode ? (
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <div className="rounded-md bg-slate-100 px-3 py-1 font-mono text-sm dark:bg-slate-800 dark:text-slate-50">
                                {o.pickupCode}
                              </div>

                              {/* Only render actions when code is visible AND trackingToken exists */}
                              {o.trackingToken ? (
                                <OrderActionsClient
                                  trackingToken={o.trackingToken}
                                  pickupCode={o.pickupCode ?? ""}
                                  storeSlug={o.store.slug}
                                />
                              ) : null}
                            </div>
                          ) : (
                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                              Code will appear when the store marks your order{" "}
                              {o.fulfilmentType === "COLLECTION"
                                ? "Ready for collection"
                                : "Out for delivery"}
                              .
                            </div>
                          )}
                        </div>
                      </div>

                      {/* details */}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                          View items &amp; details
                        </summary>

                        <div className="mt-2 space-y-2 text-sm">
                          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {o.items.map((it) => (
                              <li
                                key={it.id}
                                className="flex items-center justify-between py-2"
                              >
                                <div>
                                  <div className="font-medium text-slate-900 dark:text-slate-50">
                                    {it.quantity}× {it.name}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatPrice(it.unitCents)} each
                                  </div>
                                </div>
                                <div className="font-semibold text-slate-900 dark:text-slate-50">
                                  {formatPrice(it.totalCents)}
                                </div>
                              </li>
                            ))}
                          </ul>

                          {o.note && o.note.trim() !== "" && (
                            <div className="rounded-md border border-slate-100 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Note to store
                              </div>
                              <div className="mt-1 text-sm text-slate-800 dark:text-slate-50">
                                {o.note}
                              </div>
                            </div>
                          )}

                          <div className="rounded-md border border-slate-100 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-950/30">
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Order link
                            </div>
                            <div className="mt-1">
                              <Link
                                href={`/orders/${o.id}`}
                                className="text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                              >
                                Open order details →
                              </Link>
                            </div>
                          </div>
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
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Past orders
          </h2>

          {past.length === 0 ? (
            <div className="text-xs text-slate-500 dark:text-slate-300">
              No past orders yet.
            </div>
          ) : (
            <div className="space-y-3">
              {past.map((o) => (
                <article
                  key={o.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                          #{o.shortId}
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {o.store.name}
                        </div>
                        <StatusPill status={o.status} />
                      </div>

                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(o.createdAt)} · {itemsCount(o.items)} item(s)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-slate-900 dark:text-slate-50">
                        {formatPrice(o.totalCents)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {o.fulfilmentType}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {humanizePaymentMethod(o.paymentMethod as any)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <Link
                      href={`/orders/${o.id}`}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      View details
                    </Link>

                    {/* If completed, showing code is fine (both delivery & collection) */}
                    {o.status === "COMPLETED" && shouldShowCode(o) && o.pickupCode && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {codeLabel(o.fulfilmentType)}:{" "}
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                          {o.pickupCode}
                        </span>
                      </span>
                    )}
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                      View items
                    </summary>
                    <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                      {o.items.map((it) => (
                        <li
                          key={it.id}
                          className="flex items-center justify-between py-2"
                        >
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-50">
                              {it.quantity}× {it.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {formatPrice(it.unitCents)} each
                            </div>
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-slate-50">
                            {formatPrice(it.totalCents)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

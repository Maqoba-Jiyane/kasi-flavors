// app/orders/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import Link from "next/link";
import OrderActionsClient from "@/components/orders/OrderActionsClient";
import type { Order,  } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My orders", // becomes "My orders | Kasi Flavors" via root template
  description:
    "View your active and past kasi food orders placed with your Kasi Flavors account.",
  alternates: {
    canonical: "/orders",
  },
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
    follow: false, // internal/account area; no need for bots to follow
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

type Row = {
  id: string;
  shortId: string;
  createdAt: Date;
  status: Order["status"];
  fulfilmentType: Order["fulfilmentType"];
  totalCents: number;
  pickupCode: string;
  estimatedReadyAt?: Date | null;
  store: { id: string; name: string; slug: string };
  note?: string | null;
  trackingToken: string; 
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
  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function StatusPill({ status }: { status: string }) {
  const mapping: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700",
    ACCEPTED: "bg-emerald-50 text-emerald-700",
    IN_PREPARATION: "bg-sky-50 text-sky-700",
    READY_FOR_COLLECTION: "bg-indigo-50 text-indigo-700",
    OUT_FOR_DELIVERY: "bg-emerald-50 text-emerald-700",
    COMPLETED: "bg-slate-100 text-slate-700",
    CANCELLED: "bg-red-50 text-red-700",
  };
  const cls = mapping[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

export default async function OrdersPage() {
  const user = await getCurrentUser();
  assertRole(user, ["CUSTOMER", "ADMIN"]); // allow customers primarily; admins/stores may view their orders too

  // Fetch orders for this user (customerId)
  const ordersRaw = await prisma.order.findMany({
    where: { customerId: user.id },
    include: {
      items: true,
      store: { select: { id: true, name: true, slug: true } },
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

  const active = mapped.filter((m) => ["PENDING", "ACCEPTED", "IN_PREPARATION", "READY_FOR_COLLECTION", "OUT_FOR_DELIVERY"].includes(m.status));
  const past = mapped.filter((m) => ["COMPLETED", "CANCELLED"].includes(m.status));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">My orders</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Recent orders placed with your account</p>
          </div>
          <div className="text-right text-xs">
            <div className="text-slate-500 dark:text-slate-400">Signed in as</div>
            <div className="font-medium text-slate-900 dark:text-slate-50">{user.name ?? user.email}</div>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Active orders</h2>

          {active.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              You don&apos;t have any active orders right now.
              <div className="mt-3">
                <Link href="/" className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                  Browse stores
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((o) => (
                <article key={o.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-xs text-slate-600 dark:text-slate-400">#{o.shortId}</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{o.store.name}</div>
                          <StatusPill status={o.status} />
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(o.createdAt)} · {o.items.reduce((s, it) => s + it.quantity, 0)} item(s)
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatPrice(o.totalCents)}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{o.fulfilmentType}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <div className="text-slate-500">ETA:</div>
                      <div className="font-medium text-slate-700 dark:text-slate-200">{formatTime(o.estimatedReadyAt)}</div>

                      <div className="ml-4 text-slate-400">·</div>

                      <div className="ml-4 text-xs">
                        <span className="text-slate-500">Pickup code</span>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="rounded-md bg-slate-100 px-3 py-1 font-mono text-sm dark:bg-slate-800">{o.pickupCode}</div>
                          <OrderActionsClient trackingToken={o.trackingToken} pickupCode={o.pickupCode} storeSlug={o.store.slug} />
                        </div>
                      </div>
                    </div>

                    {/* details */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-300">View items & details</summary>
                      <div className="mt-2 space-y-2 text-sm">
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                          {o.items.map((it) => (
                            <li key={it.id} className="flex items-center justify-between py-2">
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-50">{it.quantity}× {it.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{formatPrice(it.unitCents)} each</div>
                              </div>
                              <div className="font-semibold text-slate-900 dark:text-slate-50">{formatPrice(it.totalCents)}</div>
                            </li>
                          ))}
                        </ul>

                        {o.note && (
                          <div className="rounded-md border border-slate-100 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                            <div className="text-[11px] text-slate-500">Note to store</div>
                            <div className="mt-1 text-sm text-slate-800 dark:text-slate-50">{o.note}</div>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Past orders</h2>
          {past.length === 0 ? (
            <div className="text-xs text-slate-500 dark:text-slate-300">No past orders yet.</div>
          ) : (
            <div className="space-y-3">
              {past.map((o) => (
                <article key={o.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-xs text-slate-600 dark:text-slate-400">#{o.shortId}</div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{o.store.name}</div>
                        <StatusPill status={o.status} />
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(o.createdAt)} · {o.items.length} item(s)</div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-slate-900 dark:text-slate-50">{formatPrice(o.totalCents)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{o.fulfilmentType}</div>
                    </div>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-300">View items</summary>
                    <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {o.items.map((it) => (
                        <li key={it.id} className="flex items-center justify-between py-2">
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-50">{it.quantity}× {it.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{formatPrice(it.unitCents)} each</div>
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-slate-50">{formatPrice(it.totalCents)}</div>
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

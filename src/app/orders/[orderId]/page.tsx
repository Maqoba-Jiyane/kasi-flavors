// app/orders/[orderId]/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

type OrderPageRouteParams = {
  orderId: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<OrderPageRouteParams>;
}): Promise<Metadata> {
  const { orderId } = await params;
  const shortId = orderId.slice(-6);

  const title = `Order #${shortId}`;
  const urlPath = `/orders/${orderId}`;

  return {
    title,
    description:
      "View the status, pickup or delivery code, and details for this Kasi Flavors order.",
    alternates: { canonical: urlPath },
    openGraph: {
      type: "website",
      title: `${title} | Kasi Flavors`,
      description: "Track the status and view details for your Kasi Flavors order.",
      url: urlPath,
    },
    twitter: {
      card: "summary",
      title: `${title} | Kasi Flavors`,
      description: "Track the status and see details for your Kasi Flavors order.",
    },
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PREPARATION"
  | "READY_FOR_COLLECTION"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

interface OrderPageProps {
  params: Promise<{ orderId: string }>;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const label = status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide";

  const colorClasses: Record<OrderStatus, string> = {
    PENDING:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
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

  return <span className={`${base} ${colorClasses[status]}`}>{label}</span>;
}

function formatPrice(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function minutesDiff(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 60000);
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

function OrderNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Order not found
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          We couldn&apos;t find that order. Please check your link or contact the store.
        </p>
      </div>
    </main>
  );
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;

  // 1) Require authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirectUrl=/orders/${orderId}`);
  }

  // 2) Load order with store + items
  // NOTE: include only what you need (keeps it fast + safer)
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      storeId: true,
      customerId: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      fulfilmentType: true,
      paymentMethod: true,
      status: true,
      totalCents: true,
      deliveryFeeCents: true,
      pickupCode: true,
      deliveryAddress: true,
      note: true,
      trackingToken: true,
      estimatedReadyAt: true,
      createdAt: true,
      completedAt: true,
      store: {
        select: {
          name: true,
          area: true,
          city: true,
        },
      },
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
  });

  if (!order) return <OrderNotFound />;

  // 3) Verify ownership:
  // - best: customerId matches
  // - fallback: email matches (case-insensitive)
  const ownsById = !!order.customerId && order.customerId === user.id;

  const ownsByEmail =
    !!order.customerEmail &&
    !!user.email &&
    order.customerEmail.toLowerCase() === user.email.toLowerCase();

  if (!ownsById && !ownsByEmail) {
    return <OrderNotFound />;
  }

  const shortId = order.id.slice(-6);
  const store = order.store;

  const now = new Date();
  const eta = order.estimatedReadyAt ?? null;

  const isTerminal = order.status === "COMPLETED" || order.status === "CANCELLED";

  // ✅ Code visibility rules:
  // - COLLECTION: show at READY_FOR_COLLECTION and later (incl COMPLETED)
  // - DELIVERY: show at OUT_FOR_DELIVERY and later (incl COMPLETED)
  const isInternalPickupCode = typeof order.pickupCode === "string" && order.pickupCode.startsWith("MANUAL-");

  let showCode =
    (order.fulfilmentType === "COLLECTION" &&
      (order.status === "READY_FOR_COLLECTION" || order.status === "COMPLETED")) ||
    (order.fulfilmentType === "DELIVERY" &&
      (order.status === "OUT_FOR_DELIVERY" || order.status === "COMPLETED"));

  if (isInternalPickupCode) showCode = false;

  // Only show “minutes remaining” if:
  // - we have an ETA
  // - order isn’t terminal
  // - and ETA is in the future-ish
  const minutesRemaining =
    eta && !isTerminal ? minutesDiff(now, eta) : null;

  // Queue position:
  // Don’t include OUT_FOR_DELIVERY in queue (for customers, it’s “left the store”)
  const queueEligibleStatuses: OrderStatus[] = [
    "PENDING",
    "ACCEPTED",
    "IN_PREPARATION",
    "READY_FOR_COLLECTION",
  ];

  const isInQueue =
    order.fulfilmentType === "COLLECTION"
      ? queueEligibleStatuses.includes(order.status as OrderStatus)
      : ["PENDING", "ACCEPTED", "IN_PREPARATION"].includes(order.status);

  let queuePosition: number | null = null;

  if (isInQueue) {
    const activeForQueue: OrderStatus[] =
      order.fulfilmentType === "COLLECTION"
        ? queueEligibleStatuses
        : ["PENDING", "ACCEPTED", "IN_PREPARATION"];

    const ordersAheadCount = await prisma.order.count({
      where: {
        storeId: order.storeId,
        status: { in: activeForQueue as any },
        createdAt: { lt: order.createdAt },
      },
    });

    queuePosition = ordersAheadCount + 1;
  }

  const paymentLabel = humanizePaymentMethod(order.paymentMethod as any);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Header */}
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Order #{shortId}
              </p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                {store.name}
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                {store.area}, {store.city}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={order.status as OrderStatus} />
              <p className="text-[11px] text-slate-500 dark:text-slate-300">
                Placed on {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
              </p>
            </div>
          </div>
        </header>

        {/* ETA + fulfilment info */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Estimated time
              </p>

              {isTerminal ? (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                  {order.status === "COMPLETED"
                    ? `Completed on ${order.completedAt ? formatDate(order.completedAt) : "—"}`
                    : "This order was cancelled."}
                </p>
              ) : eta ? (
                <>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    Ready around {formatTime(eta)}
                  </p>
                  {minutesRemaining !== null && (
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      {minutesRemaining > 0
                        ? `${minutesRemaining} min remaining (estimate)`
                        : "Should be ready shortly"}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  The store will update your order status soon.
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-950/50">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-100">
                  {order.fulfilmentType === "COLLECTION" ? "Collection order" : "Delivery order"}
                </p>

                {order.fulfilmentType === "COLLECTION" ? (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                    When the status becomes <strong>Ready for collection</strong>, use your{" "}
                    <strong>pickup code</strong> at the store.
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                    When the status becomes <strong>Out for delivery</strong>, your{" "}
                    <strong>delivery code</strong> will show here.
                  </p>
                )}
              </div>

              {isInQueue && queuePosition !== null && (
                <div className="rounded-md bg-slate-900/5 px-2 py-1.5 text-[11px] text-slate-700 dark:bg-slate-100/5 dark:text-slate-200">
                  <p className="font-medium">
                    You&apos;re <span className="font-semibold">#{queuePosition}</span> in the queue.
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    Based on active orders created before yours.
                  </p>
                </div>
              )}

              {order.fulfilmentType === "DELIVERY" && order.status === "OUT_FOR_DELIVERY" && (
                <div className="rounded-md bg-cyan-50 px-2 py-1.5 text-[11px] text-cyan-800 ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-200 dark:ring-cyan-900/50">
                  Your order has left the store and is on the way.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pickup / delivery code */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {order.fulfilmentType === "COLLECTION" ? "Pickup code" : "Delivery code"}
          </p>

          {showCode ? (
            <div className="mt-2">
              <p className="text-sm text-slate-600 dark:text-slate-200">
                Give this code to the{" "}
                {order.fulfilmentType === "COLLECTION" ? "store" : "driver"} to confirm your order:
              </p>

              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-2xl font-mono font-semibold tracking-[0.2em] text-slate-900 dark:text-slate-50">
                  {order.pickupCode}
                </p>
              </div>

              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">
                Don&apos;t share your code publicly.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Your code will appear once the store{" "}
              {order.fulfilmentType === "COLLECTION"
                ? "marks your order as Ready for collection"
                : "marks your order as Out for delivery"}
              .
            </p>
          )}
        </section>

        {/* Order items + totals */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Items</h2>

          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    {item.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.quantity} × {formatPrice(item.unitCents)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {formatPrice(item.totalCents)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300">Payment method</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {paymentLabel}
              </span>
            </div>

            {order.deliveryFeeCents && order.deliveryFeeCents > 0 && (
              <div className="mt-2 flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Delivery fee</span>
                <span>{formatPrice(order.deliveryFeeCents)}</span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between font-semibold text-slate-900 dark:text-slate-50">
              <span>Total</span>
              <span>{formatPrice(order.totalCents)}</span>
            </div>
          </div>
        </section>

        {/* Delivery details */}
        {order.fulfilmentType === "DELIVERY" && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Delivery details
            </h2>

            {order.deliveryAddress && (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Address
                </p>
                <p className="mt-1 whitespace-pre-line">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    {order.deliveryAddress}
                  </a>
                </p>
              </div>
            )}

            {order.note && order.note.trim() !== "" && (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Note to store
                </p>
                <p className="mt-1 whitespace-pre-line">{order.note}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

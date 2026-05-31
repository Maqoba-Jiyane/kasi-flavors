// app/orders/[orderId]/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

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
      description:
        "Track the status and view details for your Kasi Flavors order.",
      url: urlPath,
    },
    twitter: {
      card: "summary",
      title: `${title} | Kasi Flavors`,
      description:
        "Track the status and see details for your Kasi Flavors order.",
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
          slug: true,
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

  const isTerminal =
    order.status === "COMPLETED" || order.status === "CANCELLED";

  // ✅ Code visibility rules:
  // - COLLECTION: show at READY_FOR_COLLECTION and later (incl COMPLETED)
  // - DELIVERY: show at OUT_FOR_DELIVERY and later (incl COMPLETED)
  const isInternalPickupCode =
    typeof order.pickupCode === "string" &&
    order.pickupCode.startsWith("MANUAL-");

  let showCode =
    (order.fulfilmentType === "COLLECTION" &&
      (order.status === "READY_FOR_COLLECTION" ||
        order.status === "COMPLETED")) ||
    (order.fulfilmentType === "DELIVERY" &&
      (order.status === "OUT_FOR_DELIVERY" || order.status === "COMPLETED"));

  if (isInternalPickupCode) showCode = false;

  // Only show “minutes remaining” if:
  // - we have an ETA
  // - order isn’t terminal
  // - and ETA is in the future-ish
  const minutesRemaining = eta && !isTerminal ? minutesDiff(now, eta) : null;

  // Queue position:
  // Don’t include OUT_FOR_DELIVERY in queue (for customers, it’s “left the store”)
  const queueEligibleStatuses: OrderStatus[] = [
    "PENDING",
    "ACCEPTED",
    "IN_PREPARATION",
    "READY_FOR_COLLECTION",
  ];

  let queuePosition: number | null = null;

  const isOnlinePaymentPending =
    order.paymentMethod === "ONLINE_PAYMENT" && order.status === "PENDING";

  const isInQueue =
    !isOnlinePaymentPending &&
    (order.fulfilmentType === "COLLECTION"
      ? queueEligibleStatuses.includes(order.status as OrderStatus)
      : ["PENDING", "ACCEPTED", "IN_PREPARATION"].includes(order.status));

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

  function StatusBadge({ status }: { status: OrderStatus }) {
    const label = status
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const colorClasses: Record<OrderStatus, string> = {
      PENDING: "bg-golden-yellow/25 text-kasi-black ring-golden-yellow/40",
      ACCEPTED: "bg-blue-50 text-blue-700 ring-blue-100",
      IN_PREPARATION:
        "bg-street-orange/10 text-street-orange ring-street-orange/20",
      READY_FOR_COLLECTION:
        "bg-kasi-green/10 text-kasi-green ring-kasi-green/20",
      OUT_FOR_DELIVERY: "bg-cyan-50 text-cyan-700 ring-cyan-100",
      COMPLETED: "bg-black/10 text-black/60 ring-black/10",
      CANCELLED: "bg-red-50 text-red-600 ring-red-200",
    };

    return (
      <span
        className={[
          "inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1",
          colorClasses[status],
        ].join(" ")}
      >
        {label}
      </span>
    );
  }

  function OrderNotFound() {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kasi-cream px-4">
        <div className="max-w-md rounded-4xl border border-black/10 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kasi-black text-3xl">
            🍟
          </div>

          <h1 className="mt-5 text-2xl font-black text-kasi-black">
            Order not found
          </h1>

          <p className="mt-2 text-sm font-medium leading-6 text-black/60">
            We couldn&apos;t find that order. Please check your link or contact
            the store.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-kasi-cream px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Header */}
        <header className="overflow-hidden rounded-4xl border border-black/10 bg-white shadow-sm">
          <div className="h-2 bg-linear-to-r from-kasi-green via-street-orange to-golden-yellow" />

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                  Order #{shortId}
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
                  {store.name}
                </h1>

                <p className="mt-2 text-sm font-bold text-black/55">
                  {store.area}, {store.city}
                </p>

                <p className="mt-3 text-xs font-medium text-black/45">
                  Placed on {formatDate(order.createdAt)} at{" "}
                  {formatTime(order.createdAt)}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                {isOnlinePaymentPending ? (
                  <span className="inline-flex rounded-full bg-golden-yellow/25 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-kasi-black ring-1 ring-golden-yellow/40">
                    Payment pending
                  </span>
                ) : (
                  <StatusBadge status={order.status as OrderStatus} />
                )}

                <span className="rounded-full bg-kasi-cream px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black/50">
                  {order.fulfilmentType === "COLLECTION"
                    ? "Collection"
                    : "Delivery"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {isOnlinePaymentPending && (
          <section className="rounded-4xl border border-golden-yellow/40 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Payment required
            </p>

            <h2 className="mt-2 text-2xl font-black text-kasi-black">
              Complete your online payment
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-black/60">
              This order is waiting for payment confirmation. The store will not
              start preparing it until payment succeeds.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/checkout"
                className="inline-flex rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange"
              >
                Try payment again
              </Link>

              <Link
                href={`/stores/${order.store.slug}`}
                className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-black"
              >
                Back to store
              </Link>
            </div>
          </section>
        )}

        {/* Main status card */}
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Estimated time
            </p>

            {isOnlinePaymentPending ? (
              <div className="mt-3">
                <p className="text-2xl font-black text-kasi-black">
                  Payment pending
                </p>

                <p className="mt-2 text-sm font-medium leading-6 text-black/60">
                  Your order has been created, but it will only be sent to the
                  store after your online payment is confirmed.
                </p>
              </div>
            ) : isTerminal ? (
              <div className="mt-3">
                <p className="text-2xl font-black text-kasi-black">
                  {order.status === "COMPLETED"
                    ? "Order completed"
                    : "Order cancelled"}
                </p>

                <p className="mt-2 text-sm font-medium leading-6 text-black/60">
                  {order.status === "COMPLETED"
                    ? `Completed on ${
                        order.completedAt ? formatDate(order.completedAt) : "—"
                      }.`
                    : "This order was cancelled."}
                </p>
              </div>
            ) : eta ? (
              <div className="mt-3">
                <p className="text-3xl font-black text-kasi-black">
                  Ready around {formatTime(eta)}
                </p>

                {minutesRemaining !== null && (
                  <p className="mt-2 text-sm font-bold text-black/55">
                    {minutesRemaining > 0
                      ? `${minutesRemaining} min remaining estimated`
                      : "Should be ready shortly"}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm font-medium leading-6 text-black/60">
                The store will update your order status soon.
              </p>
            )}

            {isInQueue && queuePosition !== null && (
              <div className="mt-5 rounded-3xl bg-kasi-black p-4 text-white">
                <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                  Queue position
                </p>

                <p className="mt-1 text-2xl font-black">
                  You&apos;re #{queuePosition}
                </p>

                <p className="mt-1 text-xs font-medium leading-5 text-white/60">
                  Based on active orders created before yours.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Order instructions
            </p>

            <h2 className="mt-2 text-xl font-black text-kasi-black">
              {order.fulfilmentType === "COLLECTION"
                ? "Collection order"
                : "Delivery order"}
            </h2>

            {order.fulfilmentType === "COLLECTION" ? (
              <p className="mt-2 text-sm font-medium leading-6 text-black/60">
                When your order becomes{" "}
                <strong className="text-kasi-black">
                  Ready for collection
                </strong>
                , your pickup code will appear below. Give it to the store when
                you collect.
              </p>
            ) : (
              <p className="mt-2 text-sm font-medium leading-6 text-black/60">
                When your order becomes{" "}
                <strong className="text-kasi-black">Out for delivery</strong>,
                your delivery code will appear below.
              </p>
            )}

            {order.fulfilmentType === "DELIVERY" &&
              order.status === "OUT_FOR_DELIVERY" && (
                <div className="mt-4 rounded-2xl bg-cyan-50 px-4 py-3 text-xs font-bold leading-5 text-cyan-700 ring-1 ring-cyan-100">
                  Your order has left the store and is on the way.
                </div>
              )}
          </div>
        </section>

        {/* Pickup / delivery code */}
        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                {order.fulfilmentType === "COLLECTION"
                  ? "Pickup code"
                  : "Delivery code"}
              </p>

              <h2 className="mt-1 text-xl font-black text-kasi-black">
                {isOnlinePaymentPending
                  ? "Waiting for payment"
                  : showCode
                    ? "Use this code at collection"
                    : "Code not ready yet"}
              </h2>
            </div>

            {showCode && (
              <div className="rounded-3xl bg-kasi-black px-6 py-4 text-center text-white">
                <p className="font-mono text-3xl font-black tracking-[0.24em]">
                  {order.pickupCode}
                </p>
              </div>
            )}
          </div>

          {showCode ? (
            <p className="mt-4 text-sm font-medium leading-6 text-black/60">
              Give this code to the{" "}
              {order.fulfilmentType === "COLLECTION" ? "store" : "driver"} to
              confirm your order. Don&apos;t share your code publicly.
            </p>
          ) : isOnlinePaymentPending ? (
            <p className="mt-4 text-sm font-medium leading-6 text-black/60">
              Your pickup code will only become available after payment succeeds
              and the store prepares your order.
            </p>
          ) : (
            <p className="mt-4 text-sm font-medium leading-6 text-black/60">
              Your code will appear once the store{" "}
              {order.fulfilmentType === "COLLECTION"
                ? "marks your order as Ready for collection"
                : "marks your order as Out for delivery"}
              .
            </p>
          )}
        </section>

        {/* Order items + totals */}
        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Order summary
              </p>

              <h2 className="mt-1 text-2xl font-black text-kasi-black">
                Items
              </h2>
            </div>

            <p className="text-xs font-black uppercase tracking-wide text-black/45">
              {order.items.length} item{order.items.length === 1 ? "" : "s"}
            </p>
          </div>

          <ul className="mt-4 divide-y divide-black/10">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-black text-kasi-black">{item.name}</p>

                  <p className="mt-1 text-xs font-medium text-black/50">
                    {item.quantity} × {formatPrice(item.unitCents)}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-black text-kasi-black">
                  {formatPrice(item.totalCents)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-3xl bg-kasi-cream p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-black/60">Payment method</span>
              <span
                className={[
                  "font-black",
                  isOnlinePaymentPending
                    ? "text-street-orange"
                    : "text-kasi-black",
                ].join(" ")}
              >
                {isOnlinePaymentPending
                  ? "Online payment pending"
                  : paymentLabel}
              </span>
            </div>

            {order.deliveryFeeCents && order.deliveryFeeCents > 0 && (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="font-bold text-black/60">Delivery fee</span>
                <span className="font-black text-kasi-black">
                  {formatPrice(order.deliveryFeeCents)}
                </span>
              </div>
            )}

            <div className="mt-3 border-t border-black/10 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-black text-kasi-black">
                  Total
                </span>
                <span className="text-2xl font-black text-kasi-green">
                  {formatPrice(order.totalCents)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Delivery details */}
        {order.fulfilmentType === "DELIVERY" && (
          <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Delivery details
            </p>

            <h2 className="mt-1 text-2xl font-black text-kasi-black">
              Address and note
            </h2>

            {order.deliveryAddress && (
              <div className="mt-4 rounded-3xl bg-kasi-cream p-4">
                <p className="text-xs font-black uppercase tracking-wide text-black/45">
                  Address
                </p>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    order.deliveryAddress,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block whitespace-pre-line text-sm font-bold leading-6 text-kasi-green underline-offset-4 hover:underline"
                >
                  {order.deliveryAddress}
                </a>
              </div>
            )}

            {order.note && order.note.trim() !== "" && (
              <div className="mt-4 rounded-3xl bg-kasi-cream p-4">
                <p className="text-xs font-black uppercase tracking-wide text-black/45">
                  Note to store
                </p>

                <p className="mt-1 whitespace-pre-line text-sm font-medium leading-6 text-black/65">
                  {order.note}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

// app/orders/[orderId]/page.tsx
import { prisma } from "@/lib/prisma";

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

// Simple status pill for customers
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

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: true,
      items: true,
    },
  });

  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Order not found
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            We couldn&apos;t find that order. Please check your link or contact
            the store.
          </p>
        </div>
      </main>
    );
  }

  const shortId = order.id.slice(-6);
  const store = order.store;
  const now = new Date();
  const eta = order.estimatedReadyAt ?? null;

  const showCode =
    order.status === "READY_FOR_COLLECTION" ||
    order.status === "OUT_FOR_DELIVERY" ||
    order.status === "COMPLETED";

  const minutesRemaining =
    eta && order.status !== "COMPLETED" ? minutesDiff(now, eta) : null;

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
                Placed on {formatDate(order.createdAt)} at{" "}
                {formatTime(order.createdAt)}
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
              {eta ? (
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

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-950/50">
              <p className="font-medium text-slate-700 dark:text-slate-100">
                {order.fulfilmentType === "COLLECTION"
                  ? "Collection order"
                  : "Delivery order"}
              </p>
              {order.fulfilmentType === "COLLECTION" ? (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                  You&apos;ll collect your food at the store. When the status
                  changes to <strong>Ready for collection</strong>, you&apos;ll
                  use your pickup code.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                  A driver will deliver your order. When they arrive, they will
                  ask for your delivery code.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Pickup / delivery code */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {order.fulfilmentType === "COLLECTION"
              ? "Pickup code"
              : "Delivery code"}
          </p>

          {showCode ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-200">
                  Give this code to the{" "}
                  {order.fulfilmentType === "COLLECTION" ? "store" : "driver"}{" "}
                  to confirm your order:
                </p>
                <p className="mt-2 text-2xl font-mono font-semibold tracking-[0.2em] text-slate-900 dark:text-slate-50">
                  {order.pickupCode}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Your code will be available once the store has{" "}
              {order.fulfilmentType === "COLLECTION"
                ? "finished preparing your order"
                : "sent your order out for delivery"}
              .
            </p>
          )}
        </section>

        {/* Order items + totals */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Items
          </h2>

          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2"
              >
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
              <span className="text-slate-600 dark:text-slate-300">
                Payment method
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                Cash on delivery
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between font-semibold text-slate-900 dark:text-slate-50">
              <span>Total</span>
              <span>{formatPrice(order.totalCents)}</span>
            </div>
          </div>
        </section>

        {/* Delivery address / note (if delivery) */}
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
                  {order.deliveryAddress}
                </p>
              </div>
            )}
            {order.note && (
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

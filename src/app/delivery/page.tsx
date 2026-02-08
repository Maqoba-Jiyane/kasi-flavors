// app/delivery/page.tsx
"use client";
import { completeDelivery } from "@/app/(dashboard)/owner/store/orders/actions";
import { ChevronDown } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

// export const metadata: Metadata = {
//   title: "Courier Deliveries",
// };

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

function minutesDiff(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

export default function DeliveryPage() {
  // Client-side data fetching
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const activeOrders = orders.filter(
    (order) => order.status !== "COMPLETED" && order.status !== "CANCELLED",
  );

  React.useEffect(() => {
    async function fetchOrders() {
      try {
        // We'll need to create an API route for this
        const response = await fetch("/api/delivery/orders");
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/sign-in?redirectUrl=/delivery";
            return;
          }
          throw new Error("Failed to fetch orders");
        }
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Loading deliveries...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Error
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            No active deliveries
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            No delivery orders are currently assigned to you.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header */}
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Deliveries
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Active orders · {activeOrders.length}{" "}
            {activeOrders.length === 1 ? "delivery" : "deliveries"}
          </p>
        </header>

        {/* Orders List */}
        <div className="space-y-3">
          {orders.map((order) => (
            <DeliveryOrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </main>
  );
}

function DeliveryOrderCard({ order }: { order: any }) {
  "use client";

  const shortId = order.id.slice(-6);
  const now = new Date();
  const eta = order.estimatedReadyAt ? new Date(order.estimatedReadyAt) : null;
  const minutesRemaining = eta ? minutesDiff(now, eta) : null;
  const isCOD = order.paymentMethod === "CASH_ON_DELIVERY";
  const [cashConfirmed, setCashConfirmed] = useState(false);

  // default behavior: open if active / needs action, collapsed if completed
  const defaultOpen = useMemo(
    () => order.status !== "COMPLETED",
    [order.status],
  );
  const [open, setOpen] = useState(defaultOpen);

  const handleComplete = useCallback(async () => {
    const codeInput = document.querySelector(
      `input[name="code"][data-order-id="${order.id}"]`,
    ) as HTMLInputElement;

    if (!codeInput || !codeInput.value.trim()) {
      alert("Please enter the delivery code");
      return;
    }

    const formData = new FormData();
    formData.append("orderId", order.id);
    formData.append("code", codeInput.value.trim());

    try {
      const result = await completeDelivery(formData);
      if (!result?.success) {
        alert(result?.error || "Failed to complete delivery");
        return;
      }
      alert("Delivery completed successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Complete delivery failed:", err);
      alert("Server error. Please try again.");
    }
  }, [order.id]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header (click to expand/collapse) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Order #{shortId}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {order.customerName || "Anonymous Customer"}
              </h3>
              {order.customerPhone && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {order.customerPhone}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform dark:text-slate-300 ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      {open && (
        <div className="space-y-3 p-4">
          {/* Status message */}
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-200">
              {order.status === "ACCEPTED"
                ? "Order accepted and waiting to be prepared."
                : order.status === "IN_PREPARATION"
                  ? "Order is being prepared."
                  : order.status === "READY_FOR_COLLECTION"
                    ? "Order is ready for pickup."
                    : order.status === "COMPLETED"
                      ? "Delivery completed."
                      : "Order is out for delivery."}
            </p>
          </div>

          {/* ETA */}
          {eta && order.status !== "COMPLETED" && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                ETA
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {formatTime(eta)}
                {minutesRemaining !== null && minutesRemaining > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-600 dark:text-slate-300">
                    ({minutesRemaining} min)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Complete Delivery Form - only when out for delivery */}
          {order.status === "OUT_FOR_DELIVERY" && (
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Complete delivery
              </p>

              {isCOD ? (
                <div className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <div className="font-semibold">
                    Collect cash: {formatPrice(order.totalCents)}
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={cashConfirmed}
                      onChange={(e) => setCashConfirmed(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    I have collected the cash amount above.
                  </label>
                </div>
              ) : (
                <p className="mt-2 text-xs text-blue-800 dark:text-blue-200">
                  No cash required (paid online).
                </p>
              )}

              <div className="mt-2 flex gap-2">
                <input
                  name="code"
                  data-order-id={order.id}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="Enter code"
                  required
                  className="flex-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-sm text-blue-900 placeholder-blue-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100 dark:placeholder-blue-400"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  disabled={isCOD && !cashConfirmed}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleComplete();
                  }}
                  className={`rounded-md px-3 py-1 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isCOD && !cashConfirmed ? "bg-blue-300 cursor-not-allowed dark:bg-blue-800/40" : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"}`}
                >
                  Complete
                </button>
              </div>
            </div>
          )}

          {/* Delivery Address / Coordinates - clickable map link */}
          {(order.deliveryAddress || (order.deliveryLat != null && order.deliveryLng != null)) && order.status !== "COMPLETED" && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Delivery address
              </p>

              {order.deliveryLat != null && order.deliveryLng != null ? (
                (() => {
                  const lat = Number(order.deliveryLat);
                  const lng = Number(order.deliveryLng);
                  const label = (!Number.isNaN(lat) && !Number.isNaN(lng)) ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : `${order.deliveryLat}, ${order.deliveryLng}`;
                  const href = `https://maps.google.com/?q=${encodeURIComponent(`${lat},${lng}`)}`;

                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 block rounded-lg bg-emerald-50 p-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50 break-words"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {label} →
                    </a>
                  );
                })()
              ) : (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    order.deliveryAddress,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 block rounded-lg bg-emerald-50 p-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50 break-words"
                  onClick={(e) => e.stopPropagation()}
                >
                  {order.deliveryAddress} →
                </a>
              )}
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Items ({order.items.length})
            </p>
            <ul className="mt-1.5 space-y-1">
              {order.items.map((item: any) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                >
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">
                    {formatPrice(item.totalCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Total */}
          <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Total
              </span>
              <span
                className={`font-semibold ${"text-slate-900 dark:text-slate-50"}`}
              >
                {formatPrice(order.totalCents)}
              </span>
            </div>
          </div>

          {/* Optional: collapse control at bottom */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Collapse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide";

  const colorClasses: Record<string, string> = {
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

  const label = status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={`${base} ${colorClasses[status] || colorClasses.PENDING}`}>
      {label}
    </span>
  );
}

function PaymentPill({
  paymentMethod,
  totalCents,
}: {
  paymentMethod: string;
  totalCents: number;
}) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1";

  if (paymentMethod === "CASH_ON_DELIVERY") {
    return (
      <span
        className={`${base} bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60`}
        title="Collect cash from customer on delivery"
      >
        Collect Cash · {formatPrice(totalCents)}
      </span>
    );
  }

  if (paymentMethod === "ONLINE_PAYMENT") {
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60`}
        title="Customer already paid online"
      >
        Paid Online
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700`}
    >
      Payment Unknown
    </span>
  );
}

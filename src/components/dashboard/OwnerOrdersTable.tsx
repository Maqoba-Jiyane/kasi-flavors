"use client";

import React, { useCallback, useState, useTransition } from "react";
import { OrderStatus } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";
import {
  updateOrderStatus,
  confirmOrderWithCode,
} from "@/app/(dashboard)/owner/store/orders/actions";
import toast from "react-hot-toast";

type OwnerOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
};

type OwnerOrderRow = {
  id: string;
  shortId: string;
  createdAt: Date;
  customerName: string | null;
  totalCents: number;
  status: OrderStatus;
  fulfilmentType: "COLLECTION" | "DELIVERY";
  estimatedReadyAt?: Date | null;
  note?: string | null;
  items: OwnerOrderItem[];
};

interface OwnerOrdersTableProps {
  orders: OwnerOrderRow[];
}

function formatPrice(priceCents: number) {
  return `R ${(priceCents / 100).toFixed(2)}`;
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
  });
}

function humanizeStatus(status: OrderStatus) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Return ONLY valid next statuses for the given current state.
 * This prevents jumping around and matches real kitchen flow.
 */
function allowedNextStatuses(
  current: OrderStatus,
  fulfilmentType: "COLLECTION" | "DELIVERY",
): OrderStatus[] {
  // Linear flow for each fulfilment type
  const flow: OrderStatus[] =
    fulfilmentType === "COLLECTION"
      ? ["PENDING", "ACCEPTED", "IN_PREPARATION", "READY_FOR_COLLECTION", "COMPLETED"]
      : ["PENDING", "ACCEPTED", "IN_PREPARATION", "READY_FOR_COLLECTION", "OUT_FOR_DELIVERY", "COMPLETED"];

  // If already terminal, no further actions
  if (current === "COMPLETED" || current === "CANCELLED") return [];

  const idx = flow.indexOf(current);

  // If current is not in the flow (edge cases), allow a safe subset
  const nextLinear =
    idx >= 0 && idx < flow.length - 1 ? [flow[idx + 1]] : [];

  // Always allow cancel unless terminal
  return [...nextLinear, "CANCELLED"];
}

async function handleStatusUpdate(formData: FormData) {
  try {
    const res = await updateOrderStatus(formData);

    if (!res?.success) {
      toast.error(res?.error || "Failed to update status");
      return;
    }

    toast.success("Status updated!");
  } catch (err) {
    console.error("updateOrderStatus failed:", err);
    toast.error("Server error. Please try again.");
  }
}

export function OwnerOrdersTable({ orders }: OwnerOrdersTableProps) {
  const hasOrders = orders.length > 0;

  return (
    <div className="space-y-4">
      {/* MOBILE: stacked cards */}
      <div className="space-y-3 md:hidden">
        {!hasOrders && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-300">
            No orders to show for the current filters.
          </p>
        )}

        {orders.map((order) => {
          const highlight =
            order.status === "READY_FOR_COLLECTION" ||
            order.status === "OUT_FOR_DELIVERY";

          const needsPickupCode =
            order.fulfilmentType === "COLLECTION" &&
            order.status === "READY_FOR_COLLECTION";

          const options = allowedNextStatuses(order.status, order.fulfilmentType);
          const hasActions = options.length > 0;

          return (
            <div
              key={order.id}
              className={[
                "rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-900",
                highlight
                  ? "border-emerald-300/70 dark:border-emerald-500/60"
                  : "border-slate-200 dark:border-slate-800",
              ].join(" ")}
            >
              {/* Header row: ref + status */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-50">
                    #{order.shortId}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
                    {order.customerName || "Walk-in customer"}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {/* Expandable details */}
              <details className="group mt-3">
                <summary className="flex cursor-pointer items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>View details</span>
                  <svg
                    className="h-4 w-4 transition-transform duration-200 group-open:rotate-180"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>

                <div className="mt-3 space-y-3 text-xs text-slate-700 dark:text-slate-200">
                  {/* Items */}
                  <div>
                    <p className="mb-1 font-semibold">Items</p>
                    <ul className="space-y-1">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>
                            {item.quantity}× {item.name}
                          </span>
                          <span>{formatPrice(item.totalCents)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      Total
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {formatPrice(order.totalCents)}
                    </span>
                  </div>

                  {/* Fulfilment + ETA */}
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 font-medium uppercase tracking-wide dark:bg-slate-800">
                      {order.fulfilmentType === "COLLECTION"
                        ? "Collection"
                        : "Delivery"}
                    </span>
                    {order.estimatedReadyAt && (
                      <span>ETA: {formatTime(order.estimatedReadyAt)}</span>
                    )}
                  </div>

                  {/* Note */}
                  {order.note && order.note.trim() !== "" && (
                    <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
                      <p className="font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Notes / sauces / spice
                      </p>
                      <p className="mt-1 whitespace-pre-line">{order.note}</p>
                    </div>
                  )}

                  {/* Status update + Confirm code */}
                  <div className="space-y-2">
                    {/* Status select (only if there are valid actions) */}
                    {hasActions ? (
                      <MobileStatusActions order={order} options={options} />
                    ) : (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        No actions available for this order.
                      </p>
                    )}

                    {/* Confirm with code (only at the correct stage) */}
                    {(needsPickupCode ) && (
                      <form
                        action={confirmOrderWithCode}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <input type="hidden" name="orderId" value={order.id} />
                        <input
                          name="code"
                          maxLength={6}
                          inputMode="numeric"
                          placeholder={needsPickupCode ? "Pickup code" : "Delivery code"}
                          className="w-full max-w-40 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                          Confirm
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </details>
            </div>
          );
        })}
      </div>

      {/* DESKTOP: table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-950/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Fulfilment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  ETA
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!hasOrders && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-300"
                  >
                    No orders to show for the current filters.
                  </td>
                </tr>
              )}

              {orders.map((order) => {
                const highlight =
                  order.status === "READY_FOR_COLLECTION" ||
                  order.status === "OUT_FOR_DELIVERY";

                const needsPickupCode =
                  order.fulfilmentType === "COLLECTION" &&
                  order.status === "READY_FOR_COLLECTION";

                const options = allowedNextStatuses(order.status, order.fulfilmentType);
                const hasActions = options.length > 0;

                return (
                  <tr
                    key={order.id}
                    className={[
                      "hover:bg-slate-50/60 dark:hover:bg-slate-800/60",
                      highlight ? "bg-emerald-50/40 dark:bg-emerald-950/10" : "",
                    ].join(" ")}
                  >
                    {/* Order ID + date */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-50">
                          #{order.shortId}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <span className="text-sm text-slate-800 dark:text-slate-50">
                        {order.customerName || "Walk-in customer"}
                      </span>
                    </td>

                    {/* Items summary (count) */}
                    <td className="px-4 py-3 align-middle text-xs text-slate-600 dark:text-slate-300">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"}
                    </td>

                    {/* Total */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <span className="font-semibold text-slate-900 dark:text-slate-50">
                        {formatPrice(order.totalCents)}
                      </span>
                    </td>

                    {/* Fulfilment */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {order.fulfilmentType === "COLLECTION" ? "Collection" : "Delivery"}
                      </span>
                    </td>

                    {/* ETA */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      {order.estimatedReadyAt ? (
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {formatTime(order.estimatedReadyAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                      {hasActions ? (
                        <DesktopStatusActions order={order} options={options} />
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          —
                        </span>
                      )}

                      {(needsPickupCode ) && (
                        <form
                          action={confirmOrderWithCode}
                          className="mt-2 flex items-center justify-end gap-2"
                        >
                          <input type="hidden" name="orderId" value={order.id} />
                          <input
                            name="code"
                            maxLength={6}
                            inputMode="numeric"
                            placeholder={needsPickupCode ? "Pickup code" : "Delivery code"}
                            className="w-28 rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                          >
                            Confirm
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MobileStatusActions({
  order,
  options,
}: {
  order: OwnerOrderRow;
  options: OrderStatus[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<OrderStatus>(options[0] ?? "CANCELLED");

  // Keep selected in sync if options change due to rerender/filter
  React.useEffect(() => {
    if (options.length > 0 && !options.includes(selected)) {
      setSelected(options[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.join("|")]);

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isPending) return;

      const fd = new FormData();
      fd.append("orderId", order.id);
      fd.append("status", selected);

      startTransition(async () => {
        await handleStatusUpdate(fd);
      });
    },
    [isPending, order.id, selected],
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center justify-between gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as OrderStatus)}
        className="w-full max-w-[200px] rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        disabled={isPending}
        aria-label="Select next status"
      >
        {options.map((status) => (
          <option key={status} value={status}>
            {humanizeStatus(status)}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}function DesktopStatusActions({
  order,
  options,
}: {
  order: OwnerOrderRow;
  options: OrderStatus[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<OrderStatus>(options[0] ?? "CANCELLED");

  // 🔒 Guard: delivery orders that are already out should not be editable by store
  const hideControls =
    order.fulfilmentType === "DELIVERY" && order.status === "OUT_FOR_DELIVERY";

  React.useEffect(() => {
    if (hideControls) return; // nothing to sync if hidden
    if (options.length > 0 && !options.includes(selected)) {
      setSelected(options[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.join("|"), hideControls]);

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isPending || hideControls) return;

      const fd = new FormData();
      fd.append("orderId", order.id);
      fd.append("status", selected);

      startTransition(async () => {
        await handleStatusUpdate(fd);
      });
    },
    [isPending, hideControls, order.id, selected],
  );

  if (hideControls) {
    return (
      <span className="text-[11px] text-slate-400 dark:text-slate-500">
        With courier
      </span>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center justify-end gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as OrderStatus)}
        className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        disabled={isPending}
        aria-label="Select next status"
      >
        {options.map((status) => (
          <option key={status} value={status}>
            {humanizeStatus(status)}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

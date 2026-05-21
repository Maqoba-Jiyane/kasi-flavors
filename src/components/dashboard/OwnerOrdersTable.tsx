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

function allowedNextStatuses(current: OrderStatus): OrderStatus[] {
  const flow: OrderStatus[] = [
    "PENDING",
    "ACCEPTED",
    "IN_PREPARATION",
    "READY_FOR_COLLECTION",
    "COMPLETED",
  ];

  if (current === "COMPLETED" || current === "CANCELLED") return [];

  const idx = flow.indexOf(current);
  const nextLinear = idx >= 0 && idx < flow.length - 1 ? [flow[idx + 1]] : [];

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
      <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Collection order management
            </p>

            <h2 className="text-2xl font-black text-kasi-black">Orders list</h2>
          </div>

          <p className="text-xs font-black uppercase tracking-wide text-black/45">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {!hasOrders && (
          <div className="rounded-4xl border border-black/10 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-bold text-black/55">
              No orders to show for the current filters.
            </p>
          </div>
        )}

        {orders.map((order) => {
          const highlight = order.status === "READY_FOR_COLLECTION";
          const needsPickupCode = order.status === "READY_FOR_COLLECTION";
          const options = allowedNextStatuses(order.status);
          const hasActions = options.length > 0;

          return (
            <div
              key={order.id}
              className={[
                "rounded-[1.75rem] border bg-white p-4 shadow-sm",
                highlight ? "border-kasi-green" : "border-black/10",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-black text-kasi-black">
                    #{order.shortId}
                  </p>

                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-black/45">
                    {formatDate(order.createdAt)} ·{" "}
                    {formatTime(order.createdAt)}
                  </p>

                  <p className="mt-2 text-sm font-black text-kasi-black">
                    {order.customerName || "Walk-in customer"}
                  </p>
                </div>

                <StatusBadge status={order.status} />
              </div>

              <details className="group mt-4">
                <summary className="flex cursor-pointer items-center justify-between rounded-2xl bg-kasi-cream px-4 py-3 text-xs font-black uppercase tracking-wide text-kasi-black">
                  <span>View details</span>
                  <span className="transition-transform group-open:rotate-180">
                    ↓
                  </span>
                </summary>

                <div className="mt-4 space-y-4 text-sm text-kasi-black">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/45">
                      Items
                    </p>

                    <ul className="space-y-2">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between gap-3 rounded-2xl bg-kasi-cream p-3"
                        >
                          <span className="font-semibold">
                            {item.quantity}× {item.name}
                          </span>

                          <span className="font-black">
                            {formatPrice(item.totalCents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between border-t border-black/10 pt-3">
                    <span className="text-sm font-bold text-black/55">
                      Total
                    </span>

                    <span className="rounded-full bg-golden-yellow px-3 py-1.5 text-sm font-black text-kasi-black">
                      {formatPrice(order.totalCents)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide">
                    <span className="inline-flex rounded-full bg-black/10 px-3 py-1 text-black/60">
                      Collection
                    </span>

                    {order.estimatedReadyAt && (
                      <span className="inline-flex rounded-full bg-kasi-green/10 px-3 py-1 text-kasi-green">
                        ETA: {formatTime(order.estimatedReadyAt)}
                      </span>
                    )}
                  </div>

                  {order.note && order.note.trim() !== "" && (
                    <div className="rounded-2xl bg-kasi-cream p-3 text-sm font-medium text-black/70">
                      <p className="text-xs font-black uppercase tracking-wide text-black/45">
                        Notes / sauces / spice
                      </p>

                      <p className="mt-1 whitespace-pre-line">{order.note}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {hasActions ? (
                      <MobileStatusActions order={order} options={options} />
                    ) : (
                      <p className="text-xs font-bold text-black/45">
                        No actions available for this order.
                      </p>
                    )}

                    {needsPickupCode && (
                      <form
                        action={confirmOrderWithCode}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="orderId" value={order.id} />

                        <input
                          name="code"
                          maxLength={6}
                          inputMode="numeric"
                          placeholder="Pickup code"
                          className="min-w-0 flex-1 rounded-full border-2 border-black/10 bg-white px-3 py-2 text-xs font-semibold text-kasi-black outline-none focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10"
                        />

                        <button
                          type="submit"
                          className="rounded-full bg-kasi-green px-4 py-2 text-xs font-black text-white transition hover:bg-street-orange"
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

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-4xl border border-black/10 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/10 text-sm">
            <thead className="bg-kasi-black text-white">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wide text-white/70">
                  Order
                </th>
                <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wide text-white/70">
                  Customer
                </th>
                <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wide text-white/70">
                  Items
                </th>
                <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wide text-white/70">
                  Total
                </th>
                <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wide text-white/70">
                  ETA
                </th>
                <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wide text-white/70">
                  Status
                </th>
                <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-wide text-white/70">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/10">
              {!hasOrders && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm font-bold text-black/55"
                  >
                    No orders to show for the current filters.
                  </td>
                </tr>
              )}

              {orders.map((order) => {
                const highlight = order.status === "READY_FOR_COLLECTION";
                const needsPickupCode = order.status === "READY_FOR_COLLECTION";
                const options = allowedNextStatuses(order.status);
                const hasActions = options.length > 0;

                return (
                  <tr
                    key={order.id}
                    className={[
                      "transition hover:bg-kasi-cream",
                      highlight ? "bg-kasi-green/5" : "",
                    ].join(" ")}
                  >
                    <td className="whitespace-nowrap px-4 py-4 align-middle">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-black text-kasi-black">
                          #{order.shortId}
                        </span>

                        <span className="text-xs font-medium text-black/45">
                          {formatDate(order.createdAt)} ·{" "}
                          {formatTime(order.createdAt)}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 align-middle">
                      <span className="text-sm font-bold text-kasi-black">
                        {order.customerName || "Walk-in customer"}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-middle text-xs font-bold text-black/55">
                      {order.items.length} item
                      {order.items.length === 1 ? "" : "s"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 align-middle">
                      <span className="rounded-full bg-golden-yellow px-3 py-1.5 text-xs font-black text-kasi-black">
                        {formatPrice(order.totalCents)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 align-middle">
                      {order.estimatedReadyAt ? (
                        <span className="text-xs font-black text-kasi-green">
                          {formatTime(order.estimatedReadyAt)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-black/35">
                          —
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 align-middle">
                      <StatusBadge status={order.status} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right align-middle">
                      {hasActions ? (
                        <DesktopStatusActions order={order} options={options} />
                      ) : (
                        <span className="text-xs font-bold text-black/35">
                          —
                        </span>
                      )}

                      {needsPickupCode && (
                        <form
                          action={confirmOrderWithCode}
                          className="mt-2 flex items-center justify-end gap-2"
                        >
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />

                          <input
                            name="code"
                            maxLength={6}
                            inputMode="numeric"
                            placeholder="Pickup code"
                            className="w-28 rounded-full border-2 border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-kasi-black outline-none focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10"
                          />

                          <button
                            type="submit"
                            className="rounded-full bg-kasi-green px-3 py-1.5 text-xs font-black text-white transition hover:bg-street-orange"
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
  const [selected, setSelected] = useState<OrderStatus | "">(
    options[0] ?? ""
  );

  const safeSelected: OrderStatus | "" =
    selected && options.includes(selected) ? selected : options[0] ?? "";

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (isPending || !safeSelected) return;

      const fd = new FormData();
      fd.append("orderId", order.id);
      fd.append("status", safeSelected);

      startTransition(async () => {
        await handleStatusUpdate(fd);
      });
    },
    [isPending, order.id, safeSelected]
  );

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-center justify-between gap-2"
    >
      <select
        value={safeSelected}
        onChange={(e) => setSelected(e.target.value as OrderStatus)}
        className="min-w-0 flex-1 rounded-full border-2 border-black/10 bg-white px-3 py-2 text-xs font-semibold text-kasi-black outline-none focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10 disabled:opacity-60"
        disabled={isPending || options.length === 0}
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
        disabled={isPending || !safeSelected}
        className="rounded-full bg-kasi-black px-4 py-2 text-xs font-black text-white transition hover:bg-street-orange disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

function DesktopStatusActions({
  order,
  options,
}: {
  order: OwnerOrderRow;
  options: OrderStatus[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<OrderStatus | "">(
    options[0] ?? ""
  );

  const safeSelected: OrderStatus | "" =
    selected && options.includes(selected) ? selected : options[0] ?? "";

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (isPending || !safeSelected) return;

      const fd = new FormData();
      fd.append("orderId", order.id);
      fd.append("status", safeSelected);

      startTransition(async () => {
        await handleStatusUpdate(fd);
      });
    },
    [isPending, order.id, safeSelected]
  );

  return (
    <form onSubmit={onSubmit} className="flex items-center justify-end gap-2">
      <select
        value={safeSelected}
        onChange={(e) => setSelected(e.target.value as OrderStatus)}
        className="rounded-full border-2 border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-kasi-black outline-none focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10 disabled:opacity-60"
        disabled={isPending || options.length === 0}
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
        disabled={isPending || !safeSelected}
        className="rounded-full bg-kasi-black px-4 py-1.5 text-xs font-black text-white transition hover:bg-street-orange disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

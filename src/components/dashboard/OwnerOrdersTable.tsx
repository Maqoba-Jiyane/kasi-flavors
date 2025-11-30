"use client";

import { OrderStatus } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";
import {
  updateOrderStatus,
  confirmOrderWithCode,
} from "@/app/(dashboard)/owner/store/orders/actions";

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
  customerName: string;
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

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "ACCEPTED",
  "IN_PREPARATION",
  "READY_FOR_COLLECTION",
  // "OUT_FOR_DELIVERY",
  // "COMPLETED", // 👈 only via code confirm
  "CANCELLED",
];

function formatPrice(priceCents: number) {
  return `R ${(priceCents / 100).toFixed(2)}`;
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
  });
}

export function OwnerOrdersTable({ orders }: OwnerOrdersTableProps) {
  const hasOrders = orders.length > 0;

  return (
    <div className="space-y-4">
      {/* MOBILE: stacked cards */}
      <div className="space-y-3 md:hidden">
        {!hasOrders && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-300">
            No orders yet.
          </p>
        )}

        {orders.map((order) => {
          const isReady =
            order.status === "READY_FOR_COLLECTION" ||
            order.status === "OUT_FOR_DELIVERY";

          return (
            <div
              key={order.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Header row: ref + status */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-50">
                    #{order.shortId}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatDate(order.createdAt)} ·{" "}
                    {formatTime(order.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">
                    {order.customerName}
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
                        <li
                          key={item.id}
                          className="flex justify-between"
                        >
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
                      <span>
                        ETA: {formatTime(order.estimatedReadyAt)}
                      </span>
                    )}
                  </div>

                  {/* Note / sauces */}
                  {order.note && order.note.trim() !== "" && (
                    <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
                      <p className="font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Notes / sauces / spice
                      </p>
                      <p className="mt-1 whitespace-pre-line">
                        {order.note}
                      </p>
                    </div>
                  )}

                  {/* Status update + Confirm code */}
                  <div className="space-y-2">
                    {/* Status select */}
                    <form
                      action={updateOrderStatus}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <input
                        type="hidden"
                        name="orderId"
                        value={order.id}
                      />
                      <select
                        name="status"
                        defaultValue={order.status}
                        className="w-full max-w-[180px] rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status
                              .toLowerCase()
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        Save
                      </button>
                    </form>

                    {/* Confirm with code (only when ready) */}
                    {isReady && (
                      <form
                        action={confirmOrderWithCode}
                        className="flex flex-wrap items-center justify-between gap-2"
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
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block hidden">
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
                    No orders yet.
                  </td>
                </tr>
              )}

              {orders.map((order) => {
                const isReady =
                  order.status === "READY_FOR_COLLECTION" ||
                  order.status === "OUT_FOR_DELIVERY";

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60"
                  >
                    {/* Order ID + date */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-50">
                          #{order.shortId}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDate(order.createdAt)} ·{" "}
                          {formatTime(order.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <span className="text-sm text-slate-800 dark:text-slate-50">
                        {order.customerName}
                      </span>
                    </td>

                    {/* Items summary (count) */}
                    <td className="px-4 py-3 align-middle text-xs text-slate-600 dark:text-slate-300">
                      {order.items.length} item
                      {order.items.length === 1 ? "" : "s"}
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
                        {order.fulfilmentType === "COLLECTION"
                          ? "Collection"
                          : "Delivery"}
                      </span>
                    </td>

                    {/* ETA */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      {order.estimatedReadyAt ? (
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {formatTime(order.estimatedReadyAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          —
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-4 py-3 align-middle">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Actions (status + confirm code) */}
                    <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                      {/* Status update */}
                      <form
                        action={updateOrderStatus}
                        className="flex items-center justify-end gap-2"
                      >
                        <input
                          type="hidden"
                          name="orderId"
                          value={order.id}
                        />
                        <select
                          name="status"
                          defaultValue={order.status}
                          className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status
                                .toLowerCase()
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          Save
                        </button>
                      </form>

                      {/* Confirm with code */}
                      {isReady && (
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

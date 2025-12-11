// app/(dashboard)/admin/stores/[storeId]/page.tsx

import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { notFound } from "next/navigation";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function AdminStoreDetailPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const { storeId } = await params;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      owner: true,
      products: {
        orderBy: { createdAt: "desc" },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
        },
        take: 15,
      },
    },
  });

  if (!store) return notFound();

  const totalProducts = store.products.length;
  const totalOrders = store.orders.length;

  const totalRevenueCents = store.orders.reduce(
    (sum, o) => sum + o.totalCents,
    0
  );

  const completedOrders = store.orders.filter(
    (o) => o.status === "COMPLETED"
  ).length;

  function formatPrice(cents: number) {
    return `R ${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {store.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {store.area}, {store.city}
          </p>
        </div>

        <div className="flex gap-1">
          <Link
            href="/admin/stores"
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            Back to stores
          </Link>

          <Link
            href={`/admin/stores/${storeId}/products`}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            Manage
          </Link>
        </div>
      </div>

      {/* Store Overview */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Store Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard label="Total Products" value={totalProducts} />
          <OverviewCard label="Total Orders" value={totalOrders} />
          <OverviewCard label="Completed Orders" value={completedOrders} />
          <OverviewCard
            label="Total Revenue"
            value={formatPrice(totalRevenueCents)}
          />
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Owned by: <strong>{store.owner.name}</strong> — {store.owner.email}
        </p>
      </section>

      {/* Products */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Products
        </h2>

        {store.products.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No products found.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  <Th>Name</Th>
                  <Th>Price</Th>
                  <Th>Available</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {store.products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  >
                    <Td>{product.name}</Td>
                    <Td>{formatPrice(product.priceCents)}</Td>
                    <Td>
                      <span
                        className={
                          product.isAvailable
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {product.isAvailable ? "Yes" : "No"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Orders */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Recent Orders
        </h2>

        {store.orders.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No orders yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {store.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  >
                    <Td>#{order.id.slice(-6)}</Td>
                    <Td>{order.customerName}</Td>
                    <Td>{formatPrice(order.totalCents)}</Td>
                    <Td>{order.status}</Td>
                    <Td>
                      {formatDistanceToNow(order.createdAt, {
                        addSuffix: true,
                      })}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------
   Small reusable table utilities
--------------------------------*/
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-200">
      {children}
    </td>
  );
}

/* ------------------------------
   Overview card component
--------------------------------*/
function OverviewCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}

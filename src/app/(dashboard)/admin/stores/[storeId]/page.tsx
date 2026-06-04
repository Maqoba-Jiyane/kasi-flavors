// app/(dashboard)/admin/stores/[storeId]/page.tsx

import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import AdminStoreStatusActions from "@/components/admin/AdminStoreStatusActions";
import type { Metadata } from "next";
import AssignStoreOwnerPanel from "@/components/admin/AssignStoreOwnerPanel";

export const metadata: Metadata = {
  title: "Store review",
  description: "Review and manage a Kasi Flavors store in the admin dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

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
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      approvedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      products: {
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
        },
        take: 10,
      },
      _count: {
        select: {
          products: true,
          orders: true,
        },
      },
    },
  });

  if (!store) return notFound();

  const totalRevenueCents = store.orders.reduce(
    (sum, order) => sum + order.totalCents,
    0,
  );

  const completedOrders = store.orders.filter(
    (order) => order.status === "COMPLETED",
  ).length;

  const pendingWarnings = [
    !store.locationVerified ? "Location not verified" : null,
    store._count.products === 0 ? "No products added" : null,
    !store.lat || !store.lng ? "Missing coordinates" : null,
  ].filter(Boolean) as string[];

  return (
    <main className="space-y-5">
      <header className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/admin/stores"
              className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-green hover:text-kasi-green"
            >
              ← Back to stores
            </Link>

            <p className="mt-5 text-xs font-black uppercase tracking-wide text-street-orange">
              Store review
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
              {store.name}
            </h1>

            <p className="mt-2 text-sm font-medium leading-6 text-black/60">
              {store.address}
              {store.area ? `, ${store.area}` : ""}, {store.city}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <StoreStatusBadge status={store.approvalStatus} />

              <span className="rounded-full bg-kasi-cream px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black/55">
                {store.isOpen ? "Open" : "Closed"}
              </span>

              <span className="rounded-full bg-kasi-cream px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black/55">
                Collection
              </span>

              {store.locationVerified ? (
                <span className="rounded-full bg-kasi-green/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-kasi-green">
                  Location verified
                </span>
              ) : (
                <span className="rounded-full bg-golden-yellow/25 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-kasi-black">
                  Location not verified
                </span>
              )}
            </div>
          </div>

          <AdminStoreStatusActions
            storeId={store.id}
            currentStatus={store.approvalStatus}
          />
        </div>

        {pendingWarnings.length > 0 && (
          <div className="mt-5 rounded-3xl border border-golden-yellow/40 bg-golden-yellow/20 p-4">
            <p className="text-sm font-black text-kasi-black">
              Review warnings
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {pendingWarnings.map((warning) => (
                <span
                  key={warning}
                  className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-kasi-black"
                >
                  {warning}
                </span>
              ))}
            </div>
          </div>
        )}

        {store.rejectionReason && (
          <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-600">
            Reason / admin note: {store.rejectionReason}
          </div>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard label="Products" value={store._count.products} />
        <OverviewCard label="Orders" value={store._count.orders} />
        <OverviewCard label="Recent completed" value={completedOrders} />
        <OverviewCard
          label="Recent revenue"
          value={formatMoney(totalRevenueCents)}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Store details
          </p>

          <h2 className="mt-1 text-2xl font-black text-kasi-black">
            Business information
          </h2>

          <div className="mt-5 grid gap-3 text-sm">
            <DetailRow label="Store name" value={store.name} />
            <DetailRow label="Slug" value={store.slug} />
            <DetailRow label="Phone" value={store.phone || "Not provided"} />
            <DetailRow
              label="Prep time"
              value={`${store.avgPrepTimeMinutes} min`}
            />
            <DetailRow
              label="Collection radius"
              value={`${store.collectionRadiusKm} km`}
            />
            <DetailRow
              label="Coordinates"
              value={
                store.lat && store.lng
                  ? `${store.lat.toFixed(5)}, ${store.lng.toFixed(5)}`
                  : "Missing"
              }
            />
            <DetailRow
              label="Created"
              value={formatDistanceToNow(store.createdAt, { addSuffix: true })}
            />
          </div>
        </div>

        <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Owner
          </p>

          <h2 className="mt-1 text-2xl font-black text-kasi-black">
            Account details
          </h2>

          <div className="mt-5 grid gap-3 text-sm">
            <DetailRow label="Name" value={store.owner.name} />
            <DetailRow label="Email" value={store.owner.email} />
            <DetailRow
              label="Phone"
              value={store.owner.phone || "Not provided"}
            />
            <DetailRow label="Role" value={store.owner.role} />

            {store.approvedAt && (
              <DetailRow
                label="Approved"
                value={formatDistanceToNow(store.approvedAt, {
                  addSuffix: true,
                })}
              />
            )}

            {store.approvedBy && (
              <DetailRow
                label="Approved by"
                value={`${store.approvedBy.name} · ${store.approvedBy.email}`}
              />
            )}
          </div>
        </div>

        {store.owner.role === "ADMIN" ? (
          <div className="mt-5 rounded-3xl border border-kasi-green/20 bg-kasi-green/10 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-kasi-green">
              Admin-created store
            </p>

            <p className="mt-1 text-sm font-medium leading-6 text-black/65">
              This store is currently owned by an admin account. You can assign
              it to the real store owner when their account is ready.
            </p>

            <div className="mt-4">
              <AssignStoreOwnerPanel storeId={store.id} />
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-black/10 bg-kasi-cream p-4">
            <p className="text-xs font-black uppercase tracking-wide text-black/45">
              Reassignment locked
            </p>

            <p className="mt-1 text-sm font-medium leading-6 text-black/60">
              This store is already owned by a seller account, so it cannot be
              reassigned from this admin screen.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Menu
            </p>

            <h2 className="mt-1 text-2xl font-black text-kasi-black">
              Products
            </h2>
          </div>

          <Link
            href={`/admin/stores/${store.id}/products`}
            className="inline-flex rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange"
          >
            Manage products →
          </Link>
        </div>

        {store.products.length === 0 ? (
          <p className="mt-4 rounded-3xl bg-kasi-cream p-4 text-sm font-bold text-black/60">
            No products found.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-3xl border border-black/10">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-kasi-black text-white">
                  <tr>
                    <Th>Name</Th>
                    <Th>Base price</Th>
                    <Th>Available</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/10 bg-white">
                  {store.products.map((product) => (
                    <tr key={product.id} className="hover:bg-kasi-cream">
                      <Td>
                        <Link
                          href={`/admin/stores/${store.id}/products/${product.id}`}
                          className="font-black text-kasi-green hover:text-street-orange"
                        >
                          {product.name}
                        </Link>
                      </Td>

                      <Td>{formatMoney(product.priceCents)}</Td>

                      <Td>
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide",
                            product.isAvailable
                              ? "bg-kasi-green/10 text-kasi-green"
                              : "bg-red-50 text-red-600",
                          ].join(" ")}
                        >
                          {product.isAvailable ? "Available" : "Hidden"}
                        </span>
                      </Td>

                      <Td>
                        {formatDistanceToNow(product.createdAt, {
                          addSuffix: true,
                        })}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-street-orange">
          Recent orders
        </p>

        <h2 className="mt-1 text-2xl font-black text-kasi-black">
          Latest activity
        </h2>

        {store.orders.length === 0 ? (
          <p className="mt-4 rounded-3xl bg-kasi-cream p-4 text-sm font-bold text-black/60">
            No orders yet.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-3xl border border-black/10">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-kasi-black text-white">
                  <tr>
                    <Th>Order</Th>
                    <Th>Customer</Th>
                    <Th>Total</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/10 bg-white">
                  {store.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-kasi-cream">
                      <Td>#{order.id.slice(-6)}</Td>
                      <Td>{order.customerName || "Walk-in customer"}</Td>
                      <Td>{formatMoney(order.totalCents)}</Td>
                      <Td>{order.status.replace(/_/g, " ")}</Td>
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
          </div>
        )}
      </section>
    </main>
  );
}

function formatMoney(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

function StoreStatusBadge({ status }: { status: string }) {
  const className =
    status === "APPROVED"
      ? "bg-kasi-green/10 text-kasi-green ring-kasi-green/20"
      : status === "REJECTED"
        ? "bg-red-50 text-red-600 ring-red-200"
        : status === "DEACTIVATED"
          ? "bg-black/10 text-black/60 ring-black/10"
          : "bg-golden-yellow/25 text-kasi-black ring-golden-yellow/40";

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1",
        className,
      ].join(" ")}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-kasi-cream px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-black/45">
        {label}
      </p>
      <p className="mt-1 font-bold text-kasi-black">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-white/70">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 font-bold text-black/70">{children}</td>;
}

function OverviewCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-street-orange">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-kasi-black">{value}</p>
    </div>
  );
}

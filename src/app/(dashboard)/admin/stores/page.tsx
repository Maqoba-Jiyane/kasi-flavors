import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import AdminStoreRow from "@/components/admin/AdminStoreRow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage stores",
  description: "Approve, reject, deactivate, and manage Kasi Flavors stores.",
  robots: {
    index: false,
    follow: false,
  },
};

type SearchParams = {
  status?: string;
};

const VALID_STATUSES = [
  "ALL",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "DEACTIVATED",
] as const;

type StatusFilter = (typeof VALID_STATUSES)[number];

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const sp = await searchParams;

  const status = VALID_STATUSES.includes(sp.status as StatusFilter)
    ? (sp.status as StatusFilter)
    : "ALL";

const rawStores = await prisma.store.findMany({
  where: status === "ALL" ? {} : { approvalStatus: status },
  orderBy: {
    createdAt: "desc",
  },
  include: {
    owner: {
      select: {
        name: true,
        email: true,
      },
    },
    _count: {
      select: {
        products: true,
        orders: true,
      },
    },
  },
});

const stores = rawStores.map((store) => ({
  ...store,
  approvalStatus: store.approvalStatus ?? "PENDING_REVIEW",
}));

const [
  totalCount,
  pendingCount,
  approvedCount,
  rejectedCount,
  deactivatedCount,
] = await Promise.all([
  prisma.store.count(),
  prisma.store.count({ where: { approvalStatus: "PENDING_REVIEW" } }),
  prisma.store.count({ where: { approvalStatus: "APPROVED" } }),
  prisma.store.count({ where: { approvalStatus: "REJECTED" } }),
  prisma.store.count({ where: { approvalStatus: "DEACTIVATED" } }),
]);

const countFor = (statusName: string) => {
  switch (statusName) {
    case "PENDING_REVIEW":
      return pendingCount;
    case "APPROVED":
      return approvedCount;
    case "REJECTED":
      return rejectedCount;
    case "DEACTIVATED":
      return deactivatedCount;
    default:
      return 0;
  }
};

  return (
    <main className="space-y-5">
      <header className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-street-orange">
          Admin stores
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
          Manage stores
        </h1>

        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-black/60">
          Review store submissions, approve verified food spots, reject stores
          that need changes, or deactivate stores that should no longer appear
          publicly.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatusCard
            label="All"
            value={totalCount}
            active={status === "ALL"}
            href="/admin/stores"
          />
          <StatusCard
            label="Pending"
            value={countFor("PENDING_REVIEW")}
            active={status === "PENDING_REVIEW"}
            href="/admin/stores?status=PENDING_REVIEW"
          />
          <StatusCard
            label="Approved"
            value={countFor("APPROVED")}
            active={status === "APPROVED"}
            href="/admin/stores?status=APPROVED"
          />
          <StatusCard
            label="Rejected"
            value={countFor("REJECTED")}
            active={status === "REJECTED"}
            href="/admin/stores?status=REJECTED"
          />
          <StatusCard
            label="Deactivated"
            value={countFor("DEACTIVATED")}
            active={status === "DEACTIVATED"}
            href="/admin/stores?status=DEACTIVATED"
          />
        </div>
      </header>

      <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Store list
            </p>

            <h2 className="mt-1 text-2xl font-black text-kasi-black">
              Review queue
            </h2>
          </div>

          <p className="text-xs font-black uppercase tracking-wide text-black/45">
            {stores.length} store{stores.length === 1 ? "" : "s"} shown
          </p>
        </div>

        {stores.length === 0 ? (
          <div className="rounded-3xl bg-kasi-cream p-6 text-sm font-bold text-black/60">
            No stores found for this filter.
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {stores.map((store) => (
                <AdminStoreRow key={store.id} store={store} variant="card" />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-3xl border border-black/10 md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-kasi-black text-white">
                    <tr>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-wide text-white/70">
                        Store
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-wide text-white/70">
                        Owner
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-wide text-white/70">
                        Location
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-wide text-white/70">
                        Status
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-wide text-white/70">
                        Data
                      </th>
                      <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-wide text-white/70">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-black/10 bg-white">
                    {stores.map((store) => (
                      <AdminStoreRow key={store.id} store={store} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function StatusCard({
  label,
  value,
  active,
  href,
}: {
  label: string;
  value: number;
  active: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      className={[
        "rounded-3xl border p-4 transition",
        active
          ? "border-kasi-green bg-kasi-green text-white"
          : "border-black/10 bg-kasi-cream text-kasi-black hover:border-kasi-green",
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-black uppercase tracking-wide",
          active ? "text-white/70" : "text-black/45",
        ].join(" ")}
      >
        {label}
      </p>

      <p className="mt-1 text-3xl font-black">{value}</p>
    </a>
  );
}
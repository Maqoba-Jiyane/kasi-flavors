"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Store, StoreApprovalStatus } from "@prisma/client";

type AdminStore = Store & {
  owner?: {
    name: string;
    email: string;
  } | null;
  _count: {
    products: number;
    orders: number;
  };
};

type Props = {
  store: AdminStore;
  variant?: "row" | "card";
};

type ActionType = "APPROVED" | "REJECTED" | "DEACTIVATED" | "PENDING_REVIEW";

export default function AdminStoreRow({ store, variant = "row" }: Props) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<ActionType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStoreStatus(status: ActionType) {
    setError(null);

    let reason = "";

    if (status === "REJECTED") {
      reason =
        window.prompt(
          "Why is this store being rejected? This may be shown to the owner.",
        ) || "";

      if (!reason.trim()) {
        setError("Rejection reason is required.");
        return;
      }
    }

    if (status === "DEACTIVATED") {
      reason =
        window.prompt(
          "Why is this store being deactivated? This is useful for admin records.",
        ) || "";
    }

    try {
      setLoadingAction(status);

      const res = await fetch(`/api/admin/stores/${store.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          status,
          reason,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to update store.");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  if (variant === "card") {
    return (
      <article className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              {store.slug}
            </p>

            <h3 className="mt-1 text-lg font-black text-kasi-black">
              {store.name}
            </h3>

            <p className="mt-1 text-xs font-bold text-black/50">
              {store.area ? `${store.area}, ` : ""}
              {store.city}
            </p>

            <p className="mt-1 text-xs font-medium text-black/45">
              Owner: {store.owner?.name || "Unknown"} ·{" "}
              {store.owner?.email || "No email"}
            </p>
          </div>

          <StoreStatusBadge status={store.approvalStatus} />
        </div>

        <StoreWarnings store={store} />

        <div className="mt-4 flex flex-wrap gap-2">
          <AdminActions
            status={store.approvalStatus}
            loadingAction={loadingAction}
            onUpdate={updateStoreStatus}
          />

          <Link
            href={`/admin/stores/${store.id}`}
            className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-green hover:text-kasi-green"
          >
            Review
          </Link>
        </div>

        {error && (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
            {error}
          </p>
        )}
      </article>
    );
  }

  return (
    <tr className="transition hover:bg-kasi-cream">
      <td className="px-4 py-4 align-middle">
        <p className="text-sm font-black text-kasi-black">{store.name}</p>
        <p className="mt-1 text-xs font-medium text-black/45">{store.slug}</p>
      </td>

      <td className="px-4 py-4 align-middle">
        <p className="text-sm font-bold text-kasi-black">
          {store.owner?.name || "Unknown"}
        </p>
        <p className="mt-1 text-xs font-medium text-black/45">
          {store.owner?.email || "No email"}
        </p>
      </td>

      <td className="px-4 py-4 align-middle">
        <p className="text-sm font-bold text-kasi-black">
          {store.area ? `${store.area}, ` : ""}
          {store.city}
        </p>

        <p className="mt-1 text-xs font-medium text-black/45">
          {store.locationVerified
            ? "Location verified"
            : "Location not verified"}
        </p>
      </td>

      <td className="px-4 py-4 align-middle">
        <StoreStatusBadge status={store.approvalStatus} />
      </td>

      <td className="px-4 py-4 align-middle">
        <p className="text-xs font-bold text-black/55">
          {store._count.products} product
          {store._count.products === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-xs font-medium text-black/45">
          {store._count.orders} order
          {store._count.orders === 1 ? "" : "s"}
        </p>
      </td>

      <td className="px-4 py-4 text-right align-middle">
        <div className="flex flex-wrap justify-end gap-2">
          <AdminActions
            status={store.approvalStatus}
            loadingAction={loadingAction}
            onUpdate={updateStoreStatus}
          />

          <Link
            href={`/admin/stores/${store.id}`}
            className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-green hover:text-kasi-green"
          >
            Review
          </Link>
        </div>

        {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

function AdminActions({
  status,
  loadingAction,
  onUpdate,
}: {
  status: StoreApprovalStatus;
  loadingAction: ActionType | null;
  onUpdate: (status: ActionType) => void;
}) {
  const busy = loadingAction !== null;

  return (
    <>
      {status !== "APPROVED" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate("APPROVED")}
          className="inline-flex rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAction === "APPROVED" ? "Approving..." : "Approve"}
        </button>
      )}

      {status !== "REJECTED" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate("REJECTED")}
          className="inline-flex rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAction === "REJECTED" ? "Rejecting..." : "Reject"}
        </button>
      )}

      {status === "APPROVED" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate("DEACTIVATED")}
          className="inline-flex rounded-full bg-kasi-black px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAction === "DEACTIVATED" ? "Deactivating..." : "Deactivate"}
        </button>
      )}

      {status === "DEACTIVATED" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate("PENDING_REVIEW")}
          className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-green hover:text-kasi-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAction === "PENDING_REVIEW" ? "Moving..." : "Move to review"}
        </button>
      )}
    </>
  );
}

function StoreStatusBadge({ status }: { status: StoreApprovalStatus }) {
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

function StoreWarnings({ store }: { store: AdminStore }) {
  const warnings: string[] = [];

  if (!store.locationVerified) warnings.push("Location not verified");
  if (store._count.products === 0) warnings.push("No products");

  if (warnings.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {warnings.map((warning) => (
        <span
          key={warning}
          className="rounded-full bg-golden-yellow/25 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-kasi-black"
        >
          {warning}
        </span>
      ))}
    </div>
  );
}
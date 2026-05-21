// components/admin/AdminStoreStatusActions.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreApprovalStatus } from "@prisma/client";

type ActionType = "APPROVED" | "REJECTED" | "DEACTIVATED" | "PENDING_REVIEW";

export default function AdminStoreStatusActions({
  storeId,
  currentStatus,
}: {
  storeId: string;
  currentStatus: StoreApprovalStatus;
}) {
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

      const res = await fetch(`/api/admin/stores/${storeId}/status`, {
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

  const busy = loadingAction !== null;

  return (
    <div className="rounded-3xl border border-black/10 bg-kasi-cream p-4">
      <p className="text-xs font-black uppercase tracking-wide text-black/45">
        Admin actions
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {currentStatus !== "APPROVED" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => updateStoreStatus("APPROVED")}
            className="rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "APPROVED" ? "Approving..." : "Approve"}
          </button>
        )}

        {currentStatus !== "REJECTED" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => updateStoreStatus("REJECTED")}
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "REJECTED" ? "Rejecting..." : "Reject"}
          </button>
        )}

        {currentStatus === "APPROVED" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => updateStoreStatus("DEACTIVATED")}
            className="rounded-full bg-kasi-black px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "DEACTIVATED"
              ? "Deactivating..."
              : "Deactivate"}
          </button>
        )}

        {currentStatus === "DEACTIVATED" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => updateStoreStatus("PENDING_REVIEW")}
            className="rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-green hover:text-kasi-green disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "PENDING_REVIEW"
              ? "Moving..."
              : "Move to review"}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
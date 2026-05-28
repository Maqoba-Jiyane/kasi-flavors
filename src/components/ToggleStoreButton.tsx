"use client";

import { useState } from "react";

type StoreApprovalStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export default function ToggleStoreButton({
  initialState,
  storeId,
  approvalStatus,
}: {
  initialState: boolean;
  storeId: string;
  approvalStatus: StoreApprovalStatus;
}) {
  const [isOpen, setIsOpen] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApproved = approvalStatus === "APPROVED";

  async function toggle() {
    setError(null);

    if (!isApproved) {
      setError("Your store must be approved before it can open for orders.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/owner/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ storeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Something went wrong.");
        return;
      }

      setIsOpen(Boolean(data.isOpen));
    } catch {
      setError("Error updating store status. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const label = loading
    ? "Updating..."
    : !isApproved
      ? "Awaiting approval"
      : isOpen
        ? "Store open"
        : "Store closed";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        disabled={loading || !isApproved}
        aria-busy={loading}
        aria-disabled={loading || !isApproved}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-white shadow-sm transition",
          isApproved
            ? isOpen
              ? "bg-kasi-green hover:bg-street-orange"
              : "bg-red-600 hover:bg-red-700"
            : "cursor-not-allowed bg-black/25 text-white/80 shadow-none",
          loading ? "cursor-not-allowed opacity-60 shadow-none" : "",
        ].join(" ")}
      >
        <span className="h-2 w-2 rounded-full bg-current" />
        {label}
      </button>

      {error && (
        <p className="max-w-xs rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600">
          {error}
        </p>
      )}

      {!isApproved && !error && (
        <p className="max-w-xs text-xs font-medium leading-5 text-black/50">
          Your store will be able to open after admin approval.
        </p>
      )}
    </div>
  );
}
// components/orders/OrderActionsClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderActionsClient({
  trackingToken,
  pickupCode,
  storeSlug,
}: {
  trackingToken: string;
  pickupCode: string;
  storeSlug: string;
}) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pickupCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleTrack() {
    // go to tracking route (you will implement /track/[trackingToken] or similar)
    router.push(`/track/${trackingToken}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label="Copy pickup code"
      >
        {copied ? "Copied" : "Copy code"}
      </button>

      <button
        type="button"
        onClick={handleTrack}
        className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        Track
      </button>
    </div>
  );
}

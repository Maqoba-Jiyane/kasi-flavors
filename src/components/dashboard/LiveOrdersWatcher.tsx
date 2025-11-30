// app/(dashboard)/owner/store/orders/LiveOrdersWatcher.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LiveOrdersWatcherProps {
  initialLatestOrderId: string | null;
  intervalMs?: number;
}

export function LiveOrdersWatcher({
  initialLatestOrderId,
  intervalMs = 7000, // 7s – tweak as you like
}: LiveOrdersWatcherProps) {
  const router = useRouter();
  const [lastSeenId, setLastSeenId] = useState<string | null>(
    initialLatestOrderId,
  );
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(
          "/api/owner/store/orders/heartbeat",
          { cache: "no-store" },
        );
        if (!res.ok) return;

        const data = await res.json() as {
          latestOrderId: string | null;
        };

        if (!cancelled && data.latestOrderId && data.latestOrderId !== lastSeenId) {
          // New order detected
          setLastSeenId(data.latestOrderId);

          if (soundEnabled) {
            // Some browsers block autoplay until the user interacts;
            // we only play sound if the toggle is enabled
            const audio = new Audio("/sounds/new-order.mp3");
            audio.play().catch(() => {
              // Ignore (autoplay might be blocked)
            });
          }

          // Re-render server component with fresh orders
          router.refresh();
        }
      } catch {
        // Silent fail – don’t spam the console in production
      }
    }

    const id = setInterval(check, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, lastSeenId, router, soundEnabled]);

  return (
    <div className="mb-2 flex justify-end">
      <button
        type="button"
        onClick={() => setSoundEnabled((v) => !v)}
        className={[
          "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition",
          soundEnabled
            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400/80 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800",
        ].join(" ")}
      >
        {soundEnabled ? "🔔 Sound on" : "🔕 Sound off"}
      </button>
    </div>
  );
}

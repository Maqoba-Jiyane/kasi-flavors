"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface LiveOrdersWatcherProps {
  initialLatestOrderId: string | null;
  intervalMs?: number;
}

export function LiveOrdersWatcher({
  initialLatestOrderId,
  intervalMs = 7000,
}: LiveOrdersWatcherProps) {
  const router = useRouter();

  const [lastSeenId, setLastSeenId] = useState<string | null>(initialLatestOrderId);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [failCount, setFailCount] = useState(0);

  // Reuse one audio instance (faster + less glitchy)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isOnline = failCount < 3;

  const statusLabel = useMemo(() => {
    if (!lastCheckedAt) return "Live";
    const t = lastCheckedAt.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return isOnline ? `Live · checked ${t}` : `Offline · last ${t}`;
  }, [isOnline, lastCheckedAt]);

  useEffect(() => {
    // Create audio once
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/new-order.mp3");
      audioRef.current.preload = "auto";
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/owner/store/orders/heartbeat", { cache: "no-store" });
        if (!res.ok) throw new Error("Heartbeat failed");

        const data = (await res.json()) as { latestOrderId: string | null };

        if (cancelled) return;

        setLastCheckedAt(new Date());
        setFailCount(0);

        if (data.latestOrderId && data.latestOrderId !== lastSeenId) {
          setLastSeenId(data.latestOrderId);

          if (soundEnabled && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {
              // still might be blocked; we fail silently
            });
          }

          router.refresh();
        }
      } catch {
        if (cancelled) return;
        setLastCheckedAt(new Date());
        setFailCount((c) => c + 1);
      }
    }

    // run an immediate check once, then poll
    check();
    const id = setInterval(check, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, lastSeenId, router, soundEnabled]);

  async function enableSoundWithTest() {
    const next = !soundEnabled;

    // Turning OFF is simple
    if (!next) {
      setSoundEnabled(false);
      return;
    }

    // Turning ON: play a short “test” to satisfy user-gesture policies
    setSoundEnabled(true);

    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        // optional: immediately pause so it’s just a chirp
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {
      // If blocked, keep enabled but UI should hint user to tap again if needed.
    }
  }

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-[11px]">
        <span
          className={[
            "inline-flex h-2 w-2 rounded-full",
            isOnline ? "bg-emerald-500" : "bg-rose-500",
          ].join(" ")}
          aria-hidden="true"
        />
        <span className="text-slate-500 dark:text-slate-400">{statusLabel}</span>
      </div>

      <button
        type="button"
        onClick={enableSoundWithTest}
        className={[
          "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium transition",
          soundEnabled
            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400/80 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800",
        ].join(" ")}
      >
        {soundEnabled ? "🔔 Sound on" : "🔕 Enable sound"}
      </button>
    </div>
  );
}

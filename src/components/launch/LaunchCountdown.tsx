"use client";

import { useEffect, useMemo, useState } from "react";

const LAUNCH_DATE = "2026-06-01T00:00:00+02:00";

function getTimeLeft() {
  const now = new Date().getTime();
  const target = new Date(LAUNCH_DATE).getTime();
  const difference = Math.max(0, target - now);

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (difference / (1000 * 60 * 60)) % 24
  );
  const minutes = Math.floor(
    (difference / (1000 * 60)) % 60
  );
  const seconds = Math.floor((difference / 1000) % 60);

  return {
    days,
    hours,
    minutes,
    seconds,
    isLive: difference <= 0,
  };
}

export function LaunchCountdown() {
  const initial = useMemo(() => getTimeLeft(), []);
  const [timeLeft, setTimeLeft] = useState(initial);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (timeLeft.isLive) {
    return (
      <div className="rounded-4xl bg-kasi-green p-5 text-center text-white shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide">
          Kasi Flavors is launching
        </p>
        <p className="mt-2 text-2xl font-black">
          We are getting ready to go live.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      <TimeBox label="Days" value={timeLeft.days} />
      <TimeBox label="Hours" value={timeLeft.hours} />
      <TimeBox label="Minutes" value={timeLeft.minutes} />
      <TimeBox label="Seconds" value={timeLeft.seconds} />
    </div>
  );
}

function TimeBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur sm:p-5">
      <p className="text-2xl font-black text-golden-yellow sm:text-4xl">
        {String(value).padStart(2, "0")}
      </p>

      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/60 sm:text-xs">
        {label}
      </p>
    </div>
  );
}
"use client";

import { SignedIn, SignedOut, SignInButton, SignOutButton, SignUpButton } from "@clerk/nextjs";
import { LogIn, User, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = { href: string; label: string; group?: "main" | "settings" };

export default function OwnerNavbar({
  storeSlug,
  storeId,
  isOpen,
  onSignOut,
}: {
  storeSlug: string;
  storeId: string;
  isOpen: boolean;
  onSignOut?: () => void;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storeIsOpen, setStoreIsOpen] = useState(isOpen);

  // Close mobile menu when route changes (nice UX)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const nav: NavItem[] = useMemo(
    () => [
      { href: "/owner/store/overview", label: "Overview", group: "main" },
      { href: "/owner/store/orders", label: "Orders", group: "main" },
      { href: "/owner/store/billing", label: "Billing", group: "main" },
      { href: "/owner/store/analytics", label: "Analytics", group: "main" },

      // ✅ NEW: settings entry point
      { href: "/owner/store/settings", label: "Settings", group: "settings" },
    ],
    []
  );

  const isActive = (href: string) => {
    // treat settings subroutes as active too
    if (href === "/owner/store/settings") {
      return pathname?.startsWith("/owner/store/settings");
    }
    return pathname?.startsWith(href);
  };

  async function toggle() {
    if (loading) return;

    try {
      setLoading(true);

      const res = await fetch("/api/owner/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Something went wrong");
        return;
      }

      setStoreIsOpen(Boolean(data?.isOpen));
    } catch {
      alert("Error updating store status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <nav className="border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <Link href="/owner/store/overview" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 font-bold text-white">
                S
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-slate-900 dark:text-slate-50">
                  Store Panel
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Manage {storeSlug}
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-2">
              {nav
                .filter((n) => n.group === "main")
                .map((l) => {
                  const active = isActive(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={[
                        "rounded-md px-2 py-1 text-sm font-medium",
                        active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
                      ].join(" ")}
                    >
                      {l.label}
                    </Link>
                  );
                })}

              {/* Settings pill (keeps space clean) */}
              <Link
                href="/owner/store/settings"
                className={[
                  "ml-1 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium",
                  isActive("/owner/store/settings")
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
                ].join(" ")}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Toggle (desktop) */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={toggle}
                aria-pressed={storeIsOpen}
                disabled={loading}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2",
                  storeIsOpen
                    ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                    : "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500",
                  loading ? "cursor-not-allowed opacity-70" : "",
                ].join(" ")}
                title={storeIsOpen ? "Store is open for orders" : "Store is closed"}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-white" />
                {loading ? "Updating…" : storeIsOpen ? "Open" : "Closed"}
              </button>

                <SignedIn>
                  <SignOutButton>
                    <button
                      onClick={onSignOut}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Sign out
                    </button>
                  </SignOutButton>
                </SignedIn>
            </div>

            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden mt-3 pb-3 border-t border-slate-100 dark:border-slate-800">
            <div className="px-2 pt-3 space-y-1">
              {nav.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={[
                    "block rounded-md px-3 py-2 text-sm font-medium",
                    isActive(l.href)
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/50",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              ))}

              <div className="px-3 mt-2">
                <button
                  onClick={toggle}
                  disabled={loading}
                  className={[
                    "w-full rounded-md px-3 py-2 text-sm font-semibold text-white",
                    storeIsOpen ? "bg-emerald-600" : "bg-rose-600",
                    loading ? "cursor-not-allowed opacity-70" : "",
                  ].join(" ")}
                >
                  {loading ? "Updating…" : storeIsOpen ? "Set Closed" : "Set Open"}
                </button>

                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {storeIsOpen
                    ? "Customers can place orders now."
                    : "Customers can browse, but can’t place orders."}
                </p>
              </div>

              <div className="mt-3 px-3">
                <SignedIn>
                  <SignOutButton>
                    <button
                      onClick={onSignOut}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Sign out
                    </button>
                  </SignOutButton>
                </SignedIn>

                <SignedOut>
                  <div className="space-y-2">
                    <SignInButton>
                      <button className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                        <span className="inline-flex items-center gap-2">
                          <LogIn className="h-4 w-4" />
                          Sign in
                        </span>
                      </button>
                    </SignInButton>

                    <SignUpButton>
                      <button className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
                        <span className="inline-flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Sign up
                        </span>
                      </button>
                    </SignUpButton>
                  </div>
                </SignedOut>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

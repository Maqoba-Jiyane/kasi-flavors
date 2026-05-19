"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from "@clerk/nextjs";
import {
  BarChart3,
  CreditCard,
  Home,
  LogIn,
  Menu,
  PackageCheck,
  Settings,
  Store,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  group?: "main" | "settings";
};

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const nav: NavItem[] = useMemo(
    () => [
      {
        href: "/owner/store/overview",
        label: "Overview",
        icon: Home,
        group: "main",
      },
      {
        href: "/owner/store/orders",
        label: "Orders",
        icon: PackageCheck,
        group: "main",
      },
      {
        href: "/owner/store/billing",
        label: "Billing",
        icon: CreditCard,
        group: "main",
      },
      {
        href: "/owner/store/analytics",
        label: "Analytics",
        icon: BarChart3,
        group: "main",
      },
      {
        href: "/owner/store/settings",
        label: "Settings",
        icon: Settings,
        group: "settings",
      },
    ],
    []
  );

  const isActive = (href: string) => {
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

  const desktopLinkClass = (active: boolean) =>
    [
      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition",
      active
        ? "bg-kasi-green text-white"
        : "text-kasi-black/65 hover:bg-kasi-green/10 hover:text-kasi-green",
    ].join(" ");

  const mobileLinkClass = (active: boolean) =>
    [
      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition",
      active
        ? "bg-kasi-green text-white"
        : "bg-white text-kasi-black hover:bg-kasi-green/10 hover:text-kasi-green",
    ].join(" ");

  return (
    <nav className="sticky top-0 z-50 border-b border-black/10 bg-kasi-cream/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="hidden border-b border-black/10 py-2 text-xs font-black uppercase tracking-wide text-kasi-black/60 md:flex md:items-center md:justify-between">
          <span>Owner dashboard</span>
          <span>
            <span className="text-street-orange">Manage orders.</span>{" "}
            <span className="text-kasi-green">Grow your store.</span>
          </span>
        </div>

        <div className="flex h-20 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/owner/store/overview"
              className="flex min-w-0 items-center gap-3"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-kasi-black bg-kasi-black text-white shadow-sm">
                <Store className="h-5 w-5" />
              </div>

              <div className="min-w-0 leading-tight">
                <div className="font-black text-kasi-black">Store Panel</div>
                <div className="truncate text-xs font-bold text-black/50">
                  Manage {storeSlug}
                </div>
              </div>
            </Link>

            <div className="hidden items-center gap-2 lg:flex">
              {nav
                .filter((n) => n.group === "main")
                .map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={desktopLinkClass(active)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}

              <Link
                href="/owner/store/settings"
                className={desktopLinkClass(isActive("/owner/store/settings"))}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-pressed={storeIsOpen}
              disabled={loading}
              className={[
                "hidden items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 sm:inline-flex",
                storeIsOpen
                  ? "bg-kasi-green hover:bg-street-orange focus:ring-kasi-green"
                  : "bg-red-600 hover:bg-red-700 focus:ring-red-500",
                loading ? "cursor-not-allowed opacity-70" : "",
              ].join(" ")}
              title={
                storeIsOpen ? "Store is open for orders" : "Store is closed"
              }
            >
              <span className="inline-block h-2 w-2 rounded-full bg-white" />
              {loading ? "Updating…" : storeIsOpen ? "Open" : "Closed"}
            </button>

            <SignedIn>
              <SignOutButton>
                <button
                  onClick={onSignOut}
                  className="hidden rounded-full border-2 border-black/10 bg-white px-4 py-2.5 text-sm font-black text-kasi-black transition hover:border-kasi-black lg:inline-flex"
                >
                  Sign out
                </button>
              </SignOutButton>
            </SignedIn>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-kasi-black bg-white text-kasi-black lg:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-black/10 pb-4 pt-4 lg:hidden">
            <div className="space-y-2">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={mobileLinkClass(active)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="mt-4 rounded-3xl bg-kasi-black p-4 text-white">
                <p className="text-sm font-black uppercase tracking-wide text-golden-yellow">
                  Store status
                </p>

                <p className="mt-1 text-sm text-white/65">
                  {storeIsOpen
                    ? "Customers can place orders now."
                    : "Customers can browse, but cannot place orders."}
                </p>

                <button
                  onClick={toggle}
                  disabled={loading}
                  className={[
                    "mt-4 w-full rounded-full px-4 py-3 text-sm font-black text-white",
                    storeIsOpen ? "bg-red-600" : "bg-kasi-green",
                    loading ? "cursor-not-allowed opacity-70" : "",
                  ].join(" ")}
                >
                  {loading
                    ? "Updating…"
                    : storeIsOpen
                      ? "Set closed"
                      : "Set open"}
                </button>

                <div className="mt-3">
                  <SignedIn>
                    <SignOutButton>
                      <button
                        onClick={onSignOut}
                        className="w-full rounded-full bg-white px-4 py-3 text-sm font-black text-kasi-black"
                      >
                        Sign out
                      </button>
                    </SignOutButton>
                  </SignedIn>

                  <SignedOut>
                    <div className="grid gap-2">
                      <SignInButton>
                        <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-kasi-black">
                          <LogIn className="h-4 w-4" />
                          Sign in
                        </button>
                      </SignInButton>

                      <SignUpButton>
                        <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-kasi-green px-4 py-3 text-sm font-black text-white">
                          <User className="h-4 w-4" />
                          Sign up
                        </button>
                      </SignUpButton>
                    </div>
                  </SignedOut>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
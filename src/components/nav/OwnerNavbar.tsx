"use client";

import { SignedIn, SignedOut, SignInButton, SignOutButton, SignUpButton } from "@clerk/nextjs";
import { LogIn, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function OwnerNavbar({
  name,
  storeSlug,
  isOpen,storeId,
  onSignOut,
}: {
  name?: string | null;
  storeSlug: string;
  storeId: string;
  isOpen: boolean;
  onSignOut?: () => void;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storeIsOpen, setStoreIsOpen] = useState(isOpen);
  const links = [
    { href: `/owner/store/overview`, label: "Overview" },
    { href: `/owner/store/orders`, label: "Orders" },
    { href: `/owner/store/billing`, label: "Billing" },
    { href: `/owner/store/analytics`, label: "Analytics" },
    // { href: `/owner/store/settings`, label: "Settings" },
  ];

  async function toggle() {
    try {
      setLoading(true);

      const res = await fetch("/api/owner/toggle", {
        method: "POST",
        body: JSON.stringify({ storeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Something went wrong");
        return;
      }

      setStoreIsOpen(data.isOpen);
    } catch (e) {
      alert("Error updating store status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/owner/store`} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold">S</div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-50">Store Panel</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Manage {storeSlug}</div>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-2">
              {links.map((l) => {
                const active = pathname?.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`px-2 py-1 rounded-md text-sm font-medium ${
                      active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={toggle}
                aria-pressed={isOpen}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-semibold text-white shadow-sm transition ${
                  storeIsOpen ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-white" />
                {storeIsOpen ? "Open" : "Closed"}
              </button>

              <Link href={`/owner/store/orders`} className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300">
                Orders
              </Link>

              <div className="mt-2 px-3 w-full flex flex-col justify-center items-center">
                <SignedIn>
                  <SignOutButton>
                    <div className="flex justify-center w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                      {/* <LogOut className="h-4 w-4" /> */}
                      Sign Out
                    </div>
                  </SignOutButton>
                </SignedIn>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800"
                aria-label="Open menu"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden mt-3 pb-3 border-t border-slate-100 dark:border-slate-800">
            <div className="px-2 space-y-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium ${
                    pathname?.startsWith(l.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {l.label}
                </Link>
              ))}

              <div className="px-3 mt-2">
                <button onClick={() => toggle?.()} className={`w-full rounded-md ${storeIsOpen ? 'bg-emerald-600' : 'bg-red-600'}  px-3 py-2 text-sm font-semibold text-white`}>
                  {storeIsOpen ? "Set Closed" : "Set Open"}
                </button>
              </div>

              <div className="mt-2 px-3 w-full flex flex-col justify-center items-center">
                <SignedIn>
                  <SignOutButton>
                    <div className="flex justify-center w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                      {/* <LogOut className="h-4 w-4" /> */}
                      Sign Out
                    </div>
                  </SignOutButton>
                </SignedIn>

                <SignedOut>
                  <SignInButton>
                    <div className="flex cursor-pointer items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </div>
                  </SignInButton>

                  <SignUpButton>
                    <div className="flex cursor-pointer items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Sign Up</span>
                    </div>
                  </SignUpButton>
                </SignedOut>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

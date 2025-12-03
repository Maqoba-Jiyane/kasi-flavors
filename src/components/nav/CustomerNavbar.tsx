"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function CustomerNavbar({
  userName,
  cartCount = 0,
  onSignIn,
  onSignOut,
}: {
  userName?: string | null;
  cartCount?: number;
  onSignIn?: () => void;
  onSignOut?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold">
                KF
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-50">
                Kasi Flavors
              </span>
            </Link>

            <div className="hidden md:flex md:items-center md:gap-2">
              <Link
                href="/"
                className={`px-2 py-1 rounded-md text-sm ${
                  pathname === "/" ? "text-emerald-700" : "text-slate-600"
                }`}
              >
                Home
              </Link>
              {/* <Link
                href="/stores"
                className={`px-2 py-1 rounded-md text-sm ${
                  pathname.startsWith("/stores")
                    ? "text-emerald-700"
                    : "text-slate-600"
                }`}
              >
                Stores
              </Link> */}
              <Link
                href="/orders"
                className={`px-2 py-1 rounded-md text-sm ${
                  pathname.startsWith("/orders")
                    ? "text-emerald-700"
                    : "text-slate-600"
                }`}
              >
                My orders
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="relative inline-flex items-center rounded-md px-3 py-1 text-sm font-medium bg-slate-100 dark:bg-slate-800"
            >
              <svg
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4"
                />
              </svg>
              Cart
              {cartCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-2 text-xs font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <div className="hidden sm:flex sm:items-center sm:gap-3">
              {userName ? (
                <>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {userName}
                  </span>
                  <button
                    onClick={() => onSignOut?.()}
                    className="text-sm text-slate-600 dark:text-slate-300"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onSignIn?.()}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white"
                >
                  Sign in
                </button>
              )}
            </div>

            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden mt-2 pb-3 border-t border-slate-100 dark:border-slate-800">
            <div className="px-2 space-y-1">
              <Link
                href="/"
                className={`block px-3 py-2 rounded-md ${
                  pathname === "/"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-700"
                }`}
              >
                Home
              </Link>
              {/* <Link
                href="/stores"
                className={`block px-3 py-2 rounded-md ${
                  pathname.startsWith("/stores")
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-700"
                }`}
              >
                Stores
              </Link> */}
              <Link
                href="/orders"
                className={`block px-3 py-2 rounded-md ${
                  pathname.startsWith("/orders")
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-700"
                }`}
              >
                My orders
              </Link>

              {/* <div className="mt-2 px-3">
                <Link
                  href="/cart"
                  className="block w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Cart ({cartCount})
                </Link>
              </div> */}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from "@clerk/nextjs";
import { LogIn, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function AdminNavbar({
  name,
  onSignOut,
}: {
  name?: string | null;
  onSignOut?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/stores", label: "Stores" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold">
                K
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-50">
                Kasi Admin
              </span>
            </Link>

            <div className="hidden md:flex md:items-center md:space-x-1">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex sm:items-center sm:gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Signed in as
              </span>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
              <SignedIn>
                  <SignOutButton>
                  {name ?? "Admin"}
                  </SignOutButton>
                </SignedIn>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Open menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
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
        </div>

        {/* mobile menu */}
        {open && (
          <div className="md:hidden mt-3 pb-3 border-t border-slate-100 dark:border-slate-800">
            <div className="px-2 space-y-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === l.href
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {l.label}
                </Link>
              ))}

              <div className="mt-2 px-3">
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

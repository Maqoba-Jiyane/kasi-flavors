"use client";

import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Left: logo / brand */}
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
            Kasi Flavors
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Order food from your kasi
          </span>
        </Link>

        {/* Right: auth controls */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            {/* Simple: always send signed-in users to dashboard; 
               role-based redirects are handled server-side. */}
            <Link
              href="/owner/store/orders"
              className="hidden rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 sm:inline-flex"
            >
              Dashboard
            </Link>

            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-7 w-7",
                },
              }}
            />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

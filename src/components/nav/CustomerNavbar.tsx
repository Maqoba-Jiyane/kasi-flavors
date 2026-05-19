"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from "@clerk/nextjs";
import { LogIn, Menu, ShoppingCart, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function CustomerNavbar({
  userName,
  cartCount = 0,
}: {
  userName?: string | null;
  cartCount?: number;
  onSignIn?: () => void;
  onSignOut?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/owner") || pathname.startsWith("/admin")) {
    return null;
  }

  const navLinkClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-extrabold transition ${
      active
        ? "bg-kasi-green text-white"
        : "text-kasi-black/70 hover:bg-kasi-green/10 hover:text-kasi-green"
    }`;

  const mobileLinkClass = (active: boolean) =>
    `block rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
      active
        ? "bg-kasi-green text-white"
        : "bg-white text-kasi-black hover:bg-kasi-green/10 hover:text-kasi-green"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-black/10 bg-kasi-cream/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top mini strip */}
        <div className="hidden border-b border-black/10 py-2 text-xs font-black uppercase tracking-wide text-kasi-black/60 md:flex md:items-center md:justify-between">
          <span>Real flavors. Real kasi.</span>
          <span>
            <span className="text-street-orange">Skip the queue.</span>{" "}
            <span className="text-kasi-green">Order online.</span>
          </span>
        </div>

        <div className="flex h-20 items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-kasi-black bg-kasi-black text-lg font-black text-white shadow-sm">
                KF
              </div>

              <div className="leading-none">
                <span className="block text-xl font-black tracking-tight text-kasi-green">
                  Kasi
                </span>
                <span className="-mt-0.5 block text-lg font-black tracking-tight text-golden-yellow [text-shadow:2px_2px_0_#111111]">
                  Flavors
                </span>
              </div>
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/" className={navLinkClass(pathname === "/")}>
                Home
              </Link>

              <Link
                href="/orders"
                className={navLinkClass(pathname.startsWith("/orders"))}
              >
                My orders
              </Link>

              <Link
                href="/owner-application"
                className={navLinkClass(
                  pathname.startsWith("/owner-application")
                )}
              >
                Open a store
              </Link>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="relative inline-flex items-center rounded-full border-2 border-kasi-black bg-white px-4 py-2.5 text-sm font-black text-kasi-black shadow-sm transition hover:-translate-y-0.5 hover:bg-golden-yellow"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart

              {cartCount > 0 && (
                <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-street-orange px-2 text-xs font-black text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <div className="hidden items-center gap-2 lg:flex">
              <SignedIn>
                {userName ? (
                  <span className="max-w-[140px] truncate text-sm font-bold text-kasi-black/70">
                    {userName}
                  </span>
                ) : null}

                <SignOutButton>
                  <button className="rounded-full bg-kasi-black px-4 py-2.5 text-sm font-black text-white transition hover:bg-street-orange">
                    Sign out
                  </button>
                </SignOutButton>
              </SignedIn>

              <SignedOut>
                <SignInButton>
                  <button className="inline-flex items-center gap-2 rounded-full border-2 border-black/10 bg-white px-4 py-2.5 text-sm font-black text-kasi-black transition hover:border-kasi-green hover:text-kasi-green">
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </button>
                </SignInButton>

                <SignUpButton>
                  <button className="inline-flex items-center gap-2 rounded-full bg-kasi-green px-4 py-2.5 text-sm font-black text-white transition hover:bg-street-orange">
                    <User className="h-4 w-4" />
                    Sign up
                  </button>
                </SignUpButton>
              </SignedOut>
            </div>

            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-kasi-black bg-white text-kasi-black md:hidden"
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="border-t border-black/10 pb-4 pt-4 md:hidden">
            <div className="space-y-2">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className={mobileLinkClass(pathname === "/")}
              >
                Home
              </Link>

              <Link
                href="/orders"
                onClick={() => setOpen(false)}
                className={mobileLinkClass(pathname.startsWith("/orders"))}
              >
                My orders
              </Link>

              <Link
                href="/owner-application"
                onClick={() => setOpen(false)}
                className={mobileLinkClass(
                  pathname.startsWith("/owner-application")
                )}
              >
                Open a store
              </Link>

              <div className="mt-4 rounded-3xl bg-kasi-black p-4 text-white">
                <p className="text-sm font-black uppercase tracking-wide text-golden-yellow">
                  Skip the queue
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Order from local kasi food spots and collect when ready.
                </p>

                <div className="mt-4">
                  <SignedIn>
                    <SignOutButton>
                      <button className="w-full rounded-full bg-street-orange px-4 py-3 text-sm font-black text-white">
                        Sign out
                      </button>
                    </SignOutButton>
                  </SignedIn>

                  <SignedOut>
                    <div className="grid gap-2">
                      <SignInButton>
                        <button className="w-full rounded-full bg-white px-4 py-3 text-sm font-black text-kasi-black">
                          Sign in
                        </button>
                      </SignInButton>

                      <SignUpButton>
                        <button className="w-full rounded-full bg-kasi-green px-4 py-3 text-sm font-black text-white">
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
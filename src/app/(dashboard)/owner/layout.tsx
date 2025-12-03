// app/(dashboard)/owner/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface OwnerLayoutProps {
  children: ReactNode;
}

export default async function OwnerLayout({ children }: OwnerLayoutProps) {
  const user = await getCurrentUser();

  // 1) Require auth
  if (!user) {
    // With Clerk you'll typically have /sign-in route
    redirect("/sign-in");
  }

  // 2) Require store owner role
  if (user.role !== "STORE_OWNER") {
    redirect("/"); // or some /403 page
  }

  // 3) Load the store linked to this owner
  const store = await prisma.store.findUnique({
    where: { ownerId: user?.id },
  });

  if (!store) {
    // You can make this a nicer UX later (e.g., "Create store" page)
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            No store found
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            This account is marked as a store owner, but no store is linked yet.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Top bar */}
      {/* <header className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Owner dashboard
            </span>
            <h1 className="text-sm font-semibold sm:text-base">{store.name}</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-300">
              {store.area}, {store.city}
            </p>
          </div>

          <div className="hidden items-center gap-3 text-xs sm:flex">
            <div className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {/* You can later wire this to live stats 
              <span className="font-medium">Logged in as:</span>{" "}
              <span>{user?.name}</span>
            </div>
          </div>
        </div>
      </header> */}

      {/* Sub-nav */}
      {/* <nav className="border-b border-slate-200 bg-slate-50/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex gap-2 overflow-x-auto py-2 text-sm"> */}
          {/* <OwnerNavLink href="/owner/store/orders" label="Orders" />
          <OwnerNavLink href="/owner/store/analytics" label="Analytics" /> */}
          <OwnerNavbar isOpen={store.isOpen} storeSlug={store.slug} storeId={store.id} />
          {/* Add more later, e.g. Settings, Menu, etc. */}
        {/* </div>
      </nav> */}

      {/* Page content */}
      <main className="px-4 py-4">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

// Simple server-side nav link (no active highlight yet; you can upgrade later)
import Link from "next/link";
import OwnerNavbar from "@/components/nav/OwnerNavbar";

interface OwnerNavLinkProps {
  href: string;
  label: string;
}

function OwnerNavLink({ href, label }: OwnerNavLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-transparent transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {label}
    </Link>
  );
}

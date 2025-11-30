import { ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";

interface StoreAdminLayoutProps {
  children: ReactNode;
  params: Promise<{ storeId: string }>;
}

export default async function StoreAdminLayout({
  children,
  params,
}: StoreAdminLayoutProps) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const {storeId} = await params

  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    // You can redirect or throw; for simplicity:
    throw new Error("Store not found");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {store.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Admin · Manage store data, products and settings.
          </p>
        </div>

        <span
          className={[
            "inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
            store.isOpen
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          ].join(" ")}
        >
          {store.isOpen ? "Open" : "Closed"}
        </span>
      </header>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-1 text-[11px] dark:border-slate-800">
        <StoreTab href={`/admin/stores/${store.id}/overview`}>Overview</StoreTab>
        <StoreTab href={`/admin/stores/${store.id}/products`}>Products</StoreTab>
        <StoreTab href={`/admin/stores/${store.id}/settings`}>Settings</StoreTab>
      </nav>

      <div>{children}</div>
    </div>
  );
}

function StoreTab({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  // For simplicity, we’re not doing active detection yet.
  // You can enhance with `usePathname` in a client wrapper later.
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {children}
    </Link>
  );
}

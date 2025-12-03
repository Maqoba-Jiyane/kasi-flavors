// app/(dashboard)/admin/layout.tsx
import { ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser, assertRole } from "@/lib/auth";
import AdminNavbar from "@/components/nav/AdminNavbar";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white">
              Admin
            </span>
            <span className="text-sm font-semibold">
              Kasi Flavors Platform
            </span>
          </div>

          <nav className="flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
            {/* <AdminNavLink href="/admin/overview">Overview</AdminNavLink>
            <AdminNavLink href="/admin/stores">Stores</AdminNavLink> */}
            <AdminNavbar/>
            {/* later: /admin/orders, /admin/users */}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {children}
    </Link>
  );
}

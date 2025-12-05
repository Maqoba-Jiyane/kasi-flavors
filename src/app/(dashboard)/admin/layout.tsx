// app/(dashboard)/admin/layout.tsx
import { ReactNode } from "react";
import { getCurrentUser, assertRole } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
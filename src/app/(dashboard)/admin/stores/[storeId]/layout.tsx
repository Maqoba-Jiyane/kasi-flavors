import { ReactNode } from "react";
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

      <div>{children}</div>
    </div>
  );
}
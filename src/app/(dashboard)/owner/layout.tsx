// app/(dashboard)/owner/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import OwnerNavbar from "@/components/nav/OwnerNavbar";
import { ToasterProvider } from "@/components/ui/ToasterProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Owner dashboard",
    template: "%s | Owner | Kasi Flavors",
  },
  description:
    "Manage your Kasi Flavors store from the owner dashboard: overview, orders, analytics, billing, and more.",
  openGraph: {
    type: "website",
    title: "Owner dashboard | Kasi Flavors",
    description:
      "Access your Kasi Flavors owner dashboard to manage store orders, analytics, billing, and settings.",
    url: "/owner",
  },
  twitter: {
    card: "summary",
    title: "Owner dashboard | Kasi Flavors",
    description:
      "Use the Kasi Flavors owner dashboard to manage your store and monitor performance.",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

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
      <OwnerNavbar
        isOpen={store.isOpen}
        storeSlug={store.slug}
        storeId={store.id}
      />

      <main className="px-4 py-4">
        <ToasterProvider />
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

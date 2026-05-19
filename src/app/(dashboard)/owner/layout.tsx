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

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "STORE_OWNER") {
    redirect("/");
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });

  if (!store) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kasi-cream px-4 py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kasi-black text-3xl">
            🏪
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-wide text-street-orange">
            Owner dashboard
          </p>

          <h1 className="mt-2 text-2xl font-black text-kasi-black">
            No store found
          </h1>

          <p className="mt-3 text-sm font-medium leading-6 text-black/60">
            This account is marked as a store owner, but no store is linked yet.
            Please contact Kasi Flavors support so your store can be connected.
          </p>

          <a
            href="mailto:support@kasiflavors.co.za"
            className="mt-6 inline-flex rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange"
          >
            Contact support
          </a>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-kasi-cream text-kasi-black">
      <OwnerNavbar
        isOpen={store.isOpen}
        storeSlug={store.slug}
        storeId={store.id}
      />

      <main className="px-4 py-5 sm:px-6 lg:px-8">
        <ToasterProvider />

        <div className="mx-auto max-w-7xl">
          <div className="mb-5 overflow-hidden rounded-[2rem] bg-kasi-black text-white shadow-sm">
            <div className="relative px-5 py-6 sm:px-7">
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-street-orange opacity-40 blur-3xl" />
              <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-kasi-green opacity-40 blur-3xl" />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                    Store owner
                  </p>

                  <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                    {store.name}
                  </h1>

                  <p className="mt-2 text-sm font-medium text-white/60">
                    Manage orders, menu items, settings, and store performance.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${
                      store.isOpen
                        ? "bg-kasi-green text-white"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-current" />
                    {store.isOpen ? "Store open" : "Store closed"}
                  </span>

                  <a
                    href={`/stores/${store.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:bg-golden-yellow"
                  >
                    View store
                  </a>
                </div>
              </div>
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
// app/(dashboard)/admin/layout.tsx
import { ReactNode } from "react";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s | Admin | Kasi Flavors",
  },
  description:
    "Administrative dashboard for managing the Kasi Flavors platform, stores, users, and system operations.",
  openGraph: {
    type: "website",
    title: "Admin Dashboard | Kasi Flavors",
    description:
      "Access the administrative console for managing the Kasi Flavors ecosystem.",
    url: "/admin",
  },
  twitter: {
    card: "summary",
    title: "Admin Dashboard | Kasi Flavors",
    description:
      "Platform admin tools and system controls for Kasi Flavors.",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nocache: true,
    },
  },
};

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
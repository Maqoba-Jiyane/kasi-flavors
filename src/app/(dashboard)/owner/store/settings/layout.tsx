// app/(dashboard)/owner/store/settings/layout.tsx
import Link from "next/link";

export default function StoreSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Store settings
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            Manage your store information, delivery settings, and couriers.
          </p>

          <nav className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <Tab href="/owner/store/settings">General</Tab>
            <Tab href="/owner/store/settings/delivery">Delivery</Tab>
            <Tab href="/owner/store/settings/couriers">Couriers</Tab>
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}

function Tab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {children}
    </Link>
  );
}

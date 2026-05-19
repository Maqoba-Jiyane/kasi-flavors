// app/(dashboard)/owner/store/settings/layout.tsx
import Link from "next/link";

export default function StoreSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="py-2">
      <div className="space-y-5">
        <header className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Owner controls
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
            Store settings
          </h1>

          <p className="mt-2 text-sm font-medium text-black/60">
            Manage your store information, delivery settings, pricing, and
            couriers.
          </p>

          <nav className="mt-5 flex flex-wrap gap-2 text-xs">
            <Tab href="/owner/store/settings">General</Tab>
            <Tab href="/owner/store/settings/delivery">Delivery</Tab>
            <Tab href="/owner/store/settings/pricing">Pricing</Tab>
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
      className="inline-flex items-center rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-green hover:text-kasi-green"
    >
      {children}
    </Link>
  );
}
import { prisma } from "@/lib/prisma";
import { StoreCard } from "@/components/StoreCard";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignedIn, SignedOut, SignIn, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function HomePage() {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
  });

  const user = await getCurrentUser();

  // If store owner, don't allow them to see the customer homepage.
  if (user?.role === "STORE_OWNER") {
    redirect("/owner/store/orders");
  }

  const mapped = stores.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    area: s.area,
    city: s.city,
    description: s.description ?? undefined,
    avgPrepTimeMinutes: s.avgPrepTimeMinutes,
    isOpen: s.isOpen,
  }));

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex justify-between">
          <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Kasi Flavors
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Order from your favourite kasi spots – kotsa, kota, bunny chow, all
            in one place.
          </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <SignedOut>
              <Button asChild size="default" variant="default">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: {
                      width: 35,
                      height: 35,
                    },
                  },
                }}
              />
            </SignedIn>
          </div>
        </header>

        <section>
          {mapped.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              No stores yet. Seed your database with a few demo stores.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mapped.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

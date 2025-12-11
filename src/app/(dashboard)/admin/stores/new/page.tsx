// app/(dashboard)/admin/stores/new/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/* ---------- Helpers ---------- */

// Small slug helper
function slugifyBase(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------- Server action ---------- */

/** SERVER ACTION: create a new store for an existing owner user */
export async function createStore(formData: FormData) {
  "use server";

  const current = await getCurrentUser();
  assertRole(current, ["ADMIN"]);

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const ownerEmail =
    (formData.get("ownerEmail") as string | null)?.trim().toLowerCase() ?? "";
  const city = (formData.get("city") as string | null)?.trim() ?? "";
  const area = (formData.get("area") as string | null)?.trim() ?? "";
  const address = (formData.get("address") as string | null)?.trim() ?? "";

  if (!name || !ownerEmail || !city || !address) {
    throw new Error(
      "Missing required fields (name, owner email, city, address)."
    );
  }

  // Owner must already exist in the system
  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (!owner) {
    throw new Error(
      `Owner user with email "${ownerEmail}" not found. Ask them to sign up first.`
    );
  }

  // Ensure they have STORE_OWNER role
  if (owner.role !== "STORE_OWNER") {
    await prisma.user.update({
      where: { id: owner.id },
      data: { role: "STORE_OWNER" },
    });
  }

  // Generate unique slug
  const baseSlug = slugifyBase(name) || "store";
  let slug = baseSlug;
  let counter = 1;

  // make sure slug is unique (simple loop ok for MVP)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.store.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }

  await prisma.store.create({
    data: {
      name,
      slug,
      description: null,
      address,
      city,
      area: area || "",
      avgPrepTimeMinutes: 25,
      isOpen: true,
      ownerId: owner.id,
    },
  });

  // Refresh the admin stores path so the new store appears
  revalidatePath("/admin/stores");
  redirect("/admin/stores");
}

/* ---------- Page ---------- */

export default async function AdminStoresNewPage() {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  return (
    <main className="space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Add new store
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Link a store to an existing owner account and set basic details.
          </p>
        </div>

        <Link
          href="/admin/stores"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          ← Back to stores
        </Link>
      </header>

      {/* Create Store Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Store details
        </h2>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          The owner must already have an account in the system.
        </p>

        <form action={createStore} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Store name
            </label>
            <input
              name="name"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="Mama K's Kotas"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Owner email
            </label>
            <input
              name="ownerEmail"
              type="email"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="owner@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              City
            </label>
            <input
              name="city"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="Soweto"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Area (optional)
            </label>
            <input
              name="area"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="Zola"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Address
            </label>
            <input
              name="address"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="123 Corner Street, next to the taxi rank"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Save store
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

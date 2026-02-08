// app/(dashboard)/owner/store/settings/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default async function StoreGeneralSettingsPage() {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      area: true,
      avgPrepTimeMinutes: true,
    },
  });

  if (!store) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        No store linked to this account.
      </div>
    );
  }

  async function save(formData: FormData) {
    "use server";

    const user = await getCurrentUser();
    assertRole(user, ["STORE_OWNER"]);

    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });

    if (!store) throw new Error("No store linked to this account");

    const name = String(formData.get("name") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const area = String(formData.get("area") || "").trim();

    const avgPrepRaw = Number(formData.get("avgPrepTimeMinutes") || 25);
    const avgPrepTimeMinutes = clampInt(
      Number.isFinite(avgPrepRaw) ? avgPrepRaw : 25,
      5,
      180
    );

    if (!name) throw new Error("Store name is required");
    if (!address) throw new Error("Address is required");
    if (!city) throw new Error("City is required");

    await prisma.store.update({
      where: { id: store.id },
      data: {
        name,
        address,
        city,
        area,
        avgPrepTimeMinutes,
      },
    });

    revalidatePath("/owner/store/settings");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        General
      </h2>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
        Update your store details shown to customers.
      </p>

      <form action={save} className="mt-4 grid gap-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Store name">
            <input
              name="name"
              defaultValue={store.name}
              className={inputCls}
              required
            />
          </Field>

          <Field label="Avg prep time (minutes)">
            <input
              name="avgPrepTimeMinutes"
              type="number"
              min={5}
              max={180}
              defaultValue={store.avgPrepTimeMinutes}
              className={inputCls}
              required
            />
          </Field>
        </div>

        <Field label="Address">
          <input
            name="address"
            defaultValue={store.address}
            className={inputCls}
            required
          />
        </Field>

        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="City">
            <input
              name="city"
              defaultValue={store.city}
              className={inputCls}
              required
            />
          </Field>

          <Field label="Area (optional)">
            <input
              name="area"
              defaultValue={store.area}
              className={inputCls}
              placeholder="e.g. Diepkloof"
            />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

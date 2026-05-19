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
      onlinePaymentsEnabled: true,
    },
  });

  if (!store) {
    return (
      <div className="rounded-[2rem] border border-black/10 bg-white p-6 text-sm shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-street-orange">
          Store setup
        </p>

        <h2 className="mt-2 text-2xl font-black text-kasi-black">
          No store linked
        </h2>

        <p className="mt-2 text-sm font-medium text-black/60">
          No store is linked to this account.
        </p>
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

    const onlinePaymentsEnabled =
      formData.get("onlinePaymentsEnabled") === "on";

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
        onlinePaymentsEnabled,
      },
    });

    revalidatePath("/owner/store/settings");
  }

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-street-orange">
        General settings
      </p>

      <h2 className="mt-1 text-2xl font-black text-kasi-black">
        Store details
      </h2>

      <p className="mt-1 text-sm font-medium text-black/55">
        Update the information customers see when they browse and order from
        your store.
      </p>

      <form action={save} className="mt-6 grid gap-4 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name">
            <input
              name="name"
              defaultValue={store.name}
              className={inputCls}
              required
            />
          </Field>

          <Field label="Avg prep time minutes">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City">
            <input
              name="city"
              defaultValue={store.city}
              className={inputCls}
              required
            />
          </Field>

          <Field label="Area optional">
            <input
              name="area"
              defaultValue={store.area}
              className={inputCls}
              placeholder="e.g. Diepkloof"
            />
          </Field>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-kasi-cream p-4">
          <label className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm font-black text-kasi-black">
                Enable online payments
              </span>

              <span className="mt-1 block text-xs font-medium leading-5 text-black/55">
                Customers will only be able to pay online when this is enabled.
                Cash on collection or delivery can still be used depending on
                your checkout setup.
              </span>
            </div>

            <input
              name="onlinePaymentsEnabled"
              type="checkbox"
              defaultChecked={store.onlinePaymentsEnabled}
              className="mt-1 h-4 w-4 accent-kasi-green"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-street-orange"
          >
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-black/50">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border-2 border-black/10 bg-kasi-cream px-4 py-3 text-sm font-semibold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:bg-white focus:ring-4 focus:ring-kasi-green/10";
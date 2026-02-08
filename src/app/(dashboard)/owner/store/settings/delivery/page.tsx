// app/(dashboard)/owner/store/settings/delivery/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default async function StoreDeliverySettingsPage() {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      supportsDelivery: true,
      deliveryRadiusKm: true,
      deliveryFeeCents: true,
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

    const supportsDelivery = formData.get("supportsDelivery") === "on";

    const radiusRaw = Number(formData.get("deliveryRadiusKm") || 0);
    const feeRandRaw = Number(formData.get("deliveryFeeRand") || 0);

    // if delivery is off -> null out radius/fee
    const deliveryRadiusKm = supportsDelivery
      ? clampInt(Number.isFinite(radiusRaw) ? radiusRaw : 0, 1, 30)
      : null;

    const deliveryFeeCents = supportsDelivery
      ? clampInt(
          Number.isFinite(feeRandRaw) ? Math.round(feeRandRaw * 100) : 0,
          0,
          50000
        )
      : null;

    if (supportsDelivery) {
      if (!deliveryRadiusKm || deliveryRadiusKm < 1) {
        throw new Error("Delivery radius must be at least 1km");
      }
      if (deliveryFeeCents == null || deliveryFeeCents < 0) {
        throw new Error("Delivery fee must be valid");
      }
    }

    await prisma.store.update({
      where: { id: store.id },
      data: {
        supportsDelivery,
        deliveryRadiusKm,
        deliveryFeeCents,
      },
    });

    revalidatePath("/owner/store/settings/delivery");
  }

  const feeRand =
    store.deliveryFeeCents != null ? store.deliveryFeeCents / 100 : 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Delivery
      </h2>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
        Enable delivery and set your radius + fee.
      </p>

      <form action={save} className="mt-4 grid gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="supportsDelivery"
            defaultChecked={store.supportsDelivery}
          />
          <span className="text-sm text-slate-800 dark:text-slate-100">
            Enable delivery for this store
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Delivery radius (km)">
            <input
              type="number"
              name="deliveryRadiusKm"
              min={1}
              max={30}
              defaultValue={store.deliveryRadiusKm ?? 3}
              className={inputCls}
            />
          </Field>

          <Field label="Delivery fee (R)">
            <input
              type="number"
              name="deliveryFeeRand"
              min={0}
              step="0.5"
              defaultValue={feeRand}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
          Tip: Start simple (e.g. radius 3–5km, fee R10–R25). Later we can upgrade
          to “zones” or Google Maps distance pricing.
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Save delivery settings
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

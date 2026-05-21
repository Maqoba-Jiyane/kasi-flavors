// app/(dashboard)/owner/store/settings/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  buildSouthAfricanAddress,
  geocodeStoreAddress,
} from "@/lib/location/geocode";
import { StoreGeneralSettingsForm } from "@/components/owner/StoreGeneralSettingsForm";

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
      postalCode: true,
      lat: true,
      lng: true,
      avgPrepTimeMinutes: true,
      onlinePaymentsEnabled: true,
    },
  });

  if (!store) {
    return (
      <div className="rounded-4xl border border-black/10 bg-white p-6 text-sm shadow-sm">
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
      select: { id: true, slug: true },
    });

    if (!store) throw new Error("No store linked to this account");

    const postalCode = String(formData.get("postalCode") || "").trim();
    const latRaw = String(formData.get("lat") || "").trim();
    const lngRaw = String(formData.get("lng") || "").trim();

    const formLat = latRaw ? Number(latRaw) : null;
    const formLng = lngRaw ? Number(lngRaw) : null;

    const name = String(formData.get("name") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const area = String(formData.get("area") || "").trim();

    const avgPrepRaw = Number(formData.get("avgPrepTimeMinutes") || 25);
    const avgPrepTimeMinutes = clampInt(
      Number.isFinite(avgPrepRaw) ? avgPrepRaw : 25,
      5,
      180,
    );

    const onlinePaymentsEnabled =
      formData.get("onlinePaymentsEnabled") === "on";

    if (!name) throw new Error("Store name is required");
    if (!address) throw new Error("Address is required");
    if (!city) throw new Error("City is required");

    const fullAddress = buildSouthAfricanAddress([address, area, city]);
    let geocoded: {
      lat: number;
      lng: number;
      precision?: string;
    } | null = null;

    if (
      formLat !== null &&
      formLng !== null &&
      Number.isFinite(formLat) &&
      Number.isFinite(formLng)
    ) {
      geocoded = {
        lat: formLat,
        lng: formLng,
        precision: "EXACT_ADDRESS",
      };
    } else {
      geocoded = await geocodeStoreAddress({
        address,
        area,
        city,
        postalCode,
      });
    }

    console.log("fullAddress: ", fullAddress, "geocoded: ", geocoded);

    await prisma.store.update({
      where: { id: store.id },
      data: {
        name,
        address,
        city,
        area,
        postalCode,
        ...(geocoded
          ? {
              lat: geocoded.lat,
              lng: geocoded.lng,
              locationVerified: geocoded.precision === "EXACT_ADDRESS",
            }
          : {
              locationVerified: false,
            }),
        avgPrepTimeMinutes,
        onlinePaymentsEnabled,
      },
    });

    revalidateTag("stores", "max");
    revalidateTag("stores:open-collection", "max");
    revalidateTag("stores:all-collection", "max");
    revalidateTag(`store:${store.slug}`, "max");
    revalidateTag(`store-menu:${store.slug}`, "max");

    revalidatePath("/");
    revalidatePath("/owner/store/settings");
    revalidatePath(`/stores/${store.slug}`);
  }

  return (
    <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
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

      <StoreGeneralSettingsForm store={store} action={save} />
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

// app/(dashboard)/owner/store/settings/pricing/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { PriceAdjustmentSettings } from "@/components/PriceAdjustmentSettings";

export default async function StorePricingSettingsPage() {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      priceAdjustmentEnabled: true,
      priceAdjustmentPercent: true,
    },
  });

  if (!store) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        No store linked to this account.
      </div>
    );
  }

  return (
    <PriceAdjustmentSettings
      storeId={store.id}
      priceAdjustmentEnabled={store.priceAdjustmentEnabled}
      priceAdjustmentPercent={store.priceAdjustmentPercent}
    />
  );
}

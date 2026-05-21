// src/lib/pricing.ts

// src/lib/pricing.ts

export function applyPriceAdjustment(
  priceCents: number,
  enabled?: boolean | null,
  percent?: number | null,
) {
  if (!enabled || !percent) return priceCents;

  const adjusted = priceCents * (1 + percent / 100);

  return Math.max(0, Math.round(adjusted));
}

export function formatMoney(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

export function applyEffectiveProductPrice({
  basePriceCents,
  storeAdjustmentEnabled,
  storeAdjustmentPercent,
  productAdjustmentEnabled,
  productAdjustmentPercent,
}: {
  basePriceCents: number;
  storeAdjustmentEnabled?: boolean | null;
  storeAdjustmentPercent?: number | null;
  productAdjustmentEnabled?: boolean | null;
  productAdjustmentPercent?: number | null;
}) {
  let price = basePriceCents;

  price = applyPriceAdjustment(
    price,
    storeAdjustmentEnabled,
    storeAdjustmentPercent,
  );

  price = applyPriceAdjustment(
    price,
    productAdjustmentEnabled,
    productAdjustmentPercent,
  );

  return price;
}
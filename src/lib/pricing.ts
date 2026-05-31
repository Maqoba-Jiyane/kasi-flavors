// src/lib/pricing.ts
// src/lib/pricing.ts

export function roundToNearest50Cents(priceCents: number) {
  if (!Number.isFinite(priceCents)) return 0;

  return Math.max(0, Math.round(priceCents / 50) * 50);
}

export function applyPriceAdjustment(
  priceCents: number,
  enabled?: boolean | null,
  percent?: number | null,
) {
  
  if (!enabled || !percent) return priceCents;
  
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return 0;
  }

  if (!enabled || !Number.isFinite(percent) || percent === 0) {
    return roundToNearest50Cents(priceCents);
  }

  const adjusted = priceCents * (1 + percent / 100);

  return roundToNearest50Cents(adjusted);
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
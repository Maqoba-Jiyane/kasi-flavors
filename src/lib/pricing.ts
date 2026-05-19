// lib/pricing.ts

/**
 * Apply a single percentage adjustment to a price. Works for both store-level
 * and product-level adjustments.
 */
export function applyPriceAdjustment(
  baseCents: number,
  enabled: boolean | null | undefined,
  percent: number | null | undefined
): number {
  if (!enabled || !percent) {
    return baseCents;
  }

  const multiplier = 1 + percent / 100;
  const adjusted = Math.round(baseCents * multiplier);
  return adjusted;
}

/**
 * Compute the final price given an optional product-level adjustment followed by
 * an optional store-level adjustment. Product adjustments are applied first so
 * a product-specific markup/discount composes with any global adjustment.
 */
export function applyAllAdjustments(
  baseCents: number,
  storeEnabled: boolean | null | undefined,
  storePercent: number | null | undefined,
  productEnabled: boolean | null | undefined,
  productPercent: number | null | undefined,
): number {
  let price = baseCents;
  if (productEnabled && productPercent) {
    price = applyPriceAdjustment(price, productEnabled, productPercent);
  }
  if (storeEnabled && storePercent) {
    price = applyPriceAdjustment(price, storeEnabled, storePercent);
  }
  return price;
}


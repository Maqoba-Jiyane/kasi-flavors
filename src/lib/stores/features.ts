// src/lib/stores/features.ts

type StoreFeatureFlags = {
  premiumEnabled: boolean;
  premiumUntil: Date | string | null;
};

function toDate(value: Date | string | null) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function storeHasActivePremium(store: StoreFeatureFlags) {
  if (!store.premiumEnabled) return false;

  const premiumUntil = toDate(store.premiumUntil);

  // If premium is enabled and no expiry date is set,
  // treat it as active until manually disabled.
  if (!premiumUntil) return true;

  return premiumUntil.getTime() > Date.now();
}

export function getStoreFeatures(store: StoreFeatureFlags) {
  const premiumActive = storeHasActivePremium(store);

  return {
    premiumActive,
  };
}
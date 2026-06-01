// app/(public)/become-a-partner/StoreSignupClient.tsx
"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import dynamic from "next/dynamic";

type SavedOnboarding = {
  id: string;
  status: string;
  storeName: string | null;
  description: string | null;
  address: string | null;
  area: string | null;
  city: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  avgPrepTimeMinutes: number;
  supportsCollection: boolean;
  supportsDelivery: boolean;
  deliveryFeeCents: number | null;
  deliveryRadiusKm: number | null;
  cashOnCollectionEnabled: boolean;
  namingTheme:
    | "DESCRIPTIVE"
    | "KASI_STYLE"
    | "MINIMAL"
    | "COMBO_STYLE"
    | "STORE_BRANDED"
    | null;
  extractedMenuJson: unknown;
  reviewedProductsJson: unknown;
  menuImages: unknown;
};

type DraftProduct = {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  priceCents: number;
  imagePrompt: string;
  imageUrl: string;
  isAvailable: boolean;
  priceAdjustmentEnabled: boolean;
  priceAdjustmentPercent: number;
  namingConfidence: "HIGH" | "MEDIUM" | "LOW";
};

type StoreDraft = {
  storeName: string;
  description: string;
  address: string;
  area: string;
  city: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  avgPrepTimeMinutes: number;
  supportsCollection: boolean;
  supportsDelivery: boolean;
  deliveryFeeCents: number;
  deliveryRadiusKm: number;
  cashOnCollectionEnabled: boolean;
  namingTheme:
    | "DESCRIPTIVE"
    | "KASI_STYLE"
    | "MINIMAL"
    | "COMBO_STYLE"
    | "STORE_BRANDED";
};

const emptyStore: StoreDraft = {
  storeName: "",
  description: "",
  address: "",
  area: "",
  city: "",
  postalCode: "",
  lat: null,
  lng: null,
  phone: "",
  avgPrepTimeMinutes: 25,
  supportsCollection: true,
  supportsDelivery: false,
  deliveryFeeCents: 0,
  deliveryRadiusKm: 5,
  cashOnCollectionEnabled: false,
  namingTheme: "DESCRIPTIVE",
};

const StoreLocationPicker = dynamic(
  () =>
    import("@/components/onboarding/StoreLocationPicker").then(
      (mod) => mod.StoreLocationPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center rounded-3xl border border-black/10 bg-kasi-cream text-sm font-bold text-black/55">
        Loading map...
      </div>
    ),
  },
);

function newDraftProduct(): DraftProduct {
  return {
    id: cryptoRandom(),
    name: "",
    description: "",
    categoryName: "Menu",
    priceCents: 0,
    imagePrompt: "",
    imageUrl: "",
    isAvailable: true,
    priceAdjustmentEnabled: false,
    priceAdjustmentPercent: 0,
    namingConfidence: "MEDIUM",
  };
}

function centsToRand(cents: number) {
  return (cents / 100).toFixed(2);
}

function randToCents(value: string) {
  const cleaned = value.replace(",", ".").trim();
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed < 0) return 0;

  return Math.round(parsed * 100);
}

function buildStoreFromSaved(saved?: SavedOnboarding | null): StoreDraft {
  if (!saved) return emptyStore;

  return {
    storeName: saved.storeName ?? "",
    description: saved.description ?? "",
    address: saved.address ?? "",
    area: saved.area ?? "",
    city: saved.city ?? "",
    postalCode: saved.postalCode ?? "",
    lat: typeof saved.lat === "number" ? saved.lat : null,
    lng: typeof saved.lng === "number" ? saved.lng : null,
    phone: saved.phone ?? "",
    avgPrepTimeMinutes: saved.avgPrepTimeMinutes ?? 25,
    supportsCollection: saved.supportsCollection ?? true,
    supportsDelivery: saved.supportsDelivery ?? false,
    deliveryFeeCents: saved.deliveryFeeCents ?? 0,
    deliveryRadiusKm: saved.deliveryRadiusKm ?? 5,
    cashOnCollectionEnabled: saved.cashOnCollectionEnabled ?? false,
    namingTheme: saved.namingTheme ?? "DESCRIPTIVE",
  };
}

function buildProductsFromSaved(
  saved?: SavedOnboarding | null,
): DraftProduct[] {
  if (!saved) return [newDraftProduct()];

  const reviewedProducts = Array.isArray(saved.reviewedProductsJson)
    ? saved.reviewedProductsJson
    : null;

  const extractedRaw = saved.extractedMenuJson as
    | { products?: unknown[] }
    | null
    | undefined;

  const extractedProducts = Array.isArray(extractedRaw?.products)
    ? extractedRaw.products
    : null;

  const source = reviewedProducts || extractedProducts;

  if (!Array.isArray(source) || source.length === 0) {
    return [newDraftProduct()];
  }

  const products: DraftProduct[] = source
    .map((item: any) => ({
      id: cryptoRandom(),
      name: String(item?.name || "").trim(),
      description: String(item?.description || "").trim(),
      categoryName:
        String(item?.categoryName || item?.category || "Menu").trim() || "Menu",
      priceCents: Number(item?.priceCents || 0),
      imagePrompt: String(item?.imagePrompt || "").trim(),
      imageUrl: String(item?.imageUrl || "").trim(),
      isAvailable: item?.isAvailable !== false,
      priceAdjustmentEnabled: Boolean(item?.priceAdjustmentEnabled),
      priceAdjustmentPercent: Number(item?.priceAdjustmentPercent || 0),
      namingConfidence:
        item?.namingConfidence === "HIGH" ||
        item?.namingConfidence === "MEDIUM" ||
        item?.namingConfidence === "LOW"
          ? item.namingConfidence
          : "MEDIUM",
    }))
    .filter((item) => item.name || item.priceCents > 0);

  return products.length > 0 ? products : [newDraftProduct()];
}

function getInitialStep(saved?: SavedOnboarding | null) {
  if (!saved) return 1;

  if (saved.reviewedProductsJson) return 5;
  if (saved.extractedMenuJson) return 4;
  if (saved.storeName && saved.address && saved.city) return 3;
  if (saved.storeName || saved.address || saved.city) return 2;

  return 1;
}

export function StoreSignupClient({
  user,
  savedOnboarding,
}: {
  user: {
    name?: string | null;
    email?: string | null;
  };
  savedOnboarding?: SavedOnboarding | null;
}) {
  const [step, setStep] = React.useState(() => getInitialStep(savedOnboarding));
  const [toast, setToast] = React.useState<string | null>(null);

  const [onboardingId, setOnboardingId] = React.useState<string | null>(
    savedOnboarding?.id ?? null,
  );

  const [store, setStore] = React.useState<StoreDraft>(() =>
    buildStoreFromSaved(savedOnboarding),
  );

  const [menuFiles, setMenuFiles] = React.useState<File[]>([]);

  const [products, setProducts] = React.useState<DraftProduct[]>(() =>
    buildProductsFromSaved(savedOnboarding),
  );

  const [extracting, setExtracting] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  function validateStep(currentStep: number) {
    if (currentStep === 1) {
      if (!store.storeName.trim()) {
        return "Store name is required.";
      }

      if (!store.phone.trim()) {
        return "Phone number is required.";
      }

      if (!store.address.trim()) {
        return "Address, house number, street, or landmark is required.";
      }

      // if (!store.area.trim()) {
      //   return "Area, section, or extension is required.";
      // }

      if (!store.city.trim()) {
        return "Town or city is required.";
      }

      const hasCoords =
        typeof store.lat === "number" &&
        typeof store.lng === "number" &&
        Number.isFinite(store.lat) &&
        Number.isFinite(store.lng);

      if (!hasCoords) {
        return "Please select your store location pin on the map.";
      }

      if (
        !Number.isFinite(store.avgPrepTimeMinutes) ||
        store.avgPrepTimeMinutes < 5 ||
        store.avgPrepTimeMinutes > 180
      ) {
        return "Average prep time must be between 5 and 180 minutes.";
      }
    }

    if (currentStep === 2) {
      if (!store.supportsCollection && !store.supportsDelivery) {
        return "Choose at least one order option: collection or delivery.";
      }

      if (store.supportsDelivery) {
        if (
          !Number.isFinite(store.deliveryFeeCents) ||
          store.deliveryFeeCents < 0
        ) {
          return "Delivery fee must be valid.";
        }

        if (
          !Number.isFinite(store.deliveryRadiusKm) ||
          store.deliveryRadiusKm < 1 ||
          store.deliveryRadiusKm > 50
        ) {
          return "Delivery radius must be between 1km and 50km.";
        }
      }
    }

    // if (currentStep === 3) {
    //   if (menuFiles.length === 0) {
    //     return "Please upload at least one clear menu image before continuing.";
    //   }
    // }

    if (currentStep === 4) {
      const validProducts = products.filter(
        (product) => product.name.trim() && product.priceCents > 0,
      );

      if (validProducts.length === 0) {
        return "Add at least one product with a name and price.";
      }

      const missingCategory = products.find(
        (product) => product.name.trim() && !product.categoryName.trim(),
      );

      if (missingCategory) {
        return "Every product must have a category.";
      }

      const invalidProduct = products.find(
        (product) =>
          product.name.trim() &&
          (!Number.isFinite(product.priceCents) || product.priceCents <= 0),
      );

      if (invalidProduct) {
        return "Every product with a name must have a valid price.";
      }
    }

    return null;
  }

  function updateStore<K extends keyof StoreDraft>(
    key: K,
    value: StoreDraft[K],
  ) {
    setStore((prev) => ({ ...prev, [key]: value }));
  }

  function updateProduct(id: string, patch: Partial<DraftProduct>) {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id ? { ...product, ...patch } : product,
      ),
    );
  }

  function addProduct() {
    setProducts((prev) => [...prev, newDraftProduct()]);
  }

  function removeProduct(id: string) {
    setProducts((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((product) => product.id !== id);
    });
  }

  async function extractMenu() {
    setError(null);
    setMessage(null);

    if (menuFiles.length === 0) {
      setError("Please upload at least one clear menu image first.");
      return;
    }

    try {
      setExtracting(true);

      const formData = new FormData();

      if (onboardingId) {
        formData.append("onboardingId", onboardingId);
      }

      for (const file of menuFiles) {
        formData.append("menuImages", file);
      }

      formData.append("namingTheme", store.namingTheme);

      const res = await fetch("/api/store-onboarding/extract-menu", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (json.onboardingId) {
        setOnboardingId(json.onboardingId);
      }

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to extract menu.");
        return;
      }

      const extractedProducts: DraftProduct[] = Array.isArray(json.products)
        ? json.products.map((item: any) => ({
            id: cryptoRandom(),
            name: String(item.name || "").trim(),
            description: String(item.description || "").trim(),
            categoryName:
              String(item.categoryName || item.category || "Menu").trim() ||
              "Menu",
            priceCents: Number(item.priceCents || 0),
            imagePrompt: String(item.imagePrompt || "").trim(),
            imageUrl: "",
            isAvailable: true,
            priceAdjustmentEnabled: false,
            priceAdjustmentPercent: 0,
            namingConfidence:
              item.namingConfidence === "HIGH" ||
              item.namingConfidence === "MEDIUM" ||
              item.namingConfidence === "LOW"
                ? item.namingConfidence
                : "MEDIUM",
          }))
        : [];

      if (extractedProducts.length === 0) {
        setError("No menu items were found. You can add them manually below.");
        return;
      }

      setProducts(extractedProducts);
      setStep(4);
      setMessage("Menu extracted. Please review the products before saving.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong extracting the menu.",
      );
    } finally {
      setExtracting(false);
    }
  }

  async function saveDraft() {
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/store-onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          onboardingId,
          store,
          products: products
            .filter((product) => product.name.trim() && product.priceCents > 0)
            .map((product) => ({
              name: product.name.trim(),
              description: product.description.trim() || null,
              priceCents: product.priceCents,
              imageUrl: product.imageUrl.trim() || null,
              imagePrompt: product.imagePrompt.trim() || null,
              isAvailable: product.isAvailable,
              priceAdjustmentEnabled: product.priceAdjustmentEnabled,
              priceAdjustmentPercent: product.priceAdjustmentPercent,
            })),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to save draft.");
        return;
      }

      if (json.onboardingId) {
        setOnboardingId(json.onboardingId);
      }

      setMessage("Draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft.");
    }
  }

  // function validateStep(currentStep: number) {
  //   if (currentStep === 1) {
  //     if (!store.storeName.trim()) {
  //       return "Store name is required.";
  //     }

  //     if (!store.phone.trim()) {
  //       return "Phone number is required.";
  //     }

  //     if (!store.address.trim()) {
  //       return "Address, house number, street, or landmark is required.";
  //     }

  //     if (!store.area.trim()) {
  //       return "Area, section, or extension is required.";
  //     }

  //     if (!store.city.trim()) {
  //       return "Town or city is required.";
  //     }

  //     const hasCoords =
  //       typeof store.lat === "number" &&
  //       typeof store.lng === "number" &&
  //       Number.isFinite(store.lat) &&
  //       Number.isFinite(store.lng);

  //     if (!hasCoords) {
  //       return "Please select your store location pin on the map.";
  //     }

  //     if (
  //       !Number.isFinite(store.avgPrepTimeMinutes) ||
  //       store.avgPrepTimeMinutes < 5 ||
  //       store.avgPrepTimeMinutes > 180
  //     ) {
  //       return "Average prep time must be between 5 and 180 minutes.";
  //     }
  //   }

  //   if (currentStep === 2) {
  //     if (!store.supportsCollection && !store.supportsDelivery) {
  //       return "Choose at least one order option: collection or delivery.";
  //     }

  //     if (store.supportsDelivery) {
  //       if (
  //         !Number.isFinite(store.deliveryFeeCents) ||
  //         store.deliveryFeeCents < 0
  //       ) {
  //         return "Delivery fee must be valid.";
  //       }

  //       if (
  //         !Number.isFinite(store.deliveryRadiusKm) ||
  //         store.deliveryRadiusKm < 1 ||
  //         store.deliveryRadiusKm > 50
  //       ) {
  //         return "Delivery radius must be between 1km and 50km.";
  //       }
  //     }
  //   }

  //   if (currentStep === 3) {
  //     if (menuFiles.length === 0) {
  //       return "Please upload at least one clear menu image before continuing.";
  //     }
  //   }

  //   if (currentStep === 4) {
  //     const validProducts = products.filter(
  //       (product) => product.name.trim() && product.priceCents > 0,
  //     );

  //     if (validProducts.length === 0) {
  //       return "Add at least one product with a name and price.";
  //     }

  //     const invalidProduct = products.find(
  //       (product) =>
  //         product.name.trim() &&
  //         (!Number.isFinite(product.priceCents) || product.priceCents <= 0),
  //     );

  //     if (invalidProduct) {
  //       return "Every product with a name must have a valid price.";
  //     }

  //     const missingCategory = products.find(
  //       (product) => product.name.trim() && !product.categoryName.trim(),
  //     );

  //     if (missingCategory) {
  //       return "Every product must have a category.";
  //     }
  //   }

  //   return null;
  // }

  function goToNextStep() {
    setError(null);
    setMessage(null);

    const validationError = validateStep(step);

    if (validationError) {
      setError(validationError);
      showToast(validationError);
      return;
    }

    setStep((prev) => Math.min(5, prev + 1));
  }

  // function goToNextStep() {
  //   setError(null);
  //   setMessage(null);

  //   const validationError = validateStep(step);

  // if (validationError) {
  //   setError(validationError);
  //   showToast(validationError);
  //   return;
  // }

  //   setStep((prev) => Math.min(5, prev + 1));
  // }

  function validateBeforeSubmit() {
    for (let currentStep = 1; currentStep <= 4; currentStep += 1) {
      const validationError = validateStep(currentStep);

      if (validationError) {
        setStep(currentStep);
        return validationError;
      }
    }

    return null;
  }

  async function submitOnboarding() {
    setError(null);
    setMessage(null);

    const validationError = validateBeforeSubmit();

    if (validationError) {
      setError(validationError);
      showToast(validationError);
      return;
    }

    const finalProducts = products
      .filter((product) => product.name.trim() && product.priceCents > 0)
      .map((product) => ({
        name: product.name.trim(),
        description: product.description.trim() || null,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl.trim() || null,
        imagePrompt: product.imagePrompt.trim() || null,
        isAvailable: product.isAvailable,
        priceAdjustmentEnabled: product.priceAdjustmentEnabled,
        priceAdjustmentPercent: product.priceAdjustmentPercent,
        categoryName: product.categoryName,
      }));

    try {
      setSubmitting(true);

      // console.log(
      //   "[submit onboarding] product categories:",
      //   finalProducts.map((product) => ({
      //     name: product.name,
      //     categoryName: product.categoryName,
      //   })),
      // );

      const res = await fetch("/api/store-onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          onboardingId,
          store,
          products: finalProducts,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to submit store signup.");
        return;
      }

      setMessage(
        "Store signup submitted. Your store and menu are ready for review.",
      );

      if (json.redirectUrl) {
        window.location.href = json.redirectUrl;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong submitting.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-4xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
      {toast && (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-600 shadow-lg">
          {toast}
        </div>
      )}
      <div className="flex flex-col gap-3 border-b border-black/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Store onboarding
          </p>

          <h2 className="mt-1 text-3xl font-black text-kasi-black">
            List your food business
          </h2>

          <p className="mt-1 text-sm font-medium text-black/55">
            Complete the steps below. You can upload your current menu and
            review the digitised products before saving.
          </p>

          <div className="mt-4 rounded-3xl border border-black/10 bg-kasi-cream p-4">
            <p className="text-xs font-black uppercase tracking-wide text-black/45">
              Signed in account
            </p>

            <p className="mt-1 text-sm font-black text-kasi-black">
              {user.name || "Store owner"}
            </p>

            {user.email && (
              <p className="mt-1 text-xs font-medium text-black/55">
                {user.email}
              </p>
            )}

            <p className="mt-2 text-xs font-medium leading-5 text-black/55">
              This account will become the owner account for the store.
            </p>

            {savedOnboarding && (
              <div className="mt-4 rounded-3xl border border-kasi-green/20 bg-kasi-green/10 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-kasi-green">
                  Draft restored
                </p>

                <p className="mt-1 text-sm font-medium leading-6 text-black/65">
                  We found your saved onboarding progress and loaded it here.
                  You can continue from where you left off.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-full bg-kasi-black px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
          Step {step} of 5
        </div>
      </div>

      <StepBar current={step} />

      {message && (
        <div className="mt-5 rounded-2xl border border-kasi-green/20 bg-kasi-green/10 px-4 py-3 text-sm font-bold text-kasi-green">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6">
        {step === 1 && (
          <StoreDetailsStep store={store} updateStore={updateStore} />
        )}

        {step === 2 && (
          <OperationsStep store={store} updateStore={updateStore} />
        )}

        {step === 3 && (
          <MenuUploadStep
            menuFiles={menuFiles}
            setMenuFiles={setMenuFiles}
            extracting={extracting}
            onExtract={extractMenu}
          />
        )}

        {step === 4 && (
          <ProductsReviewStep
            products={products}
            updateProduct={updateProduct}
            addProduct={addProduct}
            removeProduct={removeProduct}
          />
        )}

        {step === 5 && <FinalReviewStep store={store} products={products} />}
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          disabled={step === 1 || submitting || extracting}
          className="rounded-full border-2 border-black/10 bg-white px-5 py-3 text-sm font-black text-kasi-black transition hover:border-kasi-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        <button
          type="button"
          onClick={saveDraft}
          disabled={submitting || extracting}
          className="rounded-full border-2 border-black/10 bg-white px-5 py-3 text-sm font-black text-kasi-black transition hover:border-kasi-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save draft
        </button>

        <div className="flex flex-col gap-2 sm:flex-row">
          {step < 5 ? (
            <button
              type="button"
              onClick={goToNextStep}
              disabled={extracting || submitting}
              className="rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submitOnboarding}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Submitting..." : "Submit store"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBar({ current }: { current: number }) {
  const steps = [
    "Store details",
    "Order setup",
    "Upload menu",
    "Review products",
    "Submit",
  ];

  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-5">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const active = current === stepNumber;
        const done = current > stepNumber;

        return (
          <div
            key={label}
            className={[
              "rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-wide",
              active
                ? "border-kasi-green bg-kasi-green text-white"
                : done
                  ? "border-kasi-green/20 bg-kasi-green/10 text-kasi-green"
                  : "border-black/10 bg-kasi-cream text-black/45",
            ].join(" ")}
          >
            {stepNumber}. {label}
          </div>
        );
      })}
    </div>
  );
}

function StoreDetailsStep({
  store,
  updateStore,
}: {
  store: StoreDraft;
  updateStore: <K extends keyof StoreDraft>(
    key: K,
    value: StoreDraft[K],
  ) => void;
}) {
  const hasCoords =
    typeof store.lat === "number" &&
    typeof store.lng === "number" &&
    Number.isFinite(store.lat) &&
    Number.isFinite(store.lng);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Your browser does not support location sharing.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        updateStore("lat", lat);
        updateStore("lng", lng);

        try {
          const res = await fetch("/api/location/reverse-geocode", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({ lat, lng }),
          });

          const data = await res.json();

          if (!res.ok || !data?.success) {
            return;
          }

          const found = data.location;

          if (found.address) updateStore("address", found.address);
          if (found.area) updateStore("area", found.area);
          if (found.city) updateStore("city", found.city);
          if (found.postalCode) updateStore("postalCode", found.postalCode);
        } catch {
          // Coordinates are still useful even if address lookup fails.
        }
      },
      () => {
        alert(
          "We could not access your location. Please allow location access or place the pin manually.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60_000,
      },
    );
  }

  return (
    <div>
      <SectionHeading
        title="Store details"
        text="Tell us where your food business operates and help customers find the correct collection point."
      />

      <div className="mt-5 grid gap-5">
        {/* Basic info */}
        <section className="rounded-3xl border border-black/10 bg-white p-4">
          <div className="mb-4">
            <p className="text-sm font-black text-kasi-black">Business info</p>
            <p className="mt-1 text-xs font-medium leading-5 text-black/55">
              Add the name, contact number, and short description customers will
              see on Kasi Flavors.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Store name">
              <input
                value={store.storeName}
                onChange={(e) => updateStore("storeName", e.target.value)}
                className={inputCls}
                placeholder="e.g. Mdu's Kota Spot"
              />
            </Field>

            <Field label="Phone number">
              <input
                value={store.phone}
                onChange={(e) => updateStore("phone", e.target.value)}
                className={inputCls}
                placeholder="e.g. 073 000 0000"
                inputMode="tel"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Short description">
              <textarea
                value={store.description}
                onChange={(e) => updateStore("description", e.target.value)}
                className={inputCls}
                rows={3}
                placeholder="e.g. Fresh kotas, chips, burgers and lunch plates made for collection."
              />
            </Field>
          </div>
        </section>

        {/* Map pin */}
        <section className="rounded-3xl border border-black/10 bg-kasi-cream p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-kasi-black">
                Store location pin
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-black/55">
                This pin is used for OpenStreetMap location, distance checks,
                and customer directions. Use your current location, then move
                the pin to the exact gate, stall, corner, or collection point.
              </p>
            </div>

            <button
              type="button"
              onClick={useCurrentLocation}
              className="rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange"
            >
              Use current location
            </button>
          </div>

          {hasCoords ? (
            <div className="mt-3 rounded-2xl bg-white px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-black/45">
                Selected map coordinates
              </p>

              <p className="mt-1 text-xs font-bold text-kasi-black">
                {store.lat!.toFixed(6)}, {store.lng!.toFixed(6)}
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-black/50">
                If the address below looks slightly wrong, keep the pin accurate
                and edit the address or landmark manually.
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl bg-white px-4 py-3">
              <p className="text-xs font-bold leading-5 text-black/55">
                No pin selected yet. Choose your current location or place the
                pin manually on the map.
              </p>
            </div>
          )}

          <div className="mt-4">
            <StoreLocationPicker
              lat={store.lat}
              lng={store.lng}
              onChange={({ lat, lng }) => {
                updateStore("lat", lat);
                updateStore("lng", lng);
              }}
            />
          </div>
        </section>

        {/* Address and reverse-geocoded details */}
        <section className="rounded-3xl border border-black/10 bg-white p-4">
          <div className="mb-4">
            <p className="text-sm font-black text-kasi-black">
              Address details
            </p>

            <p className="mt-1 text-xs font-medium leading-5 text-black/55">
              OpenStreetMap may fill in the nearest street, suburb, or area from
              your pin. Please edit it so customers can understand the location
              in real township terms.
            </p>
          </div>

          <Field label="Address, house number, street, or landmark">
            <input
              value={store.address}
              onChange={(e) => updateStore("address", e.target.value)}
              className={inputCls}
              placeholder="e.g. 1234 Block L, opposite the primary school / next to the taxi rank"
            />
          </Field>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Area / section / extension">
              <input
                value={store.area}
                onChange={(e) => updateStore("area", e.target.value)}
                className={inputCls}
                placeholder="e.g. Olievenhoutbosch Ext 36"
              />
            </Field>

            <Field label="Town / city">
              <input
                value={store.city}
                onChange={(e) => updateStore("city", e.target.value)}
                className={inputCls}
                placeholder="e.g. Centurion"
              />
            </Field>

            <Field label="Postal code">
              <input
                value={store.postalCode}
                onChange={(e) => updateStore("postalCode", e.target.value)}
                className={inputCls}
                placeholder="e.g. 0187"
                inputMode="numeric"
              />
            </Field>
          </div>

          <div className="mt-4 rounded-2xl bg-kasi-cream p-4">
            <p className="text-xs font-black uppercase tracking-wide text-black/45">
              Helpful township directions
            </p>

            <p className="mt-1 text-xs font-medium leading-5 text-black/60">
              Add details customers will recognise: “blue gate near the soccer
              ground”, “opposite the school”, “next to the spaza shop”, “corner
              house by the taxi rank”, or “behind the community hall”.
            </p>
          </div>
        </section>

        {/* Prep and naming */}
        <section className="rounded-3xl border border-black/10 bg-white p-4">
          <div className="mb-4">
            <p className="text-sm font-black text-kasi-black">Order settings</p>

            <p className="mt-1 text-xs font-medium leading-5 text-black/55">
              Set how long customers should expect to wait and how AI should
              name unclear menu items.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Average prep time minutes">
              <input
                type="number"
                min={5}
                max={180}
                value={store.avgPrepTimeMinutes}
                onChange={(e) =>
                  updateStore("avgPrepTimeMinutes", Number(e.target.value))
                }
                className={inputCls}
              />
            </Field>

            <Field label="Product naming style">
              <select
                value={store.namingTheme}
                onChange={(e) =>
                  updateStore(
                    "namingTheme",
                    e.target.value as StoreDraft["namingTheme"],
                  )
                }
                className={inputCls}
              >
                <option value="DESCRIPTIVE">Clear and descriptive</option>
                <option value="KASI_STYLE">Kasi-style names</option>
                <option value="MINIMAL">Short and simple</option>
                <option value="COMBO_STYLE">Combo-style names</option>
                <option value="STORE_BRANDED">Store-branded names</option>
              </select>
            </Field>
          </div>

          <p className="mt-3 text-xs font-medium leading-5 text-black/55">
            If your menu items do not have clear names, AI will generate
            customer-friendly names using this style.
          </p>
        </section>
      </div>
    </div>
  );
}

function OperationsStep({
  store,
  updateStore,
}: {
  store: StoreDraft;
  updateStore: <K extends keyof StoreDraft>(
    key: K,
    value: StoreDraft[K],
  ) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Order setup"
        text="Choose how customers can order from your store."
      />

      <div className="mt-5 grid gap-4">
        {/* <div className="grid gap-4 sm:grid-cols-2">
          <ToggleCard
            title="Collection"
            text="Customers collect their order from your store."
            checked={store.supportsCollection}
            onChange={(checked) => updateStore("supportsCollection", checked)}
          />

          {/* <ToggleCard
            title="Delivery"
            text="Customers can request delivery if your store supports it."
            checked={store.supportsDelivery}
            onChange={(checked) => updateStore("supportsDelivery", checked)}
          />
        </div> */}

        {store.supportsDelivery && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Delivery fee">
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-kasi-black px-4 py-3 text-sm font-black text-white">
                  R
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={centsToRand(store.deliveryFeeCents)}
                  onChange={(e) =>
                    updateStore("deliveryFeeCents", randToCents(e.target.value))
                  }
                  className={inputCls}
                />
              </div>
            </Field>

            <Field label="Delivery radius km">
              <input
                type="number"
                min={1}
                max={50}
                value={store.deliveryRadiusKm}
                onChange={(e) =>
                  updateStore("deliveryRadiusKm", Number(e.target.value))
                }
                className={inputCls}
              />
            </Field>
          </div>
        )}

        <div className="rounded-3xl border-2 border-kasi-green bg-kasi-green/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-kasi-black">
                Online payments
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-black/55">
                Online payments are enabled by default. Customers will be
                encouraged to pay securely online when placing an order.
              </p>
            </div>

            <span className="rounded-full bg-kasi-green px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
              Enabled
            </span>
          </div>
        </div>

        <ToggleCard
          title="Cash on collection"
          text="Allow customers to pay you directly when they collect their order. Platform fees will be tracked in your weekly balance."
          checked={store.cashOnCollectionEnabled}
          onChange={(checked) =>
            updateStore("cashOnCollectionEnabled", checked)
          }
        />
      </div>
    </div>
  );
}

function MenuUploadStep({
  menuFiles,
  setMenuFiles,
  extracting,
  onExtract,
}: {
  menuFiles: File[];
  setMenuFiles: React.Dispatch<React.SetStateAction<File[]>>;
  extracting: boolean;
  onExtract: () => Promise<void>;
}) {
  return (
    <div>
      <SectionHeading
        title="Upload your menu"
        text="Upload clear pictures of your current menu. Make sure item names and prices are readable."
      />

      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-4xl border-2 border-dashed border-black/15 bg-kasi-cream px-6 py-10 text-center transition hover:border-kasi-green hover:bg-kasi-green/5">
        <UploadCloud className="h-10 w-10 text-kasi-green" />

        <span className="mt-3 text-lg font-black text-kasi-black">
          Upload menu images
        </span>

        <span className="mt-1 text-sm font-medium text-black/55">
          PNG, JPG, or WEBP. You can upload multiple pages.
        </span>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setMenuFiles(files);
          }}
        />
      </label>

      {menuFiles.length > 0 && (
        <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-black/45">
            Uploaded files
          </p>

          <ul className="mt-2 space-y-2">
            {menuFiles.map((file) => (
              <li
                key={`${file.name}-${file.size}`}
                className="rounded-2xl bg-kasi-cream px-4 py-3 text-sm font-bold text-kasi-black"
              >
                {file.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onExtract}
        disabled={extracting || menuFiles.length === 0}
        className="mt-5 inline-flex items-center rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-50"
      >
        {extracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {extracting ? "Extracting menu..." : "Extract menu items"}
      </button>

      <p className="mt-3 text-xs font-medium leading-5 text-black/50">
        You will still be able to review and edit every product before saving.
      </p>
    </div>
  );
}

function ProductsReviewStep({
  products,
  updateProduct,
  addProduct,
  removeProduct,
}: {
  products: DraftProduct[];
  updateProduct: (id: string, patch: Partial<DraftProduct>) => void;
  addProduct: () => void;
  removeProduct: (id: string) => void;
}) {
  return (
    <div>
      <SectionHeading
        title="Review products"
        text="Check the extracted items. Fix names, descriptions, prices, and availability before saving."
      />

      <div className="mt-5 space-y-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="rounded-3xl border border-black/10 bg-kasi-cream p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-wide text-black/45">
                Product {index + 1}
              </p>

              <button
                type="button"
                onClick={() => removeProduct(product.id)}
                disabled={products.length === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-500 hover:text-white disabled:opacity-40"
                aria-label="Remove product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[180px_1fr_160px]">
                <Field label="Category">
                  <input
                    value={product.categoryName}
                    onChange={(e) =>
                      updateProduct(product.id, {
                        categoryName: e.target.value,
                      })
                    }
                    className={inputCls}
                    placeholder="e.g. Kotas"
                  />
                </Field>

                <Field label="Product name">
                  <input
                    value={product.name}
                    onChange={(e) =>
                      updateProduct(product.id, { name: e.target.value })
                    }
                    className={inputCls}
                    placeholder="e.g. Russian Cheese Kota"
                  />
                </Field>

                <Field label="Price">
                  <div className="flex items-center gap-2">
                    <span className="rounded-2xl bg-kasi-black px-4 py-3 text-sm font-black text-white">
                      R
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={centsToRand(product.priceCents)}
                      onChange={(e) =>
                        updateProduct(product.id, {
                          priceCents: randToCents(e.target.value),
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  value={product.description}
                  onChange={(e) =>
                    updateProduct(product.id, {
                      description: e.target.value,
                    })
                  }
                  className={inputCls}
                  rows={2}
                  placeholder="What comes with this item?"
                />
              </Field>

              <Field label="Image prompt optional">
                <textarea
                  value={product.imagePrompt}
                  onChange={(e) =>
                    updateProduct(product.id, {
                      imagePrompt: e.target.value,
                    })
                  }
                  className={inputCls}
                  rows={2}
                  placeholder="Example: A realistic kota with chips, egg, russian and sauce on a clean food delivery background."
                />
              </Field>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-kasi-black">
                  <input
                    type="checkbox"
                    checked={product.isAvailable}
                    onChange={(e) =>
                      updateProduct(product.id, {
                        isAvailable: e.target.checked,
                      })
                    }
                    className="accent-kasi-green"
                  />
                  Available
                </label>

                <label className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-kasi-black">
                  <input
                    type="checkbox"
                    checked={product.priceAdjustmentEnabled}
                    onChange={(e) =>
                      updateProduct(product.id, {
                        priceAdjustmentEnabled: e.target.checked,
                      })
                    }
                    className="accent-kasi-green"
                  />
                  Product price adjustment
                </label>
              </div>

              {product.priceAdjustmentEnabled && (
                <Field label="Price adjustment percent">
                  <input
                    type="number"
                    step="0.1"
                    value={product.priceAdjustmentPercent}
                    onChange={(e) =>
                      updateProduct(product.id, {
                        priceAdjustmentPercent: Number(e.target.value),
                      })
                    }
                    className={inputCls}
                    placeholder="Example: 10 for markup, -10 for discount"
                  />
                </Field>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addProduct}
        className="mt-5 inline-flex items-center rounded-full border-2 border-black/10 bg-white px-5 py-3 text-sm font-black text-kasi-black transition hover:border-kasi-green hover:text-kasi-green"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add product
      </button>
    </div>
  );
}

function FinalReviewStep({
  store,
  products,
}: {
  store: StoreDraft;
  products: DraftProduct[];
}) {
  const validProducts = products.filter(
    (product) => product.name.trim() && product.priceCents > 0,
  );

  return (
    <div>
      <SectionHeading
        title="Final review"
        text="Check your store and menu summary before submitting."
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-black/10 bg-kasi-cream p-4">
          <p className="text-xs font-black uppercase tracking-wide text-black/45">
            Store
          </p>

          <h3 className="mt-2 text-2xl font-black text-kasi-black">
            {store.storeName || "Store name missing"}
          </h3>

          <p className="mt-2 text-sm font-medium text-black/60">
            {store.area ? `${store.area}, ` : ""}
            {store.city || "City missing"}
          </p>

          <p className="mt-3 text-sm font-medium leading-6 text-black/60">
            {store.description || "No description added yet."}
          </p>
        </div>

        <div className="rounded-3xl border border-black/10 bg-kasi-black p-4 text-white">
          <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
            Menu summary
          </p>

          <p className="mt-2 text-4xl font-black">{validProducts.length}</p>

          <p className="mt-2 text-sm font-medium text-white/65">
            Products ready to be saved.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {store.supportsCollection && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide">
                Collection
              </span>
            )}

            {store.supportsDelivery && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide">
                Delivery
              </span>
            )}

            {store.cashOnCollectionEnabled && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide">
                Cash payments
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-black/10 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wide text-black/45">
          Products
        </p>

        <ul className="mt-3 grid gap-2">
          {validProducts.slice(0, 8).map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-kasi-cream px-4 py-3"
            >
              <span className="font-black text-kasi-black">{product.name}</span>

              <span className="rounded-full bg-golden-yellow px-3 py-1 text-xs font-black text-kasi-black">
                R {centsToRand(product.priceCents)}
              </span>
            </li>
          ))}
        </ul>

        {validProducts.length > 8 && (
          <p className="mt-3 text-xs font-bold text-black/50">
            + {validProducts.length - 8} more products
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-2xl font-black text-kasi-black">{title}</h3>
      <p className="mt-1 text-sm font-medium leading-6 text-black/60">{text}</p>
    </div>
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

function ToggleCard({
  title,
  text,
  checked,
  onChange,
}: {
  title: string;
  text: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={[
        "cursor-pointer rounded-3xl border-2 p-4 transition",
        checked
          ? "border-kasi-green bg-kasi-green/10"
          : "border-black/10 bg-white hover:border-kasi-green/40",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-kasi-black">{title}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-black/55">
            {text}
          </p>
        </div>

        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 accent-kasi-green"
        />
      </div>
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-semibold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10";

function cryptoRandom() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 9);
}

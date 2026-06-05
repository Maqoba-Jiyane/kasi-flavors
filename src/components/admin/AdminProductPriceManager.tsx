"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyPriceAdjustment, formatMoney } from "@/lib/pricing";

type ProductForPricing = {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
  priceAdjustmentEnabled: boolean;
  priceAdjustmentPercent: number;
};

type Props = {
  storeId: string;
  products: ProductForPricing[];
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, value));
}

export function AdminProductPriceManager({ storeId, products }: Props) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [percent, setPercent] = useState(10);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIds.includes(product.id)),
    [products, selectedIds],
  );

  const allSelected =
    products.length > 0 && selectedIds.length === products.length;

  function toggleProduct(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : products.map((product) => product.id));
  }

  async function save() {
    setMessage(null);

    if (selectedIds.length === 0) {
      setMessage({
        type: "error",
        text: "Select at least one product.",
      });
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(
        `/api/admin/stores/${storeId}/products/price-adjustment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            productIds: selectedIds,
            priceAdjustmentEnabled: enabled,
            priceAdjustmentPercent: enabled ? clampPercent(percent) : 0,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        setMessage({
          type: "error",
          text: data?.error || "Failed to update products.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: `${data.updatedCount} product(s) updated.`,
      });

      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-street-orange">
        Admin pricing
      </p>

      <h2 className="mt-1 text-2xl font-black text-kasi-black">
        Manage product discounts
      </h2>

      <p className="mt-1 text-sm font-medium leading-6 text-black/55">
        Select one product, multiple products, or all products. Apply a discount
        using a negative percentage, or remove pricing adjustments completely.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-3xl border border-black/10">
          <div className="flex items-center justify-between bg-kasi-black px-4 py-3 text-white">
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-black uppercase tracking-wide text-golden-yellow"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>

            <span className="text-xs font-black uppercase tracking-wide text-white/60">
              {selectedIds.length} selected
            </span>
          </div>

          <div className="divide-y divide-black/10">
            {products.length === 0 ? (
              <p className="p-4 text-sm font-bold text-black/55">
                No products found.
              </p>
            ) : (
              products.map((product) => {
                const adjustedPrice = applyPriceAdjustment(
                  product.priceCents,
                  product.priceAdjustmentEnabled,
                  product.priceAdjustmentPercent,
                );

                return (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center justify-between gap-3 bg-white px-4 py-3 hover:bg-kasi-cream"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        className="h-4 w-4 accent-kasi-green"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-kasi-black">
                          {product.name}
                        </p>

                        <p className="text-xs font-medium text-black/50">
                          Base: {formatMoney(product.priceCents)}
                          {product.priceAdjustmentEnabled
                            ? ` · Adjustment: ${product.priceAdjustmentPercent}%`
                            : " · No adjustment"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="rounded-full bg-golden-yellow px-3 py-1 text-xs font-black text-kasi-black">
                        {formatMoney(adjustedPrice)}
                      </p>

                      {!product.isAvailable && (
                        <p className="mt-1 text-[11px] font-bold text-red-600">
                          Hidden
                        </p>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-kasi-cream p-4">
          <p className="text-sm font-black text-kasi-black">
            Apply to selected
          </p>

          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
              <span className="text-sm font-bold text-kasi-black">
                Enable adjustment
              </span>

              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-4 w-4 accent-kasi-green"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-black/50">
                Percentage
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="-100"
                  max="100"
                  step="0.5"
                  value={percent}
                  disabled={!enabled}
                  onChange={(event) =>
                    setPercent(clampPercent(Number(event.target.value)))
                  }
                  className="w-28 rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-black text-kasi-black outline-none focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10 disabled:opacity-50"
                />

                <span className="text-sm font-black text-kasi-black">%</span>
              </div>

              <p className="text-xs font-medium leading-5 text-black/55">
                Use negative values for discounts. Example: -10 gives a 10%
                discount.
              </p>
            </label>

            <div className="rounded-2xl bg-white p-3 text-xs font-medium leading-5 text-black/60">
              {selectedProducts.length > 0 ? (
                <>
                  Preview using{" "}
                  <span className="font-black text-kasi-black">
                    {selectedProducts[0].name}
                  </span>
                  :{" "}
                  <span className="font-black text-kasi-black">
                    {formatMoney(selectedProducts[0].priceCents)}
                  </span>{" "}
                  becomes{" "}
                  <span className="font-black text-kasi-green">
                    {formatMoney(
                      applyPriceAdjustment(
                        selectedProducts[0].priceCents,
                        enabled,
                        percent,
                      ),
                    )}
                  </span>
                  .
                </>
              ) : (
                "Select a product to preview the adjusted price."
              )}
            </div>

            {message && (
              <div
                className={[
                  "rounded-2xl border px-4 py-3 text-sm font-bold",
                  message.type === "success"
                    ? "border-kasi-green/20 bg-kasi-green/10 text-kasi-green"
                    : "border-red-200 bg-red-50 text-red-600",
                ].join(" ")}
              >
                {message.text}
              </div>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving || selectedIds.length === 0}
              className="w-full rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Apply pricing"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEnabled(false);
                setPercent(0);
              }}
              className="w-full rounded-full border-2 border-black/10 bg-white px-5 py-3 text-sm font-black text-kasi-black transition hover:border-kasi-black"
            >
              Prepare to remove adjustment
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
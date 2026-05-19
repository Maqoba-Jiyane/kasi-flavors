"use client";

import { useState } from "react";

interface PriceAdjustmentSettingsProps {
  storeId: string;
  priceAdjustmentEnabled: boolean;
  priceAdjustmentPercent: number;
}

export function PriceAdjustmentSettings({
  storeId,
  priceAdjustmentEnabled: initialEnabled,
  priceAdjustmentPercent: initialPercent,
}: PriceAdjustmentSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [percent, setPercent] = useState(initialPercent);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/stores/update-price-adjustment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId,
            priceAdjustmentEnabled: isEnabled,
            priceAdjustmentPercent: percent,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to update price settings",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Price adjustment settings updated successfully",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        Price adjustment
      </h2>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Enable price adjustment
              </label>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add a global markup or discount to all product prices for this
                store.
              </p>
            </div>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled
                  ? "bg-emerald-600"
                  : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Percentage Input */}
          {isEnabled && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-50">
                Adjustment percentage
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="-100"
                  max="100"
                  step="0.5"
                  value={percent}
                  onChange={(e) => {
                    let value = Number.parseFloat(e.target.value) || 0;
                    if (value < -100) value = -100;
                    if (value > 100) value = 100;
                    setPercent(value);
                  }}
                  className="w-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50"
                  disabled={!isEnabled || isSaving}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  %
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {percent >= 0
                  ? `Example: An item priced R100 will cost R${(
                      (100 * (100 + percent)) /
                      100
                    ).toFixed(2)} after markup`
                  : `Example: An item priced R100 will cost R${(
                      (100 * (100 + percent)) /
                      100
                    ).toFixed(2)} after discount`}
              </p>
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={`rounded-md p-3 text-xs ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                isSaving
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isSaving ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Saving…
                </>
              ) : (
                "Save settings"
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

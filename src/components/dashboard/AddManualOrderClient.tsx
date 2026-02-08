"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; priceCents: number };

interface Props {
  products: Product[];
  // Optional: wire these when you’re ready
  // supportsDelivery?: boolean;
  // supportsCollection?: boolean;
}

type Row = { id: string; productId: string; quantity: number };

export function AddManualOrderClient({ products }: Props) {
  const router = useRouter();
  const hasProducts = products.length > 0;

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const [rows, setRows] = useState<Row[]>(() =>
    hasProducts
      ? [{ id: cryptoRandom(), productId: products[0]?.id || "", quantity: 1 }]
      : []
  );

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fulfilmentType, setFulfilmentType] =
    useState<"COLLECTION" | "DELIVERY">("COLLECTION");
  const [note, setNote] = useState("");

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  // Optional: auto-clear success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 2500);
    return () => clearTimeout(t);
  }, [success]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function addRow() {
    if (!hasProducts) return;
    setRows((prev) => [
      ...prev,
      { id: cryptoRandom(), productId: products[0]?.id || "", quantity: 1 },
    ]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function getProduct(productId: string) {
    return productMap.get(productId) || null;
  }

  const totals = useMemo(() => {
    let totalCents = 0;
    let totalItems = 0;

    for (const r of rows) {
      totalItems += r.quantity;
      const p = getProduct(r.productId);
      if (!p) continue;
      totalCents += p.priceCents * r.quantity;
    }

    return { totalCents, totalItems };
  }, [rows, productMap]);

  function resetForm() {
    setRows([{ id: cryptoRandom(), productId: products[0]?.id || "", quantity: 1 }]);
    setFullName("");
    setPhone("");
    setEmail("");
    setNote("");
    setFulfilmentType("COLLECTION");
    setError(null);
    setRowErrors({});
    setSuccess(null);
  }

  function validate(): boolean {
    const nextRowErrors: Record<string, string> = {};

    if (!hasProducts) {
      setError("No available menu items. Mark items as available before logging a manual order.");
      return false;
    }

    if (rows.length === 0) {
      setError("Add at least one item to the order.");
      return false;
    }

    for (const r of rows) {
      if (!r.productId || !getProduct(r.productId)) {
        nextRowErrors[r.id] = "Select a valid product.";
      }
      if (!Number.isFinite(r.quantity) || r.quantity < 1) {
        nextRowErrors[r.id] = nextRowErrors[r.id]
          ? nextRowErrors[r.id] + " Quantity must be 1–99."
          : "Quantity must be 1–99.";
      }
      if (r.quantity > 99) {
        nextRowErrors[r.id] = nextRowErrors[r.id]
          ? nextRowErrors[r.id] + " Max 99."
          : "Max 99.";
      }
    }

    setRowErrors(nextRowErrors);

    if (Object.keys(nextRowErrors).length > 0) {
      setError("Fix the highlighted items before creating the order.");
      return false;
    }

    setError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (processing) return;

    setSuccess(null);

    if (!validate()) return;

    setProcessing(true);

    try {
      const payload = {
        items: rows.map((r) => ({
          productId: r.productId,
          quantity: r.quantity,
        })),
        fullName: fullName.trim() || "Walk-in Customer",
        phone: phone.trim(),
        email: email.trim(),
        fulfilmentType,
        note: note.trim(),
      };

      const res = await fetch("/api/owner/manual-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to create order.");
        setProcessing(false);
        return;
      }

      router.refresh();

      resetForm();
      setSuccess("Manual order created.");
      setProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message || "Network error." : "Something went wrong.");
      setProcessing(false);
    }
  }

  if (!hasProducts) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Manual orders unavailable
        </h3>
        <p className="mt-1">
          There are no available menu items for this store. Mark products as{" "}
          <span className="font-medium">available</span> in your menu before logging manual or walk-in orders.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={processing}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Add manual order
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            For phone, WhatsApp or walk-in customers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetForm}
            disabled={processing}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={processing || rows.length === 0}
            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? "Creating..." : "Create order"}
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {rows.map((r) => {
          const product = getProduct(r.productId);
          const lineTotal =
            product && r.quantity > 0 ? ((product.priceCents * r.quantity) / 100).toFixed(2) : "0.00";

          const hasRowError = Boolean(rowErrors[r.id]);

          return (
            <div
              key={r.id}
              className={[
                "flex flex-wrap items-center gap-2 rounded-md p-2",
                hasRowError
                  ? "bg-rose-50 ring-1 ring-rose-200 dark:bg-rose-950/20 dark:ring-rose-900/60"
                  : "bg-slate-50 dark:bg-slate-950/40",
              ].join(" ")}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <label className="flex-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="sr-only">Product</span>
                  <select
                    value={r.productId}
                    onChange={(e) => updateRow(r.id, { productId: e.target.value })}
                    className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    disabled={processing}
                    aria-label="Select product"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — R {(p.priceCents / 100).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="w-24 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="sr-only">Quantity</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    value={Number.isFinite(r.quantity) ? r.quantity : 1}
                    onChange={(e) => {
                      // allow temporary empty typing; clamp later
                      const v = e.target.value;
                      if (v === "") {
                        updateRow(r.id, { quantity: 1 });
                        return;
                      }
                      updateRow(r.id, { quantity: Number(v) });
                    }}
                    onBlur={() => {
                      const q = Number.isFinite(r.quantity) ? r.quantity : 1;
                      const clamped = Math.max(1, Math.min(99, Math.round(q)));
                      if (clamped !== r.quantity) updateRow(r.id, { quantity: clamped });
                    }}
                    className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-center outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    disabled={processing}
                    aria-label="Quantity"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200">
                  R {lineTotal}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  className="rounded-full px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
                  disabled={processing || rows.length === 1}
                  title="Remove item"
                  aria-label="Remove item"
                >
                  ×
                </button>
              </div>

              {hasRowError && (
                <div className="w-full text-[11px] text-rose-700 dark:text-rose-200">
                  {rowErrors[r.id]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add item + total */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={addRow}
          disabled={processing}
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          + Add item
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span>
            Items:{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-50">{totals.totalItems}</span>
          </span>
          <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span>
            Total:{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              R {(totals.totalCents / 100).toFixed(2)}
            </span>
          </span>
        </div>
      </div>

      {/* Customer info */}
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Customer name (optional)"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          disabled={processing}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (for updates)"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          disabled={processing}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          disabled={processing}
        />
      </div>

      {/* Fulfilment */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 dark:text-slate-200">
        <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Fulfilment
        </span>

        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="fulfilment"
            checked={fulfilmentType === "COLLECTION"}
            onChange={() => setFulfilmentType("COLLECTION")}
            disabled={processing}
          />
          <span>Collection</span>
        </label>

        {/* When ready, enable Delivery and guard with store supports */}
        {/* <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="fulfilment"
            checked={fulfilmentType === "DELIVERY"}
            onChange={() => setFulfilmentType("DELIVERY")}
            disabled={processing || !supportsDelivery}
          />
          <span className={!supportsDelivery ? "text-slate-400" : ""}>Delivery</span>
        </label> */}
      </div>

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Notes to kitchen (sauce, spice, special instructions)"
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        disabled={processing}
      />

      {/* Feedback */}
      {error && (
        <div className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </div>
      )}
    </form>
  );
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 9);
}

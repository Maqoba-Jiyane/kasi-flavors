"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; priceCents: number };

interface Props {
  products: Product[];
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
    setRows([
      { id: cryptoRandom(), productId: products[0]?.id || "", quantity: 1 },
    ]);
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
      setError(
        "No available menu items. Mark items as available before logging a manual order."
      );
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
      setError(
        err instanceof Error
          ? err.message || "Network error."
          : "Something went wrong."
      );
      setProcessing(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border-2 border-black/10 bg-kasi-cream px-3 py-2.5 text-sm font-semibold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:bg-white focus:ring-4 focus:ring-kasi-green/10 disabled:cursor-not-allowed disabled:opacity-60";

  if (!hasProducts) {
    return (
      <div className="rounded-[2rem] border border-dashed border-black/15 bg-white p-5 text-sm shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-street-orange">
          Manual orders
        </p>

        <h3 className="mt-2 text-xl font-black text-kasi-black">
          Manual orders unavailable
        </h3>

        <p className="mt-2 text-sm font-medium leading-6 text-black/60">
          There are no available menu items for this store. Mark products as{" "}
          <span className="font-black text-kasi-black">available</span> in your
          menu before logging manual or walk-in orders.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={processing}
      className="space-y-5 rounded-[2rem] border border-black/10 bg-white p-5 text-sm shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Walk-in / WhatsApp orders
          </p>

          <h3 className="mt-1 text-2xl font-black text-kasi-black">
            Add manual order
          </h3>

          <p className="mt-1 text-sm font-medium text-black/55">
            Create an order for phone, WhatsApp, or walk-in customers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={resetForm}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-black disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>

          <button
            type="submit"
            disabled={processing || rows.length === 0}
            className="inline-flex items-center rounded-full bg-kasi-green px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? "Creating..." : "Create order"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const product = getProduct(r.productId);
          const lineTotal =
            product && r.quantity > 0
              ? ((product.priceCents * r.quantity) / 100).toFixed(2)
              : "0.00";

          const hasRowError = Boolean(rowErrors[r.id]);

          return (
            <div
              key={r.id}
              className={[
                "rounded-[1.5rem] border p-3 transition",
                hasRowError
                  ? "border-red-200 bg-red-50"
                  : "border-black/10 bg-kasi-cream",
              ].join(" ")}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_120px]">
                  <label>
                    <span className="sr-only">Product</span>
                    <select
                      value={r.productId}
                      onChange={(e) =>
                        updateRow(r.id, { productId: e.target.value })
                      }
                      className={fieldClass}
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

                  <label>
                    <span className="sr-only">Quantity</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={99}
                      value={Number.isFinite(r.quantity) ? r.quantity : 1}
                      onChange={(e) => {
                        const v = e.target.value;

                        if (v === "") {
                          updateRow(r.id, { quantity: 1 });
                          return;
                        }

                        updateRow(r.id, { quantity: Number(v) });
                      }}
                      onBlur={() => {
                        const q = Number.isFinite(r.quantity) ? r.quantity : 1;
                        const clamped = Math.max(
                          1,
                          Math.min(99, Math.round(q))
                        );

                        if (clamped !== r.quantity) {
                          updateRow(r.id, { quantity: clamped });
                        }
                      }}
                      className={`${fieldClass} text-center`}
                      disabled={processing}
                      aria-label="Quantity"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 lg:w-40">
                  <span className="rounded-full bg-golden-yellow px-3 py-1.5 text-sm font-black text-kasi-black">
                    R {lineTotal}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-500 hover:text-white disabled:opacity-40"
                    disabled={processing || rows.length === 1}
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {hasRowError && (
                <div className="mt-2 text-xs font-bold text-red-600">
                  {rowErrors[r.id]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={addRow}
          disabled={processing}
          className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-green hover:text-kasi-green disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>

        <div className="sm:ml-auto flex flex-wrap items-center gap-2 rounded-full bg-kasi-black px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
          <span>{totals.totalItems} item{totals.totalItems === 1 ? "" : "s"}</span>
          <span className="h-3 w-px bg-white/20" />
          <span className="text-golden-yellow">
            R {(totals.totalCents / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Customer name optional"
          className={fieldClass}
          disabled={processing}
        />

        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone for updates"
          className={fieldClass}
          disabled={processing}
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email optional"
          className={fieldClass}
          disabled={processing}
        />
      </div>

      <div className="rounded-[1.5rem] border border-black/10 bg-kasi-cream p-4">
        <p className="text-xs font-black uppercase tracking-wide text-black/50">
          Fulfilment
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-kasi-black">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2">
            <input
              type="radio"
              name="fulfilment"
              checked={fulfilmentType === "COLLECTION"}
              onChange={() => setFulfilmentType("COLLECTION")}
              disabled={processing}
              className="accent-kasi-green"
            />
            <span>Collection</span>
          </label>
        </div>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Notes to kitchen: sauce, spice, special instructions..."
        className={fieldClass}
        disabled={processing}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {success && !error && (
        <div className="rounded-2xl border border-kasi-green/20 bg-kasi-green/10 px-4 py-3 text-sm font-bold text-kasi-green">
          {success}
        </div>
      )}
    </form>
  );
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 9);
}
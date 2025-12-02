// components/dashboard/AddManualOrderClient.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; priceCents: number };

interface Props {
  products: Product[];
}

type Row = { id: string; productId: string; quantity: number };

export function AddManualOrderClient({ products }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => [{ id: cryptoRandom(), productId: products[0]?.id || "", quantity: 1 }]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fulfilmentType, setFulfilmentType] = useState<"COLLECTION" | "DELIVERY">("COLLECTION");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { id: cryptoRandom(), productId: products[0]?.id || "", quantity: 1 }]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function computeTotalCents() {
    return rows.reduce((sum, r) => {
      const p = products.find((x) => x.id === r.productId);
      if (!p) return sum;
      return sum + p.priceCents * r.quantity;
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (processing) return;

    // minimal validation
    if (rows.length === 0) {
      setError("Add at least one item.");
      return;
    }
    if (!rows.some((r) => r.productId)) {
      setError("Please select a product.");
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const payload = {
        items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity })),
        fullName: fullName || "Walk-in Customer",
        phone,
        email,
        fulfilmentType,
        note,
      };

      const res = await fetch("/api/owner/manual-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to create order");
        setProcessing(false);
        return;
      }

      // success: refresh orders list and reset
      router.refresh(); // ensure the OwnerOrders page fetches latest orders
      // Optionally navigate to orders page or show a success toast
      setProcessing(false);
      setRows([{ id: cryptoRandom(), productId: products[0]?.id || "", quantity: 1 }]);
      setFullName("");
      setPhone("");
      setEmail("");
      setNote("");
      // focus or show a short success message
    } catch (err) {
        if(err instanceof Error){
            setError(err?.message || "Network error");
            setProcessing(false);
        }
    }
  }

  const totalCents = computeTotalCents();

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Add manual order</h3>

      {rows.map((r) => (
        <div key={r.id} className="flex gap-2">
          <select
            value={r.productId}
            onChange={(e) => updateRow(r.id, { productId: e.target.value })}
            className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none dark:border-slate-700 dark:bg-slate-950"
            disabled={processing}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — R {(p.priceCents / 100).toFixed(2)}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            value={r.quantity}
            onChange={(e) => updateRow(r.id, { quantity: Math.max(1, Number(e.target.value || 1)) })}
            className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-center outline-none dark:border-slate-700 dark:bg-slate-950"
            disabled={processing}
          />

          <button
            type="button"
            onClick={() => removeRow(r.id)}
            className="rounded-md px-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
            disabled={processing || rows.length === 1}
            title="Remove row"
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button type="button" onClick={addRow} disabled={processing} className="rounded-full border px-3 py-1 text-xs">
          + Add item
        </button>

        <div className="ml-auto text-xs text-slate-500">
          Total: <span className="font-semibold">R {(totalCents / 100).toFixed(2)}</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Customer name" className="col-span-1 rounded-md border px-2 py-1 text-sm" disabled={processing} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="col-span-1 rounded-md border px-2 py-1 text-sm" disabled={processing} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="col-span-1 rounded-md border px-2 py-1 text-sm" disabled={processing} />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs">
          <input type="radio" name="fulfilment" checked={fulfilmentType === "COLLECTION"} onChange={() => setFulfilmentType("COLLECTION")} disabled={processing} /> Collection
        </label>
        {/* <label className="text-xs">
          <input type="radio" name="fulfilment" checked={fulfilmentType === "DELIVERY"} onChange={() => setFulfilmentType("DELIVERY")} disabled={processing} /> Delivery
        </label> */}
      </div>

      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note to store (optional)" className="w-full rounded-md border px-2 py-1 text-sm" disabled={processing} />

      {error && <div className="text-xs text-red-500">{error}</div>}

      <div className="flex items-center justify-end gap-2">
        <button type="submit" disabled={processing} className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60">
          {processing ? "Creating..." : "Create order"}
        </button>
      </div>
    </form>
  );
}

// tiny client-side unique id
function cryptoRandom() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 9);
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerApplicationForm() {
  const router = useRouter();
  const [values, setValues] = useState({
    storeName: "",
    slug: "",
    description: "",
    address: "",
    city: "",
    area: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setValues((v) => {
      if (name === "storeName") {
        return {
          ...v,
          storeName: value,
          slug: slugify(value),
        };
      }

      return { ...v, [name]: value };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/owner/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to submit");
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("Server error");
    } finally {
      setSubmitting(false);
    }
  };

  function slugify(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // remove special chars
      .replace(/\s+/g, "-") // spaces → -
      .replace(/-+/g, "-"); // collapse --
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="text-red-600">{error}</div>}
      <div>
        <label className="block text-sm font-medium">Store name</label>
        <input
          name="storeName"
          value={values.storeName}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded border px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Slug (unique URL)</label>
        <input
          name="slug"
          value={values.slug}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded border px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          name="description"
          value={values.description}
          onChange={handleChange}
          className="mt-1 block w-full rounded border px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Address</label>
        <input
          name="address"
          value={values.address}
          onChange={handleChange}
          className="mt-1 block w-full rounded border px-2 py-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">City</label>
          <input
            name="city"
            value={values.city}
            onChange={handleChange}
            className="mt-1 block w-full rounded border px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Area</label>
          <input
            name="area"
            value={values.area}
            onChange={handleChange}
            className="mt-1 block w-full rounded border px-2 py-1"
          />
        </div>
      </div>

      <button
        disabled={submitting}
        type="submit"
        className="px-4 py-2 bg-emerald-600 text-white rounded"
      >
        Submit application
      </button>
    </form>
  );
}

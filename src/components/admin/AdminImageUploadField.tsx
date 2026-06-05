"use client";

import * as React from "react";
import { Loader2, UploadCloud } from "lucide-react";

type Props = {
  label: string;
  value: string;
  purpose: "product-image" | "store-og-image";
  entityId: string;
  onUploaded: (url: string) => void;
};

export default function AdminImageUploadField({
  label,
  value,
  purpose,
  entityId,
  onUploaded,
}: Props) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", purpose);
      formData.append("entityId", entityId);

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to upload image.");
        return;
      }

      onUploaded(json.url);
    } catch {
      setError("Something went wrong while uploading.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <label className="text-xs font-black uppercase tracking-wide text-black/50">
        {label}
      </label>

      {value ? (
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-kasi-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="aspect-[1200/630] w-full object-cover"
          />
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-black/15 bg-kasi-cream p-6 text-center text-sm font-bold text-black/50">
          No image uploaded yet.
        </div>
      )}

      <label className="inline-flex w-fit cursor-pointer items-center rounded-full bg-kasi-black px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange">
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="mr-2 h-4 w-4" />
        )}

        {uploading ? "Uploading..." : "Upload image"}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploading}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              uploadImage(file);
            }

            e.currentTarget.value = "";
          }}
        />
      </label>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
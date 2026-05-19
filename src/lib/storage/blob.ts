// src/lib/storage/blob.ts
import { put } from "@vercel/blob";

function safeFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "jpg";

  const base = name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${base || "upload"}.${extension}`;
}

export async function uploadMenuImageToBlob({
  file,
  ownerId,
  onboardingId,
}: {
  file: File;
  ownerId: string;
  onboardingId: string;
}) {
  const fileName = safeFileName(file.name);

  const pathname = `store-onboarding/${ownerId}/${onboardingId}/menu/${Date.now()}-${fileName}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type,
    size: file.size,
    originalName: file.name,
  };
}

export async function uploadProductImageToBlob({
  bytes,
  ownerId,
  storeId,
  productId,
  contentType = "image/png",
}: {
  bytes: Buffer | Uint8Array;
  ownerId: string;
  storeId: string;
  productId: string;
  contentType?: string;
}) {
  const extension = contentType.includes("jpeg")
    ? "jpg"
    : contentType.includes("webp")
      ? "webp"
      : "png";

  const pathname = `stores/${storeId}/products/${productId}-${Date.now()}.${extension}`;

  const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);

  const blob = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType,
  };
}
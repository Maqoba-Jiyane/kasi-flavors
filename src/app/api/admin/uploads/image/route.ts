import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser, assertRole } from "@/lib/auth";

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getExtension(file: File) {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
}

function safeName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image"
  );
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ["ADMIN"]);

    const form = await req.formData();

    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Image file is required." },
        { status: 400 },
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only JPG, PNG, and WEBP images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Image must be smaller than 4MB." },
        { status: 400 },
      );
    }

    const purpose = safeName(String(form.get("purpose") || "admin-upload"));
    const entityId = safeName(String(form.get("entityId") || "unknown"));
    const extension = getExtension(file);

    const pathname = `kasi-flavors/${purpose}/${entityId}/${Date.now()}.${extension}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    console.error("Admin image upload failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to upload image." },
      { status: 500 },
    );
  }
}
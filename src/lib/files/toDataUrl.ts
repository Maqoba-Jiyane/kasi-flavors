// src/lib/files/toDataUrl.ts

export async function fileToDataUrl(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");

  const mimeType = file.type || "image/jpeg";

  return `data:${mimeType};base64,${base64}`;
}
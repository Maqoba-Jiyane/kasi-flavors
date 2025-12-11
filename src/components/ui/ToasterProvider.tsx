// src/components/ui/ToasterProvider.tsx
"use client";

import { Toaster } from "react-hot-toast";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          fontSize: "0.85rem",
        },
      }}
    />
  );
}

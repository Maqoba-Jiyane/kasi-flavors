"use client";

import { useState } from "react";

export default function ToggleStoreButton({
  initialState,
  storeId,
}: {
  initialState: boolean;
  storeId: string;
}) {
  const [isOpen, setIsOpen] = useState(initialState);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    try {
      setLoading(true);

      const res = await fetch("/api/owner/toggle", {
        method: "POST",
        body: JSON.stringify({ storeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Something went wrong");
        return;
      }

      setIsOpen(data.isOpen);
    } catch (e) {
      alert("Error updating store status");
    } finally {
      setLoading(false);
    }
  }

  return (
<button
  onClick={toggle}
  disabled={loading}
  className={`
    flex items-center gap-1
    px-3 py-2
    text-sm font-medium text-white
    rounded-lg
    shadow-sm
    transition-all duration-200
    ${isOpen ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
    ${loading && "opacity-50 cursor-not-allowed shadow-none"}
  `}
>
  {loading ? (
    "Updating..."
  ) : isOpen ? (
    <>
      <span className="inline-block w-2 h-2 bg-white rounded-full"></span>
      Store Open
    </>
  ) : (
    <>
      <span className="inline-block w-2 h-2 bg-white rounded-full"></span>
      Store Closed
    </>
  )}
</button>

  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnerApplication } from "@prisma/client";

export default function OwnerApplicationRow({
  app,
}: {
  app: OwnerApplication & { user?: { email: string; name: string } | null };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const update = async (status: "APPROVED" | "REJECTED") => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/owner-applications/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: app.id, status }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed");
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      alert("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="border-b">
      <td className="px-2 py-1 text-sm">{app.storeName}</td>
      <td className="px-2 py-1 text-sm">{app.slug}</td>
      <td className="px-2 py-1 text-sm">{app.user?.email}</td>
      <td className="px-2 py-1 text-sm">{app.status}</td>
      <td className="px-2 py-1 text-sm">
        {app.status === "PENDING" && (
          <div className="flex gap-2">
            <button
              disabled={loading}
              className="px-2 py-1 bg-green-500 text-white rounded"
              onClick={() => update("APPROVED")}
            >
              Approve
            </button>
            <button
              disabled={loading}
              className="px-2 py-1 bg-red-500 text-white rounded"
              onClick={() => update("REJECTED")}
            >
              Reject
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

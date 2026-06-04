"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

type UserSearchResult = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "CUSTOMER" | "STORE_OWNER" | "ADMIN";
  store: {
    id: string;
    name: string;
  } | null;
};

export default function AssignStoreOwnerPanel({
  storeId,
}: {
  storeId: string;
}) {
  const router = useRouter();

  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] =
    React.useState<UserSearchResult | null>(null);

  const [searching, setSearching] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function searchUsers() {
    setError(null);
    setSelectedUser(null);

    if (query.trim().length < 2) {
      setError("Search by at least 2 characters.");
      return;
    }

    try {
      setSearching(true);

      const res = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(query.trim())}`,
        {
          cache: "no-store",
        },
      );

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to search users.");
        return;
      }

      setUsers(json.users || []);
    } catch {
      setError("Something went wrong while searching users.");
    } finally {
      setSearching(false);
    }
  }

  async function assignOwner() {
    if (!selectedUser) {
      setError("Select a user first.");
      return;
    }

    if (selectedUser.store) {
      setError("This user already has a store linked to their account.");
      return;
    }

    const confirmed = window.confirm(
      `Assign this store to ${selectedUser.name || selectedUser.email}? Their role will become STORE_OWNER.`,
    );

    if (!confirmed) return;

    try {
      setAssigning(true);
      setError(null);

      const res = await fetch(`/api/admin/stores/${storeId}/assign-owner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          ownerId: selectedUser.id,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to assign store owner.");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong while assigning the store.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-black/50">
          Search owner account
        </label>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="min-w-0 flex-1 rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-bold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10"
          />

          <button
            type="button"
            onClick={searchUsers}
            disabled={searching || assigning}
            className="inline-flex items-center rounded-full bg-kasi-black px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {users.length > 0 && (
        <div className="space-y-2">
          {users.map((user) => {
            const disabled = !!user.store;

            return (
              <button
                key={user.id}
                type="button"
                disabled={disabled || assigning}
                onClick={() => setSelectedUser(user)}
                className={[
                  "w-full rounded-2xl border-2 px-4 py-3 text-left transition",
                  selectedUser?.id === user.id
                    ? "border-kasi-green bg-kasi-green/10"
                    : "border-black/10 bg-white hover:border-kasi-green/40",
                  disabled ? "cursor-not-allowed opacity-50" : "",
                ].join(" ")}
              >
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-black text-kasi-black">
                    {user.name || "Unnamed user"}
                  </p>

                  <p className="text-xs font-medium text-black/55">
                    {user.email}
                    {user.phone ? ` · ${user.phone}` : ""}
                  </p>

                  <p className="text-xs font-black uppercase tracking-wide text-black/40">
                    {user.role}
                    {user.store ? ` · Already owns ${user.store.name}` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedUser && (
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-kasi-green">
            Selected owner
          </p>

          <p className="mt-1 text-sm font-black text-kasi-black">
            {selectedUser.name || selectedUser.email}
          </p>

          <p className="mt-1 text-xs font-medium text-black/55">
            {selectedUser.email}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={assignOwner}
        disabled={!selectedUser || assigning}
        className="inline-flex w-full items-center justify-center rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
      >
        {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {assigning ? "Assigning owner..." : "Assign selected owner"}
      </button>
    </div>
  );
}
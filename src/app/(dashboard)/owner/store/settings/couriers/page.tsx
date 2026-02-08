// app/(dashboard)/owner/store/settings/couriers/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export default async function StoreCouriersSettingsPage() {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      couriers: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!store) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        No store linked to this account.
      </div>
    );
  }

  async function toggleCourier(formData: FormData) {
    "use server";

    const courierId = String(formData.get("courierId") || "");
    if (!courierId) throw new Error("Missing courierId");

    const user = await getCurrentUser();
    assertRole(user, ["STORE_OWNER"]);

    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });
    if (!store) throw new Error("No store linked");

    const courier = await prisma.courier.findFirst({
      where: { id: courierId, storeId: store.id },
      select: { id: true, isActive: true },
    });
    if (!courier) throw new Error("Courier not found for this store");

    await prisma.courier.update({
      where: { id: courier.id },
      data: { isActive: !courier.isActive },
    });

    revalidatePath("/owner/store/settings/couriers");
  }

  async function enrollCourier(formData: FormData) {
    "use server";

    const email = String(formData.get("email") || "").trim().toLowerCase();
    if (!email) throw new Error("Email is required");

    const user = await getCurrentUser();
    assertRole(user, ["STORE_OWNER"]);

    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });
    if (!store) throw new Error("No store linked");

    // Find a user account by email (courier must exist as a user first)
    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!targetUser) {
      throw new Error("No user found with that email. Courier must sign up first.");
    }

    // Ensure the user isn't already a courier somewhere (userId is @unique on Courier)
    const existingCourier = await prisma.courier.findUnique({
      where: { userId: targetUser.id },
      select: { id: true, storeId: true },
    });

    if (existingCourier) {
      throw new Error("This user is already enrolled as a courier.");
    }

    await prisma.courier.create({
      data: {
        userId: targetUser.id,
        storeId: store.id,
        isActive: true,
      },
    });

    revalidatePath("/owner/store/settings/couriers");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Couriers
      </h2>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
        Enroll couriers for <span className="font-medium">{store.name}</span> and
        manage who is active.
      </p>

      {/* Enroll form */}
      <form action={enrollCourier} className="mt-4 flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          placeholder="Courier email (must already be signed up)"
          className={inputCls + " w-full sm:w-80"}
          required
        />
        <button
          type="submit"
          className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          Enroll courier
        </button>
      </form>

      {/* List */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
          Assigned couriers ({store.couriers.length})
        </div>

        {store.couriers.length === 0 ? (
          <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
            No couriers assigned yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {store.couriers.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {c.user.name ?? "Courier"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-300">
                    {c.user.email}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1",
                      c.isActive
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
                        : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
                    ].join(" ")}
                  >
                    {c.isActive ? "Active" : "Inactive"}
                  </span>

                  <form action={toggleCourier}>
                    <input type="hidden" name="courierId" value={c.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Toggle
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
        Note: This version enrolls couriers by email (must exist as a user).
        Next upgrade can be “Invite link” + courier onboarding flow.
      </div>
    </section>
  );
}

const inputCls =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

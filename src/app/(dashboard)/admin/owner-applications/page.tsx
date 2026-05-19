// app/(dashboard)/admin/owner-applications/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { OwnerApplication } from "@prisma/client";
import OwnerApplicationRow from "@/components/admin/OwnerApplicationRow";

export default async function OwnerApplicationsPage() {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const apps: OwnerApplication[] = await prisma.ownerApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, name: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Owner Applications</h1>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Store</th>
              <th className="px-2 py-1 text-left">Slug</th>
              <th className="px-2 py-1 text-left">Applicant</th>
              <th className="px-2 py-1 text-left">Status</th>
              <th className="px-2 py-1 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <OwnerApplicationRow key={app.id} app={app} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

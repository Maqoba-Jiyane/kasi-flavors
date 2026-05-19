// app/owner-application/page.tsx
import { getCurrentUserMinimal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import OwnerApplicationForm from "@/components/OwnerApplicationForm";

export default async function OwnerApplicationPage() {
  const user = await getCurrentUserMinimal();

  // already store owner or admin -> redirect to their dashboard
  if (user?.role === "STORE_OWNER") {
    redirect("/owner/store/overview");
  }
  if (user?.role === "ADMIN") {
    redirect("/admin");
  }

  let existing: { status: string } | null = null;
  if (user) {
    existing = await prisma.ownerApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
  }

  return (
    <div className="max-w-lg mx-auto py-16 px-4">
      <h1 className="text-2xl font-semibold mb-6">Apply to become a store owner</h1>

      <SignedOut>
        <p className="mb-4">
          You need to <SignInButton mode="modal">sign in</SignInButton> before
          applying. If you don&apos;t have an account you can create one using the
          sign up flow.
        </p>
      </SignedOut>

      <SignedIn>
        {existing ? (
          <div className="p-4 border rounded bg-yellow-50">
            <p className="font-medium">You already have an application.</p>
            <p>Status: {existing.status}</p>
            {existing.status === "REJECTED" && (
              <p className="text-sm text-slate-600">
                You may submit another application after contacting support.
              </p>
            )}
          </div>
        ) : (
          <OwnerApplicationForm />
        )}
      </SignedIn>
    </div>
  );
}


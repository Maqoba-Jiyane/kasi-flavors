// src/lib/auth.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Return type helper: User including the store relation.
 */
export type UserWithStore = Prisma.UserGetPayload<{
  include: { store: true };
}>;

/**
 * Get or provision the current DB user based on Clerk auth.
 *
 * Steps:
 * 1) Try to find by clerkUserId (canonical)
 * 2) If not found, fetch Clerk profile and try to find by email
 *    - If found by email, attempt to link Clerk by setting clerkUserId on the existing row.
 *    - If linking fails due to a unique constraint race, return the existing by-email record.
 * 3) If not found by email, create a new DB user.
 */
export async function getCurrentUser(): Promise<UserWithStore | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // 1) Try canonical lookup by clerkUserId
  const byClerk = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { store: true },
  });
  if (byClerk) return byClerk;

  // 2) Not found by clerkId -> get profile from Clerk
  const clerkUser = await currentUser();
  if (!clerkUser || !clerkUser.primaryEmailAddress) {
    return null;
  }

  const email = clerkUser.primaryEmailAddress.emailAddress;
  const name =
    clerkUser.fullName ??
    ([clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    email.split("@")[0] ||
    "Unknown User");

  const phone = clerkUser.primaryPhoneNumber?.phoneNumber ?? null;

  // 3) Try find by email
  const byEmail = await prisma.user.findUnique({
    where: { email },
    include: { store: true },
  });

  if (byEmail) {
    // Attempt to link the Clerk account to this existing DB user by setting clerkUserId.
    // This is helpful for seeded/demo accounts and prevents duplicate emails.
    // If the update races and fails (P2002), fall back to returning the existing byEmail user.
    try {
      const updated = await prisma.user.update({
        where: { email },
        data: {
          clerkUserId: userId,
          // update profile fields but DO NOT modify role
          name,
          phone,
        },
        include: { store: true },
      });
      return updated;
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Race / uniqueness conflict when linking clerkUserId — log and return existing byEmail
        console.warn(
          "[auth] race / uniqueness conflict while linking clerkUserId to existing email. Returning byEmail user.",
          { email, clerkUserId: userId, meta: (err as any).meta ?? null }
        );
        return byEmail;
      }
      // rethrow unexpected errors
      throw err;
    }
  }

  // 4) No existing user found -> create a new row
  const created = await prisma.user.create({
    data: {
      clerkUserId: userId,
      role: "CUSTOMER", // default
      name,
      email,
      phone,
    },
    include: { store: true },
  });

  return created;
}

/**
 * Simple assert helper to narrow the user type and require role.
 */
import type { UserRole } from "@prisma/client";
export function assertRole(
  user: UserWithStore | null,
  allowed: UserRole[]
): asserts user is UserWithStore {
  if (!user || !allowed.includes(user.role)) {
    throw new Error("Not authorized");
  }
}

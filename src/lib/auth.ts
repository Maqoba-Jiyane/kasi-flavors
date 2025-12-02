// src/lib/auth.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Prisma, UserRole } from "@prisma/client";

/**
 * Type helper: User including the store relation.
 * Allows TypeScript to know `user.store` exists when included.
 */
export type UserWithStore = Prisma.UserGetPayload<{
  include: { store: true };
}>;

/**
 * Return the current user from DB, provisioning from Clerk on first login.
 * Uses upsert to be race-safe (no unique constraint errors).
 */
export async function getCurrentUser(): Promise<UserWithStore | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Try to find existing user including store relation
  const existing = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { store: true },
  });

  if (existing) return existing;

  // If not present, fetch profile from Clerk
  const clerkUser = await currentUser();
  if (!clerkUser || !clerkUser.primaryEmailAddress) {
    return null;
  }

  const email = clerkUser.primaryEmailAddress.emailAddress;
  const name =
    clerkUser.fullName ??
    ((([clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim()) ||
    (clerkUser.username)) ||
    ((email.split("@")[0]) ||
    ("Unknown User")));

  const phone = clerkUser.primaryPhoneNumber?.phoneNumber ?? null;

  // Use upsert to avoid race conditions when multiple requests attempt to create the user.
  const user = await prisma.user.upsert({
    where: { clerkUserId: userId },
    create: {
      clerkUserId: userId,
      role: "CUSTOMER", // default role for new signups
      name,
      email,
      phone,
    },
    update: {
      // Update profile fields but DO NOT update role (preserve manual promotions)
      name,
      email,
      phone,
    },
    include: { store: true },
  });

  return user;
}

/**
 * Narrowing helper: asserts that the current user has one of the allowed roles.
 * After this returns success, TypeScript knows `user` is non-null and includes `store`.
 */
export function assertRole(
  user: UserWithStore | null,
  allowed: UserRole[]
): asserts user is UserWithStore {
  if (!user || !allowed.includes(user.role)) {
    throw new Error("Not authorized");
  }
}

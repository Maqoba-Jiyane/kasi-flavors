// src/lib/auth.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { Prisma, UserRole } from "@prisma/client";

export type UserWithStore = Prisma.UserGetPayload<{
  include: { store: true };
}>;

export async function getCurrentUser(): Promise<UserWithStore | null> {
  const { userId } = await auth();
  console.log("userId: ", userId)
  if (!userId) return null;

  // 1) Try to find local user (including store relation)
  let user: UserWithStore | null = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { store: true },
  });

  if (!user) {
    // 2) First-time login: sync from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser || !clerkUser.primaryEmailAddress) {
      return null;
    }

    const email = clerkUser.primaryEmailAddress.emailAddress;
    const name =
      clerkUser.fullName || clerkUser.firstName || email.split("@")[0];

    const phone = clerkUser.primaryPhoneNumber?.phoneNumber ?? null; // schema expects String? -> null, not undefined

    user = await prisma.user.create({
      data: {
        clerkUserId: userId,
        role: "CUSTOMER", // default role; promote manually in DB to STORE_OWNER/ADMIN
        name,
        email,
        phone,
      },
      include: { store: true }, // 👈 make sure create also returns store field
    });
  }

  return user;
}

export function assertRole(
  user: UserWithStore | null,
  allowed: UserRole[]
): asserts user is UserWithStore {
  if (!user || !allowed.includes(user.role)) {
    // throw new Error("Not authorized");
  }
}

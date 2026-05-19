// src/lib/auth/getOrCreateCurrentUser.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getOrCreateCurrentUser() {
  const { userId } = await auth();

  if (!userId) return null;

  const existingUser = await prisma.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (existingUser) return existingUser;

  const clerkUser = await currentUser();

  const email =
    clerkUser?.emailAddresses?.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    throw new Error("Signed-in Clerk user does not have an email address.");
  }

  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser?.username ||
    email.split("@")[0] ||
    "Kasi Flavors User";

  return prisma.user.create({
    data: {
      clerkUserId: userId,
      name,
      email,
      role: "CUSTOMER",
    },
  });
}
// src/lib/auth/getOrCreateCurrentUser.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function getDisplayName({
  firstName,
  lastName,
  username,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email: string;
}) {
  return (
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    username ||
    email.split("@")[0] ||
    "Kasi Flavors User"
  );
}

function maskEmail(email: string) {
  return email.replace(/(.{2}).+(@.*)/, "$1***$2");
}

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

  if (!clerkUser) {
    throw new Error("Signed-in Clerk user could not be loaded.");
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses?.find(
      (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    throw new Error("Signed-in Clerk user does not have an email address.");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const name = getDisplayName({
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
    email: normalizedEmail,
  });

  const phone = clerkUser.primaryPhoneNumber?.phoneNumber ?? null;

  const existingByEmail = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingByEmail) {
    try {
      return await prisma.user.update({
        where: {
          email: normalizedEmail,
        },
        data: {
          clerkUserId: userId,
          name,
          phone,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const linkedUser = await prisma.user.findUnique({
          where: {
            clerkUserId: userId,
          },
        });

        if (linkedUser) return linkedUser;

        console.warn("[auth] Failed to link Clerk user to existing email.", {
          emailMasked: maskEmail(normalizedEmail),
          clerkUserId: userId,
        });

        return existingByEmail;
      }

      throw err;
    }
  }

  try {
    return await prisma.user.create({
      data: {
        clerkUserId: userId,
        name,
        email: normalizedEmail,
        phone,
        role: "CUSTOMER",
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ clerkUserId: userId }, { email: normalizedEmail }],
        },
      });

      if (existing) return existing;
    }

    throw err;
  }
}
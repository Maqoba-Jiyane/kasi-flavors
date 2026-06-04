// src/lib/auth.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Return type helper: User including the store relation.
 */
export type UserWithStore = Prisma.UserGetPayload<{
  include: { store: true };
}>;

type MinimalUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string | null;
};

function maskEmail(email: string) {
  return email.replace(/(.{2}).+(@.*)/, "$1***$2");
}

function buildDisplayName({
  fullName,
  firstName,
  lastName,
  username,
  email,
}: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string;
}) {
  return (
    (fullName ?? [firstName, lastName].filter(Boolean).join(" ").trim()) ||
    username ||
    email.split("@")[0] ||
    "Unknown User"
  );
}

/**
 * Get or provision the current DB user based on Clerk auth.
 *
 * Flow:
 * 1) Find by clerkUserId.
 * 2) If not found, fetch Clerk profile.
 * 3) Try find by email.
 * 4) If email exists, link that DB user to the Clerk user.
 * 5) If no email match exists, create a new DB user.
 */
export async function getCurrentUser(): Promise<UserWithStore | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const byClerk = await prisma.user.findUnique({
    where: {
      clerkUserId: userId,
    },
    include: {
      store: true,
    },
  });

  if (byClerk) {
    return byClerk;
  }

  const clerkUser = await currentUser();

  if (!clerkUser?.primaryEmailAddress) {
    return null;
  }

  const email = clerkUser.primaryEmailAddress.emailAddress
    .toLowerCase()
    .trim();

  const name = buildDisplayName({
    fullName: clerkUser.fullName,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
    email,
  });

  const phone = clerkUser.primaryPhoneNumber?.phoneNumber ?? null;

  const byEmail = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      store: true,
    },
  });

  if (byEmail) {
    try {
      return await prisma.user.update({
        where: {
          email,
        },
        data: {
          clerkUserId: userId,
          name,
          phone,
        },
        include: {
          store: true,
        },
      });
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const linkedUser = await prisma.user.findUnique({
          where: {
            clerkUserId: userId,
          },
          include: {
            store: true,
          },
        });

        if (linkedUser) {
          return linkedUser;
        }

        console.warn("[auth] Clerk user link race/unique conflict.", {
          emailMasked: maskEmail(email),
          clerkUserId: userId,
        });

        return byEmail;
      }

      throw err;
    }
  }

  try {
    return await prisma.user.create({
      data: {
        clerkUserId: userId,
        role: "CUSTOMER",
        name,
        email,
        phone,
      },
      include: {
        store: true,
      },
    });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            {
              clerkUserId: userId,
            },
            {
              email,
            },
          ],
        },
        include: {
          store: true,
        },
      });

      if (existing) {
        return existing;
      }
    }

    throw err;
  }
}

export function assertRole(
  user: UserWithStore | null,
  allowed: UserRole[],
): asserts user is UserWithStore {
  if (!user || !allowed.includes(user.role)) {
    throw new Error("Not authorized");
  }
}

export async function getCurrentUserMinimal(): Promise<MinimalUser | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
  };
}

export async function getCurrentUserMinimalReadOnly() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      clerkUserId: userId,
    },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      phone: true,
    },
  });
}
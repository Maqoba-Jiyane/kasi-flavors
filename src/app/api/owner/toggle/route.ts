// app/api/owner/toggle/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId } = await req.json();

    if (!storeId) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    // Verify store ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        ownerId: true,
        isOpen: true,
        creditCents: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!store || store.ownerId !== user?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If currently closed and balance is negative, block opening
    const isTryingToOpen = !store.isOpen;
    if (isTryingToOpen && (store.creditCents ?? 0) < 0) {
      return NextResponse.json(
        {
          error:
            "Your store balance is negative. Please top up your credit before opening the store.",
          balanceCents: store.creditCents ?? 0,
        },
        { status: 400 },
      );
    }

    // Otherwise, allow toggling
    const updated = await prisma.store.update({
      where: { id: store.id },
      data: { isOpen: !store.isOpen },
    });

    return NextResponse.json({ success: true, isOpen: updated.isOpen });
  } catch (err) {
    console.error("Store toggle error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

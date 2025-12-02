import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { storeId } = await req.json();

    if (!storeId) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    // Verify store ownership
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    });

    const user = await prisma.user.findUnique({
        where: {
            clerkUserId: userId
        }, select: {
            id: true
        }
    })

    if (!store || store.ownerId !== user?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Toggle the value
    const updated = await prisma.store.update({
      where: { id: storeId },
      data: { isOpen: !store.isOpen },
    });

    return NextResponse.json({ success: true, isOpen: updated.isOpen });
  } catch (err) {
    console.error("Store toggle error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

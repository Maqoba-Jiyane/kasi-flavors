// app/api/owner/apply/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    // only customers can apply
    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, error: "You are already a store owner or not eligible to apply." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { storeName, slug, description, address, city, area } = body as {
      storeName: string;
      slug: string;
      description?: string;
      address?: string;
      city?: string;
      area?: string;
    };

    if (!storeName || !slug) {
      return NextResponse.json(
        { success: false, error: "Store name and slug are required." },
        { status: 400 }
      );
    }

    // check store slug isn't already taken by an existing store
    const slugTaken = await prisma.store.findUnique({ where: { slug } });
    if (slugTaken) {
      return NextResponse.json(
        { success: false, error: "Slug already taken by a store. Choose another." },
        { status: 400 }
      );
    }

    // prevent duplicate or pending application for this user
    const existing = await prisma.ownerApplication.findFirst({
      where: { userId: user.id, status: "PENDING" },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You already have a pending application." },
        { status: 400 }
      );
    }

    await prisma.ownerApplication.create({
      data: {
        userId: user.id,
        storeName,
        slug,
        description,
        address,
        city,
        area,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("/api/owner/apply error", err);
    // handle unique slug conflicts
    if (
      err instanceof Error &&
      err.message.includes("P2002") // prisma unique constraint
    ) {
      return NextResponse.json(
        { success: false, error: "Slug already in use. Please choose another." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await getCurrentUser();
    assertRole(admin, ["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
      });
    }

    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["CUSTOMER", "STORE_OWNER"],
        },
        OR: [
          {
            name: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: q.toLowerCase(),
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: q,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 8,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Admin user search failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to search users." },
      { status: 500 },
    );
  }
}
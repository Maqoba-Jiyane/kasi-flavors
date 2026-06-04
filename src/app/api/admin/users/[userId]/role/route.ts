import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

const ALLOWED_ADMIN_ROLE_UPDATES: UserRole[] = ["CUSTOMER", "STORE_OWNER"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await getCurrentUser();
    assertRole(admin, ["ADMIN"]);

    const { userId } = await params;
    const body = await req.json();

    const nextRole = String(body?.role || "") as UserRole;

    if (!ALLOWED_ADMIN_ROLE_UPDATES.includes(nextRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role update.",
        },
        { status: 400 },
      );
    }

    if (userId === admin.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You cannot change your own admin role here.",
        },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found.",
        },
        { status: 404 },
      );
    }

    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Admin users cannot be changed from this action.",
        },
        { status: 403 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        role: nextRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Admin user role update failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user role.",
      },
      { status: 500 },
    );
  }
}
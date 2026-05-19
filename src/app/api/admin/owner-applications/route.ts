// app/api/admin/owner-applications/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const apps = await prisma.ownerApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  return NextResponse.json({ success: true, applications: apps });
}

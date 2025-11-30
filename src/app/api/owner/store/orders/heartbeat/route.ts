// app/api/owner/store/orders/heartbeat/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });

  if (!store) {
    return NextResponse.json(
      { error: "No store for this user" },
      { status: 404 },
    );
  }

  const latestOrder = await prisma.order.findFirst({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    latestOrderId: latestOrder?.id ?? null,
    latestOrderCreatedAt: latestOrder?.createdAt ?? null,
  });
}

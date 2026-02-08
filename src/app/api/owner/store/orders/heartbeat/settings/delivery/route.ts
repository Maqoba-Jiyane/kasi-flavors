import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";

type Body = {
  supportsDelivery: boolean;
  deliveryRadiusKm: number | null;
  deliveryFeeCents: number | null;

  // optional: if you allow owner to set store pin on a map
  lat?: number | null;
  lng?: number | null;
};

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const supportsDelivery = Boolean(body.supportsDelivery);

  const deliveryRadiusKm =
    body.deliveryRadiusKm == null ? null : Number(body.deliveryRadiusKm);

  const deliveryFeeCents =
    body.deliveryFeeCents == null ? null : Number(body.deliveryFeeCents);

  // Basic validation
  if (!Number.isFinite(deliveryRadiusKm ?? 0) && deliveryRadiusKm !== null) {
    return badRequest("deliveryRadiusKm must be a number or null");
  }
  if (!Number.isFinite(deliveryFeeCents ?? 0) && deliveryFeeCents !== null) {
    return badRequest("deliveryFeeCents must be a number or null");
  }

  if (supportsDelivery) {
    if (deliveryRadiusKm == null || deliveryRadiusKm <= 0 || deliveryRadiusKm > 50) {
      return badRequest("deliveryRadiusKm must be between 1 and 50 for delivery stores");
    }
    if (deliveryFeeCents == null || deliveryFeeCents < 0 || deliveryFeeCents > 200000) {
      return badRequest("deliveryFeeCents must be between 0 and 200000 cents");
    }
  }

  const lat = body.lat == null ? undefined : Number(body.lat);
  const lng = body.lng == null ? undefined : Number(body.lng);

  if (lat !== undefined && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
    return badRequest("lat must be between -90 and 90");
  }
  if (lng !== undefined && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
    return badRequest("lng must be between -180 and 180");
  }

  // Make sure owner has a store
  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  if (!store) {
    return NextResponse.json(
      { success: false, error: "No store linked to this account" },
      { status: 404 },
    );
  }

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: {
      supportsDelivery,
      deliveryRadiusKm: supportsDelivery ? deliveryRadiusKm : null,
      deliveryFeeCents: supportsDelivery ? deliveryFeeCents : null,

      ...(lat !== undefined ? { lat } : {}),
      ...(lng !== undefined ? { lng } : {}),
    },
    select: {
      id: true,
      supportsDelivery: true,
      deliveryRadiusKm: true,
      deliveryFeeCents: true,
      lat: true,
      lng: true,
    },
  });

  return NextResponse.json({ success: true, store: updated });
}

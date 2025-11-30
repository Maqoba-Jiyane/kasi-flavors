// app/api/clerk/webhook/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const secret = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!secret) {
    console.error("❌ Missing CLERK_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server Misconfigured" }, { status: 500 });
  }

  const payload = await req.text();
  const headerPayload = await headers();

  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const wh = new Webhook(secret);

  let event: any;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("❌ Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const evt = event.type;
  const data = event.data;

  // ----------------------------------------------------------------------------
  // USER CREATED
  // ----------------------------------------------------------------------------
  if (evt === "user.created") {
    const clerkId = data.id;
    const email = data.email_addresses?.[0]?.email_address;
    const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
    const phone = data.phone_numbers?.[0]?.phone_number;

    if (!email) {
      console.error("❌ Clerk user missing email");
      return NextResponse.json({ success: true });
    }

    await prisma.user.create({
      data: {
        clerkUserId: clerkId,
        email,
        name: name || "Unnamed User",
        phone,
        role: "CUSTOMER", // default role
      },
    });

    return NextResponse.json({ success: true });
  }

  // ----------------------------------------------------------------------------
  // USER UPDATED
  // ----------------------------------------------------------------------------
  if (evt === "user.updated") {
    const clerkId = data.id;

    const email = data.email_addresses?.[0]?.email_address;
    const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
    const phone = data.phone_numbers?.[0]?.phone_number;

    await prisma.user.updateMany({
      where: { clerkUserId: clerkId },
      data: {
        email: email ?? undefined,
        name: name || undefined,
        phone: phone ?? undefined,
      },
    });

    return NextResponse.json({ success: true });
  }

  // ----------------------------------------------------------------------------
  // USER DELETED
  // ----------------------------------------------------------------------------
  if (evt === "user.deleted") {
    const clerkId = data.id;

    await prisma.user.deleteMany({
      where: { clerkUserId: clerkId },
    });

    return NextResponse.json({ success: true });
  }

  // ----------------------------------------------------------------------------
  // DEFAULT: ignore events you don't need
  // ----------------------------------------------------------------------------
  return NextResponse.json({ success: true });
}

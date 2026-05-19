// app/api/admin/owner-applications/update-status/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ["ADMIN"]);

    const body = await req.json();
    const { id, status } = body as { id: string; status: string };

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "Missing id or status." }, { status: 400 });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status." }, { status: 400 });
    }

    // cast to correct enum type
    const newStatus = status as import("@prisma/client").OwnerApplicationStatus;

    const application = await prisma.ownerApplication.update({
      where: { id },
      data: { status: newStatus },
    });

    // If approved, create store and upgrade user role
    if (status === "APPROVED" && application.userId) {
      // create store with minimal fields, may want to fill address etc
      try {
        await prisma.store.create({
          data: {
            name: application.storeName,
            slug: application.slug,
            description: application.description,
            address: application.address || "",
            city: application.city || "",
            area: application.area || "",
            ownerId: application.userId,
          },
        });
      } catch (err: unknown) {
        // if slug unique conflict occurs, update application status back
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          // rollback application status so admin can try again
          await prisma.ownerApplication.update({
            where: { id: application.id },
            data: { status: "PENDING" },
          });
          return NextResponse.json({
            success: false,
            error: "Failed to create store: slug already exists. Please choose a different slug or reject the application.",
          });
        }
        throw err;
      }

      await prisma.user.update({
        where: { id: application.userId },
        data: { role: "STORE_OWNER" },
      });
    }

    return NextResponse.json({ success: true, application });
  } catch (err) {
    console.error("[admin/owner-applications] update-status error", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

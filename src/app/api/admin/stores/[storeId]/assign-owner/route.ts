import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const admin = await getCurrentUser();
    assertRole(admin, ["ADMIN"]);

    const { storeId } = await params;
    const body = await req.json();

    const newOwnerId = String(body?.ownerId || "").trim();

    if (!newOwnerId) {
      return NextResponse.json(
        { success: false, error: "Owner user ID is required." },
        { status: 400 },
      );
    }

    if (newOwnerId === admin.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Choose a seller account, not your own admin account.",
        },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            role: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found." },
        { status: 404 },
      );
    }

    if (store.owner.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This store cannot be reassigned because it is already owned by a seller account.",
        },
        { status: 403 },
      );
    }

    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!newOwner) {
      return NextResponse.json(
        { success: false, error: "Selected user was not found." },
        { status: 404 },
      );
    }

    if (newOwner.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "You cannot assign a store to another admin account.",
        },
        { status: 400 },
      );
    }

    if (newOwner.store && newOwner.store.id !== store.id) {
      return NextResponse.json(
        {
          success: false,
          error: `${newOwner.name} already has a store linked to their account.`,
        },
        { status: 409 },
      );
    }

    const updatedStore = await prisma.$transaction(async (tx) => {
      const updated = await tx.store.update({
        where: { id: store.id },
        data: {
          ownerId: newOwner.id,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (newOwner.role === "CUSTOMER") {
        await tx.user.update({
          where: { id: newOwner.id },
          data: {
            role: "STORE_OWNER",
          },
        });
      }

      return updated;
    });

    revalidateTag("stores", "max");
    revalidateTag(`store:${store.slug}`, "max");
    revalidateTag(`store-menu:${store.slug}`, "max");

    revalidatePath("/admin/stores");
    revalidatePath(`/admin/stores/${store.id}`);
    revalidatePath("/owner/store/overview");

    return NextResponse.json({
      success: true,
      store: updatedStore,
    });
  } catch (error) {
    console.error("Admin store reassignment failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to reassign store owner." },
      { status: 500 },
    );
  }
}

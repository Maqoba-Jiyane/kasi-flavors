// src/app/api/admin/stores/[storeId]/status/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import type { StoreApprovalStatus } from "@prisma/client";
import { sendStoreStatusEmail } from "@/lib/email/send-store-status-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_STATUSES: StoreApprovalStatus[] = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "DEACTIVATED",
];

function logStep(requestId: string, message: string, data?: Record<string, unknown>) {
  console.log(
    `[store-status:${requestId}] ${message}`,
    data ? JSON.stringify(data) : "",
  );
}

function logError(requestId: string, message: string, error: unknown) {
  console.error(`[store-status:${requestId}] ${message}`, {
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  logStep(requestId, "POST started");

  try {
    logStep(requestId, "Getting current user");

    const user = await getCurrentUser();

    logStep(requestId, "Current user loaded", {
      userId: user?.id,
      role: user?.role,
    });

    assertRole(user, ["ADMIN"]);

    logStep(requestId, "Admin role confirmed");

    const { storeId } = await params;

    logStep(requestId, "Route params loaded", {
      storeId,
    });

    const body = await req.json();

    logStep(requestId, "Request body parsed", {
      status: body?.status,
      hasReason: Boolean(String(body?.reason || "").trim()),
    });

    const status = String(body?.status || "") as StoreApprovalStatus;
    const reason = String(body?.reason || "").trim();

    if (!VALID_STATUSES.includes(status)) {
      logStep(requestId, "Invalid store status rejected", {
        status,
      });

      return NextResponse.json(
        { success: false, error: "Invalid store status." },
        { status: 400 },
      );
    }

    if (status === "REJECTED" && !reason) {
      logStep(requestId, "Rejected status missing reason");

      return NextResponse.json(
        { success: false, error: "Rejection reason is required." },
        { status: 400 },
      );
    }

    logStep(requestId, "Updating store in database", {
      storeId,
      status,
    });

    const dbStartedAt = Date.now();

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        approvalStatus: status,
        approvedAt: status === "APPROVED" ? new Date() : null,
        approvedById: status === "APPROVED" ? user.id : null,
        rejectionReason:
          status === "REJECTED" || status === "DEACTIVATED"
            ? reason || null
            : null,
        isOpen: status === "APPROVED" ? undefined : false,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        approvalStatus: true,
        owner: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    logStep(requestId, "Store updated successfully", {
      storeId: store.id,
      storeSlug: store.slug,
      approvalStatus: store.approvalStatus,
      hasOwnerEmail: Boolean(store.owner?.email),
      durationMs: Date.now() - dbStartedAt,
    });

    if (store.owner?.email) {
      logStep(requestId, "Sending store status email", {
        to: store.owner.email,
        storeName: store.name,
        storeSlug: store.slug,
        status: store.approvalStatus,
        willGeneratePdf: store.approvalStatus === "APPROVED",
      });

      const emailStartedAt = Date.now();

      try {
        await sendStoreStatusEmail({
          to: store.owner.email,
          ownerName: store.owner.name,
          storeName: store.name,
          storeSlug: store.slug,
          status: store.approvalStatus,
          reason,
        });

        logStep(requestId, "Store status email sent successfully", {
          durationMs: Date.now() - emailStartedAt,
        });
      } catch (emailError) {
        logError(requestId, "Store status email failed", emailError);

        // Important:
        // Do not throw here. Store approval should still succeed even if email/PDF fails.
      }
    } else {
      logStep(requestId, "Skipping email because store owner email is missing", {
        storeId: store.id,
      });
    }

    logStep(requestId, "Starting cache revalidation");

    const revalidationStartedAt = Date.now();

    revalidateTag("stores", "max");
    revalidateTag("stores:open-collection", "max");
    revalidateTag("stores:all-collection", "max");
    revalidateTag(`store:${store.slug}`, "max");
    revalidateTag(`store-menu:${store.slug}`, "max");

    revalidatePath("/");
    revalidatePath("/admin/stores");
    revalidatePath(`/admin/stores/${store.id}`);
    revalidatePath(`/stores/${store.slug}`);
    revalidatePath("/owner/store/overview");

    logStep(requestId, "Cache revalidation completed", {
      durationMs: Date.now() - revalidationStartedAt,
    });

    logStep(requestId, "POST completed successfully", {
      totalDurationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      store,
    });
  } catch (error) {
    logError(requestId, "Admin store status update failed", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update store status.",
        requestId,
      },
      { status: 500 },
    );
  }
}
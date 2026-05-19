// app/api/store-onboarding/extract-menu/route.ts
import { NextResponse } from "next/server";
import { getCurrentUserMinimal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildMenuExtractionPrompt,
  normalizeExtractedMenuResult,
  safeParseJsonObject,
} from "@/lib/onboarding/menuExtraction";
import { groq, GROQ_MENU_VISION_MODEL } from "@/lib/ai/groq";
import { uploadMenuImageToBlob } from "@/lib/storage/blob";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserMinimal();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please sign in before uploading a menu." },
        { status: 401 },
      );
    }

    const formData = await req.formData();

    const onboardingId = String(formData.get("onboardingId") || "").trim();

    const namingTheme =
  String(formData.get("namingTheme") || "DESCRIPTIVE") as any;

    const files = formData
      .getAll("menuImages")
      .filter((file): file is File => file instanceof File);

    if (!files.length) {
      return NextResponse.json(
        { success: false, error: "No menu images uploaded." },
        { status: 400 },
      );
    }

    if (files.length > 4) {
      return NextResponse.json(
        { success: false, error: "Upload up to 4 menu images at a time." },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { success: false, error: "Only image files are supported." },
          { status: 400 },
        );
      }

      if (file.size > 4 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            error: "Each image must be under 4MB for reliable AI extraction.",
          },
          { status: 400 },
        );
      }
    }

    let onboarding = onboardingId
      ? await prisma.storeOnboarding.findFirst({
          where: {
            id: onboardingId,
            ownerId: user.id,
          },
        })
      : null;

    if (!onboarding) {
      onboarding = await prisma.storeOnboarding.create({
        data: {
          ownerId: user.id,
          status: "DRAFT",
        },
      });
    }

    const uploadedImages = await Promise.all(
      files.map((file) =>
        uploadMenuImageToBlob({
          file,
          ownerId: user.id,
          onboardingId: onboarding.id,
        }),
      ),
    );

    const response = await fetch("https://api.groq.com/openai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MENU_VISION_MODEL,
        temperature: 0.1,
        max_output_tokens: 3000,
        input: [
          {
            role: "system",
            content:
              "You extract restaurant menu items from images and return strict JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildMenuExtractionPrompt(namingTheme),
              },
              ...uploadedImages.map((image) => ({
                type: "input_image",
                image_url: image.url,
              })),
            ],
          },
        ],
        text: {
          format: {
            type: "json_object",
          },
        },
      }),
    });

    console.log("Groq API response status:", response);

    const json = await response.json();

    console.log("Groq API response JSON:", json.output[1].content);

    if (!response.ok) {
      if (process.env.NODE_ENV === "development") {
        console.error("Groq responses error:", json);
      }

      return NextResponse.json(
        {
          success: false,
          error: json?.error?.message || "Failed to extract menu with AI.",
        },
        { status: response.status },
      );
    }

    const text =
      json.output_text ||
      json.output
        ?.flatMap((item: any) => item.content || [])
        ?.find((content: any) => content.type === "output_text")?.text ||
      "";

    const parsed = safeParseJsonObject(text);
    const extracted = normalizeExtractedMenuResult(parsed);

    if (extracted.products.length === 0) {
      await prisma.storeOnboarding.update({
        where: { id: onboarding.id },
        data: {
          status: "DRAFT",
          menuImages: uploadedImages,
          errorMessage:
            "No products could be extracted. Try uploading clearer menu photos.",
        },
      });

      return NextResponse.json(
        {
          success: false,
          onboardingId: onboarding.id,
          uploadedImages,
          error:
            "No products could be extracted. Try uploading clearer menu photos.",
        },
        { status: 422 },
      );
    }

    await prisma.storeOnboarding.update({
      where: { id: onboarding.id },
      data: {
        status: "MENU_EXTRACTED",
        extractedMenuJson: extracted,
        menuImages: uploadedImages,
        errorMessage: null,
      },
    });

    return NextResponse.json({
      success: true,
      onboardingId: onboarding.id,
      uploadedImages,
      products: extracted.products,
      notes: extracted.notes,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Groq menu extraction failed:", error);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload and extract menu with AI. Please try again.",
      },
      { status: 500 },
    );
  }
}

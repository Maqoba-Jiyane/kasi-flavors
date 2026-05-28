import { NextResponse } from "next/server";
import { reverseGeocodeCoordinates } from "@/lib/location/geocode";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const lat = Number(body?.lat);
    const lng = Number(body?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid coordinates.",
        },
        { status: 400 },
      );
    }

    const result = await reverseGeocodeCoordinates({ lat, lng });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not find an address for this location.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      location: {
        lat: result.lat,
        lng: result.lng,
        displayName: result.displayName,
        address: result.address || "",
        area: result.area || "",
        city: result.city || "",
        postalCode: result.postalCode || "",
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Reverse geocode failed:", error);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to reverse geocode location.",
      },
      { status: 500 },
    );
  }
}
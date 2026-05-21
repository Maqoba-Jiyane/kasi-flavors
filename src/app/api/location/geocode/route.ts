// app/api/location/geocode/route.ts
import { NextResponse } from "next/server";
import {
  buildSouthAfricanAddress,
  geocodeStoreAddress,
} from "@/lib/location/geocode";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const address = String(body?.address || "").trim();
    const area = String(body?.area || "").trim();
    const city = String(body?.city || "").trim();

    const query = buildSouthAfricanAddress([address, area, city]);

    if (!address && !area && !city) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter your address, area, or city.",
        },
        { status: 400 }
      );
    }

    const result = await geocodeStoreAddress({
  address,
  area,
  city,
});

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error:
            "We could not find that location. Try using a more specific address or area.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      location: {
        address: result.displayName,
        lat: result.lat,
        lng: result.lng,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Customer geocoding failed:", error);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to find location. Please try again.",
      },
      { status: 500 }
    );
  }
}
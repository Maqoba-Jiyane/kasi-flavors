// src/proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

// Same matcher you had before – adjust to your needs
export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)", // all non-static routes
    "/(api|trpc)(.*)",            // all API / TRPC routes
  ],
};

// app/(auth)/sign-in/page.tsx
"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function SignInPage() {
  const searchParams = useSearchParams();

  // 1) Capture the redirect param ONCE on the client (stable even if Clerk navigates internally)
  // We read from window.location.search if available as a fallback for robustness.
  const initialRedirect = useMemo(() => {
    try {
      // Prefer useSearchParams result (works on initial render)
      const s = searchParams?.get("redirectUrl");
      if (s) return s;

      // Fallback: parse window.location (useful during client-only transitions)
      if (typeof window !== "undefined") {
        return new URLSearchParams(window.location.search).get("redirectUrl");
      }
      return null;
    } catch {
      return null;
    }
  }, [searchParams]);

  // Keep it in state so it never changes during the SignIn internal navigation
  const [redirectUrl] = useState<string | null>(initialRedirect);

  useEffect(() => {
    console.log("[SignInPage] searchParams:", searchParams);
    console.log("[SignInPage] initialRedirect:", initialRedirect);
    console.log("[SignInPage] redirectUrl (stable):", redirectUrl);
    // Also log the full location for debugging when you hit the password step
    if (typeof window !== "undefined") console.log("[SignInPage] href:", window.location.href);
  }, [searchParams, initialRedirect, redirectUrl]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-0 bg-transparent",
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"

        // pass stable redirect props from captured state
        redirectUrl={redirectUrl ?? undefined}       // primary prop Clerk uses
        forceRedirectUrl={redirectUrl ?? undefined}  // keep for compatibility if your version supports it
        afterSignInUrl={redirectUrl ?? undefined}    // safe extra fallback (Clerk versions vary)
        fallbackRedirectUrl="/"
      />
    </main>
  );
}

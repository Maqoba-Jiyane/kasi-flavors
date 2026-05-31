// app/(auth)/sign-in/page.tsx
"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

function getSafeRedirectUrl(value: string | null) {
  if (!value) return null;

  // Keep redirects internal only. This prevents open redirect issues.
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;

  return value;
}

function SignInPageContent() {
  const searchParams = useSearchParams();

  const redirectUrl = useMemo(() => {
    const rawRedirect =
      searchParams.get("redirect_url") || searchParams.get("redirectUrl");

    return getSafeRedirectUrl(rawRedirect);
  }, [searchParams]);

  const signUpUrl = redirectUrl
    ? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/sign-up";

  return (
    <main className="min-h-screen bg-kasi-cream">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
        <div className="absolute inset-0 bg-kasi-black" />

        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-street-orange blur-3xl" />
          <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-kasi-green blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-56 w-56 rounded-full bg-golden-yellow blur-3xl" />
        </div>

        <div className="relative grid w-full max-w-6xl items-center justify-center gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="text-white">
            <Link
              href="/"
              className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-golden-yellow transition hover:bg-white hover:text-kasi-black"
            >
              Kasi Flavors
            </Link>

            <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Welcome back to the kasi food table.
            </h1>

            <p className="mt-4 max-w-lg text-sm font-medium leading-7 text-white/65 sm:text-base">
              Sign in to continue setting up your store, manage your menu, or
              get ready for collection orders on Kasi Flavors.
            </p>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-4xl border border-white/10 bg-white p-4 shadow-2xl sm:p-6">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                  Sign in
                </p>

                <h2 className="mt-1 text-2xl font-black text-kasi-black">
                  Continue your journey
                </h2>

                <p className="mt-1 text-sm font-medium text-black/55">
                  Use your account to access Kasi Flavors.
                </p>
              </div>

              <SignIn
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "w-full border-0 bg-transparent p-0 shadow-none",
                    header: "hidden",
                    footer: "hidden",
                    socialButtonsBlockButton:
                      "rounded-2xl border-2 border-black/10 bg-white py-3 text-sm font-black text-kasi-black transition hover:border-kasi-green hover:bg-kasi-green/5",
                    formFieldLabel:
                      "text-xs font-black uppercase tracking-wide text-black/50",
                    formFieldInput:
                      "rounded-2xl border-2 border-black/10 bg-kasi-cream px-4 py-3 text-sm font-semibold text-kasi-black shadow-none outline-none transition focus:border-kasi-green focus:bg-white focus:ring-4 focus:ring-kasi-green/10",
                    formButtonPrimary:
                      "rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-street-orange",
                    dividerLine: "bg-black/10",
                    dividerText:
                      "text-xs font-black uppercase tracking-wide text-black/40",
                    formFieldAction:
                      "text-xs font-black text-kasi-green hover:text-street-orange",
                    identityPreviewText: "text-sm font-bold text-kasi-black",
                    identityPreviewEditButton:
                      "text-xs font-black text-kasi-green hover:text-street-orange",
                    otpCodeFieldInput:
                      "rounded-2xl border-2 border-black/10 bg-kasi-cream text-kasi-black focus:border-kasi-green focus:ring-kasi-green/10",
                    alert:
                      "rounded-2xl border border-red-200 bg-red-50 text-sm font-bold text-red-600",
                    footerActionText: "text-sm font-medium text-black/55",
                    footerActionLink:
                      "text-sm font-black text-kasi-green hover:text-street-orange",
                  },
                }}
                routing="path"
                path="/sign-in"
                signUpUrl={signUpUrl}
                forceRedirectUrl={redirectUrl || "/"}
                fallbackRedirectUrl="/"
              />

              <p className="mt-5 text-center text-xs font-medium leading-5 text-black/45">
                New to Kasi Flavors?{" "}
                <Link
                  href={signUpUrl}
                  className="font-black text-kasi-green hover:text-street-orange"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageContent />
    </Suspense>
  );
}
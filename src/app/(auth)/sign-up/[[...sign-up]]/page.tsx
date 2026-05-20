// app/(auth)/sign-up/page.tsx
"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function SignUpPage() {
  const searchParams = useSearchParams();

  const initialRedirect = useMemo(() => {
    try {
      const redirectUrl =
        searchParams?.get("redirectUrl") || searchParams?.get("redirect_url");

      if (redirectUrl) return redirectUrl;

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);

        return params.get("redirectUrl") || params.get("redirect_url");
      }

      return null;
    } catch {
      return null;
    }
  }, [searchParams]);

  const [redirectUrl] = useState<string | null>(initialRedirect);

  return (
    <main className="min-h-screen bg-kasi-black">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="absolute inset-0 bg-kasi-black" />

        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-street-orange blur-3xl" />
          <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-kasi-green blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-56 w-56 rounded-full bg-golden-yellow blur-3xl" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl items-center justify-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className=" text-white lg:block">
            <Link
              href="/"
              className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-golden-yellow transition hover:bg-white hover:text-kasi-black"
            >
              Kasi Flavors
            </Link>

            <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Join the kasi food movement.
            </h1>

            <p className="mt-4 max-w-lg text-sm font-medium leading-7 text-white/65 sm:text-base">
              Create an account to list your food spot, build your digital menu,
              and prepare your store for collection orders.
            </p>
          </div>

          <div className="mx-auto w-full max-w-[420px]">
            <div className="w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-white px-3 py-4 shadow-2xl sm:rounded-[2rem] sm:px-6 sm:py-6">
              <div className="mb-4 px-1 sm:mb-5 sm:px-0">
                <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                  Sign up
                </p>

                <h2 className="mt-1 text-2xl font-black text-kasi-black">
                  Create your account
                </h2>

                <p className="mt-1 text-sm font-medium text-black/55">
                  Start setting up your Kasi Flavors profile.
                </p>
              </div>

              <SignUp
                appearance={{
                  elements: {
                    rootBox: "mx-auto w-full max-w-full",
                    card: "mx-auto w-full max-w-full border-0 bg-transparent p-0 shadow-none",
                    main: "mx-auto w-full max-w-full",
                    form: "mx-auto w-full max-w-full",
                    formField: "w-full max-w-full",
                    header: "hidden",
                    footer: "hidden",
                    socialButtons: "w-full max-w-full",
                    socialButtonsBlockButton:
                      "w-full max-w-full rounded-2xl border-2 border-black/10 bg-white py-3 text-sm font-black text-kasi-black transition hover:border-kasi-green hover:bg-kasi-green/5",
                    formFieldLabel:
                      "text-xs font-black uppercase tracking-wide text-black/50",
                    formFieldInput:
                      "w-full max-w-full rounded-2xl border-2 border-black/10 bg-kasi-cream px-4 py-3 text-sm font-semibold text-kasi-black shadow-none outline-none transition focus:border-kasi-green focus:bg-white focus:ring-4 focus:ring-kasi-green/10",
                    formButtonPrimary:
                      "w-full rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-street-orange",
                    dividerLine: "bg-black/10",
                    dividerText:
                      "text-xs font-black uppercase tracking-wide text-black/40",
                    formFieldAction:
                      "text-xs font-black text-kasi-green hover:text-street-orange",
                    identityPreview: "w-full max-w-full",
                    identityPreviewText: "text-sm font-bold text-kasi-black",
                    identityPreviewEditButton:
                      "text-xs font-black text-kasi-green hover:text-street-orange",
                    otpCodeFieldInput:
                      "rounded-2xl border-2 border-black/10 bg-kasi-cream text-kasi-black focus:border-kasi-green focus:ring-kasi-green/10",
                    alert:
                      "w-full rounded-2xl border border-red-200 bg-red-50 text-sm font-bold text-red-600",
                    footerActionText: "text-sm font-medium text-black/55",
                    footerActionLink:
                      "text-sm font-black text-kasi-green hover:text-street-orange",
                  },
                }}
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                redirectUrl={redirectUrl ?? undefined}
                forceRedirectUrl={redirectUrl ?? undefined}
                afterSignUpUrl={redirectUrl ?? undefined}
                fallbackRedirectUrl="/"
              />

              <p className="mt-5 px-1 text-center text-xs font-medium leading-5 text-black/45 sm:px-0">
                Already have an account?{" "}
                <Link
                  href={
                    redirectUrl
                      ? `/sign-in?redirectUrl=${encodeURIComponent(redirectUrl)}`
                      : "/sign-in"
                  }
                  className="font-black text-kasi-green hover:text-street-orange"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
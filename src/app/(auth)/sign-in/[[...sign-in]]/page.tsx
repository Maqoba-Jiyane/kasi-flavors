// app/(auth)/sign-in/page.tsx
"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h1 className="mb-4 text-center text-xl font-semibold text-slate-900 dark:text-slate-50">
          Sign in to Kasi Flavors
        </h1>
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
          redirectUrl="/"
        />
      </div>
    </main>
  );
}

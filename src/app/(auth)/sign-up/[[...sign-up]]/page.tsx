"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h1 className="mb-4 text-center text-xl font-semibold text-slate-900 dark:text-slate-50">
          Create your Kasi Flavors account
        </h1>
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border-0 bg-transparent",
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          redirectUrl="/"
        />
      </div>
    </main>
  );
}

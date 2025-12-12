// app/privacy/page.tsx
import type { Metadata } from "next";
import { JSX } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy | Kasi Flavors",
  description:
    "Learn how Kasi Flavors collects, uses, stores, and protects your personal information in line with POPIA principles.",
  alternates: { canonical: "https://www.kasiflavors.co.za/privacy" },
};

export default function PrivacyPolicyPage(): JSX.Element {
  const lastUpdated = "12 December 2025";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-900 dark:text-slate-50">
            Last updated:
          </span>{" "}
          {lastUpdated}
        </p>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Kasi Flavors (“we”, “our”, or “us”) respects your privacy and is
          committed to protecting your personal information. This Privacy Policy
          explains how we collect, use, store, and protect your information when
          you use our website, mobile services, and related platforms
          (collectively, the “Service”).
        </p>
      </header>

      <section className="mt-10 space-y-8">
        <PolicySection
          title="1. Information We Collect"
          content={
            <>
              <p>
                We only collect information that is necessary to provide and
                improve our services.
              </p>

              <SubSection title="1.1 Information You Provide">
                <ul className="list-disc pl-5">
                  <li>Full name</li>
                  <li>Phone number</li>
                  <li>Email address</li>
                  <li>Delivery or collection details</li>
                  <li>Order notes or preferences</li>
                  <li>Account login details (where applicable)</li>
                </ul>
              </SubSection>

              <SubSection title="1.2 Information Collected Automatically">
                <ul className="list-disc pl-5">
                  <li>IP address</li>
                  <li>Device and browser information</li>
                  <li>Pages visited and actions taken</li>
                  <li>Date and time of access</li>
                  <li>Cookies and similar technologies</li>
                </ul>
              </SubSection>
            </>
          }
        />

        <PolicySection
          title="2. How We Use Your Information"
          content={
            <>
              <p>We use your information to:</p>
              <ul className="list-disc pl-5">
                <li>Process and fulfill food orders</li>
                <li>
                  Communicate order updates (e.g. order confirmation, ready for
                  collection, delivery status)
                </li>
                <li>Provide customer support</li>
                <li>Improve platform performance and user experience</li>
                <li>Prevent fraud and abuse</li>
                <li>Comply with legal and regulatory obligations</li>
              </ul>
              <p className="mt-3 font-medium">
                We do not sell your personal information.
              </p>
            </>
          }
        />

        <PolicySection
          title="3. Sharing of Information"
          content={
            <>
              <p>We may share your information only when necessary:</p>
              <ul className="list-disc pl-5">
                <li>
                  With participating food vendors to prepare and fulfill your
                  order
                </li>
                <li>With delivery partners (where delivery is selected)</li>
                <li>
                  With service providers who support our platform (e.g. hosting,
                  messaging, analytics)
                </li>
                <li>When required by law or legal process</li>
              </ul>
              <p className="mt-3">
                All third parties are required to handle your data securely and
                lawfully.
              </p>
            </>
          }
        />

        <PolicySection
          title="4. Cookies and Tracking Technologies"
          content={
            <>
              <p>Kasi Flavors uses cookies and similar technologies to:</p>
              <ul className="list-disc pl-5">
                <li>Keep you signed in</li>
                <li>Remember your preferences</li>
                <li>Analyze site usage and performance</li>
              </ul>
              <p className="mt-3">
                You can control or disable cookies through your browser
                settings. Some features may not work correctly if cookies are
                disabled.
              </p>
            </>
          }
        />

        <PolicySection
          title="5. Data Storage and Security"
          content={
            <ul className="list-disc pl-5">
              <li>Your data is stored securely using industry-standard practices</li>
              <li>
                We take reasonable technical and organizational measures to
                protect your information
              </li>
              <li>
                No system is 100% secure, but we actively work to prevent
                unauthorized access, loss, or misuse
              </li>
            </ul>
          }
        />

        <PolicySection
          title="6. Data Retention"
          content={
            <>
              <p>
                We retain personal information only for as long as necessary to:
              </p>
              <ul className="list-disc pl-5">
                <li>Provide our services</li>
                <li>Meet legal, accounting, or reporting requirements</li>
                <li>Resolve disputes or enforce agreements</li>
              </ul>
            </>
          }
        />

        <PolicySection
          title="7. Your Rights (POPIA)"
          content={
            <>
              <p>Under South African law, you have the right to:</p>
              <ul className="list-disc pl-5">
                <li>Access your personal information</li>
                <li>Request correction or deletion of your information</li>
                <li>Object to processing in certain circumstances</li>
                <li>
                  Withdraw consent where processing is based on consent
                </li>
              </ul>
              <p className="mt-3">
                To exercise these rights, contact us using the details below.
              </p>
            </>
          }
        />

        <PolicySection
          title="8. Third-Party Links"
          content={
            <p>
              Our platform may contain links to third-party websites or
              services. We are not responsible for the privacy practices of
              those third parties. We encourage you to review their privacy
              policies separately.
            </p>
          }
        />

        <PolicySection
          title="9. Children’s Privacy"
          content={
            <p>
              Kasi Flavors is not intended for use by individuals under the age
              of 18. We do not knowingly collect personal information from
              children.
            </p>
          }
        />

        <PolicySection
          title="10. Changes to This Privacy Policy"
          content={
            <p>
              We may update this Privacy Policy from time to time. Any changes
              will be posted on this page with an updated “Last updated” date.
              Continued use of the Service after changes indicates acceptance of
              the updated policy.
            </p>
          }
        />

        <PolicySection
          title="11. Contact Us"
          content={
            <div className="space-y-2">
              <p>
                If you have questions or concerns about this Privacy Policy or
                how we handle your information, please contact us:
              </p>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-slate-50">
                  Kasi Flavors
                </p>
                <p className="text-slate-700 dark:text-slate-200">
                  Email:{" "}
                  <a
                    className="underline underline-offset-4"
                    href="mailto:kasiflavors01@gmail.com"
                  >
                    kasiflavors01@gmail.com
                  </a>
                </p>
                <p className="text-slate-700 dark:text-slate-200">
                  Website:{" "}
                  <a
                    className="underline underline-offset-4"
                    href="https://www.kasiflavors.co.za"
                    target="_blank"
                    rel="noreferrer"
                  >
                    www.kasiflavors.co.za
                  </a>
                </p>
              </div>
            </div>
          }
        />
      </section>
    </main>
  );
}

function PolicySection({
  title,
  content,
}: {
  title: string;
  content: React.ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </h2>
      <div className="space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
        {content}
      </div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </h3>
      <div className="space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
        {children}
      </div>
    </div>
  );
}

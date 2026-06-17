import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Sario",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">
          ← Back to Home
        </Link>
      </div>

      <h1 className="font-display text-4xl font-extrabold text-[#1A1A1A] mb-2">Privacy Policy</h1>
      <p className="text-sm text-[#9B9B9B] mb-10">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none space-y-8 text-[#4D4D4D]">
        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">1. Information We Collect</h2>
          <p className="leading-relaxed">
            We collect your mobile number for authentication, your name and email (optional) for
            your profile, delivery addresses, and order history. We also collect anonymous usage
            data to improve the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
            <li>To process and fulfil your orders</li>
            <li>To send OTPs and order status notifications via SMS</li>
            <li>To personalise your browsing and search experience</li>
            <li>To comply with legal and regulatory requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">3. Data Sharing</h2>
          <p className="leading-relaxed">
            We share your data only with vendors to fulfil your orders, logistics partners
            (Shiprocket) for shipping, and payment processors (Razorpay) for payment. We do not
            sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">4. Cookies & Local Storage</h2>
          <p className="leading-relaxed">
            We use secure HTTP-only cookies for authentication tokens. Your wishlist is stored
            in your browser's local storage and never sent to our servers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">5. Data Retention</h2>
          <p className="leading-relaxed">
            Account data is retained while your account is active. Order records are retained for
            7 years as required by Indian GST regulations. You may request deletion of your
            account by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">6. Your Rights</h2>
          <p className="leading-relaxed">
            Under the Digital Personal Data Protection Act 2023 (India), you have the right to
            access, correct, and erase your personal data, and to withdraw consent. Contact us
            to exercise these rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">7. Contact</h2>
          <p className="leading-relaxed">
            For privacy-related questions, please{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact us
            </Link>{" "}
            or email{" "}
            <a href="mailto:privacy@sario.in" className="text-primary hover:underline">
              privacy@sario.in
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

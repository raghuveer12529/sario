import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Sario",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">
          ← Back to Home
        </Link>
      </div>

      <h1 className="font-display text-4xl font-extrabold text-[#1A1A1A] mb-2">Terms of Use</h1>
      <p className="text-sm text-[#9B9B9B] mb-10">Last updated: May 2026</p>

      <div className="prose prose-sm max-w-none space-y-8 text-[#4D4D4D]">
        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">
            By accessing or using Sario ("the Platform"), you agree to be bound by these Terms of Use
            and our Privacy Policy. If you do not agree, please do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">2. Use of the Platform</h2>
          <p className="leading-relaxed">
            Sario is a multi-vendor marketplace connecting buyers with verified Indian handloom saree
            weavers and vendors. You agree to use the Platform only for lawful purposes and in
            compliance with all applicable laws and regulations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">3. Account Registration</h2>
          <p className="leading-relaxed">
            You must provide a valid Indian mobile number to create an account. You are responsible
            for maintaining the confidentiality of your account and all activity under it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">4. Orders & Payments</h2>
          <p className="leading-relaxed">
            All prices are listed in Indian Rupees (₹). Orders are subject to availability and
            vendor confirmation. Payments are processed securely through Razorpay. By placing an
            order, you authorise the charge to your selected payment method.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">5. Returns & Refunds</h2>
          <p className="leading-relaxed">
            Our return and refund policy is described in detail on our{" "}
            <Link href="/returns" className="text-primary hover:underline">
              Returns & Refunds
            </Link>{" "}
            page. Requests must be raised within 7 days of delivery.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">6. Intellectual Property</h2>
          <p className="leading-relaxed">
            All content on the Platform, including but not limited to text, images, logos, and
            design, is the property of Sario Technologies Pvt. Ltd. or its licensors and is
            protected under applicable intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">7. Limitation of Liability</h2>
          <p className="leading-relaxed">
            To the maximum extent permitted by law, Sario shall not be liable for any indirect,
            incidental, special, or consequential damages arising from your use of the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">8. Governing Law</h2>
          <p className="leading-relaxed">
            These Terms are governed by the laws of India. Any disputes shall be subject to the
            exclusive jurisdiction of courts in Hyderabad, Telangana.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-3">9. Contact</h2>
          <p className="leading-relaxed">
            For questions about these Terms, please{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact us
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

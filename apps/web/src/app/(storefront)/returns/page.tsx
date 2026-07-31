import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns & Refunds — Sario",
  description: "Easy 7-day returns on all Sario saree orders. We stand behind every weaver's craft.",
};

export default function ReturnsPage() {
  return (
    <main className="bg-[#F5F5F5] min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white border border-[#F0F0F0] p-8 shadow-sm">
          <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Returns &amp; Refunds</h1>
          <p className="mt-3 text-sm text-[#696969] leading-relaxed">
            We stand behind every saree on Sario. If you are not completely satisfied, we make returns straightforward.
          </p>

          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">7-Day Return Window</h2>
              <p className="text-sm text-[#4D4D4D] leading-relaxed">
                You may initiate a return within 7 days of delivery. To be eligible, the saree must be unused, unwashed, and in its original packaging with tags intact.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">How to Initiate a Return</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[#4D4D4D]">
                <li>Go to <Link href="/account/orders" className="text-primary font-medium hover:underline">My Orders</Link> and select the item.</li>
                <li>Tap &ldquo;Request Return&rdquo; and choose your reason.</li>
                <li>Upload a photo of the saree in its current condition.</li>
                <li>A return pickup will be scheduled within 48 hours.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Refund Timeline</h2>
              <p className="text-sm text-[#4D4D4D] leading-relaxed">
                Once the returned item is received and quality-checked, your refund will be processed within 5 business days to your original payment method.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Non-Returnable Items</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-[#4D4D4D]">
                <li>Custom or personalised orders (blouse stitching, custom embroidery)</li>
                <li>Items marked &ldquo;Final Sale&rdquo; on the product page</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Damaged or Wrong Item</h2>
              <p className="text-sm text-[#4D4D4D] leading-relaxed">
                If you receive a damaged or incorrect item, contact us within 48 hours of delivery. We will arrange an immediate replacement or full refund — no questions asked.
              </p>
            </section>

            <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] px-5 py-4">
              <p className="text-sm font-semibold text-[#1A1A1A]">Need help?</p>
              <p className="mt-1 text-sm text-[#696969]">
                Contact our support team at <a href="mailto:support@sario.in" className="text-primary hover:underline">support@sario.in</a> or visit <Link href={"/contact" as Route} className="text-primary hover:underline">Contact Us</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

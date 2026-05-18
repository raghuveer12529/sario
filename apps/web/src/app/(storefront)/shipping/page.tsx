import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Information — Sario",
  description: "Sario ships across India via Shiprocket. Free shipping on orders above ₹2,000.",
};

export default function ShippingPage() {
  return (
    <main className="bg-[#F5F5F5] min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white border border-[#F0F0F0] p-8 shadow-sm">
          <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Shipping Information</h1>
          <p className="mt-3 text-sm text-[#696969] leading-relaxed">
            We ship across India with Shiprocket — covering 27,000+ PIN codes.
          </p>

          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Delivery Timelines</h2>
              <div className="overflow-hidden rounded-xl border border-[#F0F0F0]">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAFAFA]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Zone</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">Delivery Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0]">
                    <tr><td className="px-4 py-3 text-[#4D4D4D]">Metro cities</td><td className="px-4 py-3 font-semibold text-[#1A1A1A]">3–5 business days</td></tr>
                    <tr><td className="px-4 py-3 text-[#4D4D4D]">Tier-2 cities</td><td className="px-4 py-3 font-semibold text-[#1A1A1A]">5–7 business days</td></tr>
                    <tr><td className="px-4 py-3 text-[#4D4D4D]">Remote areas</td><td className="px-4 py-3 font-semibold text-[#1A1A1A]">7–10 business days</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Shipping Charges</h2>
              <ul className="space-y-2 text-sm text-[#4D4D4D]">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  <strong>Free shipping</strong> on all orders above ₹2,000
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#9B9B9B] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  ₹50 flat rate on orders below ₹2,000
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">Order Tracking</h2>
              <p className="text-sm text-[#4D4D4D] leading-relaxed">
                Once your order ships, you will receive an SMS with a tracking link. You can also track your order from <strong>My Orders</strong> in your account.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Sario",
  description: "Get in touch with Sario's customer support team.",
};

export default function ContactPage() {
  return (
    <main className="bg-[#F5F5F5] min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white border border-[#F0F0F0] p-8 shadow-sm">
          <h1 className="font-display text-3xl font-bold text-[#1A1A1A]">Contact Us</h1>
          <p className="mt-3 text-sm text-[#696969] leading-relaxed">
            Our team is available Monday–Saturday, 10 AM – 7 PM IST.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B] mb-1">Email Support</p>
              <a href="mailto:support@sario.in" className="text-base font-semibold text-primary hover:underline">
                support@sario.in
              </a>
              <p className="mt-1 text-xs text-[#696969]">Response within 24 hours</p>
            </div>
            <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9B9B9B] mb-1">WhatsApp</p>
              <a href="https://wa.me/919999999999" className="text-base font-semibold text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                +91 99999 99999
              </a>
              <p className="mt-1 text-xs text-[#696969]">Mon–Sat, 10 AM – 7 PM IST</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#F0F0F0] p-5">
            <p className="text-sm font-bold text-[#1A1A1A] mb-2">Grievance Officer</p>
            <p className="text-sm text-[#4D4D4D] leading-relaxed">
              As per Consumer Protection (E-Commerce) Rules 2020:<br />
              <strong>Email:</strong> grievance@sario.in<br />
              <strong>Response time:</strong> Within 48 business hours
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

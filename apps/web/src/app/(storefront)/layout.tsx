import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";

function TruckIcon() {
  return (
    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  );
}

export { TruckIcon, ShieldIcon, RefreshIcon };

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <Suspense fallback={<div className="h-24 bg-white" />}><Header /></Suspense>
      {children}

      <footer className="mt-10 bg-white border-t border-[#E8E8E8]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <p className="mb-1 text-xl font-extrabold text-primary">Sario</p>
              <p className="mt-2 text-xs text-[#696969] leading-relaxed">
                Handloom sarees, direct from India's finest weavers. Verified origin, transparent pricing.
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-[#1A1A1A]">Shop</p>
              <ul className="space-y-2 text-xs text-[#696969]">
                <li><Link href="/search" className="hover:text-primary">All Sarees</Link></li>
                <li><Link href="/search?q=Kanjivaram" className="hover:text-primary">Kanjivaram</Link></li>
                <li><Link href="/search?q=Banarasi" className="hover:text-primary">Banarasi</Link></li>
                <li><Link href="/search?q=Pochampally" className="hover:text-primary">Pochampally</Link></li>
                <li><Link href="/search?q=Chanderi" className="hover:text-primary">Chanderi</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-[#1A1A1A]">Account</p>
              <ul className="space-y-2 text-xs text-[#696969]">
                <li><Link href="/auth" className="hover:text-primary">Sign In</Link></li>
                <li><Link href="/account/orders" className="hover:text-primary">My Orders</Link></li>
                <li><Link href="/cart" className="hover:text-primary">My Cart</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-[#1A1A1A]">Help</p>
              <ul className="space-y-2 text-xs text-[#696969]">
                <li><a href="#" className="hover:text-primary">Returns &amp; Refunds</a></li>
                <li><a href="#" className="hover:text-primary">Shipping Info</a></li>
                <li><a href="#" className="hover:text-primary">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary">Terms of Use</a></li>
                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-[#F0F0F0] pt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-[#696969]">
              © {new Date().getFullYear()} Sario Technologies Pvt. Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

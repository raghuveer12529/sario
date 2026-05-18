import { Suspense } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Header } from "@/components/layout/header";

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/v1";

interface GrandChild { id: string; name: string; slug: string }
interface SubCategory { id: string; name: string; slug: string; children: GrandChild[] }
interface Category { id: string; name: string; slug: string; children: SubCategory[] }

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/catalog/categories`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json() as Promise<Category[]>;
  } catch {
    return [];
  }
}

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

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <Suspense fallback={<div className="h-24 bg-white" />}><Header categories={categories} /></Suspense>
      {children}

      <footer className="mt-12 bg-[#1E0533] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:gap-16">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-1">
              <p className="text-2xl font-extrabold tracking-tight text-white">Sario</p>
              <p className="mt-3 text-sm text-white/50 leading-relaxed max-w-xs">
                Handloom sarees sourced directly from India&apos;s finest weavers. Every purchase supports an artisan family.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <span className="rounded-full border border-[#FDE68A]/30 bg-[#FDE68A]/10 px-3 py-1 text-[10px] font-bold text-[#FDE68A] uppercase tracking-widest">
                  GI Certified
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Fair Trade
                </span>
              </div>
            </div>

            {/* Shop column */}
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">Shop</p>
              <ul className="space-y-3 text-sm text-white/60">
                <li><Link href="/search" className="hover:text-white transition-colors">All Sarees</Link></li>
                <li><Link href={"/search?q=Kanjivaram" as Route} className="hover:text-white transition-colors">Kanjivaram</Link></li>
                <li><Link href={"/search?q=Banarasi" as Route} className="hover:text-white transition-colors">Banarasi</Link></li>
                <li><Link href={"/search?q=Pochampally" as Route} className="hover:text-white transition-colors">Pochampally</Link></li>
                <li><Link href={"/search?q=Chanderi" as Route} className="hover:text-white transition-colors">Chanderi</Link></li>
              </ul>
            </div>

            {/* Account column */}
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">Account</p>
              <ul className="space-y-3 text-sm text-white/60">
                <li><Link href="/auth" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/account/orders" className="hover:text-white transition-colors">My Orders</Link></li>
                <li><Link href="/cart" className="hover:text-white transition-colors">My Cart</Link></li>
                <li><Link href={"/wishlist" as Route} className="hover:text-white transition-colors">Wishlist</Link></li>
              </ul>
            </div>

            {/* Help column */}
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">Help</p>
              <ul className="space-y-3 text-sm text-white/60">
                <li><Link href={"/returns" as Route} className="hover:text-white transition-colors">Returns &amp; Refunds</Link></li>
                <li><Link href={"/shipping" as Route} className="hover:text-white transition-colors">Shipping Info</Link></li>
                <li><Link href={"/contact" as Route} className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href={"/terms" as Route} className="hover:text-white transition-colors">Terms of Use</Link></li>
                <li><Link href={"/privacy" as Route} className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()} Sario. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span>Payments by Razorpay</span>
              <span>&middot;</span>
              <span>Shipping by Shiprocket</span>
              <span>&middot;</span>
              <span>Secured by Cloudflare</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

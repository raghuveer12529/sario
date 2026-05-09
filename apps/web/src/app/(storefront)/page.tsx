import { Suspense } from "react";
import { apiFetch } from "@/lib/api";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sario — Premium Sarees, Direct from Weavers",
};

interface Product {
  id: string;
  name: string;
  slug: string;
  images: Array<{ url: string; altText?: string }>;
  variants: Array<{ pricePaise: number; mrpPaise: number }>;
}

async function getFeatured(): Promise<Product[]> {
  try {
    return await apiFetch<Product[]>("/catalog/featured?limit=12");
  } catch {
    return [];
  }
}

const CATEGORIES = [
  { label: "Kanjivaram", query: "q=Kanjivaram", color: "bg-red-100 text-red-700 border-red-200" },
  { label: "Banarasi", query: "q=Banarasi", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { label: "Pochampally", query: "q=Pochampally", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { label: "Chanderi", query: "q=Chanderi", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { label: "Mysore Silk", query: "q=Mysore+Silk", color: "bg-green-100 text-green-700 border-green-200" },
  { label: "Tussar", query: "q=Tussar", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { label: "Patola", query: "q=Patola", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { label: "Sambalpuri", query: "q=Sambalpuri", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
];

const BANNER_OFFERS = [
  { title: "Upto 70% Off", subtitle: "Kanjivaram Sarees", cta: "Shop Now", href: "/search?q=Kanjivaram", gradient: "from-[#9B2D8E] to-[#C06BB5]" },
  { title: "Free Delivery", subtitle: "On orders above ₹2,000", cta: "Explore", href: "/search", gradient: "from-[#E8590C] to-[#F0943A]" },
  { title: "New Arrivals", subtitle: "Banarasi & Silk Sarees", cta: "View All", href: "/search?q=Banarasi", gradient: "from-[#1A7A3A] to-[#3DBE6C]" },
];

function FabricIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
      <path d="M12 2c-2.5 2.5-4 6-4 10s1.5 7.5 4 10" /><path d="M12 2c2.5 2.5 4 6 4 10s-1.5 7.5-4 10" />
      <path d="M2 12h20" />
    </svg>
  );
}
function ShieldCheckIcon() {
  return (
    <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
function RefreshCcwIcon() {
  return (
    <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  );
}

export default async function HomePage() {
  const products = await getFeatured();

  return (
    <main>
      {/* Hero Banner */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BANNER_OFFERS.map((banner) => (
              <Link
                key={banner.title}
                href={banner.href as never}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${banner.gradient} p-6 text-white transition-opacity hover:opacity-95`}
              >
                <p className="text-xl font-bold">{banner.title}</p>
                <p className="mt-1 text-sm opacity-90">{banner.subtitle}</p>
                <span className="mt-4 inline-block rounded-lg bg-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
                  {banner.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="bg-white mt-3 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-base font-bold text-[#1A1A1A]">Shop by Category</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href={`/search?${cat.query}`}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:shadow-sm ${cat.color}`}
              >
                <FabricIcon />
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mt-3 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1A1A]">Featured Sarees</h2>
            <Link href="/search" className="text-sm font-semibold text-primary hover:underline">
              View All
            </Link>
          </div>
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid products={products} />
          </Suspense>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="mt-3 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { Icon: ShieldCheckIcon, title: "Verified Weaver Origin", desc: "Every product is linked to a verified weaver or craft cluster." },
              { Icon: TagIcon, title: "Transparent Pricing", desc: "See exactly what the weaver earns from your purchase." },
              { Icon: RefreshCcwIcon, title: "Easy 7-Day Returns", desc: "No-questions-asked returns on all orders." },
            ].map((badge) => (
              <div key={badge.title} className="flex items-start gap-4 rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-4">
                <div className="shrink-0"><badge.Icon /></div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{badge.title}</p>
                  <p className="mt-1 text-xs text-[#696969]">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Now */}
      <section className="mt-3 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1A1A1A]">Trending Now</h2>
            <Link href="/search" className="text-sm font-semibold text-primary hover:underline">
              View All
            </Link>
          </div>
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid products={products.slice().reverse()} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8E8E8] py-16 text-center text-[#9B9B9B]">
        <svg className="mx-auto mb-3 h-10 w-10 text-[#CCCCCC]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        </svg>
        <p className="text-sm">No products yet — check back soon.</p>
        <p className="mt-1 text-xs text-[#BBBBBB]">Try Banarasi, Kanjivaram, or Silk</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => {
        const price = p.variants[0]?.pricePaise ?? 0;
        const mrp = p.variants[0]?.mrpPaise ?? 0;
        const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
        return (
          <Link key={p.id} href={`/p/${p.slug}`} className="group block bg-white rounded-xl border border-[#F0F0F0] overflow-hidden hover:shadow-md hover:border-[#E0E0E0] transition-all">
            <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F5F5]">
              {p.images[0] ? (
                <img
                  src={p.images[0].url}
                  alt={p.images[0].altText ?? p.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <svg className="h-12 w-12 text-[#DDDDDD]" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
              )}
              {discount > 0 && (
                <span className="absolute left-0 top-2 bg-[#E8590C] px-2 py-0.5 text-xs font-bold text-white rounded-r-sm">
                  {discount}% OFF
                </span>
              )}
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 text-xs font-medium text-[#1A1A1A] leading-tight">{p.name}</p>
              {p.variants[0] && (
                <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
                  <span className="text-sm font-bold text-[#1A1A1A]">
                    ₹{Math.round(price / 100).toLocaleString("en-IN")}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-xs text-[#9B9B9B] line-through">
                        ₹{Math.round(mrp / 100).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-semibold text-[#26A541]">{discount}% off</span>
                    </>
                  )}
                </div>
              )}
              <p className="mt-0.5 text-xs font-medium text-[#26A541]">Free Delivery</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-[#F0F0F0] bg-white overflow-hidden">
          <div className="aspect-[3/4] bg-[#F0F0F0]" />
          <div className="p-2.5 space-y-1.5">
            <div className="h-3 w-full rounded bg-[#F0F0F0]" />
            <div className="h-3 w-3/4 rounded bg-[#F0F0F0]" />
            <div className="h-3 w-1/2 rounded bg-[#F0F0F0]" />
          </div>
        </div>
      ))}
    </div>
  );
}

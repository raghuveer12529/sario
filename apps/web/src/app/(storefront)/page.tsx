import { Suspense } from "react";
import { apiFetch } from "@/lib/api";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import Image from "next/image";
import { WishlistButton } from "./wishlist-button";

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/v1";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sario — Premium Sarees, Direct from Weavers",
};

interface GrandChild { id: string; name: string; slug: string }
interface SubCategory { id: string; name: string; slug: string; children: GrandChild[] }
interface Category { id: string; name: string; slug: string; children: SubCategory[] }

interface Product {
  id: string;
  name: string;
  slug: string;
  images: Array<{ url: string; altText?: string }>;
  variants: Array<{ pricePaise: number; mrpPaise: number }>;
  vendorName?: string;
  vendorSlug?: string;
}

async function getFeatured(): Promise<Product[]> {
  try {
    return await apiFetch<Product[]>("/catalog/featured?limit=12");
  } catch {
    return [];
  }
}

async function getNewArrivals(): Promise<Product[]> {
  try {
    const res = await apiFetch<{ hits: Array<{ id: string; name: string; slug: string; primaryImageUrl?: string; minPricePaise: number; mrpPaise?: number; vendorName?: string; vendorSlug?: string }> }>("/catalog/search?q=&sort=newest&limit=10", { cache: "no-store" });
    return res.hits.map((h) => ({
      id: h.id,
      name: h.name,
      slug: h.slug,
      images: h.primaryImageUrl ? [{ url: h.primaryImageUrl }] : [],
      variants: [{ pricePaise: h.minPricePaise, mrpPaise: h.mrpPaise ?? h.minPricePaise }],
      ...(h.vendorName ? { vendorName: h.vendorName } : {}),
      ...(h.vendorSlug ? { vendorSlug: h.vendorSlug } : {}),
    }));
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/catalog/categories`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json() as Promise<Category[]>;
  } catch {
    return [];
  }
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
  const [products, newArrivals, categories] = await Promise.all([getFeatured(), getNewArrivals(), getCategories()]);

  // flatten: parent first, then its children, for the chip row
  const chips = categories.flatMap((cat) => [
    { id: cat.id, name: cat.name, slug: cat.slug },
    ...cat.children.map((child) => ({ id: child.id, name: child.name, slug: child.slug })),
  ]);

  return (
    <main>
      {/* Hero — editorial aspirational banner */}
      <section className="relative overflow-hidden bg-[#1E0533]">
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left copy */}
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70 backdrop-blur-sm">
                Handloom Direct from India&apos;s Weavers
              </p>
              <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Wear the Art of<br />
                <span className="bg-gradient-to-r from-[#F9A8D4] to-[#FDE68A] bg-clip-text text-transparent">
                  India&apos;s Heritage
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base text-white/60 leading-relaxed">
                Kanjivaram, Banarasi, Pochampally — crafted by master weavers, certified at origin, delivered to your door.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-[#1E0533] shadow-lg transition-all hover:shadow-white/20 hover:scale-[1.02] active:scale-100"
                >
                  Explore Collection
                </Link>
                <Link
                  href="/search?sort=newest"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  New Arrivals
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">500+</p>
                  <p className="text-xs text-white/50 mt-0.5">Master Weavers</p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">10k+</p>
                  <p className="text-xs text-white/50 mt-0.5">Saree Varieties</p>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div className="text-center">
                  <p className="text-xl font-bold text-[#FDE68A]">GI</p>
                  <p className="text-xs text-white/50 mt-0.5">Certified Origins</p>
                </div>
              </div>
            </div>

            {/* Right — editorial saree photograph */}
            <div className="relative hidden lg:block">
              <div className="relative h-[520px] w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/50">
                <Image
                  src="https://images.unsplash.com/photo-1641699862936-be9f49b1c38d?auto=format&fit=crop&w=960&q=90&crop=top"
                  alt="Tamil bride in purple and gold Kanjivaram silk saree"
                  fill
                  sizes="480px"
                  className="object-cover object-top"
                  priority
                />
                {/* Subtle dark gradient at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E0533]/70 via-[#1E0533]/10 to-transparent" />
                {/* Photo credit */}
                <p className="absolute bottom-3 right-3 text-[9px] text-white/40 font-medium tracking-wider">
                  Photo: Bella Pon Fruitsia / Unsplash
                </p>
              </div>
              {/* GI badge overlay */}
              <div className="absolute -bottom-4 -left-4 rounded-2xl border border-[#FDE68A]/30 bg-[#1E0533]/95 backdrop-blur-md px-5 py-4 shadow-xl">
                <p className="text-[10px] font-bold text-[#FDE68A]/80 uppercase tracking-widest">Authenticity</p>
                <p className="mt-0.5 text-sm font-bold text-white">GI Tag Certified Weaves</p>
              </div>
              {/* Floating stat card */}
              <div className="absolute -top-4 -right-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md px-4 py-3 shadow-xl">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Heritage Since</p>
                <p className="mt-0.5 text-lg font-bold text-white">400+ Years</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Occasions — visual card strip */}
      <section className="bg-white border-b border-[#F0F0F0] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#9B9B9B]">Shop by Occasion</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Wedding",
                sub: "Bridal & Ceremony",
                href: "/search?occasion=wedding",
                img: "https://images.unsplash.com/photo-1727430228383-aa1fb59db8bf?auto=format&fit=crop&w=400&q=85&crop=top",
                alt: "Woman in red bridal saree",
              },
              {
                label: "Festive",
                sub: "Puja & Celebrations",
                href: "/search?occasion=festive",
                img: "https://images.unsplash.com/flagged/photo-1551854716-8b811be39e7e?auto=format&fit=crop&w=400&q=85&crop=top",
                alt: "Woman in green and gold festive saree",
              },
              {
                label: "Gifting",
                sub: "Curated for Her",
                href: "/search?occasion=gifting",
                img: "https://images.unsplash.com/photo-1588140686379-1b76a52103dc?auto=format&fit=crop&w=400&q=85",
                alt: "Vibrant Indian textile fabric",
              },
              {
                label: "Everyday",
                sub: "Comfort & Style",
                href: "/search?occasion=everyday",
                img: "https://images.unsplash.com/photo-1610189012906-4c0aa9b9781e?auto=format&fit=crop&w=400&q=85&crop=top",
                alt: "Woman in blue and yellow cotton saree",
              },
            ].map((o) => (
              <Link
                key={o.label}
                href={o.href as Route}
                className="group relative overflow-hidden rounded-2xl aspect-[3/2] sm:aspect-[2/3] block"
              >
                <Image
                  src={o.img}
                  alt={o.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {/* Text */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                  <p className="text-base font-bold text-white leading-tight">{o.label}</p>
                  <p className="text-[11px] text-white/70 mt-0.5">{o.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      {chips.length > 0 && (
        <section className="bg-white mt-3 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-4 text-base font-bold text-[#1A1A1A]">Shop by Category</h2>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-2">
              {chips.map((chip) => (
                <Link
                  key={chip.id}
                  href={`/search?categoryId=${chip.id}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-semibold text-[#4D4D4D] transition-all hover:border-primary hover:text-primary"
                >
                  {chip.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="mt-3 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#1A1A1A]">Featured Sarees</h2>
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

      {/* Heritage Edit — editorial image gallery */}
      <section className="mt-3 bg-[#1E0533] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FDE68A]/70 mb-1">The Heritage Edit</p>
              <h2 className="font-display text-2xl font-bold text-white">Craft Stories from the Loom</h2>
            </div>
            <Link href="/search" className="text-sm font-semibold text-white/60 hover:text-white transition-colors">
              Explore All →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:grid-rows-2">
            {/* Large feature image — spans 2 rows on desktop */}
            <div className="relative overflow-hidden rounded-2xl lg:row-span-2 aspect-[4/3] lg:aspect-auto">
              <Image
                src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=88&crop=top"
                alt="Woman in red and brown Banarasi silk saree"
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span className="inline-block rounded-full border border-[#FDE68A]/40 bg-[#FDE68A]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#FDE68A] uppercase tracking-widest mb-2">
                  Banarasi Silk
                </span>
                <p className="font-display text-xl font-bold text-white leading-tight">
                  Woven with Gold, Worn with Grace
                </p>
                <p className="mt-1 text-xs text-white/60">Varanasi craft cluster · GI Certified</p>
              </div>
            </div>
            {/* Top-right image */}
            <div className="relative overflow-hidden rounded-2xl lg:col-span-2 aspect-[16/7]">
              <Image
                src="https://images.unsplash.com/photo-1610189026205-27510cfc52f8?auto=format&fit=crop&w=1200&q=85&crop=center"
                alt="Women in pink and purple silk sarees"
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <span className="inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/80 uppercase tracking-widest mb-2 backdrop-blur-sm">
                  Festive Collection
                </span>
                <p className="font-display text-lg font-bold text-white">Silk for Every Celebration</p>
              </div>
            </div>
            {/* Bottom-right image */}
            <div className="relative overflow-hidden rounded-2xl lg:col-span-2 aspect-[16/7]">
              <Image
                src="https://images.unsplash.com/photo-1676696706907-0e04665b80bd?auto=format&fit=crop&w=1200&q=85"
                alt="Teal silk fabric weave close-up"
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <span className="inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/80 uppercase tracking-widest mb-2 backdrop-blur-sm">
                  The Weave
                </span>
                <p className="font-display text-lg font-bold text-white">Every Thread Tells a Story</p>
                <p className="mt-1 text-xs text-white/60">Hand-woven on traditional pit looms</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="mt-3 bg-white py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1A1A1A]">New Arrivals</h2>
                <p className="text-xs text-[#9B9B9B] mt-0.5">Just added by our weavers</p>
              </div>
              <Link href="/search?sort=newest" className="text-sm font-semibold text-primary hover:underline">
                View All
              </Link>
            </div>
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid products={newArrivals} />
            </Suspense>
          </div>
        </section>
      )}
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
                <Image
                  src={p.images[0].url}
                  alt={p.images[0].altText ?? p.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <svg className="h-12 w-12 text-[#DDDDDD]" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
              )}
              {discount > 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                  {discount}% off
                </span>
              )}
              <WishlistButton productId={p.id} />
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 text-sm font-semibold text-[#1A1A1A] leading-snug">{p.name}</p>
              {p.vendorName && p.vendorSlug && (
                <Link
                  href={`/weavers/${p.vendorSlug}` as Route}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-[#9B9B9B] hover:text-primary transition-colors truncate block"
                >
                  {p.vendorName}
                </Link>
              )}
              {p.variants[0] && (
                <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
                  <span className="text-base font-bold text-[#1A1A1A]">
                    ₹{Math.round(price / 100).toLocaleString("en-IN")}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-xs text-[#9B9B9B] line-through">
                        ₹{Math.round(mrp / 100).toLocaleString("en-IN")}
                      </span>
                    </>
                  )}
                </div>
              )}
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

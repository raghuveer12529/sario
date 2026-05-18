import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import { AddToCart } from "./add-to-cart";
import { ImageGallery } from "./image-gallery";
import { WeaverCard } from "./weaver-card";

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  fabric?: string;
  region?: string;
  weaverStory?: string;
  giTag?: string;
  vendor: { businessName: string; about?: string };
  category: { name: string };
  variants: Array<{
    id: string;
    name: string;
    pricePaise: number;
    mrpPaise: number;
    color?: string;
    inventory: { quantity: number; reservedQuantity: number };
  }>;
  images: Array<{ url: string; altText?: string; isPrimary: boolean }>;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const p = await apiFetch<ProductDetail>(`/catalog/products/${params.slug}`);
    const primaryImageUrl = p.images.find((i) => i.isPrimary)?.url;
    return {
      title: `${p.name} — Sario`,
      description: p.description.slice(0, 160),
      openGraph: { images: primaryImageUrl ? [primaryImageUrl] : [] },
    };
  } catch {
    return {};
  }
}

function TruckIcon() {
  return (
    <svg className="h-5 w-5 text-[#26A541]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function ReturnIcon() {
  return (
    <svg className="h-5 w-5 text-[#696969]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg className="h-5 w-5 text-[#696969]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product: ProductDetail;
  try {
    product = await apiFetch<ProductDetail>(`/catalog/products/${params.slug}`);
  } catch {
    notFound();
  }

  const totalStock = product.variants.reduce(
    (s, v) => s + (v.inventory.quantity - v.inventory.reservedQuantity),
    0,
  );

  return (
    <main className="bg-[#F5F5F5] min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#F0F0F0] px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#9B9B9B]">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="text-[#E8E8E8] font-normal text-base">/</span>
          <Link href="/search" className="hover:text-primary transition-colors">Sarees</Link>
          <span className="text-[#E8E8E8] font-normal text-base">/</span>
          <span className="text-[#1A1A1A]">{product.category.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[auto,1fr] lg:items-start">
          {/* Image gallery — interactive client component */}
          <div className="lg:w-[480px] lg:sticky lg:top-24">
            <ImageGallery images={product.images} name={product.name} />
          </div>

          {/* Product details */}
          <div className="space-y-4">
            {/* Title block */}
            <div className="rounded-2xl bg-white border border-[#F0F0F0] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary/70">{product.category.name}</p>
                {product.giTag && (
                  <span className="flex items-center gap-1 rounded-full bg-[#FFF8E7] px-2 py-0.5 text-[9px] font-bold text-[#8A6800] border border-[#FFD700]/30 uppercase tracking-tighter">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    GI Tag Certified
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-[#1A1A1A] leading-tight">{product.name}</h1>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="text-[#696969]">Sold by</span>
                <span className="font-bold text-primary hover:underline cursor-pointer">{product.vendor.businessName}</span>
              </div>

              {totalStock === 0 && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-sm font-bold text-red-600 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                  Out of Stock
                </div>
              )}
            </div>

            {/* Price + Add to Cart */}
            <div className="rounded-2xl bg-white border border-[#F0F0F0] p-6 shadow-sm">
              <AddToCart variants={product.variants} />
            </div>

            {/* Delivery + Trust */}
            <div className="rounded-2xl bg-white border border-[#F0F0F0] p-6 space-y-5 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-[#1A1A1A] uppercase tracking-wider">Delivery Details</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-2 rounded-xl border border-gray-50 bg-gray-50/30 p-3">
                    <TruckIcon />
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">Free Shipping</p>
                      <p className="text-[10px] text-[#696969] mt-0.5 leading-tight">Delivery in 5-7 business days</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 rounded-xl border border-gray-50 bg-gray-50/30 p-3">
                    <ReturnIcon />
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">Easy Returns</p>
                      <p className="text-[10px] text-[#696969] mt-0.5 leading-tight">Within 7 days of delivery</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 rounded-xl border border-gray-50 bg-gray-50/30 p-3">
                    <LockIcon />
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">Secure Pay</p>
                      <p className="text-[10px] text-[#696969] mt-0.5 leading-tight">Encrypted Razorpay Checkout</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F0F0F0] pt-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-5 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  </div>
                  <p className="text-[10px] font-extrabold text-[#1A1A1A] uppercase tracking-widest">Sario Authenticity Promise</p>
                </div>
                <p className="text-xs text-[#696969] leading-relaxed">
                  Every saree is sourced directly from verified weavers and craft clusters. We ensure traditional weaving techniques are preserved and artists are fairly compensated.
                </p>
              </div>
            </div>

            {/* Structured specs */}
            <div className="rounded-2xl bg-white border border-[#F0F0F0] p-6 shadow-sm">
              <p className="mb-4 text-sm font-extrabold uppercase tracking-widest text-[#1A1A1A]">
                Product Specifications
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {product.fabric && (
                  <>
                    <dt className="text-[#9B9B9B] font-medium">Fabric</dt>
                    <dd className="font-semibold text-[#1A1A1A]">{product.fabric}</dd>
                  </>
                )}
                {product.region && (
                  <>
                    <dt className="text-[#9B9B9B] font-medium">Origin</dt>
                    <dd className="font-semibold text-[#1A1A1A]">{product.region}</dd>
                  </>
                )}
                <dt className="text-[#9B9B9B] font-medium">Category</dt>
                <dd className="font-semibold text-[#1A1A1A]">{product.category.name}</dd>
                <dt className="text-[#9B9B9B] font-medium">Saree Length</dt>
                <dd className="font-semibold text-[#1A1A1A]">6.3 metres</dd>
                <dt className="text-[#9B9B9B] font-medium">Blouse Piece</dt>
                <dd className="font-semibold text-[#1A1A1A]">0.8 metres included</dd>
                <dt className="text-[#9B9B9B] font-medium">Care</dt>
                <dd className="font-semibold text-[#1A1A1A]">Dry clean recommended</dd>
                <dt className="text-[#9B9B9B] font-medium">Dispatch</dt>
                <dd className="font-semibold text-[#1A1A1A]">Ships in 2–3 business days</dd>
              </dl>
              {product.giTag && (
                <div className="mt-4 rounded-xl border border-[#FFD700]/30 bg-[#FFFBEA] px-4 py-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-[#8A6800] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <p className="text-xs font-semibold text-[#8A6800]">
                    GI Tag Certified — {product.giTag}. Geographical Indication of origin is verified.
                  </p>
                </div>
              )}
            </div>

            {product.description && (
              <div className="rounded-2xl bg-white border border-[#F0F0F0] p-6 shadow-sm">
                <p className="mb-3 text-sm font-extrabold uppercase tracking-widest text-[#1A1A1A]">About this Saree</p>
                <p className="text-sm text-[#4D4D4D] leading-loose">{product.description}</p>
              </div>
            )}

            {product.weaverStory && (
              <WeaverCard
                vendorName={product.vendor.businessName}
                region={product.region}
                story={product.weaverStory}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

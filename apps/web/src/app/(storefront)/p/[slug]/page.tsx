import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import { AddToCart } from "./add-to-cart";
import { ImageGallery } from "./image-gallery";

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
                  <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Check Pincode</button>
                </div>
                
                {/* Pincode Entry Placeholder */}
                <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-1.5 focus-within:border-primary/30 transition-colors">
                  <div className="flex h-8 items-center gap-2 px-2 text-[#9B9B9B]">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Enter delivery pincode" 
                    className="flex-1 bg-transparent text-sm font-bold text-[#1A1A1A] placeholder:text-gray-300 placeholder:font-medium focus:outline-none"
                    maxLength={6}
                  />
                  <button className="rounded-lg bg-white px-4 py-1.5 text-[10px] font-extrabold text-primary border border-gray-100 shadow-sm hover:border-primary transition-all active:scale-95">CHECK</button>
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

            {/* Product details */}
            <div className="rounded-xl bg-white border border-[#F0F0F0] p-5">
              <p className="mb-3 text-sm font-bold text-[#1A1A1A]">Product Details</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {product.fabric && (
                  <>
                    <dt className="text-[#696969]">Fabric</dt>
                    <dd className="font-medium text-[#1A1A1A]">{product.fabric}</dd>
                  </>
                )}
                {product.region && (
                  <>
                    <dt className="text-[#696969]">Region</dt>
                    <dd className="font-medium text-[#1A1A1A]">{product.region}</dd>
                  </>
                )}
                <dt className="text-[#696969]">Category</dt>
                <dd className="font-medium text-[#1A1A1A]">{product.category.name}</dd>
              </dl>
            </div>

            {product.description && (
              <div className="rounded-xl bg-white border border-[#F0F0F0] p-5">
                <p className="mb-2 text-sm font-bold text-[#1A1A1A]">Description</p>
                <p className="text-sm text-[#4D4D4D] leading-relaxed">{product.description}</p>
              </div>
            )}

            {product.weaverStory && (
              <div className="rounded-xl border border-[#E8D5E8] bg-[#F9F0F9] p-5">
                <p className="mb-2 text-sm font-bold text-primary">Weaver's Story</p>
                <p className="text-sm text-[#4D4D4D] leading-relaxed">{product.weaverStory}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

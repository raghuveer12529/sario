"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import { RejectDialog } from "@/components/reject-dialog";

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  color?: string | null;
  pricePaise: number;
  mrpPaise: number;
  weightGrams: number;
  inventory: { quantity: number; reservedQuantity: number };
}

interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  description: string;
  fabric?: string | null;
  region?: string | null;
  weaverStory?: string | null;
  giTag?: string | null;
  hsnCode?: string | null;
  tags: string[];
  rejectionReason?: string | null;
  createdAt: string;
  vendor: { businessName: string; slug: string; about?: string | null };
  category: { name: string };
  variants: ProductVariant[];
  images: ProductImage[];
}

function formatPaise(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function ImageGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const primaryIndex = Math.max(0, images.findIndex((i) => i.isPrimary));
  const [activeIndex, setActiveIndex] = useState(primaryIndex);
  const active = images[activeIndex] ?? images[0];

  if (!active) {
    return (
      <div className="aspect-[4/5] w-full rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
        <svg className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-start">
      <div className="flex-1">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
          <img
            src={active.url}
            alt={active.altText ?? name}
            className="h-full w-full object-cover"
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 lg:hidden">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${activeIndex === i ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {images.length > 1 && (
        <div className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0 lg:max-h-[560px] lg:overflow-y-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                activeIndex === i
                  ? "border-blue-500 shadow-md scale-105"
                  : "border-gray-200 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              {img.isPrimary && (
                <span className="absolute bottom-0 left-0 right-0 bg-blue-500/80 text-[8px] text-white font-bold text-center py-0.5">PRIMARY</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantSelector({ variants }: { variants: ProductVariant[] }) {
  const [selected, setSelected] = useState(variants[0]?.id ?? "");
  const current = variants.find((v) => v.id === selected) ?? variants[0];
  const stock = current ? current.inventory.quantity - current.inventory.reservedQuantity : 0;
  const discount = current && current.mrpPaise > current.pricePaise
    ? Math.round(((current.mrpPaise - current.pricePaise) / current.mrpPaise) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {current && (
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-black text-gray-900">{formatPaise(current.pricePaise)}</span>
          {discount > 0 && (
            <>
              <span className="text-lg text-gray-400 line-through font-medium">{formatPaise(current.mrpPaise)}</span>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-black text-green-700">{discount}% off</span>
            </>
          )}
        </div>
      )}

      {variants.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">Select Variant</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition-all ${
                  selected === v.id
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-700 hover:border-gray-400"
                }`}
              >
                {v.name}
                {v.color && <span className="ml-1 text-xs font-medium text-gray-500">· {v.color}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ${
        stock > 0 ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
      }`}>
        <span className={`h-2 w-2 rounded-full ${stock > 0 ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
        <span className={`text-sm font-bold ${stock > 0 ? "text-green-700" : "text-red-700"}`}>
          {stock > 0 ? `${stock} in stock` : "Out of stock"}
        </span>
        {current && <span className="ml-auto text-xs text-gray-400">SKU: {current.sku}</span>}
      </div>

      <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
        Add to Cart — disabled in preview
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING_REVIEW: { bg: "bg-amber-100", text: "text-amber-800", label: "Pending Review" },
  APPROVED:       { bg: "bg-green-100", text: "text-green-800", label: "Approved" },
  REJECTED:       { bg: "bg-red-100",   text: "text-red-800",   label: "Rejected" },
  DRAFT:          { bg: "bg-gray-100",  text: "text-gray-800",  label: "Draft" },
};

export default function AdminProductPreviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    adminFetch<ProductDetail>(`/admin/products/${id}`)
      .then(setProduct)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const approve = async () => {
    setSubmitting(true);
    try {
      await adminFetch(`/admin/products/${id}/approve`, { method: "POST" });
      router.push("/products");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Approval failed.");
      setSubmitting(false);
    }
  };

  const reject = async (reason: string) => {
    setSubmitting(true);
    try {
      await adminFetch(`/admin/products/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      router.push("/products");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Rejection failed.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-12 text-center">
        <p className="text-lg font-black text-red-700">Failed to load product</p>
        <p className="mt-1 text-sm text-red-500">{error}</p>
        <button onClick={() => router.back()} className="mt-6 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white">
          Go back
        </button>
      </div>
    );
  }

  const statusStyle = STATUS_STYLE[product.status] ?? STATUS_STYLE["DRAFT"]!;
  const totalStock = product.variants.reduce(
    (s, v) => s + v.inventory.quantity - v.inventory.reservedQuantity,
    0
  );

  return (
    <>
      {showRejectDialog && (
        <RejectDialog
          title="Reject this product?"
          placeholder="Enter feedback for the vendor (required)…"
          onConfirm={(reason) => { void reject(reason); setShowRejectDialog(false); }}
          onCancel={() => setShowRejectDialog(false)}
        />
      )}

      {/* Sticky review action bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Reviewing Product</p>
              <p className="truncate text-sm font-black text-gray-900">{product.name}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:block text-xs font-semibold text-gray-400">by {product.vendor.businessName}</span>
            {product.status === "PENDING_REVIEW" && (
              <>
                <button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={submitting}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-black text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95"
                >
                  Reject
                </button>
                <button
                  onClick={() => void approve()}
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/50 disabled:opacity-50 transition-all active:scale-95"
                >
                  {submitting ? "Processing…" : "Approve"}
                </button>
              </>
            )}
            {product.status === "APPROVED" && (
              <span className="flex items-center gap-1.5 rounded-xl bg-green-100 px-4 py-2 text-sm font-black text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live on storefront
              </span>
            )}
            {product.status === "REJECTED" && (
              <span className="rounded-xl bg-red-100 px-4 py-2 text-sm font-black text-red-700">
                Rejected
              </span>
            )}
          </div>
        </div>

        {product.status === "REJECTED" && product.rejectionReason && (
          <div className="border-t border-red-100 bg-red-50 px-6 py-2">
            <p className="text-xs text-red-700">
              <span className="font-black">Rejection reason: </span>{product.rejectionReason}
            </p>
          </div>
        )}
      </div>

      {/* Storefront preview — visually matches the buyer PDP */}
      <div className="bg-gray-50 min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-100 px-4 py-2.5">
          <div className="mx-auto max-w-6xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span>Home</span>
            <span className="text-gray-200 font-normal text-base">/</span>
            <span>Sarees</span>
            <span className="text-gray-200 font-normal text-base">/</span>
            <span className="text-gray-700">{product.category.name}</span>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[auto,1fr] lg:items-start">
            {/* Left: image gallery */}
            <div className="lg:w-[440px] lg:sticky lg:top-24">
              <ImageGallery images={product.images} name={product.name} />
              {/* Admin image count note */}
              <p className="mt-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                {product.images.length} photo{product.images.length !== 1 ? "s" : ""} uploaded
              </p>
            </div>

            {/* Right: product details */}
            <div className="space-y-4">
              {/* Title block */}
              <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600/70">
                    {product.category.name}
                  </p>
                  {product.giTag && (
                    <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-[9px] font-bold text-yellow-800 border border-yellow-200 uppercase tracking-tighter">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      GI Tag Certified
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Sold by</span>
                  <span className="font-semibold text-amber-700">{product.vendor.businessName}</span>
                </div>
                {totalStock === 0 && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                    Out of Stock
                  </div>
                )}
              </div>

              {/* Price + variants */}
              <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                <VariantSelector variants={product.variants} />
              </div>

              {/* Delivery trust */}
              <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm space-y-4">
                <p className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Delivery Details</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: "🚚", title: "Free Shipping", sub: "Delivery in 5–7 business days" },
                    { icon: "↩️", title: "Easy Returns", sub: "Within 7 days of delivery" },
                    { icon: "🔒", title: "Secure Pay", sub: "Encrypted Razorpay Checkout" },
                  ].map((item) => (
                    <div key={item.title} className="flex flex-col gap-2 rounded-xl border border-gray-50 bg-gray-50/50 p-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{item.title}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specifications */}
              <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                <p className="mb-4 text-sm font-extrabold uppercase tracking-widest text-gray-900">Product Specifications</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {product.fabric && (
                    <><dt className="text-gray-400 font-medium">Fabric</dt><dd className="font-semibold text-gray-900">{product.fabric}</dd></>
                  )}
                  {product.region && (
                    <><dt className="text-gray-400 font-medium">Origin</dt><dd className="font-semibold text-gray-900">{product.region}</dd></>
                  )}
                  <dt className="text-gray-400 font-medium">Category</dt>
                  <dd className="font-semibold text-gray-900">{product.category.name}</dd>
                  {product.hsnCode && (
                    <><dt className="text-gray-400 font-medium">HSN Code</dt><dd className="font-semibold text-gray-900">{product.hsnCode}</dd></>
                  )}
                  <dt className="text-gray-400 font-medium">Saree Length</dt>
                  <dd className="font-semibold text-gray-900">6.3 metres</dd>
                  <dt className="text-gray-400 font-medium">Blouse Piece</dt>
                  <dd className="font-semibold text-gray-900">0.8 metres included</dd>
                  <dt className="text-gray-400 font-medium">Care</dt>
                  <dd className="font-semibold text-gray-900">Dry clean recommended</dd>
                  <dt className="text-gray-400 font-medium">Submitted</dt>
                  <dd className="font-semibold text-gray-900">
                    {new Date(product.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </dd>
                </dl>
                {product.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {product.giTag && (
                  <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 flex items-center gap-2">
                    <span className="text-lg">⭐</span>
                    <p className="text-xs font-semibold text-yellow-800">
                      GI Tag Certified — {product.giTag}. Geographical Indication of origin is verified.
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
                  <p className="mb-3 text-sm font-extrabold uppercase tracking-widest text-gray-900">About this Saree</p>
                  <p className="text-sm text-gray-600 leading-loose">{product.description}</p>
                </div>
              )}

              {/* Weaver story */}
              {product.weaverStory && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-black text-lg">
                      {product.vendor.businessName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">{product.vendor.businessName}</p>
                      {product.region && <p className="text-xs text-gray-500">{product.region}</p>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed italic">&ldquo;{product.weaverStory}&rdquo;</p>
                </div>
              )}

              {/* Bottom approve/reject — visible without scrolling back up on long pages */}
              {product.status === "PENDING_REVIEW" && (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900">Ready to decide?</p>
                    <p className="text-xs text-gray-500 mt-0.5">Approving will make this product live on the storefront immediately.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setShowRejectDialog(true)}
                      disabled={submitting}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-black text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => void approve()}
                      disabled={submitting}
                      className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/50 disabled:opacity-50 transition-all"
                    >
                      {submitting ? "Processing…" : "Approve & Go Live"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

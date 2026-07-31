"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";
import { useVendor } from "@/hooks/use-vendor";

type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

interface ProductVariant {
  pricePaise: number;
  inventory: { quantity: number; reservedQuantity: number };
}

interface ProductImage {
  url: string;
  isPrimary?: boolean;
}

interface VendorProduct {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  fabric?: string | null;
  region?: string | null;
  rejectionReason?: string | null;
  category?: { id: string; name: string } | null;
  variants: ProductVariant[];
  images: ProductImage[];
}

interface ProductsResponse {
  data: VendorProduct[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_TABS: Array<{ label: string; value: ProductStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Pending Review", value: "PENDING_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const STATUS_CONFIG: Record<ProductStatus, {
  bar: string;
  dot: string;
  badge: string;
  label: string;
  isLive: boolean;
}> = {
  APPROVED:       { bar: "bg-green-500",  dot: "bg-green-400", badge: "bg-green-500 text-white",        label: "LIVE",         isLive: true },
  DRAFT:          { bar: "bg-gray-300",   dot: "bg-gray-400",  badge: "bg-gray-100 text-gray-600",      label: "DRAFT",        isLive: false },
  PENDING_REVIEW: { bar: "bg-amber-400",  dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700",     label: "UNDER REVIEW", isLive: false },
  REJECTED:       { bar: "bg-red-500",    dot: "bg-red-400",   badge: "bg-red-50 text-red-700",         label: "REJECTED",     isLive: false },
};

function ImageStrip({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] w-full bg-[#F5F5F5] flex flex-col items-center justify-center gap-2 text-[#C8C8C8]">
        <svg className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span className="text-xs font-semibold tracking-wide uppercase">No Images</span>
      </div>
    );
  }

  return (
    <div>
      {/* Main image */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-[#F5F5F5]">
        <img
          src={images[activeIdx]?.url ?? images[0]?.url ?? ""}
          alt={productName}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Thumbnail strip — only shown if more than 1 image */}
      {images.length > 1 && (
        <div className="flex gap-1.5 px-3 py-2 bg-white overflow-x-auto scrollbar-none">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 h-12 w-9 rounded overflow-hidden border-2 transition-colors ${
                activeIdx === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VendorProductsPage() {
  const { vendor } = useVendor();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await apiFetch<ProductsResponse>(`/vendors/me/products?${params.toString()}`);
      setProducts(res.data);
      setTotal(res.meta.total);
    } catch {
      // show empty state on error
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/vendors/me/products/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      void fetchProducts();
    } catch {
      // silent
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Store identity header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Your Store</p>
        <h1 className="mt-0.5 text-2xl font-extrabold text-[#1A1A1A] leading-tight">
          {vendor?.businessName ?? "—"}
        </h1>
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-[#696969]">
            {total} product{total !== 1 ? "s" : ""}
          </p>
          <Link
            href="/vendor/products/new"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            + Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 rounded-xl border border-[#E8E8E8] bg-white p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === tab.value
                  ? "bg-primary text-white"
                  : "text-[#4D4D4D] hover:bg-[#F5F5F5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search products…"
          className="rounded-xl border border-[#E8E8E8] bg-white px-4 py-2 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-xl bg-[#F0F0F0]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-[#F0F0F0] bg-white py-20 text-center shadow-sm">
          <p className="text-lg font-bold text-[#1A1A1A]">No products yet</p>
          <p className="mt-1 text-sm text-[#696969]">Add your first saree to start selling.</p>
          <Link
            href="/vendor/products/new"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Add Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const status = STATUS_CONFIG[p.status];
            const minPrice = p.variants.length > 0
              ? Math.min(...p.variants.map((v) => v.pricePaise))
              : 0;
            const isConfirmingDelete = confirmDelete === p.id;
            const totalInventory = p.variants.reduce(
              (sum, v) => sum + v.inventory.quantity - v.inventory.reservedQuantity,
              0
            );

            return (
              <div
                key={p.id}
                className="rounded-xl border border-[#F0F0F0] bg-white shadow-sm overflow-hidden flex flex-col"
              >
                {/* Status bar at very top */}
                <div className={`h-1.5 w-full ${status.bar}`} />

                {/* Status label row */}
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${status.badge}`}>
                    {status.isLive && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                      </span>
                    )}
                    {status.label}
                  </span>
                  <span className="text-[10px] text-[#9B9B9B] font-semibold">
                    {p.images.length} photo{p.images.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Image gallery */}
                <ImageStrip images={p.images} productName={p.name} />

                {/* Product info */}
                <div className="p-4 flex-1">
                  <p className="text-sm font-bold text-[#1A1A1A] line-clamp-2 leading-snug mb-1">{p.name}</p>
                  {p.category && (
                    <p className="text-xs text-[#9B9B9B] mb-2">{p.category.name}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-[#696969]">
                    <span>{p.variants.length} variant{p.variants.length !== 1 ? "s" : ""} · from {formatPaise(minPrice)}</span>
                    <span className={totalInventory > 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                      {totalInventory > 0 ? `${totalInventory} in stock` : "Out of stock"}
                    </span>
                  </div>

                  {p.status === "REJECTED" && p.rejectionReason && (
                    <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <span className="font-bold">Reason:</span> {p.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-[#F0F0F0] px-4 py-3 flex items-center justify-between gap-2 bg-gray-50/30">
                  <Link
                    href={`/vendor/products/${p.id}/edit` as Route}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Edit
                  </Link>

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#696969]">Delete?</span>
                      <button
                        onClick={() => { void handleDelete(p.id); }}
                        className="text-xs font-bold text-red-600 hover:text-red-800"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs font-bold text-[#696969] hover:text-[#1A1A1A]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      className="text-xs font-bold text-[#9B9B9B] hover:text-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[#696969]">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

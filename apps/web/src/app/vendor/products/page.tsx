"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";

type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

interface ProductVariant {
  pricePaise: number;
  inventory: { quantity: number; reservedQuantity: number };
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
  images: Array<{ url: string }>;
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

const STATUS_BADGE: Record<ProductStatus, { bg: string; text: string; label: string }> = {
  DRAFT:          { bg: "bg-gray-100",   text: "text-gray-600",   label: "Draft" },
  PENDING_REVIEW: { bg: "bg-yellow-50",  text: "text-yellow-700", label: "Pending Review" },
  APPROVED:       { bg: "bg-green-50",   text: "text-green-700",  label: "Approved" },
  REJECTED:       { bg: "bg-red-50",     text: "text-red-700",    label: "Rejected" },
};

export default function VendorProductsPage() {
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
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Products</h1>
        <Link
          href="/vendor/products/new"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          + Add Product
        </Link>
      </div>

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
            <div key={i} className="h-48 animate-pulse rounded-xl bg-[#F0F0F0]" />
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
            const badge = STATUS_BADGE[p.status];
            const minPrice = p.variants.length > 0
              ? Math.min(...p.variants.map((v) => v.pricePaise))
              : 0;
            const isConfirmingDelete = confirmDelete === p.id;
            return (
              <div key={p.id} className="rounded-xl border border-[#F0F0F0] bg-white shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-bold text-[#1A1A1A] line-clamp-2 leading-snug">{p.name}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  {p.category && <p className="text-xs text-[#9B9B9B] mb-1">{p.category.name}</p>}
                  <p className="text-xs text-[#696969]">{p.variants.length} variant{p.variants.length !== 1 ? "s" : ""} · from {formatPaise(minPrice)}</p>

                  {p.status === "REJECTED" && p.rejectionReason && (
                    <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <span className="font-bold">Rejected:</span> {p.rejectionReason}
                    </div>
                  )}
                </div>

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

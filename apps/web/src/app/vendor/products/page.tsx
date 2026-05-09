"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";

type ProductStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

interface ProductVariant {
  pricePaise: number;
  mrpPaise: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  fabric?: string;
  region?: string;
  variants: ProductVariant[];
  category?: { name: string };
  createdAt: string;
}

const STATUS_TABS: { key: ProductStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "APPROVED", label: "Live" },
  { key: "PENDING", label: "Under Review" },
  { key: "DRAFT", label: "Draft" },
  { key: "REJECTED", label: "Rejected" },
];

const STATUS_BADGE: Record<ProductStatus, { label: string; bg: string; text: string }> = {
  DRAFT:    { label: "Draft",       bg: "bg-gray-100",    text: "text-gray-600" },
  PENDING:  { label: "Under Review",bg: "bg-yellow-50",   text: "text-yellow-700" },
  APPROVED: { label: "Live",        bg: "bg-green-50",    text: "text-green-700" },
  REJECTED: { label: "Rejected",    bg: "bg-red-50",      text: "text-red-700" },
};

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ProductStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const limit = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(activeTab !== "ALL" ? { status: activeTab } : {}),
        ...(search ? { search } : {}),
      });
      const res = await apiFetch<{ data: Product[]; total: number }>(
        `/vendors/me/products?${params}`,
      );
      setProducts(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, page]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    setConfirmDelete(null);
    try {
      await apiFetch(`/vendors/me/products/${confirmDelete.id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setTotal((t) => t - 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete product.");
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Products</h1>
          <p className="mt-0.5 text-sm text-[#696969]">{total} total listing{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/vendor/products/new"
          className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          <span>+</span> Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-sm border border-[#E8E8E8] bg-white p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-sm px-3 py-1.5 text-xs font-bold transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "text-[#696969] hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-sm border border-[#E8E8E8] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-primary placeholder:text-[#C0C0C0]"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          <button onClick={() => void fetchProducts()} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
        {loading ? (
          <div className="space-y-px">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-[#F5F5F5]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-3xl">📦</p>
            <p className="mt-3 font-bold text-[#1A1A1A]">No products found</p>
            <p className="mt-1 text-sm text-[#696969]">
              {activeTab !== "ALL" || search
                ? "Try a different filter or search term."
                : "Add your first saree listing to get started."}
            </p>
            {activeTab === "ALL" && !search && (
              <Link
                href="/vendor/products/new"
                className="mt-4 rounded-sm bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                + Add Product
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left text-sm lg:table">
              <thead className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Product</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Price Range</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Variants</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F5]">
                {products.map((product) => {
                  const badge = STATUS_BADGE[product.status];
                  const prices = product.variants.map((v) => v.pricePaise);
                  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
                  return (
                    <tr key={product.id} className={`transition-colors hover:bg-[#FAFAFA] ${deleting === product.id ? "opacity-40" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#1A1A1A]">{product.name}</p>
                        <p className="mt-0.5 text-[10px] text-[#9B9B9B]">
                          {product.fabric && `${product.fabric} · `}
                          {product.region}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#696969]">
                        {product.category?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-[#1A1A1A]">
                          {prices.length === 0
                            ? "—"
                            : minPrice === maxPrice
                            ? formatPaise(minPrice)
                            : `${formatPaise(minPrice)} – ${formatPaise(maxPrice)}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#4D4D4D]">
                        {product.variants.length}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/vendor/products/${product.id}/edit`}
                            className="rounded-sm border border-[#E8E8E8] px-3 py-1 text-xs font-semibold text-[#4D4D4D] hover:border-primary hover:text-primary transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => setConfirmDelete(product)}
                            disabled={deleting === product.id}
                            className="rounded-sm border border-[#E8E8E8] px-3 py-1 text-xs font-semibold text-[#696969] hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="divide-y divide-[#F5F5F5] lg:hidden">
              {products.map((product) => {
                const badge = STATUS_BADGE[product.status];
                const prices = product.variants.map((v) => v.pricePaise);
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                return (
                  <div key={product.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#1A1A1A]">{product.name}</p>
                        <p className="mt-0.5 text-xs text-[#696969]">
                          {formatPaise(minPrice)} · {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/vendor/products/${product.id}/edit`}
                        className="rounded-sm border border-[#E8E8E8] px-3 py-1.5 text-xs font-semibold text-[#4D4D4D] hover:border-primary hover:text-primary transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(product)}
                        className="rounded-sm border border-[#E8E8E8] px-3 py-1.5 text-xs font-semibold text-[#696969] hover:border-red-400 hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-[#696969]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-sm border border-[#E8E8E8] px-3 py-1.5 text-xs font-semibold text-[#4D4D4D] hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-sm border border-[#E8E8E8] px-3 py-1.5 text-xs font-semibold text-[#4D4D4D] hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-sm border border-[#E8E8E8] bg-white p-6 shadow-xl">
            <h3 className="text-base font-extrabold text-[#1A1A1A]">Delete Product?</h3>
            <p className="mt-2 text-sm text-[#696969]">
              <span className="font-semibold text-[#1A1A1A]">{confirmDelete.name}</span> will be
              removed from your catalog. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-sm border border-[#E8E8E8] py-2 text-sm font-semibold text-[#696969] hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                className="flex-1 rounded-sm bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

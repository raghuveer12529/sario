"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";
import { PRODUCT_STATUS } from "@sario/shared";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RejectDialog } from "@/components/reject-dialog";

interface Product {
  id: string;
  name: string;
  slug: string;
  status: string;
  vendor: { businessName: string };
  category: { name: string };
  createdAt: string;
}

const STATUS_TABS = Object.values(PRODUCT_STATUS).map((s) => ({
  label: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  value: s,
}));

const STATUS_BADGE: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  ARCHIVED: "bg-gray-100 text-gray-700",
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    setError(null);
    adminFetch<Product[]>(`/admin/products?status=${status}`)
      .then(setProducts)
      .catch((err: unknown) => setError(getErrorMessage(err, "Could not load products.")))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const approve = async (id: string) => {
    setSubmittingId(id);
    try {
      await adminFetch(`/admin/products/${id}/approve`, { method: "POST" });
      setProducts((p) => p.filter((x) => x.id !== id));
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Approval failed."));
    } finally {
      setSubmittingId(null);
    }
  };

  const reject = async (id: string, reason: string) => {
    setSubmittingId(id);
    try {
      await adminFetch(`/admin/products/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setProducts((p) => p.filter((x) => x.id !== id));
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Rejection failed."));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {approveTarget && (
        <ConfirmDialog
          title="Approve product?"
          message="This will make the product visible on the storefront."
          confirmLabel="Approve"
          onConfirm={() => { void approve(approveTarget); setApproveTarget(null); }}
          onCancel={() => setApproveTarget(null)}
        />
      )}
      {rejectTarget && (
        <RejectDialog
          title="Reject product?"
          placeholder="Enter feedback for the vendor (required)…"
          onConfirm={(reason) => { void reject(rejectTarget, reason); setRejectTarget(null); }}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Product Moderation</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
          {loading ? "Scanning catalog…" : `${products.length} products found`}
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-1.5 shadow-sm border border-gray-100 overflow-x-auto scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap ${
              status === tab.value
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-red-100 p-16 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 mb-4">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg font-black text-gray-900">Sync Error</p>
          <p className="mt-2 text-sm text-gray-500 font-medium max-w-xs mx-auto">{error}</p>
          <button 
            onClick={fetchProducts}
            className="mt-8 rounded-xl bg-gray-900 px-8 py-3 text-sm font-black text-white hover:opacity-90 transition-all shadow-lg shadow-gray-200"
          >
            Retry Sync
          </button>
        </div>
      ) : loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white border border-gray-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400 mb-4">
             <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
               <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
             </svg>
          </div>
          <p className="text-lg font-black text-gray-900">Nothing to review</p>
          <p className="mt-2 text-sm font-medium text-gray-400 max-w-xs mx-auto uppercase tracking-tighter">
            No products match the "{status.replace(/_/g, " ")}" status filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-200/40">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hidden sm:table-cell">Vendor Info</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hidden md:table-cell">Category</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/products/${p.id}`)}
                  className="cursor-pointer transition-colors hover:bg-blue-50/40 group"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">{p.name}</p>
                        <p className="text-[11px] font-mono font-bold text-gray-400 mt-0.5">/{p.slug}</p>
                        <p className="mt-1.5 text-[10px] font-bold text-gray-400 sm:hidden">
                          {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <span className="ml-2 hidden group-hover:inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700 uppercase tracking-wide">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                        Preview
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 hidden sm:table-cell">
                    <p className="text-xs font-bold text-gray-700">{p.vendor.businessName}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                    </p>
                  </td>
                  <td className="px-6 py-5 hidden md:table-cell">
                    <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-gray-600">
                      {p.category.name}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-block rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                    {status === "PENDING_REVIEW" && (
                      <div className="flex justify-end gap-2.5">
                        <button
                          onClick={() => setApproveTarget(p.id)}
                          disabled={submittingId === p.id}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/50 disabled:opacity-50 transition-all active:scale-95"
                        >
                          {submittingId === p.id ? "..." : "APPROVE"}
                        </button>
                        <button
                          onClick={() => setRejectTarget(p.id)}
                          disabled={submittingId === p.id}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                        >
                          REJECT
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

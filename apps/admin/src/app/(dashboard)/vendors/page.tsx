"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RejectDialog } from "@/components/reject-dialog";
import { VendorDetailDrawer } from "@/components/vendor-detail";

interface Vendor {
  id: string;
  businessName: string;
  slug: string;
  status: string;
  gstin?: string;
  pan?: string;
  createdAt: string;
  bankAccounts: Array<{ bankName: string; isVerified: boolean; isPrimary: boolean }>;
}

const STATUS_TABS = [
  { label: "Pending Review", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Suspended", value: "SUSPENDED" },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  SUSPENDED: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; act: "approve" | "suspend" } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchVendors = useCallback(() => {
    setLoading(true);
    setError(null);
    adminFetch<Vendor[]>(`/admin/vendors?status=${status}`)
      .then(setVendors)
      .catch((err) => setError(err.message || "Failed to fetch vendors. Please check your connection."))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const action = async (id: string, act: "approve" | "reject" | "suspend", reason?: string) => {
    setSubmittingId(id);
    try {
      await adminFetch(`/admin/vendors/${id}/${act}`, {
        method: "POST",
        ...(reason ? { body: JSON.stringify({ reason }) } : {}),
      });
      setVendors((v) => v.filter((x) => x.id !== id));
    } catch (err: any) {
      alert(err.message || `Failed to ${act} vendor.`);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Detail Drawer */}
      {selectedId && <VendorDetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />}

      {confirm && (
        <ConfirmDialog
          title={confirm.act === "approve" ? "Approve vendor?" : "Suspend vendor?"}
          message={
            confirm.act === "approve"
              ? "This will approve the vendor and allow them to list products on the marketplace."
              : "This will prevent the vendor from accepting new orders. Existing orders are not affected."
          }
          confirmLabel={confirm.act === "approve" ? "Approve" : "Suspend"}
          variant={confirm.act === "suspend" ? "danger" : "default"}
          onConfirm={() => { void action(confirm.id, confirm.act); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {rejectTarget && (
        <RejectDialog
          title="Reject vendor application?"
          placeholder="Enter reason for rejection (visible to vendor)…"
          onConfirm={(reason) => { void action(rejectTarget, "reject", reason); setRejectTarget(null); }}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Vendors</h1>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
            {loading ? "Updating list…" : `${vendors.length} ${status.toLowerCase()} records`}
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-1.5 shadow-sm border border-gray-100">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-200 ${
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
          <p className="text-lg font-black text-gray-900">Something went wrong</p>
          <p className="mt-2 text-sm text-gray-500 font-medium max-w-xs mx-auto">{error}</p>
          <button 
            onClick={fetchVendors}
            className="mt-8 rounded-xl bg-gray-900 px-8 py-3 text-sm font-black text-white hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-gray-200"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white border border-gray-100" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400 mb-4">
             <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
               <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
             </svg>
          </div>
          <p className="text-lg font-black text-gray-900">Queue is clear</p>
          <p className="mt-2 text-sm font-medium text-gray-400 max-w-xs mx-auto">
            {status === "PENDING" ? "All vendor applications have been processed." : "No records match this status."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-200/40">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Business Profile</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hidden sm:table-cell">Identity</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hidden md:table-cell">Bank Verification</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendors.map((v) => (
                <tr 
                  key={v.id} 
                  onClick={() => setSelectedId(v.id)}
                  className="group cursor-pointer transition-colors hover:bg-[#F8F9FC]"
                >
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-gray-900">{v.businessName}</p>
                    <p className="text-[11px] font-bold text-primary mt-0.5">@{v.slug}</p>
                    <p className="mt-1.5 text-[10px] font-bold text-gray-400 sm:hidden">
                      {new Date(v.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </td>
                  <td className="px-6 py-5 hidden sm:table-cell">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none">GSTIN</p>
                      <p className="text-xs font-mono font-bold text-gray-700">{v.gstin || "—"}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none pt-1">PAN</p>
                      <p className="text-xs font-mono font-bold text-gray-700">{v.pan || "—"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 hidden md:table-cell">
                    {v.bankAccounts[0] ? (
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter ${v.bankAccounts[0].isVerified ? "text-emerald-600" : "text-amber-600"}`}>
                          {v.bankAccounts[0].isVerified ? (
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          )}
                          {v.bankAccounts[0].isVerified ? "Verified" : "Pending Drop"}
                        </span>
                        <p className="text-[11px] font-bold text-gray-600">{v.bankAccounts[0].bankName}</p>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-gray-400 italic">No account</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-block rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE[v.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2.5">
                      {status === "PENDING" && (
                        <>
                          <button
                            onClick={() => setConfirm({ id: v.id, act: "approve" })}
                            disabled={submittingId === v.id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/50 disabled:opacity-50 transition-all active:scale-95"
                          >
                            {submittingId === v.id ? "..." : "APPROVE"}
                          </button>
                          <button
                            onClick={() => setRejectTarget(v.id)}
                            disabled={submittingId === v.id}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                          >
                            REJECT
                          </button>
                        </>
                      )}
                      {status === "APPROVED" && (
                        <button
                          onClick={() => setConfirm({ id: v.id, act: "suspend" })}
                          disabled={submittingId === v.id}
                          className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 transition-all active:scale-95"
                        >
                          SUSPEND
                        </button>
                      )}
                    </div>
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

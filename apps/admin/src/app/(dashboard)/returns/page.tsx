"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RejectDialog } from "@/components/reject-dialog";
import { formatPaise } from "@sario/ui";

type ReturnStatus = "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURN_REJECTED" | "REFUNDED";

interface ReturnRequest {
  id: string;
  status: ReturnStatus;
  reason: string;
  createdAt: string;
  order: { id: string; totalPaise: number };
  buyer: { name?: string; phone: string };
  items: Array<{ productName: string; variantName?: string; quantity: number; pricePaise: number }>;
}

const STATUS_TABS: { label: string; value: ReturnStatus }[] = [
  { label: "Requested", value: "RETURN_REQUESTED" },
  { label: "Approved", value: "RETURN_APPROVED" },
  { label: "Rejected", value: "RETURN_REJECTED" },
  { label: "Refunded", value: "REFUNDED" },
];

const STATUS_BADGE: Record<ReturnStatus, string> = {
  RETURN_REQUESTED: "bg-amber-100 text-amber-700 border-amber-200",
  RETURN_APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  RETURN_REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  REFUNDED: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [status, setStatus] = useState<ReturnStatus>("RETURN_REQUESTED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchReturns = useCallback(() => {
    setLoading(true);
    setError(null);
    adminFetch<{ data: ReturnRequest[] }>(`/admin/returns?status=${status}`)
      .then((r) => setReturns(r.data ?? []))
      .catch((err: unknown) => setError(getErrorMessage(err, "Could not load return requests.")))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const approve = async (id: string) => {
    setSubmittingId(id);
    try {
      await adminFetch(`/admin/returns/${id}/approve`, { method: "POST" });
      setReturns((r) => r.filter((x) => x.id !== id));
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Approval failed."));
    } finally {
      setSubmittingId(null);
    }
  };

  const reject = async (id: string, reason: string) => {
    setSubmittingId(id);
    try {
      await adminFetch(`/admin/returns/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setReturns((r) => r.filter((x) => x.id !== id));
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Rejection failed."));
    } finally {
      setSubmittingId(null);
    }
  };

  const refund = async (id: string) => {
    setSubmittingId(id);
    try {
      await adminFetch(`/admin/returns/${id}/refund`, { method: "POST" });
      setReturns((r) => r.filter((x) => x.id !== id));
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Refund failed."));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {approveTarget && (
        <ConfirmDialog
          title="Approve return request?"
          message="This will approve the return. The buyer can then ship the product back."
          confirmLabel="Approve Return"
          onConfirm={() => { void approve(approveTarget); setApproveTarget(null); }}
          onCancel={() => setApproveTarget(null)}
        />
      )}
      {rejectTarget && (
        <RejectDialog
          title="Reject return request?"
          placeholder="Enter reason for rejection (visible to buyer)…"
          onConfirm={(reason) => { void reject(rejectTarget, reason); setRejectTarget(null); }}
          onCancel={() => setRejectTarget(null)}
        />
      )}
      {refundTarget && (
        <ConfirmDialog
          title="Issue refund?"
          message="This will trigger a Razorpay refund. The amount will be credited to the buyer's original payment method within 5–7 business days."
          confirmLabel="Issue Refund"
          onConfirm={() => { void refund(refundTarget); setRefundTarget(null); }}
          onCancel={() => setRefundTarget(null)}
        />
      )}

      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Returns & Disputes</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
          {loading ? "Scanning for disputes…" : `${returns.length} requests in queue`}
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
          <p className="text-lg font-black text-gray-900">Queue Error</p>
          <p className="mt-2 text-sm text-gray-500 font-medium max-w-xs mx-auto">{error}</p>
          <button 
            onClick={fetchReturns}
            className="mt-8 rounded-xl bg-gray-900 px-8 py-3 text-sm font-black text-white hover:opacity-90 transition-all shadow-lg shadow-gray-200"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white border border-gray-100" />
          ))}
        </div>
      ) : returns.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400 mb-4">
             <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
               <path d="M3.51 15a9 9 0 102.13-9.36L1 10M1 10l6 6M1 10l6-6" />
             </svg>
          </div>
          <p className="text-lg font-black text-gray-900">Queue clear</p>
          <p className="mt-2 text-sm font-medium text-gray-400 max-w-xs mx-auto uppercase tracking-tighter">
            No {status.replace(/_/g, " ").toLowerCase()} found.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-200/40">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order Ref</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hidden sm:table-cell">Dispute Reason</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {returns.map((ret) => (
                <tr key={ret.id} className="transition-colors hover:bg-[#F8F9FC]">
                  <td className="px-6 py-5">
                    <p className="text-xs font-mono font-bold text-gray-900 uppercase tracking-tighter">
                      {ret.order.id.slice(0, 8)}...
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {new Date(ret.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                    <p className="mt-1 text-[11px] font-black text-gray-900">{formatPaise(ret.order.totalPaise)}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-gray-900 leading-tight">{ret.buyer.name || "Customer"}</p>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">{ret.buyer.phone}</p>
                  </td>
                  <td className="px-6 py-5 hidden sm:table-cell max-w-[280px]">
                    <div className="rounded-xl bg-orange-50/50 border border-orange-100 p-3">
                      <p className="text-[11px] font-bold text-orange-900 leading-relaxed italic">
                        "{ret.reason}"
                      </p>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-2">
                      {ret.items.length} item{ret.items.length !== 1 ? "s" : ""} included
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-block rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE[ret.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {ret.status.replace(/RETURN_/, "").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2.5">
                      {ret.status === "RETURN_REQUESTED" && (
                        <>
                          <button
                            onClick={() => setApproveTarget(ret.id)}
                            disabled={submittingId === ret.id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/50 disabled:opacity-50 transition-all active:scale-95"
                          >
                            {submittingId === ret.id ? "..." : "APPROVE"}
                          </button>
                          <button
                            onClick={() => setRejectTarget(ret.id)}
                            disabled={submittingId === ret.id}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                          >
                            REJECT
                          </button>
                        </>
                      )}
                      {ret.status === "RETURN_APPROVED" && (
                        <button
                          onClick={() => setRefundTarget(ret.id)}
                          disabled={submittingId === ret.id}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 shadow-md shadow-blue-200/50 disabled:opacity-50 transition-all active:scale-95"
                        >
                          {submittingId === ret.id ? "..." : "ISSUE REFUND"}
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

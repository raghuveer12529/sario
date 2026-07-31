"use client";

import { useState } from "react";
import { formatPaise } from "@sario/ui";
import { apiFetch } from "@/lib/api";
import type { VendorOrder } from "./order-row";

interface Props {
  order: VendorOrder;
  onRefetch: () => void;
}

export function ReturnRow({ order, onRefetch }: Props) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const approve = async () => {
    setLoading(true);
    try {
      await apiFetch(`/vendors/me/orders/${order.id}/return/approve`, { method: "POST" });
      onRefetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) { setError("Please provide a rejection reason."); return; }
    setLoading(true);
    try {
      await apiFetch(`/vendors/me/orders/${order.id}/return/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      onRefetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to reject.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-white shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Order</p>
          <p className="text-sm font-bold text-[#1A1A1A]">#{order.id.slice(-8).toUpperCase()}</p>
          <p className="text-xs text-[#696969] mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="text-right">
          <span className="rounded-full bg-orange-50 border border-orange-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700">
            Return Requested
          </span>
          <p className="mt-1 text-sm font-extrabold text-primary">{formatPaise(order.totalPaise)}</p>
        </div>
      </div>

      <div className="mb-3 space-y-1">
        {order.items.map((item) => (
          <p key={item.id} className="text-xs text-[#4D4D4D]">
            {item.variant.product.name} — {item.variant.name} × {item.quantity}
          </p>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {showReject ? (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (shown to buyer)…"
            className="w-full rounded-xl border border-[#E8E8E8] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-primary resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { void reject(); }}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "…" : "Confirm Rejection"}
            </button>
            <button
              onClick={() => { setShowReject(false); setError(""); setReason(""); }}
              className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-xs font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => { void approve(); }}
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "…" : "Approve Return"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { ReturnRow } from "../_components/return-row";
import type { VendorOrder } from "../_components/order-row";

interface OrdersResponse {
  data: VendorOrder[];
  meta: { total: number };
}

type Tab = "pending" | "history";

export default function VendorReturnsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<VendorOrder[]>([]);
  const [history, setHistory] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        apiFetch<OrdersResponse>("/vendors/me/orders?status=RETURN_REQUESTED&limit=50"),
        apiFetch<OrdersResponse>("/vendors/me/orders?status=RETURN_APPROVED&limit=50"),
        apiFetch<OrdersResponse>("/vendors/me/orders?status=RETURN_REJECTED&limit=50"),
      ]);
      setPending(pendingRes.data);
      setHistory([...approvedRes.data, ...rejectedRes.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchReturns(); }, [fetchReturns]);

  const items = tab === "pending" ? pending : history;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-[#1A1A1A]">Returns</h1>

      <div className="mb-4 flex gap-1 rounded-xl border border-[#E8E8E8] bg-white p-1 w-fit">
        {(["pending", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-colors ${
              tab === t ? "bg-primary text-white" : "text-[#4D4D4D] hover:bg-[#F5F5F5]"
            }`}
          >
            {t === "pending" ? `Pending (${pending.length})` : "History"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-[#F0F0F0]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[#F0F0F0] bg-white py-20 text-center shadow-sm">
          <p className="text-lg font-bold text-[#1A1A1A]">
            {tab === "pending" ? "No pending return requests" : "No return history yet"}
          </p>
        </div>
      ) : tab === "pending" ? (
        <div className="space-y-3">
          {items.map((order) => (
            <ReturnRow key={order.id} order={order} onRefetch={() => { void fetchReturns(); }} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((order) => {
            const isApproved = order.status === "RETURN_APPROVED";
            return (
              <div key={order.id} className="rounded-xl border border-[#F0F0F0] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">#{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-[#696969] mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    isApproved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}>
                    {isApproved ? "Approved" : "Rejected"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

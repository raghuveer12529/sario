"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { OrderRow, type VendorOrder, type OrderStatus } from "../_components/order-row";

interface OrdersResponse {
  data: VendorOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_TABS: Array<{ label: string; value: OrderStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Packed", value: "PACKED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
];

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await apiFetch<OrdersResponse>(`/vendors/me/orders?${params.toString()}`);
      setOrders(res.data);
      setTotal(res.meta.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-[#1A1A1A]">Orders</h1>

      <div className="mb-4 flex gap-1 rounded-xl border border-[#E8E8E8] bg-white p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              statusFilter === tab.value ? "bg-primary text-white" : "text-[#4D4D4D] hover:bg-[#F5F5F5]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[#F0F0F0]" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-[#F0F0F0] bg-white py-20 text-center shadow-sm">
          <p className="text-lg font-bold text-[#1A1A1A]">No orders yet</p>
          <p className="mt-1 text-sm text-[#696969]">Orders from buyers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onRefetch={() => { void fetchOrders(); }} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-[#696969]">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-[#E8E8E8] px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

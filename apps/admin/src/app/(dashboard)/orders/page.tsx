"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";
import { formatPaise } from "@sario/ui";

type OrderStatus =
  | "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED"
  | "DELIVERED" | "COMPLETED" | "CANCELLED"
  | "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURN_REJECTED" | "REFUNDED";

interface OrderItem {
  productName: string;
  variantName: string;
  quantity: number;
  pricePaise: number;
}

interface Order {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  createdAt: string;
  buyer: { name?: string; phone: string };
  items: OrderItem[];
}

const STATUS_TABS: { label: string; value: OrderStatus }[] = [
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Packed", value: "PACKED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Pending", value: "PENDING" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Returns", value: "RETURN_REQUESTED" },
  { label: "Refunded", value: "REFUNDED" },
];

const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
  PACKED: "bg-purple-100 text-purple-700 border-purple-200",
  SHIPPED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
  RETURN_REQUESTED: "bg-orange-100 text-orange-700 border-orange-200",
  RETURN_APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  RETURN_REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  REFUNDED: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus>("CONFIRMED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    setError(null);
    adminFetch<{ data: Order[] }>(`/admin/orders?status=${status}`)
      .then((r) => setOrders(r.data ?? []))
      .catch((err: unknown) => setError(getErrorMessage(err, "Could not load orders.")))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Orders</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
          {loading ? "Syncing orders…" : `${orders.length} orders found`}
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
          <p className="text-lg font-black text-gray-900">Connection Failed</p>
          <p className="mt-2 text-sm text-gray-500 font-medium max-w-xs mx-auto">{error}</p>
          <button 
            onClick={fetchOrders}
            className="mt-8 rounded-xl bg-gray-900 px-8 py-3 text-sm font-black text-white hover:opacity-90 transition-all shadow-lg shadow-gray-200"
          >
            Retry Connection
          </button>
        </div>
      ) : loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white border border-gray-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white py-24 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400 mb-4">
             <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
               <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
             </svg>
          </div>
          <p className="text-lg font-black text-gray-900">No orders yet</p>
          <p className="mt-2 text-sm font-medium text-gray-400 max-w-xs mx-auto uppercase tracking-tighter">
            No orders found with status "{status.replace(/_/g, " ")}".
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-xl shadow-gray-200/40">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hidden sm:table-cell">Items Summary</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-[#F8F9FC]">
                  <td className="px-6 py-5">
                    <p className="text-xs font-mono font-bold text-gray-900 uppercase tracking-tighter">
                      {order.id.slice(0, 8)}...{order.id.slice(-4)}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-gray-900 leading-tight">{order.buyer.name || "Guest Customer"}</p>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">{order.buyer.phone}</p>
                  </td>
                  <td className="px-6 py-5 hidden sm:table-cell max-w-[240px]">
                    <p className="text-[11px] font-bold text-gray-600 leading-relaxed truncate">
                      {order.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}
                    </p>
                    {order.items.length > 1 && (
                      <p className="text-[10px] font-black text-primary uppercase tracking-tighter mt-0.5">
                        +{order.items.length - 1} more items
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-block rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-gray-900 text-sm tracking-tight">
                    {formatPaise(order.totalPaise)}
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

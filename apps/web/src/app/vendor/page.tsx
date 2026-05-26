"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";
import { StatCard } from "./_components/stat-card";
import type { VendorOrder, OrderStatus } from "./_components/order-row";

interface ProductsResponse {
  meta: { total: number };
  data: Array<{ status: string }>;
}

interface OrdersResponse {
  data: VendorOrder[];
  meta: { total: number };
}

const STATUS_BADGE: Partial<Record<OrderStatus, { bg: string; text: string; label: string }>> = {
  CONFIRMED:        { bg: "bg-yellow-50",  text: "text-yellow-700", label: "Confirmed" },
  PACKED:           { bg: "bg-purple-50",  text: "text-purple-700", label: "Packed" },
  SHIPPED:          { bg: "bg-indigo-50",  text: "text-indigo-700", label: "Shipped" },
  DELIVERED:        { bg: "bg-green-50",   text: "text-green-700",  label: "Delivered" },
  RETURN_REQUESTED: { bg: "bg-orange-50",  text: "text-orange-700", label: "Return Requested" },
};

export default function VendorDashboardPage() {
  const [products, setProducts] = useState<ProductsResponse | null>(null);
  const [orders, setOrders] = useState<OrdersResponse | null>(null);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingReturnCount, setPendingReturnCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<ProductsResponse>("/vendors/me/products?limit=100"),
      apiFetch<OrdersResponse>("/vendors/me/orders?limit=5"),
      apiFetch<{ meta: { total: number } }>("/vendors/me/orders?status=CONFIRMED&limit=1"),
      apiFetch<{ meta: { total: number } }>("/vendors/me/orders?status=PACKED&limit=1"),
      apiFetch<{ meta: { total: number } }>("/vendors/me/orders?status=RETURN_REQUESTED&limit=1"),
    ])
      .then(([p, o, confirmed, packed, returnRequested]) => {
        setProducts(p);
        setOrders(o);
        setPendingOrderCount(confirmed.meta.total + packed.meta.total);
        setPendingReturnCount(returnRequested.meta.total);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const totalProducts = products?.meta.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Products" value={totalProducts} loading={loading} />
        <StatCard label="Orders to Process" value={pendingOrderCount} loading={loading} />
        <StatCard label="Pending Returns" value={pendingReturnCount} loading={loading} />
      </div>

      <div className="flex gap-3">
        <Link
          href="/vendor/products/new"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          + Add Product
        </Link>
        <Link
          href="/vendor/orders"
          className="rounded-xl border border-[#E8E8E8] px-5 py-2.5 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] transition-colors"
        >
          View All Orders
        </Link>
      </div>

      <div className="rounded-xl border border-[#F0F0F0] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Recent Orders</h2>
          <Link href="/vendor/orders" className="text-xs font-bold text-primary hover:underline">View All →</Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-[#F0F0F0]" />
            ))}
          </div>
        ) : !orders?.data.length ? (
          <div className="py-12 text-center text-sm text-[#9B9B9B]">No orders yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F0F0] bg-gray-50/50">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">Order</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">Date</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">Status</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {orders.data.map((order) => {
                const badge = STATUS_BADGE[order.status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: order.status };
                return (
                  <tr key={order.id}>
                    <td className="px-5 py-3 font-bold text-[#1A1A1A]">#{order.id.slice(-8).toUpperCase()}</td>
                    <td className="px-5 py-3 text-[#696969]">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-primary">{formatPaise(order.totalPaise)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

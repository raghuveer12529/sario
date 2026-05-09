"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";
import { useAuth } from "@/hooks/use-auth";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "REFUNDED";

interface OrderItem {
  id: string;
  variant: {
    product: {
      name: string;
      slug: string;
    };
    name: string;
    images?: Array<{ url: string }>;
  };
  unitPricePaise: number;
  quantity: number;
  totalPaise: number;
}

interface Order {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  createdAt: string;
  items: OrderItem[];
  shipment?: {
    status: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
  };
}

const STATUS_LABELS: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  PENDING:           { label: "Awaiting Payment", bg: "bg-yellow-50",  text: "text-yellow-700" },
  CONFIRMED:         { label: "Confirmed",         bg: "bg-blue-50",    text: "text-blue-700" },
  PACKED:            { label: "Being Packed",      bg: "bg-purple-50",  text: "text-purple-700" },
  SHIPPED:           { label: "In Transit",        bg: "bg-indigo-50",  text: "text-indigo-700" },
  DELIVERED:         { label: "Delivered",         bg: "bg-green-50",   text: "text-green-700" },
  COMPLETED:         { label: "Completed",         bg: "bg-green-100",  text: "text-green-800" },
  CANCELLED:         { label: "Cancelled",         bg: "bg-red-50",     text: "text-red-700" },
  RETURN_REQUESTED:  { label: "Return Requested",  bg: "bg-orange-50",  text: "text-orange-700" },
  RETURN_APPROVED:   { label: "Return Approved",   bg: "bg-orange-100", text: "text-orange-800" },
  RETURN_REJECTED:   { label: "Return Rejected",   bg: "bg-red-100",    text: "text-red-800" },
  REFUNDED:          { label: "Refunded",          bg: "bg-gray-100",   text: "text-gray-600" },
};

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    apiFetch<{ data: Order[] }>("/me/orders")
      .then((res) => {
        setOrders(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch orders:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, authLoading]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;

  if (!isAuthenticated) {
    return (
      <main className="bg-[#F5F5F5] min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-xl border border-[#F0F0F0] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/5 text-3xl">
            🔒
          </div>
          <h1 className="text-lg font-bold text-[#1A1A1A]">Sign in to view orders</h1>
          <p className="mt-2 text-sm text-[#696969]">Please log in to see your order history and tracking details.</p>
          <Link
            href="/auth"
            className="mt-6 block rounded-xl bg-primary py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#F5F5F5] min-h-screen pb-12">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">My Orders</h1>
            <p className="text-sm text-[#696969] mt-0.5">Track and manage your saree purchases</p>
          </div>
          <Link href="/" className="text-sm font-bold text-primary hover:underline">
            Continue Shopping
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl border border-[#F0F0F0] bg-white" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-[#F0F0F0] bg-white py-20 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-gray-300">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
            </div>
            <p className="text-lg font-bold text-[#1A1A1A]">No orders yet</p>
            <p className="mt-1 text-sm text-[#696969]">Your orders will appear here once you place them.</p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
              Explore Collection
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const s = STATUS_LABELS[order.status] || { label: order.status, bg: "bg-gray-100", text: "text-gray-600" };
              return (
                <div key={order.id} className="rounded-xl border border-[#F0F0F0] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F0F0] bg-gray-50/50 px-5 py-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Order Reference</p>
                      <p className="text-sm font-bold text-[#1A1A1A]">#{order.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Date Placed</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                      <p className="text-base font-extrabold text-primary">{formatPaise(order.totalPaise)}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-5 py-4 space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <div className="h-16 w-12 shrink-0 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shadow-inner">
                          {item.variant.images?.[0]?.url ? (
                            <img src={item.variant.images[0].url} alt={item.variant.product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">No image</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/p/${item.variant.product.slug}`} className="text-sm font-bold text-[#1A1A1A] hover:text-primary transition-colors line-clamp-1">
                            {item.variant.product.name}
                          </Link>
                          <p className="text-xs text-[#696969] mt-0.5">{item.variant.name} · Quantity: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold text-[#1A1A1A] shrink-0">
                          {formatPaise(item.totalPaise)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-[#F0F0F0] bg-gray-50/30 px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                      {order.shipment?.trackingUrl && (order.status === "SHIPPED" || order.status === "DELIVERED") && (
                        <a
                          href={order.shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-primary px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                        >
                          Track Package
                        </a>
                      )}
                      {order.status === "DELIVERED" && (
                        <button className="rounded-lg border border-[#E8E8E8] px-4 py-1.5 text-xs font-bold text-[#4D4D4D] hover:border-primary hover:text-primary transition-colors">
                          Request Return
                        </button>
                      )}
                    </div>
                    <Link 
                      href={`/account/orders/${order.id}`}
                      className="text-xs font-bold text-[#696969] hover:text-[#1A1A1A] transition-colors flex items-center gap-1"
                    >
                      View Full Details
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

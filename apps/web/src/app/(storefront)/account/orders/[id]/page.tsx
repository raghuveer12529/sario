"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
      description: string;
    };
    name: string;
    sku: string;
  };
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
}

interface Order {
  id: string;
  status: OrderStatus;
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  createdAt: string;
  addressSnapshot: any;
  items: OrderItem[];
  payments: Array<{
    status: string;
    method: string;
    capturedAt: string;
  }>;
  shipment?: {
    courierName: string;
    awbNumber: string;
    trackingUrl: string;
    status: string;
    estimatedDelivery: string;
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

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !id) return;

    apiFetch<Order>(`/me/orders/${id}`)
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load order details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, isAuthenticated, authLoading]);

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;

  if (error || !order) {
    return (
      <main className="bg-[#F5F5F5] min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-xl border border-[#F0F0F0] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl text-red-500">
            ⚠️
          </div>
          <h1 className="text-lg font-bold text-[#1A1A1A]">Order Not Found</h1>
          <p className="mt-2 text-sm text-[#696969]">{error || "We couldn't find the order you're looking for."}</p>
          <Link href="/account/orders" className="mt-6 block rounded-xl bg-primary py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity">
            Back to My Orders
          </Link>
        </div>
      </main>
    );
  }

  const s = STATUS_LABELS[order.status] || { label: order.status, bg: "bg-gray-100", text: "text-gray-600" };
  const addr = order.addressSnapshot;

  return (
    <main className="bg-[#F5F5F5] min-h-screen pb-12">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/account/orders" className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E8E8E8] text-[#696969] hover:text-primary transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Order Details</h1>
            <p className="text-sm text-[#696969]">Order #{order.id.slice(-8).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#1A1A1A]">Order Status</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
              </div>
              
              {/* Progress Stepper Placeholder */}
              <div className="relative mt-8 mb-4">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2"></div>
                <div className="relative flex justify-between">
                  {["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].map((stepStatus, idx) => {
                    const isDone = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"].indexOf(order.status) >= ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].indexOf(stepStatus);
                    return (
                      <div key={stepStatus} className="flex flex-col items-center gap-2">
                        <div className={`z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${isDone ? "bg-primary border-primary text-white" : "bg-white border-gray-200 text-gray-300"}`}>
                          {isDone ? "✓" : idx + 1}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-tight ${isDone ? "text-primary" : "text-gray-400"}`}>{stepStatus}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Items Card */}
            <div className="rounded-xl border border-[#F0F0F0] bg-white overflow-hidden shadow-sm">
              <div className="border-b border-[#F0F0F0] bg-gray-50/50 px-6 py-4">
                <h2 className="text-sm font-bold text-[#1A1A1A]">Order Items</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.id} className="p-6 flex gap-4">
                    <div className="h-24 w-18 shrink-0 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shadow-inner">
                      {/* Placeholder for item image if we have it */}
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 uppercase font-bold tracking-tighter text-center px-1">
                        {item.variant.product.name.split(" ")[0]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/p/${item.variant.product.slug}`} className="text-base font-bold text-[#1A1A1A] hover:text-primary transition-colors">
                        {item.variant.product.name}
                      </Link>
                      <p className="text-sm text-[#696969] mt-1">{item.variant.name}</p>
                      <p className="text-xs text-[#9B9B9B] mt-1 font-mono">SKU: {item.variant.sku}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm font-medium text-[#4D4D4D]">{formatPaise(item.unitPricePaise)} × {item.quantity}</p>
                        <p className="text-sm font-bold text-[#1A1A1A]">{formatPaise(item.totalPaise)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Payment & Shipping Summary */}
            <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#9B9B9B] mb-4">Payment Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[#696969]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#1A1A1A]">{formatPaise(order.subtotalPaise)}</span>
                </div>
                <div className="flex justify-between text-[#696969]">
                  <span>Shipping</span>
                  <span className={order.shippingPaise === 0 ? "font-bold text-[#26A541]" : "font-medium text-[#1A1A1A]"}>
                    {order.shippingPaise === 0 ? "FREE" : formatPaise(order.shippingPaise)}
                  </span>
                </div>
                {order.discountPaise > 0 && (
                  <div className="flex justify-between text-[#26A541]">
                    <span>Discount</span>
                    <span className="font-bold">-{formatPaise(order.discountPaise)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center">
                  <span className="text-base font-bold text-[#1A1A1A]">Total Amount</span>
                  <span className="text-lg font-extrabold text-primary">{formatPaise(order.totalPaise)}</span>
                </div>
              </div>

              {order.payments?.[0] && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-xs font-bold text-[#9B9B9B] uppercase tracking-widest mb-2">Payment Method</p>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-12 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">
                      {order.payments[0].method || "UPI"}
                    </div>
                    <p className="text-sm font-medium text-[#4D4D4D] capitalize">{order.payments[0].status.toLowerCase()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Address */}
            <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#9B9B9B] mb-4">Delivery Address</h2>
              <p className="text-sm font-bold text-[#1A1A1A]">{addr.fullName}</p>
              <p className="text-sm text-[#4D4D4D] mt-1">{addr.phone}</p>
              <p className="text-sm text-[#696969] mt-2 leading-relaxed">
                {addr.line1}{addr.line2 && `, ${addr.line2}`}<br />
                {addr.city}, {addr.state}<br />
                {addr.pincode}
              </p>
            </div>

            {/* Shipment Tracking */}
            {order.shipment && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-primary mb-3">Track Shipment</h2>
                <p className="text-xs font-bold text-primary/70 uppercase tracking-widest">{order.shipment.courierName}</p>
                <p className="text-sm font-mono font-bold text-[#1A1A1A] mt-1">AWB: {order.shipment.awbNumber}</p>
                {order.shipment.trackingUrl && (
                  <a 
                    href={order.shipment.trackingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 block w-full rounded-lg bg-primary py-2.5 text-center text-xs font-bold text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    Track on Carrier Site
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

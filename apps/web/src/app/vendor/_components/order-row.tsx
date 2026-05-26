"use client";

import { useState } from "react";
import { formatPaise } from "@sario/ui";
import { apiFetch } from "@/lib/api";

export type OrderStatus =
  | "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED"
  | "COMPLETED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURN_APPROVED"
  | "RETURN_REJECTED" | "REFUNDED";

export interface OrderItem {
  id: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
  variant: {
    name: string;
    product: { name: string; slug: string };
    images?: Array<{ url: string }>;
  };
}

export interface VendorOrder {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  createdAt: string;
  items: OrderItem[];
  shipment?: { trackingNumber?: string | null; trackingUrl?: string | null } | null;
}

const STATUS_BADGE: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  PENDING:          { bg: "bg-gray-100",    text: "text-gray-600",    label: "Pending" },
  CONFIRMED:        { bg: "bg-yellow-50",   text: "text-yellow-700",  label: "Confirmed" },
  PACKED:           { bg: "bg-purple-50",   text: "text-purple-700",  label: "Packed" },
  SHIPPED:          { bg: "bg-indigo-50",   text: "text-indigo-700",  label: "Shipped" },
  DELIVERED:        { bg: "bg-green-50",    text: "text-green-700",   label: "Delivered" },
  COMPLETED:        { bg: "bg-green-100",   text: "text-green-800",   label: "Completed" },
  CANCELLED:        { bg: "bg-red-50",      text: "text-red-700",     label: "Cancelled" },
  RETURN_REQUESTED: { bg: "bg-orange-50",   text: "text-orange-700",  label: "Return Requested" },
  RETURN_APPROVED:  { bg: "bg-orange-100",  text: "text-orange-800",  label: "Return Approved" },
  RETURN_REJECTED:  { bg: "bg-red-100",     text: "text-red-800",     label: "Return Rejected" },
  REFUNDED:         { bg: "bg-gray-100",    text: "text-gray-600",    label: "Refunded" },
};

interface Props {
  order: VendorOrder;
  onRefetch: () => void;
}

export function OrderRow({ order, onRefetch }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const badge = STATUS_BADGE[order.status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: order.status };

  const advance = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/vendors/me/orders/${order.id}/advance`, { method: "POST" });
      onRefetch();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const ship = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/vendors/me/orders/${order.id}/ship`, { method: "POST" });
      onRefetch();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Order</p>
          <p className="text-sm font-bold text-[#1A1A1A]">#{order.id.slice(-8).toUpperCase()}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Date</p>
          <p className="text-sm text-[#1A1A1A]">
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Items</p>
          <p className="text-sm text-[#1A1A1A]">{order.items.length}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          <p className="text-sm font-extrabold text-primary">{formatPaise(order.totalPaise)}</p>
        </div>
        <svg className={`h-4 w-4 text-[#9B9B9B] transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <>
          <div className="border-t border-[#F0F0F0] px-5 py-4 space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-12 w-10 shrink-0 rounded-lg bg-[#F5F5F5] border border-[#F0F0F0] overflow-hidden">
                  {item.variant.images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.variant.images[0].url} alt={item.variant.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-[#CCCCCC]">—</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A1A1A] line-clamp-1">{item.variant.product.name}</p>
                  <p className="text-xs text-[#696969]">{item.variant.name} · Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-[#1A1A1A] shrink-0">{formatPaise(item.totalPaise)}</p>
              </div>
            ))}
            {order.shipment?.trackingNumber && (
              <p className="text-xs text-[#696969]">
                Tracking: <span className="font-bold text-[#1A1A1A]">{order.shipment.trackingNumber}</span>
              </p>
            )}
          </div>

          {(order.status === "CONFIRMED" || order.status === "PACKED") && (
            <div className="border-t border-[#F0F0F0] bg-gray-50/30 px-5 py-3 flex gap-2">
              {order.status === "CONFIRMED" && (
                <button
                  onClick={() => { void advance(); }}
                  disabled={actionLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {actionLoading ? "…" : "Mark Packed"}
                </button>
              )}
              {order.status === "PACKED" && (
                <button
                  onClick={() => { void ship(); }}
                  disabled={actionLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {actionLoading ? "…" : "Create Shipment"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

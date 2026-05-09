"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";

type OrderStatus =
  | "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED"
  | "COMPLETED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURN_APPROVED"
  | "RETURN_REJECTED" | "REFUNDED";

interface OrderItem {
  id: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
  variant: {
    name: string;
    product: { name: string; slug: string };
  };
}

interface Shipment {
  status: string;
  trackingId?: string;
  trackingUrl?: string;
}

interface Order {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  createdAt: string;
  items: OrderItem[];
  shipment?: Shipment;
}

const STATUS_TABS: { key: OrderStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CONFIRMED", label: "To Pack" },
  { key: "PACKED", label: "To Ship" },
  { key: "SHIPPED", label: "In Transit" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "CANCELLED", label: "Cancelled" },
];

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:          { label: "Awaiting Payment",  bg: "bg-yellow-50",  text: "text-yellow-700" },
  CONFIRMED:        { label: "Confirmed",          bg: "bg-blue-50",    text: "text-blue-700" },
  PACKED:           { label: "Packed",             bg: "bg-purple-50",  text: "text-purple-700" },
  SHIPPED:          { label: "Shipped",            bg: "bg-indigo-50",  text: "text-indigo-700" },
  DELIVERED:        { label: "Delivered",          bg: "bg-green-50",   text: "text-green-700" },
  COMPLETED:        { label: "Completed",          bg: "bg-green-100",  text: "text-green-800" },
  CANCELLED:        { label: "Cancelled",          bg: "bg-red-50",     text: "text-red-700" },
  RETURN_REQUESTED: { label: "Return Requested",   bg: "bg-orange-50",  text: "text-orange-700" },
  RETURN_APPROVED:  { label: "Return Approved",    bg: "bg-orange-100", text: "text-orange-800" },
  RETURN_REJECTED:  { label: "Return Rejected",    bg: "bg-red-100",    text: "text-red-800" },
  REFUNDED:         { label: "Refunded",           bg: "bg-gray-100",   text: "text-gray-600" },
};

const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Mark as Packed",
  PACKED: "Mark as Shipped",
};

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<OrderStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [shipping, setShipping] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(activeTab !== "ALL" ? { status: activeTab } : {}),
      });
      const res = await apiFetch<{ data: Order[]; total: number }>(
        `/vendors/me/orders?${params}`,
      );
      setOrders(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const advanceOrder = async (orderId: string) => {
    setAdvancing(orderId);
    setActionError(null);
    try {
      const updated = await apiFetch<Order>(`/vendors/me/orders/${orderId}/advance`, {
        method: "POST",
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)),
      );
    } catch (e) {
      setActionError({
        id: orderId,
        msg: e instanceof Error ? e.message : "Failed to advance order.",
      });
    } finally {
      setAdvancing(null);
    }
  };

  const createShipment = async (orderId: string) => {
    setShipping(orderId);
    setActionError(null);
    try {
      await apiFetch(`/vendors/me/orders/${orderId}/ship`, { method: "POST" });
      await fetchOrders();
    } catch (e) {
      setActionError({
        id: orderId,
        msg: e instanceof Error ? e.message : "Failed to create shipment.",
      });
    } finally {
      setShipping(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Orders</h1>
        <p className="mt-0.5 text-sm text-[#696969]">{total} total order{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-sm border border-[#E8E8E8] bg-white p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-sm px-3 py-1.5 text-xs font-bold transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-[#696969] hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          <button onClick={() => void fetchOrders()} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Orders list */}
      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-sm bg-[#F5F5F5]" />
          ))
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center rounded-sm border border-[#E8E8E8] bg-white py-16 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-3 font-bold text-[#1A1A1A]">No orders found</p>
            <p className="mt-1 text-sm text-[#696969]">
              {activeTab !== "ALL" ? "No orders with this status." : "Orders will appear here once buyers start purchasing."}
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const s = STATUS_MAP[order.status] ?? { label: order.status, bg: "bg-gray-50", text: "text-gray-700" };
            const isExpanded = expandedId === order.id;
            const advanceLabel = ADVANCE_LABEL[order.status];
            const err = actionError?.id === order.id ? actionError.msg : null;

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-sm border border-[#E8E8E8] bg-white shadow-sm"
              >
                {/* Order header row */}
                <div
                  className="flex cursor-pointer flex-col gap-3 px-5 py-4 hover:bg-[#FAFAFA] transition-colors sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#4D4D4D]">
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#9B9B9B]">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className={`rounded-sm px-2 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}>
                      {s.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-[#1A1A1A]">
                        {formatPaise(order.totalPaise)}
                      </p>
                      <p className="text-[10px] text-[#9B9B9B]">
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="text-[#C0C0C0]">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[#F0F0F0]">
                    {/* Items */}
                    <div className="px-5 py-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Items</p>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div>
                              <p className="font-semibold text-[#1A1A1A]">
                                {item.variant.product.name}
                              </p>
                              <p className="text-xs text-[#696969]">
                                {item.variant.name} · Qty {item.quantity}
                              </p>
                            </div>
                            <p className="font-bold text-[#1A1A1A]">
                              {formatPaise(item.totalPaise)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipment tracking */}
                    {order.shipment && (
                      <div className="border-t border-[#F0F0F0] px-5 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Shipment</p>
                        <p className="mt-1 text-sm text-[#4D4D4D]">
                          Status: <span className="font-semibold">{order.shipment.status}</span>
                          {order.shipment.trackingId && ` · Tracking: ${order.shipment.trackingId}`}
                        </p>
                        {order.shipment.trackingUrl && (
                          <a
                            href={order.shipment.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                          >
                            Track Shipment →
                          </a>
                        )}
                      </div>
                    )}

                    {/* Action error */}
                    {err && (
                      <div className="border-t border-[#F0F0F0] bg-red-50 px-5 py-3 text-xs text-red-700">
                        {err}
                      </div>
                    )}

                    {/* Actions */}
                    {(advanceLabel || order.status === "PACKED") && (
                      <div className="flex flex-wrap gap-2 border-t border-[#F0F0F0] px-5 py-4">
                        {advanceLabel && (
                          <button
                            onClick={() => void advanceOrder(order.id)}
                            disabled={advancing === order.id}
                            className="rounded-sm bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {advancing === order.id ? "Updating…" : advanceLabel}
                          </button>
                        )}
                        {order.status === "PACKED" && !order.shipment && (
                          <button
                            onClick={() => void createShipment(order.id)}
                            disabled={shipping === order.id}
                            className="rounded-sm border border-[#E8E8E8] px-4 py-2 text-xs font-bold text-[#4D4D4D] hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                          >
                            {shipping === order.id ? "Creating…" : "Create Shipment (Shiprocket)"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-[#696969]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-sm border border-[#E8E8E8] px-3 py-1.5 text-xs font-semibold text-[#4D4D4D] hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-sm border border-[#E8E8E8] px-3 py-1.5 text-xs font-semibold text-[#4D4D4D] hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

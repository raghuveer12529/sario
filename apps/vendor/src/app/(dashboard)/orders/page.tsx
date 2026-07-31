"use client";

import { useEffect, useState, useCallback } from "react";
import { vendorFetch } from "@/lib/api";

interface Variant {
  sku: string;
  name: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPricePaise: number;
  variant: Variant;
}

interface Order {
  id: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  items: OrderItem[];
}

interface OrderPage {
  data: Order[];
  meta: { total: number; page: number; totalPages: number };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending payment",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURN_APPROVED: "Return approved",
  RETURN_REJECTED: "Return rejected",
  REFUNDED: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PACKED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
  RETURN_REQUESTED: "bg-yellow-100 text-yellow-700",
  RETURN_APPROVED: "bg-orange-100 text-orange-700",
  RETURN_REJECTED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-600",
};

const ADVANCEABLE = new Set(["CONFIRMED", "PACKED"]);
const SHIPPABLE = new Set(["PACKED"]);

function formatPaise(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await vendorFetch<OrderPage>(`/vendors/me/orders?page=${p}&limit=20`);
      setOrders(res.data);
      setMeta(res.meta);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(page); }, [load, page]);

  const advance = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await vendorFetch(`/vendors/me/orders/${orderId}/advance`, { method: "POST" });
      await load(page);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to advance order");
    } finally {
      setActionLoading(null);
    }
  };

  const ship = async (orderId: string) => {
    setActionLoading(`ship-${orderId}`);
    try {
      await vendorFetch(`/vendors/me/orders/${orderId}/ship`, { method: "POST" });
      await load(page);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">{meta.total} total order{meta.total !== 1 ? "s" : ""}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
          <p className="text-sm text-muted-foreground">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono text-muted-foreground">{order.id.slice(-8).toUpperCase()}</p>
                  <p className="mt-0.5 font-bold">{formatPaise(order.totalPaise)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono text-xs">{item.variant.sku}</span>
                    <span>·</span>
                    <span>{item.variant.name}</span>
                    <span>·</span>
                    <span>×{item.quantity}</span>
                    <span>·</span>
                    <span>{formatPaise(item.unitPricePaise)}</span>
                  </div>
                ))}
              </div>

              {(ADVANCEABLE.has(order.status) || SHIPPABLE.has(order.status)) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {ADVANCEABLE.has(order.status) && (
                    <button
                      onClick={() => void advance(order.id)}
                      disabled={actionLoading === order.id}
                      className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading === order.id ? "Updating…" : order.status === "CONFIRMED" ? "Mark as Packed" : "Mark as Shipped"}
                    </button>
                  )}
                  {SHIPPABLE.has(order.status) && (
                    <button
                      onClick={() => void ship(order.id)}
                      disabled={actionLoading === `ship-${order.id}`}
                      className="rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      {actionLoading === `ship-${order.id}` ? "Creating…" : "Create Shipment"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {meta.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

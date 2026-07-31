"use client";

import { useEffect, useState, useCallback } from "react";
import { vendorFetch } from "@/lib/api";

interface Order {
  id: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  notes: string | null;
}

interface OrderPage {
  data: Order[];
  meta: { total: number };
}

function formatPaise(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export default function VendorReturnsPage() {
  const [returnOrders, setReturnOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all orders and filter for return-related statuses client-side
      const res = await vendorFetch<OrderPage>("/vendors/me/orders?limit=100");
      const returnStatuses = new Set(["RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED"]);
      setReturnOrders(res.data.filter((o) => returnStatuses.has(o.status)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const approveReturn = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await vendorFetch(`/vendors/me/orders/${orderId}/return/approve`, { method: "POST" });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to approve return");
    } finally {
      setActionLoading(null);
    }
  };

  const submitReject = async () => {
    if (!rejectOrderId || !rejectReason.trim()) return;
    setActionLoading(rejectOrderId);
    try {
      await vendorFetch(`/vendors/me/orders/${rejectOrderId}/return/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectOrderId(null);
      setRejectReason("");
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to reject return");
    } finally {
      setActionLoading(null);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    RETURN_REQUESTED: "bg-yellow-100 text-yellow-700",
    RETURN_APPROVED: "bg-green-100 text-green-700",
    RETURN_REJECTED: "bg-red-100 text-red-700",
  };

  const STATUS_LABELS: Record<string, string> = {
    RETURN_REQUESTED: "Return requested",
    RETURN_APPROVED: "Return approved",
    RETURN_REJECTED: "Return rejected",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Returns</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage buyer return requests</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : returnOrders.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
          <p className="text-sm text-muted-foreground">No return requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returnOrders.map((order) => (
            <div key={order.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono text-muted-foreground">{order.id.slice(-8).toUpperCase()}</p>
                  <p className="mt-0.5 font-bold">{formatPaise(order.totalPaise)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[order.status] ?? "bg-gray-100"}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              {order.notes && (
                <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Reason: </span>{order.notes}
                </div>
              )}

              {order.status === "RETURN_REQUESTED" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => void approveReturn(order.id)}
                    disabled={actionLoading === order.id}
                    className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {actionLoading === order.id ? "Approving…" : "Approve Return"}
                  </button>
                  <button
                    onClick={() => setRejectOrderId(order.id)}
                    className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Reject Return
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject dialog */}
      {rejectOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold">Reject Return</h2>
            <p className="mt-1 text-sm text-muted-foreground">Please provide a reason for rejecting this return request.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Product shows signs of use beyond normal wear…"
              rows={3}
              className="mt-4 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setRejectOrderId(null); setRejectReason(""); }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitReject()}
                disabled={!rejectReason.trim() || !!actionLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

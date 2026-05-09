"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";

interface OrderItem {
  variant: { name: string; product: { name: string } };
  quantity: number;
  totalPaise: number;
}

interface Order {
  id: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  returnReason?: string;
  items: OrderItem[];
}

type Action = "approve" | "reject";

export default function VendorReturnsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ order: Order; action: Action } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch orders with return-related statuses
      const [reqRes, approvedRes, rejectedRes] = await Promise.all([
        apiFetch<{ data: Order[]; total: number }>(
          "/vendors/me/orders?status=RETURN_REQUESTED&limit=50",
        ),
        apiFetch<{ data: Order[]; total: number }>(
          "/vendors/me/orders?status=RETURN_APPROVED&limit=20",
        ),
        apiFetch<{ data: Order[]; total: number }>(
          "/vendors/me/orders?status=RETURN_REJECTED&limit=20",
        ),
      ]);
      setOrders([...reqRes.data, ...approvedRes.data, ...rejectedRes.data]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load returns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReturns();
  }, [fetchReturns]);

  const handleAction = async () => {
    if (!modal) return;
    if (modal.action === "reject" && !rejectReason.trim()) {
      setModalError("Please provide a reason for rejection.");
      return;
    }

    setSubmitting(true);
    setModalError("");
    try {
      const endpoint =
        modal.action === "approve"
          ? `/vendors/me/orders/${modal.order.id}/return/approve`
          : `/vendors/me/orders/${modal.order.id}/return/reject`;

      await apiFetch(endpoint, {
        method: "POST",
        ...(modal.action === "reject"
          ? { body: JSON.stringify({ reason: rejectReason.trim() }) }
          : {}),
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === modal.order.id
            ? {
                ...o,
                status: modal.action === "approve" ? "RETURN_APPROVED" : "RETURN_REJECTED",
              }
            : o,
        ),
      );
      setModal(null);
      setRejectReason("");
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Action failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pending = orders.filter((o) => o.status === "RETURN_REQUESTED");
  const resolved = orders.filter((o) => o.status !== "RETURN_REQUESTED");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Returns</h1>
        <p className="mt-0.5 text-sm text-[#696969]">
          Manage return requests from buyers. Respond within 48 hours.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}{" "}
          <button onClick={() => void fetchReturns()} className="font-bold underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-sm bg-[#F5F5F5]" />
          ))}
        </div>
      ) : (
        <>
          {/* Pending action required */}
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-[#1A1A1A]">Action Required</h2>
              {pending.length > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {pending.length}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="flex flex-col items-center rounded-sm border border-[#E8E8E8] bg-white py-10 text-center">
                <p className="text-2xl">✅</p>
                <p className="mt-2 text-sm font-bold text-[#1A1A1A]">All caught up!</p>
                <p className="text-xs text-[#696969]">No pending return requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((order) => (
                  <ReturnCard
                    key={order.id}
                    order={order}
                    onApprove={() => setModal({ order, action: "approve" })}
                    onReject={() => { setRejectReason(""); setModal({ order, action: "reject" }); }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Resolved */}
          {resolved.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-extrabold text-[#1A1A1A]">Previously Resolved</h2>
              <div className="space-y-3">
                {resolved.map((order) => (
                  <ReturnCard key={order.id} order={order} resolved />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Action modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-sm border border-[#E8E8E8] bg-white shadow-xl">
            <div
              className={`px-6 py-5 ${modal.action === "approve" ? "bg-green-600" : "bg-red-600"}`}
            >
              <h3 className="text-lg font-extrabold text-white">
                {modal.action === "approve" ? "Approve Return" : "Reject Return"}
              </h3>
              <p className="mt-0.5 text-sm text-white/80">
                Order #{modal.order.id.slice(-8).toUpperCase()} · {formatPaise(modal.order.totalPaise)}
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {modal.action === "approve" ? (
                <div className="rounded-sm border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <p className="font-bold">Approving this return will:</p>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5 text-xs">
                    <li>Notify the buyer to ship the item back</li>
                    <li>Escalate to admin for quality check and refund processing</li>
                  </ul>
                </div>
              ) : (
                <>
                  <div className="rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    The buyer's return request will be declined. Provide a clear reason.
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                      Reason for Rejection *
                    </label>
                    <textarea
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => { setRejectReason(e.target.value); setModalError(""); }}
                      placeholder="e.g. The return window of 7 days has expired…"
                      className="w-full rounded-sm border border-[#E8E8E8] px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary resize-none"
                    />
                  </div>
                </>
              )}

              {modalError && (
                <p className="text-xs text-red-600">{modalError}</p>
              )}
            </div>

            <div className="flex gap-3 border-t border-[#F0F0F0] px-6 py-4">
              <button
                onClick={() => { setModal(null); setRejectReason(""); setModalError(""); }}
                disabled={submitting}
                className="flex-1 rounded-sm border border-[#E8E8E8] py-2.5 text-sm font-semibold text-[#696969] hover:text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAction()}
                disabled={submitting}
                className={`flex-1 rounded-sm py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50 hover:opacity-90 ${
                  modal.action === "approve" ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {submitting
                  ? "Processing…"
                  : modal.action === "approve"
                  ? "Confirm Approval"
                  : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Return card ──────────────────────────────────────────────────────────────

function ReturnCard({
  order,
  onApprove,
  onReject,
  resolved = false,
}: {
  order: Order;
  onApprove?: () => void;
  onReject?: () => void;
  resolved?: boolean;
}) {
  const statusColor =
    order.status === "RETURN_APPROVED"
      ? { bg: "bg-green-50", text: "text-green-700", label: "Approved" }
      : order.status === "RETURN_REJECTED"
      ? { bg: "bg-red-50", text: "text-red-700", label: "Rejected" }
      : { bg: "bg-orange-50", text: "text-orange-700", label: "Pending" };

  return (
    <div className="overflow-hidden rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-bold text-[#4D4D4D]">
              #{order.id.slice(-8).toUpperCase()}
            </p>
            <span className={`rounded-sm px-2 py-0.5 text-[10px] font-bold ${statusColor.bg} ${statusColor.text}`}>
              {statusColor.label}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-[#9B9B9B]">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>

          {/* Items */}
          <div className="mt-3 space-y-1">
            {order.items.map((item, i) => (
              <p key={i} className="text-xs text-[#4D4D4D]">
                {item.variant.product.name} — {item.variant.name} × {item.quantity}
              </p>
            ))}
          </div>

          {/* Return reason */}
          {order.returnReason && (
            <div className="mt-3 rounded-sm border border-orange-100 bg-orange-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">
                Buyer's Reason
              </p>
              <p className="mt-0.5 text-xs text-[#4D4D4D]">{order.returnReason}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          <p className="text-base font-extrabold text-[#1A1A1A]">
            {formatPaise(order.totalPaise)}
          </p>

          {!resolved && onApprove && onReject && (
            <div className="flex gap-2">
              <button
                onClick={onReject}
                className="rounded-sm border border-[#E8E8E8] px-3 py-1.5 text-xs font-bold text-[#696969] hover:border-red-400 hover:text-red-600 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={onApprove}
                className="rounded-sm bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

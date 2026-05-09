"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";
import { useVendor } from "@/hooks/use-vendor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductSummary {
  id: string;
  name: string;
  status: string;
}

interface OrderItem {
  variant: { product: { name: string } };
  quantity: number;
}

interface Order {
  id: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  items: OrderItem[];
}

interface Stats {
  totalProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  pendingOrders: number;
  recentOrders: Order[];
  draftProducts: ProductSummary[];
}

const ORDER_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:    { label: "Awaiting Payment", bg: "bg-yellow-50", text: "text-yellow-700" },
  CONFIRMED:  { label: "Confirmed",        bg: "bg-blue-50",   text: "text-blue-700" },
  PACKED:     { label: "Packed",           bg: "bg-purple-50", text: "text-purple-700" },
  SHIPPED:    { label: "Shipped",          bg: "bg-indigo-50", text: "text-indigo-700" },
  DELIVERED:  { label: "Delivered",        bg: "bg-green-50",  text: "text-green-700" },
  COMPLETED:  { label: "Completed",        bg: "bg-green-100", text: "text-green-800" },
  CANCELLED:  { label: "Cancelled",        bg: "bg-red-50",    text: "text-red-700" },
  RETURN_REQUESTED: { label: "Return Req", bg: "bg-orange-50", text: "text-orange-700" },
  REFUNDED:   { label: "Refunded",         bg: "bg-gray-100",  text: "text-gray-600" },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string | undefined;
  accent?: "yellow" | "green" | "blue" | "red" | undefined;
}) {
  const accentCls = {
    yellow: "border-l-yellow-400",
    green: "border-l-green-400",
    blue: "border-l-blue-400",
    red: "border-l-red-400",
  };
  return (
    <div
      className={`rounded-sm border border-[#E8E8E8] bg-white p-5 shadow-sm border-l-4 ${
        accent ? accentCls[accent] : "border-l-primary"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[#9B9B9B]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[#1A1A1A]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#696969]">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorDashboardPage() {
  const { vendor } = useVendor();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          apiFetch<{ data: ProductSummary[]; total: number }>("/vendors/me/products?limit=100"),
          apiFetch<{ data: Order[]; total: number }>("/vendors/me/orders?limit=5"),
        ]);

        const products = productsRes.data;
        const orders = ordersRes.data;

        setStats({
          totalProducts: products.length,
          approvedProducts: products.filter((p) => p.status === "APPROVED").length,
          pendingProducts: products.filter((p) => p.status === "PENDING").length,
          pendingOrders: orders.filter((o) =>
            ["CONFIRMED", "PACKED"].includes(o.status),
          ).length,
          recentOrders: orders.slice(0, 5),
          draftProducts: products.filter((p) => p.status === "DRAFT").slice(0, 3),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">
          Welcome back{vendor?.businessName ? `, ${vendor.businessName}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-[#696969]">
          Here's a snapshot of your store today.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : stats ? (
        <>
          {/* Stats grid */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Products" value={stats.totalProducts} />
            <StatCard
              label="Live / Approved"
              value={stats.approvedProducts}
              accent="green"
            />
            <StatCard
              label="Pending Review"
              value={stats.pendingProducts}
              accent="yellow"
            />
            <StatCard
              label="Orders to Pack"
              value={stats.pendingOrders}
              accent={stats.pendingOrders > 0 ? "red" : undefined}
              sub={stats.pendingOrders > 0 ? "Action needed" : "All caught up!"}
            />
          </div>

          {/* Action banners */}
          {stats.pendingOrders > 0 && (
            <div className="mb-6 flex items-center justify-between rounded-sm border border-orange-200 bg-orange-50 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-orange-800">
                  {stats.pendingOrders} order{stats.pendingOrders > 1 ? "s" : ""} need your attention
                </p>
                <p className="mt-0.5 text-xs text-orange-600">Pack and ship confirmed orders promptly to keep buyers happy.</p>
              </div>
              <Link
                href="/vendor/orders"
                className="shrink-0 rounded-sm bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 transition-colors"
              >
                View Orders
              </Link>
            </div>
          )}

          {stats.draftProducts.length > 0 && (
            <div className="mb-6 flex items-center justify-between rounded-sm border border-blue-200 bg-blue-50 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-blue-800">
                  {stats.draftProducts.length} product{stats.draftProducts.length > 1 ? "s" : ""} in draft — not yet visible to buyers
                </p>
                <p className="mt-0.5 text-xs text-blue-600">
                  {stats.draftProducts.map((p) => p.name).join(", ")}
                </p>
              </div>
              <Link
                href="/vendor/products"
                className="shrink-0 rounded-sm bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                View Products
              </Link>
            </div>
          )}

          {stats.totalProducts === 0 && (
            <div className="mb-6 flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-[#E8E8E8] bg-white px-6 py-12 text-center">
              <p className="text-3xl">🛍️</p>
              <p className="mt-3 font-bold text-[#1A1A1A]">No products yet</p>
              <p className="mt-1 text-sm text-[#696969]">
                Add your first saree listing to start selling.
              </p>
              <Link
                href="/vendor/products/new"
                className="mt-5 rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                + Add First Product
              </Link>
            </div>
          )}

          {/* Recent orders */}
          {stats.recentOrders.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#1A1A1A]">Recent Orders</h2>
                <Link
                  href="/vendor/orders"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View all →
                </Link>
              </div>
              <div className="overflow-hidden rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Order</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Items</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Total</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9B9B9B]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {stats.recentOrders.map((order) => {
                      const s = ORDER_STATUS_MAP[order.status] ?? { label: order.status, bg: "bg-gray-50", text: "text-gray-600" };
                      return (
                        <tr key={order.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs text-[#4D4D4D]">#{order.id.slice(-8).toUpperCase()}</p>
                            <p className="mt-0.5 text-[10px] text-[#9B9B9B]">
                              {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#4D4D4D]">
                            {order.items
                              .slice(0, 2)
                              .map((i) => `${i.variant.product.name} ×${i.quantity}`)
                              .join(", ")}
                            {order.items.length > 2 && ` +${order.items.length - 2} more`}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-[#1A1A1A]">
                            {formatPaise(order.totalPaise)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold ${s.bg} ${s.text}`}>
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Quick links */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { href: "/vendor/products/new" as const, label: "Add Product", emoji: "➕" },
              { href: "/vendor/orders" as const, label: "Manage Orders", emoji: "📦" },
              { href: "/vendor/returns" as const, label: "Handle Returns", emoji: "↩️" },
              { href: "/vendor/profile" as const, label: "Edit Profile", emoji: "✏️" },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex flex-col items-center justify-center gap-2 rounded-sm border border-[#E8E8E8] bg-white p-5 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-2xl">{q.emoji}</span>
                <span className="text-xs font-bold text-[#1A1A1A]">{q.label}</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-sm bg-[#F0F0F0]" />
        ))}
      </div>
      <div className="h-16 rounded-sm bg-[#F0F0F0]" />
      <div className="h-48 rounded-sm bg-[#F0F0F0]" />
    </div>
  );
}

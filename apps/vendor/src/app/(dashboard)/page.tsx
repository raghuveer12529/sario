"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { vendorFetch } from "@/lib/api";

interface VendorProfile {
  id: string;
  businessName: string;
  status: string;
  createdAt: string;
}

interface OrderPage {
  data: Array<{ id: string; status: string; totalPaise: number }>;
  meta: { total: number };
}

interface ProductPage {
  data: Array<{ id: string; status: string }>;
  meta: { total: number };
}

function formatPaise(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

export default function VendorDashboardPage() {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [orders, setOrders] = useState<OrderPage | null>(null);
  const [products, setProducts] = useState<ProductPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      vendorFetch<VendorProfile>("/vendors/me"),
      vendorFetch<OrderPage>("/vendors/me/orders?limit=100"),
      vendorFetch<ProductPage>("/vendors/me/products?limit=100"),
    ])
      .then(([v, o, p]) => {
        setVendor(v);
        setOrders(o);
        setProducts(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalOrders = orders?.meta.total ?? 0;
  const pendingOrders = orders?.data.filter((o) => o.status === "CONFIRMED" || o.status === "PACKED").length ?? 0;
  const returnRequests = orders?.data.filter((o) => o.status === "RETURN_REQUESTED").length ?? 0;
  const totalProducts = products?.meta.total ?? 0;
  const revenue = orders?.data
    .filter((o) => !["CANCELLED", "RETURN_REJECTED"].includes(o.status))
    .reduce((sum, o) => sum + o.totalPaise, 0) ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome back{vendor ? `, ${vendor.businessName}` : ""}!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {vendor?.status === "PENDING" && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4">
          <p className="text-sm font-medium text-yellow-800">Application under review</p>
          <p className="mt-1 text-sm text-yellow-700">Your vendor application is being reviewed. You can browse the dashboard, but listing products requires approval.</p>
        </div>
      )}

      {returnRequests > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-medium text-red-800">Action required</p>
          <p className="mt-1 text-sm text-red-700">{returnRequests} return request{returnRequests > 1 ? "s" : ""} awaiting your response.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total orders" value={totalOrders} href="/orders" />
        <StatCard label="Pending fulfillment" value={pendingOrders} href="/orders" accent={pendingOrders > 0} />
        <StatCard label="Products listed" value={totalProducts} href="/products" />
        <StatCard label="Return requests" value={returnRequests} href="/returns" accent={returnRequests > 0} />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-6">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Estimated Revenue</p>
        <p className="mt-2 text-3xl font-bold">{formatPaise(revenue)}</p>
        <p className="mt-1 text-sm text-muted-foreground">From {totalOrders} order{totalOrders !== 1 ? "s" : ""} (excl. cancelled/refunded)</p>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              href: "/products",
              label: "Add product",
              svg: <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
            },
            {
              href: "/orders",
              label: "Manage orders",
              svg: <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>,
            },
            {
              href: "/returns",
              label: "Review returns",
              svg: <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>,
            },
            {
              href: "/products",
              label: "View products",
              svg: <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /></svg>,
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 rounded-xl border bg-card p-4 text-sm font-medium transition-colors hover:border-foreground hover:bg-accent"
            >
              {item.svg}
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, href, accent = false }: { label: string; value: number; href: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-6 transition-colors hover:border-foreground ${accent ? "border-yellow-300 bg-yellow-50" : "bg-card"}`}
    >
      <p className={`text-3xl font-bold ${accent ? "text-yellow-800" : ""}`}>{value}</p>
      <p className={`mt-1 text-sm ${accent ? "text-yellow-700" : "text-muted-foreground"}`}>{label}</p>
    </Link>
  );
}

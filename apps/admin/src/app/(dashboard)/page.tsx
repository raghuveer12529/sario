import type { Metadata } from "next";
import { adminFetch } from "@/lib/api";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface DashboardStats {
  pendingVendors: number;
  pendingProducts: number;
  openDisputes: number;
  totalOrders?: number;
}

async function getStats(): Promise<DashboardStats> {
  try {
    return await adminFetch<DashboardStats>("/admin/stats");
  } catch {
    return { pendingVendors: 0, pendingProducts: 0, openDisputes: 0, totalOrders: 0 };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {(stats.pendingVendors > 0 || stats.pendingProducts > 0 || stats.openDisputes > 0) && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4">
          <p className="text-sm font-medium text-yellow-800">Action required</p>
          <ul className="mt-1 space-y-0.5 text-sm text-yellow-700">
            {stats.pendingVendors > 0 && <li>· {stats.pendingVendors} vendor{stats.pendingVendors > 1 ? "s" : ""} awaiting approval</li>}
            {stats.pendingProducts > 0 && <li>· {stats.pendingProducts} product{stats.pendingProducts > 1 ? "s" : ""} pending review</li>}
            {stats.openDisputes > 0 && <li>· {stats.openDisputes} open dispute{stats.openDisputes > 1 ? "s" : ""}</li>}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending vendors" value={stats.pendingVendors} href="/vendors?status=PENDING" accent={stats.pendingVendors > 0} />
        <StatCard label="Pending products" value={stats.pendingProducts} href="/products?status=PENDING_REVIEW" accent={stats.pendingProducts > 0} />
        <StatCard label="Open disputes" value={stats.openDisputes} href="/returns" accent={stats.openDisputes > 0} />
        {stats.totalOrders !== undefined && (
          <StatCard label="Total orders" value={stats.totalOrders} href="/orders" />
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/vendors", label: "Review vendors", svg: <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
            { href: "/products", label: "Moderate products", svg: <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
            { href: "/orders", label: "View orders", svg: <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> },
            { href: "/returns", label: "Handle returns", svg: <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg> },
          ].map((item) => (
            <Link
              key={item.href}
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

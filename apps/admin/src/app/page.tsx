import type { Metadata } from "next";
import { adminFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface DashboardStats {
  pendingVendors: number;
  pendingProducts: number;
  openDisputes: number;
}

async function getStats(): Promise<DashboardStats> {
  try {
    return await adminFetch<DashboardStats>("/admin/stats");
  } catch {
    return { pendingVendors: 0, pendingProducts: 0, openDisputes: 0 };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Vendors awaiting approval" value={stats.pendingVendors} href="/vendors?status=PENDING" />
        <StatCard label="Products awaiting review" value={stats.pendingProducts} href="/products?status=PENDING_REVIEW" />
        <StatCard label="Open disputes" value={stats.openDisputes} href="/disputes" />
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} className="block rounded-xl border bg-card p-6 hover:border-foreground transition-colors">
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </a>
  );
}

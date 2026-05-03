"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/api";
import { ProductStatus } from "@sario/shared";

interface Product {
  id: string;
  name: string;
  slug: string;
  status: string;
  vendor: { businessName: string };
  category: { name: string };
  createdAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminFetch<{ data: Product[] }>(`/admin/products?status=${status}`)
      .then((r) => setProducts(r.data))
      .finally(() => setLoading(false));
  }, [status]);

  const approve = async (id: string) => {
    await adminFetch(`/admin/products/${id}/approve`, { method: "POST" });
    setProducts((p) => p.filter((x) => x.id !== id));
  };

  const reject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    await adminFetch(`/admin/products/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    setProducts((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Moderation</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {Object.values(ProductStatus).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border px-6 py-4">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.vendor.businessName} · {p.category.name}
                </p>
              </div>
              {status === "PENDING_REVIEW" && (
                <div className="flex gap-2">
                  <button onClick={() => approve(p.id)} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">Approve</button>
                  <button onClick={() => reject(p.id)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Reject</button>
                </div>
              )}
            </div>
          ))}
          {products.length === 0 && <p className="text-muted-foreground">Nothing to review.</p>}
        </div>
      )}
    </div>
  );
}

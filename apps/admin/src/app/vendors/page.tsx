"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/api";
import { VendorStatus } from "@sario/shared";

interface Vendor {
  id: string;
  businessName: string;
  slug: string;
  status: string;
  gstin?: string;
  pan?: string;
  createdAt: string;
  bankAccounts: Array<{ bankName: string; isVerified: boolean; isPrimary: boolean }>;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [status, setStatus] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminFetch<Vendor[]>(`/admin/vendors?status=${status}`)
      .then(setVendors)
      .finally(() => setLoading(false));
  }, [status]);

  const action = async (id: string, action: "approve" | "reject" | "suspend") => {
    await adminFetch(`/admin/vendors/${id}/${action}`, { method: "POST" });
    setVendors((v) => v.filter((x) => x.id !== id));
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {Object.values(VendorStatus).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : vendors.length === 0 ? (
        <p className="text-muted-foreground">No vendors with status {status}.</p>
      ) : (
        <div className="space-y-4">
          {vendors.map((v) => (
            <div key={v.id} className="rounded-xl border p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{v.businessName}</p>
                  <p className="text-sm text-muted-foreground">@{v.slug}</p>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    {v.gstin && <span>GSTIN: {v.gstin}</span>}
                    {v.pan && <span>PAN: {v.pan}</span>}
                    {v.bankAccounts[0] && (
                      <span>Bank: {v.bankAccounts[0].bankName} {v.bankAccounts[0].isVerified ? "✓" : "⚠ unverified"}</span>
                    )}
                  </div>
                </div>
                {status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => action(v.id, "approve")}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => action(v.id, "reject")}
                      className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {status === "APPROVED" && (
                  <button
                    onClick={() => action(v.id, "suspend")}
                    className="rounded-lg border border-destructive px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

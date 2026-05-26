"use client";

import { useState, useEffect } from "react";
import { useVendor } from "@/hooks/use-vendor";
import { apiFetch } from "@/lib/api";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#4D4D4D]">{children}</label>;
}

function ReadOnlyInput({ value }: { value: string }) {
  return (
    <div className="w-full rounded-xl border border-[#F0F0F0] bg-[#F9F9F9] px-4 py-2.5 text-sm text-[#9B9B9B]">
      {value || "—"}
    </div>
  );
}

export default function VendorProfilePage() {
  const { vendor, loading: vendorLoading, refetch } = useVendor();
  const [businessName, setBusinessName] = useState("");
  const [about, setAbout] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (vendor) {
      setBusinessName(vendor.businessName);
      setAbout(vendor.about ?? "");
      setReturnPolicy(vendor.returnPolicy ?? "");
    }
  }, [vendor]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) { setMessage({ type: "error", text: "Business name is required." }); return; }
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/vendors/me", {
        method: "PATCH",
        body: JSON.stringify({
          businessName,
          about: about || undefined,
          returnPolicy: returnPolicy || undefined,
        }),
      });
      setMessage({ type: "success", text: "Profile updated successfully." });
      refetch();
    } catch (e: unknown) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  if (vendorLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const bank = vendor?.bankAccounts?.[0];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Store Profile</h1>

      <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Store Information</h2>
        <form onSubmit={(e) => { void handleSave(e); }} className="space-y-4">
          <div>
            <FieldLabel>Business Name *</FieldLabel>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <FieldLabel>About Your Store</FieldLabel>
            <textarea
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell buyers about your craft and heritage…"
              className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
          <div>
            <FieldLabel>Return Policy</FieldLabel>
            <textarea
              rows={3}
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value)}
              placeholder="Returns accepted within 7 days…"
              className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {message && (
            <p className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 border border-green-100 text-green-700"
                : "bg-red-50 border border-red-100 text-red-700"
            }`}>
              {message.text}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">KYC Details</h2>
        <div className="space-y-4">
          <div>
            <FieldLabel>GSTIN</FieldLabel>
            <ReadOnlyInput value={vendor?.gstin ?? ""} />
          </div>
          <div>
            <FieldLabel>PAN</FieldLabel>
            <ReadOnlyInput value={vendor?.pan ?? ""} />
          </div>
        </div>
      </div>

      {bank && (
        <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Bank Account</h2>
          <div className="space-y-4">
            <div>
              <FieldLabel>Bank Name</FieldLabel>
              <ReadOnlyInput value={bank.bankName} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <FieldLabel>Account Status</FieldLabel>
                <ReadOnlyInput value={bank.isPrimary ? "Primary Account" : "Secondary Account"} />
              </div>
              <div className="mt-5">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  bank.isVerified
                    ? "bg-green-50 border border-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {bank.isVerified ? "Verified" : "Pending Verification"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

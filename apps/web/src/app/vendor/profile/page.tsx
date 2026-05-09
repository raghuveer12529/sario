"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useVendor } from "@/hooks/use-vendor";

interface ProfileForm {
  businessName: string;
  about: string;
  returnPolicy: string;
}

export default function VendorProfilePage() {
  const { vendor, loading: vendorLoading, refetch } = useVendor();
  const [form, setForm] = useState<ProfileForm>({
    businessName: "",
    about: "",
    returnPolicy: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<ProfileForm>>({});

  useEffect(() => {
    if (vendor) {
      setForm({
        businessName: vendor.businessName ?? "",
        about: vendor.about ?? "",
        returnPolicy: vendor.returnPolicy ?? "",
      });
    }
  }, [vendor]);

  const set = (key: keyof ProfileForm, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
    setMessage(null);
  };

  const validate = () => {
    const errors: Partial<ProfileForm> = {};
    if (form.businessName.trim().length < 2)
      errors.businessName = "Business name must be at least 2 characters.";
    if (form.businessName.trim().length > 100)
      errors.businessName = "Business name must be under 100 characters.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/vendors/me", {
        method: "PATCH",
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          ...(form.about.trim() ? { about: form.about.trim() } : { about: null }),
          ...(form.returnPolicy.trim() ? { returnPolicy: form.returnPolicy.trim() } : { returnPolicy: null }),
        }),
      });
      await refetch();
      setMessage({ type: "success", text: "Store profile updated successfully." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (vendorLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const inputCls = (err?: boolean) =>
    `w-full rounded-sm border px-3 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#C0C0C0] ${
      err
        ? "border-red-400 bg-red-50 focus:border-red-500"
        : "border-[#E8E8E8] bg-white focus:border-primary"
    }`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Store Profile</h1>
        <p className="mt-0.5 text-sm text-[#696969]">
          This information is displayed to buyers on your store page and product listings.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-sm border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* ── Store Info ── */}
        <section className="rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
          <div className="border-b border-[#F0F0F0] px-5 py-4">
            <h2 className="text-sm font-extrabold text-[#1A1A1A]">Store Information</h2>
          </div>
          <div className="space-y-5 px-5 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                Business / Store Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={100}
                placeholder="Kanjivaram Silks"
                value={form.businessName}
                onChange={(e) => set("businessName", e.target.value)}
                className={inputCls(!!fieldErrors.businessName)}
              />
              {fieldErrors.businessName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.businessName}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                About Your Store
              </label>
              <textarea
                rows={4}
                maxLength={2000}
                placeholder="Tell buyers your story — who you are, where you're from, and what makes your sarees special."
                value={form.about}
                onChange={(e) => set("about", e.target.value)}
                className={inputCls() + " resize-none"}
              />
              <p className="mt-1 text-right text-[10px] text-[#9B9B9B]">
                {form.about.length}/2000
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                Return Policy
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder="e.g. 7-day return accepted for unused items in original packaging with all tags intact."
                value={form.returnPolicy}
                onChange={(e) => set("returnPolicy", e.target.value)}
                className={inputCls() + " resize-none"}
              />
            </div>
          </div>
        </section>

        {/* ── Bank Account (read-only) ── */}
        <section className="rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
          <div className="border-b border-[#F0F0F0] px-5 py-4">
            <h2 className="text-sm font-extrabold text-[#1A1A1A]">Bank Account</h2>
            <p className="mt-0.5 text-xs text-[#9B9B9B]">
              Bank details are verified and cannot be self-updated. Contact support to make changes.
            </p>
          </div>
          <div className="px-5 py-5">
            {vendor?.bankAccounts?.length ? (
              <div className="space-y-3">
                {vendor.bankAccounts.map((acct) => (
                  <div
                    key={acct.id}
                    className="flex items-center justify-between rounded-sm border border-[#F0F0F0] bg-[#FAFAFA] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{acct.bankName}</p>
                      {acct.isPrimary && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          Primary Account
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-sm px-2 py-0.5 text-[10px] font-bold ${
                        acct.isVerified
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {acct.isVerified ? "Verified" : "Pending Verification"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#9B9B9B]">No bank account linked.</p>
            )}

            <a
              href="mailto:support@sario.in?subject=Bank Account Update Request"
              className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
            >
              Contact support to update bank details →
            </a>
          </div>
        </section>

        {/* ── KYC (read-only) ── */}
        {(vendor?.gstin || vendor?.pan) && (
          <section className="rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
            <div className="border-b border-[#F0F0F0] px-5 py-4">
              <h2 className="text-sm font-extrabold text-[#1A1A1A]">KYC Details</h2>
              <p className="mt-0.5 text-xs text-[#9B9B9B]">Contact support to update KYC information.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 px-5 py-5">
              {vendor.gstin && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9B9B9B]">GSTIN</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-[#1A1A1A]">
                    {vendor.gstin}
                  </p>
                </div>
              )}
              {vendor.pan && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9B9B9B]">PAN</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-[#1A1A1A]">
                    {vendor.pan}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Vendor meta ── */}
        <div className="flex items-center justify-between rounded-sm border border-[#F0F0F0] bg-[#FAFAFA] px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9B9B9B]">Vendor ID</p>
            <p className="mt-0.5 font-mono text-xs text-[#4D4D4D]">{vendor?.id}</p>
          </div>
          <span className="rounded-sm bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
            Approved
          </span>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-sm bg-primary px-8 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

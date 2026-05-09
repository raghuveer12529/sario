"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { API_BASE } from "@/lib/api";
import { useVendor } from "@/hooks/use-vendor";

type Step = 1 | 2 | 3;

interface FormData {
  // Step 1
  businessName: string;
  about: string;
  returnPolicy: string;
  // Step 2
  gstin: string;
  pan: string;
  // Step 3
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

const STEP_LABELS = ["Business Details", "KYC & Compliance", "Bank Account"];

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;

export default function VendorOnboardingPage() {
  const router = useRouter();
  const { vendor, loading: vendorLoading, refetch } = useVendor();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [form, setForm] = useState<FormData>({
    businessName: "",
    about: "",
    returnPolicy: "",
    gstin: "",
    pan: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
  });

  // If vendor already PENDING, redirect to show pending screen
  useEffect(() => {
    if (!vendorLoading && vendor?.status === "PENDING") {
      router.replace("/vendor");
    }
    if (!vendorLoading && vendor?.status === "APPROVED") {
      router.replace("/vendor");
    }
  }, [vendor, vendorLoading, router]);

  const set = (key: keyof FormData, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validateStep1 = () => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (form.businessName.trim().length < 2)
      errors.businessName = "Business name must be at least 2 characters.";
    if (form.businessName.trim().length > 100)
      errors.businessName = "Business name must be under 100 characters.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (form.gstin && !GSTIN_RE.test(form.gstin.toUpperCase()))
      errors.gstin = "Invalid GSTIN format (e.g. 33AABCU9603R1ZV).";
    if (form.pan && !PAN_RE.test(form.pan.toUpperCase()))
      errors.pan = "Invalid PAN format (e.g. ABCDE1234F).";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (form.accountHolder.trim().length < 2) errors.accountHolder = "Account holder name required.";
    if (!ACCOUNT_RE.test(form.accountNumber)) errors.accountNumber = "Account number must be 9–18 digits.";
    if (!IFSC_RE.test(form.ifsc.toUpperCase())) errors.ifsc = "Invalid IFSC (e.g. SBIN0001234).";
    if (form.bankName.trim().length < 2) errors.bankName = "Bank name required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step < 3) setStep((s) => (s + 1) as Step);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setSubmitting(true);
    setServerError("");

    const token = Cookies.get("access_token");
    try {
      const res = await fetch(`${API_BASE}/vendors/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          ...(form.about.trim() ? { about: form.about.trim() } : {}),
          ...(form.returnPolicy.trim() ? { returnPolicy: form.returnPolicy.trim() } : {}),
          ...(form.gstin ? { gstin: form.gstin.toUpperCase() } : {}),
          ...(form.pan ? { pan: form.pan.toUpperCase() } : {}),
          accountHolder: form.accountHolder.trim(),
          accountNumber: form.accountNumber,
          ifsc: form.ifsc.toUpperCase(),
          bankName: form.bankName.trim(),
        }),
      });

      if (res.status === 409) {
        setServerError(
          "A vendor with this business name already exists. Please use a different name.",
        );
        setStep(1);
        return;
      }
      if (res.status === 401) {
        router.push("/auth?next=/vendor/onboarding");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        setServerError(msg ?? "Something went wrong. Please try again.");
        return;
      }

      await refetch();
      router.push("/vendor");
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (vendorLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-extrabold text-primary">
            Sario
          </Link>
          <h1 className="mt-2 text-xl font-extrabold text-[#1A1A1A]">
            Become a Vendor
          </h1>
          <p className="mt-1 text-sm text-[#696969]">
            Set up your store in minutes and start selling sarees across India.
          </p>
        </div>

        {/* Progress stepper */}
        <div className="mb-8 flex items-center justify-between">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={n} className="flex flex-1 flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    done
                      ? "bg-primary text-white"
                      : active
                      ? "border-2 border-primary text-primary"
                      : "border-2 border-[#E8E8E8] text-[#9B9B9B]"
                  }`}
                >
                  {done ? "✓" : n}
                </div>
                <p
                  className={`mt-1.5 text-center text-[10px] font-semibold leading-tight ${
                    active ? "text-primary" : "text-[#9B9B9B]"
                  }`}
                >
                  {label}
                </p>
                {i < STEP_LABELS.length - 1 && (
                  <div className="absolute mt-4 hidden" />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
          <div className="bg-primary px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Step {step} of 3
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold text-white">
              {STEP_LABELS[step - 1]}
            </h2>
          </div>

          <div className="px-6 py-6 space-y-5">
            {serverError && (
              <div className="rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* ── Step 1: Business Details ── */}
            {step === 1 && (
              <>
                <Field
                  label="Business / Store Name *"
                  error={fieldErrors.businessName}
                  hint="This is the name buyers will see."
                >
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Kanjivaram Silks"
                    value={form.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                    className={inputCls(!!fieldErrors.businessName)}
                  />
                </Field>

                <Field label="About Your Store" hint="Tell buyers what makes your store special (optional).">
                  <textarea
                    rows={3}
                    maxLength={2000}
                    placeholder="Handloom sarees from Kanchipuram weavers, 3rd generation family…"
                    value={form.about}
                    onChange={(e) => set("about", e.target.value)}
                    className={inputCls(false) + " resize-none"}
                  />
                </Field>

                <Field label="Return Policy" hint="Buyers will see this on your product pages (optional).">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    placeholder="7-day return accepted for unused items in original packaging…"
                    value={form.returnPolicy}
                    onChange={(e) => set("returnPolicy", e.target.value)}
                    className={inputCls(false) + " resize-none"}
                  />
                </Field>
              </>
            )}

            {/* ── Step 2: KYC ── */}
            {step === 2 && (
              <>
                <div className="rounded-sm border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  KYC details are optional but help us verify your business faster and unlock
                  higher payout limits.
                </div>

                <Field label="GSTIN" error={fieldErrors.gstin} hint="15-character GST Identification Number.">
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="33AABCU9603R1ZV"
                    value={form.gstin}
                    onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                    className={inputCls(!!fieldErrors.gstin) + " font-mono tracking-wider"}
                  />
                </Field>

                <Field label="PAN" error={fieldErrors.pan} hint="10-character Permanent Account Number.">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    value={form.pan}
                    onChange={(e) => set("pan", e.target.value.toUpperCase())}
                    className={inputCls(!!fieldErrors.pan) + " font-mono tracking-wider"}
                  />
                </Field>

                <p className="text-xs text-[#9B9B9B]">
                  You can add this information later from your store profile.
                </p>
              </>
            )}

            {/* ── Step 3: Bank Account ── */}
            {step === 3 && (
              <>
                <div className="rounded-sm border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                  Payouts will be credited to this account every 7 days after order delivery.
                </div>

                <Field label="Account Holder Name *" error={fieldErrors.accountHolder}>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="As printed on your cheque/passbook"
                    value={form.accountHolder}
                    onChange={(e) => set("accountHolder", e.target.value)}
                    className={inputCls(!!fieldErrors.accountHolder)}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Account Number *" error={fieldErrors.accountNumber}>
                    <input
                      type="text"
                      maxLength={18}
                      placeholder="1234567890"
                      value={form.accountNumber}
                      onChange={(e) => set("accountNumber", e.target.value.replace(/\D/g, ""))}
                      className={inputCls(!!fieldErrors.accountNumber) + " font-mono tracking-wider"}
                    />
                  </Field>

                  <Field label="IFSC Code *" error={fieldErrors.ifsc}>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="SBIN0001234"
                      value={form.ifsc}
                      onChange={(e) => set("ifsc", e.target.value.toUpperCase())}
                      className={inputCls(!!fieldErrors.ifsc) + " font-mono tracking-wider"}
                    />
                  </Field>
                </div>

                <Field label="Bank Name *" error={fieldErrors.bankName}>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="State Bank of India"
                    value={form.bankName}
                    onChange={(e) => set("bankName", e.target.value)}
                    className={inputCls(!!fieldErrors.bankName)}
                  />
                </Field>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-[#F0F0F0] px-6 py-4">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={submitting}
                className="text-sm font-semibold text-[#696969] hover:text-primary transition-colors disabled:opacity-50"
              >
                ← Back
              </button>
            ) : (
              <Link href="/" className="text-sm font-semibold text-[#696969] hover:text-primary transition-colors">
                ← Cancel
              </Link>
            )}

            {step < 3 ? (
              <button
                onClick={goNext}
                className="rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="rounded-sm bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#9B9B9B]">
          Already a vendor?{" "}
          <Link href="/vendor" className="font-semibold text-primary hover:underline">
            Go to Dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return `w-full rounded-sm border px-3 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#C0C0C0] ${
    hasError
      ? "border-red-400 bg-red-50 focus:border-red-500"
      : "border-[#E8E8E8] bg-white focus:border-primary"
  }`;
}

function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-[#9B9B9B]">{hint}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface OnboardingData {
  businessName: string;
  about: string;
  returnPolicy: string;
  gstin: string;
  pan: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
}

const EMPTY: OnboardingData = {
  businessName: "", about: "", returnPolicy: "",
  gstin: "", pan: "",
  accountHolder: "", bankName: "", accountNumber: "", confirmAccountNumber: "", ifsc: "",
};

const STEPS = ["Business Info", "KYC Details", "Bank Account"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
              i < current ? "bg-primary text-white" :
              i === current ? "bg-primary text-white" :
              "bg-[#E8E8E8] text-[#9B9B9B]"
            }`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
              i === current ? "text-primary" : "text-[#9B9B9B]"
            }`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < current ? "bg-primary" : "bg-[#E8E8E8]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#4D4D4D]">{children}</label>;
}

function TextInput({ value, onChange, placeholder, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors resize-none"
    />
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: keyof OnboardingData) => (v: string) =>
    setData((prev) => ({ ...prev, [field]: v }));

  const validateStep = (): string => {
    if (step === 0 && !data.businessName.trim()) return "Business name is required.";
    if (step === 2) {
      if (!data.accountHolder.trim()) return "Account holder name is required.";
      if (!data.bankName.trim()) return "Bank name is required.";
      if (!/^\d{9,18}$/.test(data.accountNumber)) return "Enter a valid account number (9–18 digits).";
      if (data.accountNumber !== data.confirmAccountNumber) return "Account numbers do not match.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifsc)) return "Enter a valid IFSC code (e.g. SBIN0001234).";
    }
    return "";
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  };

  const submit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/vendors/apply", {
        method: "POST",
        body: JSON.stringify({
          businessName: data.businessName,
          about: data.about || undefined,
          returnPolicy: data.returnPolicy || undefined,
          gstin: data.gstin || undefined,
          pan: data.pan || undefined,
          accountHolder: data.accountHolder,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          ifsc: data.ifsc.toUpperCase(),
        }),
      });
      router.push("/vendor");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-2xl font-extrabold text-primary">Sario Vendor</p>
          <p className="mt-1 text-sm text-[#696969]">Complete your seller application</p>
        </div>

        <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm">
          <StepIndicator current={step} />

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <FieldLabel>Business Name *</FieldLabel>
                <TextInput value={data.businessName} onChange={set("businessName")} placeholder="Kanjivaram Silks" />
              </div>
              <div>
                <FieldLabel>About Your Store</FieldLabel>
                <Textarea value={data.about} onChange={set("about")} placeholder="Tell buyers about your craft, heritage, and speciality…" rows={4} />
              </div>
              <div>
                <FieldLabel>Return Policy</FieldLabel>
                <Textarea value={data.returnPolicy} onChange={set("returnPolicy")} placeholder="Returns accepted within 7 days of delivery…" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[#696969] mb-4">Both fields are optional. You can add these later from your profile.</p>
              <div>
                <FieldLabel>GSTIN (optional)</FieldLabel>
                <TextInput value={data.gstin} onChange={set("gstin")} placeholder="33AABCU9603R1ZV" maxLength={15} />
                <p className="mt-1 text-[10px] text-[#9B9B9B]">15-character GST Identification Number</p>
              </div>
              <div>
                <FieldLabel>PAN (optional)</FieldLabel>
                <TextInput value={data.pan} onChange={(v) => set("pan")(v.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
                <p className="mt-1 text-[10px] text-[#9B9B9B]">10-character Permanent Account Number</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <FieldLabel>Account Holder Name *</FieldLabel>
                <TextInput value={data.accountHolder} onChange={set("accountHolder")} placeholder="Kanjivaram Silks Pvt Ltd" />
              </div>
              <div>
                <FieldLabel>Bank Name *</FieldLabel>
                <TextInput value={data.bankName} onChange={set("bankName")} placeholder="State Bank of India" />
              </div>
              <div>
                <FieldLabel>Account Number *</FieldLabel>
                <TextInput value={data.accountNumber} onChange={set("accountNumber")} placeholder="1234567890" type="tel" />
              </div>
              <div>
                <FieldLabel>Confirm Account Number *</FieldLabel>
                <TextInput value={data.confirmAccountNumber} onChange={set("confirmAccountNumber")} placeholder="Re-enter account number" type="tel" />
              </div>
              <div>
                <FieldLabel>IFSC Code *</FieldLabel>
                <TextInput value={data.ifsc} onChange={(v) => set("ifsc")(v.toUpperCase())} placeholder="SBIN0001234" maxLength={11} />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => { setError(""); setStep((s) => s - 1); }}
                className="flex-1 rounded-xl border border-[#E8E8E8] py-2.5 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] transition-colors"
              >
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={next}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => { void submit(); }}
                disabled={loading}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? "Submitting…" : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

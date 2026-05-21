"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { useAuth, type User } from "@/hooks/use-auth";

type Step = "phone" | "otp";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDev = process.env.NODE_ENV === "development";
  const nextUrl = searchParams.get("next") ?? "/account/orders";

  const handleAuthSuccess = (data: { refreshToken: string; user: User }) => {
    login(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(nextUrl as any);
  };

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${cleanPhone}`, purpose: "LOGIN" }),
      });
      if (!res.ok) throw new Error("Could not send OTP. Check your number and try again.");
      setStep("otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${cleanPhone}`, otp, purpose: "LOGIN" }),
      });
      if (!res.ok) throw new Error("Invalid OTP. Please try again.");
      const data = (await res.json()) as { refreshToken: string; user: User };
      handleAuthSuccess(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const devLogin = async () => {
    const cleanPhone = phone.replace(/\D/g, "") || "9876543210";
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${cleanPhone}` }),
      });
      if (!res.ok) throw new Error("Dev login failed.");
      const data = (await res.json()) as { refreshToken: string; user: User };
      handleAuthSuccess(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Dev login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[80vh] bg-[#F5F5F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="overflow-hidden rounded-xl border border-[#E8E8E8] bg-white shadow-sm">
          {/* Purple header strip */}
          <div className="bg-primary px-6 py-8 text-white">
            <h1 className="text-2xl font-extrabold">Sario</h1>
            <p className="mt-1 text-sm opacity-90">
              {step === "phone"
                ? "Sign in or create your account"
                : `Enter the OTP sent to +91 ${phone}`}
            </p>
          </div>

          {/* Form body */}
          <div className="px-6 py-6">
            {step === "phone" ? (
              <form onSubmit={(e) => { void requestOtp(e); }} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                    Mobile Number
                  </label>
                  <div className="flex overflow-hidden rounded-xl border border-[#E8E8E8] focus-within:border-primary">
                    <span className="flex items-center border-r border-[#E8E8E8] bg-[#F5F5F5] px-3 text-sm font-medium text-[#4D4D4D]">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#E02B2B]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  id="request-otp-btn"
                  disabled={loading || phone.length < 10}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Sending OTP…" : "Continue"}
                </button>

                {isDev && (
                  <div className="pt-2 border-t border-dashed border-gray-100 mt-4">
                    <button
                      type="button"
                      id="dev-login-btn"
                      onClick={() => { void devLogin(); }}
                      className="w-full rounded-xl border border-primary text-primary py-2.5 text-xs font-bold hover:bg-primary/5 transition-colors"
                    >
                      🚀 Quick Dev Login
                    </button>
                    <p className="text-[10px] text-center text-gray-400 mt-1 uppercase font-bold tracking-tighter">Bypass OTP (Development Only)</p>
                  </div>
                )}

                <p className="text-center text-xs text-[#9B9B9B] mt-6">
                  By continuing, you agree to our{" "}
                  <Link href="/terms" className="text-primary hover:underline">Terms</Link> &amp;{" "}
                  <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </p>
              </form>
            ) : (
              <form onSubmit={(e) => { void verifyOtp(e); }} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                    One-Time Password
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    id="otp-input"
                    placeholder="· · · · · ·"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-[#1A1A1A] outline-none focus:border-primary"
                  />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#E02B2B]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  id="verify-otp-btn"
                  disabled={loading || otp.length < 4}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify & Sign In"}
                </button>

                <div className="flex items-center justify-between text-xs text-[#696969]">
                  <button
                    type="button"
                    onClick={() => { setStep("phone"); setError(""); setOtp(""); }}
                    className="hover:text-primary font-medium"
                  >
                    ← Change Number
                  </button>
                  <button
                    type="button"
                    onClick={() => { void requestOtp({ preventDefault: () => {} } as React.FormEvent); }}
                    className="hover:text-primary font-medium"
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#9B9B9B]">
          <Link href="/" className="hover:text-primary">← Back to Home</Link>
        </p>
      </div>
    </main>
  );
}

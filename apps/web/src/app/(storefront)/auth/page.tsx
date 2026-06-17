"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, type User } from "@/hooks/use-auth";

// OTP_DISABLED — phone/OTP imports kept for when OTP is re-enabled
// import { API_BASE } from "@/lib/api";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP_DISABLED — kept for re-enable
  // type Step = "phone" | "otp";
  // const [step, setStep] = useState<Step>("phone");
  // const [phone, setPhone] = useState("");
  // const [otp, setOtp] = useState("");

  const isDev = process.env.NODE_ENV === "development";
  const nextUrl = searchParams.get("next") ?? "/account/orders";

  const handleAuthSuccess = (data: { user: User }) => {
    login(data);
    if (data.user.role === "VENDOR") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push("/vendor" as any);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(nextUrl as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const endpoint = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" })) as { message?: string };
        throw new Error(err.message ?? (mode === "signup" ? "Could not create account" : "Invalid credentials"));
      }
      const data = (await res.json()) as { user: User };
      handleAuthSuccess(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // OTP_DISABLED — uncomment to re-enable OTP flow
  // const requestOtp = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   const cleanPhone = phone.replace(/\D/g, "");
  //   if (cleanPhone.length !== 10) {
  //     setError("Please enter a valid 10-digit mobile number.");
  //     return;
  //   }
  //   setLoading(true);
  //   setError("");
  //   try {
  //     const res = await fetch(`${API_BASE}/auth/otp/request`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ phone: `+91${cleanPhone}`, purpose: "LOGIN" }),
  //     });
  //     if (!res.ok) throw new Error("Could not send OTP. Check your number and try again.");
  //     setStep("otp");
  //   } catch (e: unknown) {
  //     setError(e instanceof Error ? e.message : "Something went wrong");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // OTP_DISABLED — uncomment to re-enable OTP flow
  // const verifyOtp = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   const cleanPhone = phone.replace(/\D/g, "");
  //   setLoading(true);
  //   setError("");
  //   try {
  //     const res = await fetch("/api/auth/login", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ phone: `+91${cleanPhone}`, otp, purpose: "LOGIN" }),
  //     });
  //     if (!res.ok) throw new Error("Invalid OTP. Please try again.");
  //     const data = (await res.json()) as { refreshToken: string; user: User };
  //     handleAuthSuccess(data);
  //   } catch (e: unknown) {
  //     setError(e instanceof Error ? e.message : "Something went wrong");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const devLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+919876543210" }),
      });
      if (!res.ok) throw new Error("Dev login failed.");
      const data = (await res.json()) as { user: User };
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
        <div className="overflow-hidden rounded-xl border border-[#E8E8E8] bg-white shadow-sm">
          <div className="bg-primary px-6 py-8 text-white">
            <h1 className="text-2xl font-extrabold">Sario</h1>
            <p className="mt-1 text-sm opacity-90">
              {mode === "signup" ? "Create your account" : "Sign in to your account"}
            </p>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={mode === "signup" ? 8 : 6}
                  placeholder={mode === "signup" ? "Min. 8 chars, 1 letter & 1 number" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary"
                />
              </div>

              {error && (
                <p role="alert" aria-live="assertive" className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#E02B2B]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading
                  ? mode === "signup" ? "Creating account…" : "Signing in…"
                  : mode === "signup" ? "Create Account" : "Sign In"}
              </button>

              <p className="text-center text-xs text-[#696969]">
                {mode === "signup" ? "Already have an account?" : "New to Sario?"}{" "}
                <button
                  type="button"
                  onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
                  className="font-bold text-primary hover:underline"
                >
                  {mode === "signup" ? "Sign in" : "Create an account"}
                </button>
              </p>

              {isDev && (
                <div className="pt-2 border-t border-dashed border-gray-100 mt-4">
                  <button
                    type="button"
                    id="dev-login-btn"
                    onClick={() => { void devLogin(); }}
                    className="w-full rounded-xl border border-primary text-primary py-2.5 text-xs font-bold hover:bg-primary/5 transition-colors"
                  >
                    Quick Dev Login
                  </button>
                  <p className="text-[10px] text-center text-gray-400 mt-1 uppercase font-bold tracking-tighter">Bypass Auth (Development Only)</p>
                </div>
              )}

              <p className="text-center text-xs text-[#9B9B9B] mt-6">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="text-primary hover:underline">Terms</Link> &amp;{" "}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#9B9B9B]">
          <Link href="/" className="hover:text-primary">← Back to Home</Link>
        </p>
      </div>
    </main>
  );
}

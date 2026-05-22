"use client";

import { useState } from "react";
import { setVendorToken, API_BASE } from "@/lib/api";

// OTP_DISABLED — kept for re-enable
// type Step = "phone" | "otp";

export default function VendorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP_DISABLED — kept for re-enable
  // const [step, setStep] = useState<Step>("phone");
  // const [phone, setPhone] = useState("");
  // const [otp, setOtp] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/vendor/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "Invalid credentials");
      }
      const data = (await res.json()) as { accessToken: string; vendor: { status: string } };
      if (data.vendor.status === "SUSPENDED") {
        throw new Error("Your vendor account has been suspended. Contact support.");
      }
      setVendorToken(data.accessToken);
      window.location.href = "/";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // OTP_DISABLED — uncomment to re-enable OTP flow
  // const requestOtp = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError("");
  //   try {
  //     const res = await fetch(`${API_BASE}/auth/otp/request`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ phone, purpose: "LOGIN" }),
  //     });
  //     if (!res.ok) {
  //       const body = (await res.json()) as { message?: string };
  //       throw new Error(body.message ?? "Failed to send OTP");
  //     }
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
  //   setLoading(true);
  //   setError("");
  //   try {
  //     const res = await fetch(`${API_BASE}/auth/otp/verify`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ phone, otp, purpose: "LOGIN" }),
  //     });
  //     if (!res.ok) {
  //       const body = (await res.json()) as { message?: string };
  //       throw new Error(body.message ?? "Invalid OTP");
  //     }
  //     const data = (await res.json()) as { accessToken: string };
  //     setVendorToken(data.accessToken);
  //     const vendorRes = await fetch(`${API_BASE}/vendors/me`, {
  //       headers: { Authorization: `Bearer ${data.accessToken}` },
  //     });
  //     if (!vendorRes.ok) {
  //       throw new Error("No vendor profile found. Please apply to become a vendor first.");
  //     }
  //     const vendor = (await vendorRes.json()) as { status: string };
  //     if (vendor.status === "SUSPENDED") {
  //       throw new Error("Your vendor account has been suspended. Contact support.");
  //     }
  //     window.location.href = "/";
  //   } catch (e: unknown) {
  //     setError(e instanceof Error ? e.message : "Something went wrong");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="h-5 w-5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Sario Vendor</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your vendor dashboard</p>
        </div>

        <form onSubmit={(e) => { void handleLogin(e); }} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <input
              type="password"
              minLength={6}
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

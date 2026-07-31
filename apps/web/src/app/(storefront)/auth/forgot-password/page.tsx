"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white shadow-sm">
        <div className="bg-primary px-6 py-8 text-white">
          <h1 className="text-xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-white/80">We&apos;ll email you a secure link to choose a new one.</p>
        </div>
        <div className="p-6">
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="rounded-xl bg-green-50 border border-green-100 px-3 py-3 text-sm text-green-700">
                If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
                Check your inbox and open the link within 1 hour.
              </p>
              <Link href="/auth" className="inline-block font-bold text-primary hover:underline">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-semibold text-[#4D4D4D]">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary"
                />
              </div>
              {error && (
                <p role="alert" aria-live="assertive" className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-[#E02B2B]">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <p className="text-center text-xs text-[#696969]">
                Remembered it?{" "}
                <Link href="/auth" className="font-bold text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

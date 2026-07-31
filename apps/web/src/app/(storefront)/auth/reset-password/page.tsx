"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password }) });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#F0F0F0] bg-white shadow-sm">
        <div className="bg-primary px-6 py-8 text-white">
          <h1 className="text-xl font-bold">Choose a new password</h1>
        </div>
        <div className="p-6">
          {!token ? (
            <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-3 text-sm text-[#E02B2B]">
              This reset link is missing its token. Please request a new one from the{" "}
              <Link href="/auth/forgot-password" className="font-bold underline">forgot password</Link> page.
            </p>
          ) : done ? (
            <div className="space-y-4 text-center">
              <p className="rounded-xl bg-green-50 border border-green-100 px-3 py-3 text-sm text-green-700">
                Your password has been reset. You&apos;ve been signed out of other devices for security.
              </p>
              <Link href="/auth" className="inline-block font-bold text-primary hover:underline">Sign in</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="pw" className="mb-1 block text-xs font-semibold text-[#4D4D4D]">New password</label>
                <input
                  id="pw"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 chars, 1 letter & 1 number"
                  className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1 block text-xs font-semibold text-[#4D4D4D]">Confirm password</label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
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
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F5F5F5]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

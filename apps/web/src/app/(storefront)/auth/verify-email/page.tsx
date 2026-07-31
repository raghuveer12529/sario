"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Status = "verifying" | "success" | "error";

function VerifyEmailInner() {
  const token = useSearchParams().get("token") ?? "";
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React StrictMode double-invoke
    ran.current = true;
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    apiFetch("/auth/email/verify", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "This link is invalid or has expired.");
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[#F0F0F0] bg-white p-8 text-center shadow-sm">
        {status === "verifying" && (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-[#696969]">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Email verified 🎉</h1>
            <p className="mt-2 text-sm text-[#696969]">Your account is now verified.</p>
            <Link href="/" className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">
              Continue shopping
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Verification failed</h1>
            <p className="mt-2 text-sm text-[#E02B2B]">{message}</p>
            <p className="mt-4 text-xs text-[#696969]">
              You can request a new link from your account once signed in.
            </p>
            <Link href="/auth" className="mt-6 inline-block font-bold text-primary hover:underline">Go to sign in</Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F5F5F5]" />}>
      <VerifyEmailInner />
    </Suspense>
  );
}

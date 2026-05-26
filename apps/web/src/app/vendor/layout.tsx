"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useVendor } from "@/hooks/use-vendor";
import { VendorNav } from "./_components/vendor-nav";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const { vendor, loading: vendorLoading, error: vendorError } = useVendor();
  const router = useRouter();
  const pathname = usePathname();

  const isOnboarding = pathname === "/vendor/onboarding";
  const loading = authLoading || vendorLoading;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || vendorError === "unauthorized") {
      router.push("/auth?next=/vendor");
      return;
    }
    if (!isOnboarding && (!vendor || vendor.status === "DRAFT")) {
      router.push("/vendor/onboarding");
    }
  }, [loading, isAuthenticated, vendor, vendorError, isOnboarding, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (isOnboarding && (!vendor || vendor.status === "DRAFT")) {
    return <>{children}</>;
  }

  if (!vendor || vendor.status === "DRAFT") return null;

  if (vendor.status === "PENDING") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
        <div className="w-full max-w-md rounded-xl border border-[#F0F0F0] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 text-3xl">⏳</div>
          <h1 className="text-xl font-extrabold text-[#1A1A1A]">Application Under Review</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#696969]">
            The Sario team is reviewing your application. You&apos;ll be notified via email once approved — this typically takes 1–2 business days.
          </p>
        </div>
      </div>
    );
  }

  if (vendor.status === "SUSPENDED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
        <div className="w-full max-w-md rounded-xl border border-[#F0F0F0] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">🚫</div>
          <h1 className="text-xl font-extrabold text-[#1A1A1A]">Account Suspended</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#696969]">
            Your vendor account has been suspended. Please contact{" "}
            <a href="mailto:support@sario.in" className="text-primary hover:underline">support@sario.in</a>{" "}
            for assistance.
          </p>
          <button
            onClick={() => { void logout(); }}
            className="mt-6 rounded-xl border border-red-200 px-6 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <VendorNav vendor={vendor} />
      <main className="lg:ml-56 pb-20 lg:pb-0">
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

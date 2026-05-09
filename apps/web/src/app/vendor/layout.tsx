"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useVendor } from "@/hooks/use-vendor";

// ─── Icons ────────────────────────────────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function ProductsIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}
function ReturnsIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function BanIcon() {
  return (
    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/vendor" as const, label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/vendor/products" as const, label: "Products", icon: ProductsIcon },
  { href: "/vendor/orders" as const, label: "Orders", icon: OrdersIcon },
  { href: "/vendor/returns" as const, label: "Returns", icon: ReturnsIcon },
  { href: "/vendor/profile" as const, label: "Store Profile", icon: ProfileIcon },
];

// ─── Pending / Suspended screens ──────────────────────────────────────────────

function PendingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-yellow-50 text-yellow-500">
          <ClockIcon />
        </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Application Under Review</h1>
        <p className="mt-3 text-sm text-[#696969] leading-relaxed">
          We've received your vendor application and our team is verifying your details.
          This usually takes 1–2 business days.
        </p>
        <p className="mt-4 text-xs text-[#9B9B9B]">
          You'll receive an SMS once your account is approved.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="inline-block rounded-sm bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Browse the Marketplace
          </Link>
          <Link
            href="/auth"
            className="text-xs text-[#696969] hover:text-primary transition-colors"
          >
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}

function SuspendedScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
          <BanIcon />
        </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Account Suspended</h1>
        <p className="mt-3 text-sm text-[#696969] leading-relaxed">
          Your vendor account has been suspended. Please contact our support team to
          understand next steps and resolve any outstanding issues.
        </p>
        <div className="mt-8">
          <a
            href="mailto:support@sario.in"
            className="inline-block rounded-sm bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────

function SidebarNav({
  vendor,
  user,
  onClose,
  onLogout,
}: {
  vendor: { businessName: string } | null;
  user: { name?: string; phone?: string } | null;
  onClose?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-[#F0F0F0] px-5 py-4">
        <div>
          <Link href="/vendor" className="text-xl font-extrabold text-primary" {...(onClose ? { onClick: onClose } : {})}>
            Sario
          </Link>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9B9B9B]">
            Vendor Portal
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[#696969] hover:text-primary lg:hidden" aria-label="Close menu">
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Store name pill */}
      {vendor && (
        <div className="mx-4 mt-4 rounded-sm bg-secondary/60 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9B9B9B]">Your Store</p>
          <p className="mt-0.5 truncate text-sm font-bold text-[#1A1A1A]">{vendor.businessName}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              {...(onClose ? { onClick: onClose } : {})}
              className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "text-[#4D4D4D] hover:bg-[#F5F5F5] hover:text-primary"
              }`}
            >
              <item.icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user area */}
      <div className="border-t border-[#F0F0F0] px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">
            {(user?.name ?? user?.phone ?? "V")[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#1A1A1A]">
              {user?.name ?? "Vendor"}
            </p>
            <p className="truncate text-xs text-[#9B9B9B]">{user?.phone}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-[#696969] hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogoutIcon />
          Sign out
        </button>
        <Link
          href="/"
          className="mt-1 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-[#696969] hover:bg-[#F5F5F5] hover:text-primary transition-colors"
        >
          ← Back to Storefront
        </Link>
      </div>
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, logout } = useAuth();
  const { vendor, loading: vendorLoading } = useVendor();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isOnboarding = pathname === "/vendor/onboarding";

  useEffect(() => {
    if (authLoading || vendorLoading) return;

    if (!user) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isOnboarding) {
      if (!vendor || vendor.status === "DRAFT") {
        router.push("/vendor/onboarding");
      }
    }
  }, [authLoading, vendorLoading, user, vendor, isOnboarding, pathname, router]);

  if (authLoading || vendorLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  if (vendor?.status === "PENDING" && !isOnboarding) return <PendingScreen />;
  if (vendor?.status === "SUSPENDED") return <SuspendedScreen />;

  if (isOnboarding) {
    return <div className="min-h-screen bg-[#F5F5F5]">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#F5F5F5]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-[#E8E8E8] bg-white lg:flex lg:flex-col">
        <SidebarNav vendor={vendor} user={user} onLogout={logout} />
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col bg-white shadow-xl">
            <SidebarNav
              vendor={vendor}
              user={user}
              onClose={() => setDrawerOpen(false)}
              onLogout={() => { logout(); setDrawerOpen(false); }}
            />
          </aside>
        </div>
      )}

      {/* Content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-[#E8E8E8] bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-sm p-1.5 text-[#4D4D4D] hover:text-primary"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <span className="text-base font-extrabold text-primary">Sario</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white">
            {(user?.name ?? user?.phone ?? "V")[0]?.toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

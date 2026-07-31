"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import type { Vendor } from "@/hooks/use-vendor";

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/vendor", label: "Dashboard", Icon: GridIcon, exact: true },
  { href: "/vendor/products", label: "Products", Icon: TagIcon, exact: false },
  { href: "/vendor/orders", label: "Orders", Icon: PackageIcon, exact: false },
  { href: "/vendor/returns", label: "Returns", Icon: RefreshIcon, exact: false },
  { href: "/vendor/profile", label: "Profile", Icon: UserIcon, exact: false },
] as const;

export function VendorNav({ vendor }: { vendor: Vendor }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-56 bg-white border-r border-[#F0F0F0] z-30">
        <div className="px-4 py-5 border-b border-[#F0F0F0]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">Sario Vendor</p>
          <p className="mt-1 text-lg font-extrabold text-[#1A1A1A] leading-tight">{vendor.businessName}</p>
          <span className="mt-2 inline-block rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 uppercase tracking-wide">
            Approved
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-[#4D4D4D] hover:bg-[#F5F5F5] font-medium"
                }`}
              >
                <item.Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#F0F0F0]">
          <button
            onClick={() => { void logout(); }}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOutIcon className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex bg-white border-t border-[#F0F0F0] lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-colors ${
                active ? "text-primary" : "text-[#9B9B9B]"
              }`}
            >
              <item.Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

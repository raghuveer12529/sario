"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

function DashboardIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function VendorsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function ProductsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
function ReturnsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const navItems = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon },
  { href: "/vendors", label: "Vendors", Icon: VendorsIcon },
  { href: "/products", label: "Products", Icon: ProductsIcon },
  { href: "/orders", label: "Orders", Icon: OrdersIcon },
  { href: "/returns", label: "Returns", Icon: ReturnsIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/login");
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-300 lg:static lg:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="h-4 w-4">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-black tracking-tight text-gray-900">Sario<span className="text-primary">Admin</span></span>
          </div>
          <button className="lg:hidden p-1 text-gray-400" onClick={() => setIsMobileMenuOpen(false)}>
            <XIcon />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          <p className="px-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Main Menu</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 group ${
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/10"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className={`transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-primary"}`}>
                  <item.Icon />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-6">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header / Top-bar */}
        <header className="h-16 shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between lg:justify-end">
          <button className="lg:hidden p-2 -ml-2 text-gray-600" onClick={() => setIsMobileMenuOpen(true)}>
            <MenuIcon />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-gray-900">Admin User</p>
              <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">Super Admin</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="avatar" />
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

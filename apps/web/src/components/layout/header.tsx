"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

const NAV_CATEGORIES = [
  "Sarees", "Kanjivaram", "Banarasi", "Pochampally", "Chanderi",
  "Mysore Silk", "Tussar", "Patola", "Sambalpuri",
];

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-[#F0F0F0]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 text-2xl font-extrabold text-primary tracking-tight mr-2">
          Sario
        </Link>

        <form action="/search" className="flex-1">
          <div className="flex items-center gap-2 rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] px-3 py-2.5 transition-colors focus-within:border-primary focus-within:bg-white">
            <span className="text-[#9B9B9B]"><SearchIcon /></span>
            <input
              name="q"
              type="search"
              placeholder="Try Kanjivaram, Banarasi, Silk…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9B9B9B]"
            />
          </div>
        </form>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href={isAuthenticated ? "/account/orders" : "/auth"}
            aria-label={isAuthenticated ? "My Orders" : "Sign In"}
            className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[#4D4D4D] transition-colors hover:text-primary"
          >
            <PersonIcon />
            <span className="text-[10px] font-semibold hidden sm:block">Orders</span>
          </Link>
          <Link
            href="/cart"
            aria-label="Shopping Cart"
            className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[#4D4D4D] transition-colors hover:text-primary"
          >
            <CartIcon />
            <span className="text-[10px] font-semibold hidden sm:block">Cart</span>
          </Link>
          
          {isAuthenticated ? (
            <div className="relative ml-1 sm:ml-2">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                aria-haspopup="true"
                aria-expanded={showDropdown}
                aria-label="User menu"
                className="flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-1.5 py-1 sm:px-2 transition-colors hover:border-primary focus:outline-none"
              >
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name ?? "User"} 
                    className="h-6 w-6 sm:h-7 sm:w-7 rounded-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style");
                    }}
                  />
                ) : null}
                {(!user?.avatarUrl) ? (
                  <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] sm:text-xs font-bold text-primary uppercase">
                    {user?.name?.[0] ?? user?.phone?.slice(-2) ?? "U"}
                  </div>
                ) : (
                  <div style={{ display: "none" }} className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] sm:text-xs font-bold text-primary uppercase">
                    {user?.name?.[0] ?? user?.phone?.slice(-2) ?? "U"}
                  </div>
                )}
                <span className="hidden text-sm font-semibold text-[#1A1A1A] lg:block">
                  {user?.name?.split(" ")[0] ?? "Account"}
                </span>
                <svg className={`h-4 w-4 text-[#9B9B9B] transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowDropdown(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#E8E8E8] bg-white py-1 shadow-lg z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2.5 border-b border-[#F0F0F0] bg-gray-50/50">
                      <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-wider">Account</p>
                      <p className="text-sm font-bold text-[#1A1A1A] truncate">{user?.name || user?.phone}</p>
                    </div>
                    <Link
                      href="/account/orders"
                      className="block px-4 py-2.5 text-sm text-[#4D4D4D] hover:bg-[#F5F5F5] hover:text-primary transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/account/profile"
                      className="block px-4 py-2.5 text-sm text-[#4D4D4D] hover:bg-[#F5F5F5] hover:text-primary transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      Profile Settings
                    </Link>
                    <div className="border-t border-[#F0F0F0] mt-1">
                      <button
                        onClick={() => { logout(); setShowDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="ml-1 sm:ml-2 rounded-lg border border-primary px-3 py-1.5 text-xs sm:text-sm font-bold text-primary transition-all hover:bg-primary hover:text-white active:scale-95"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>

      <div className="border-t border-[#F0F0F0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2 scrollbar-none sm:px-6 lg:px-8">
          {NAV_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/search?q=${encodeURIComponent(cat)}`}
              className="shrink-0 text-sm font-medium text-[#4D4D4D] transition-colors hover:text-primary whitespace-nowrap"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

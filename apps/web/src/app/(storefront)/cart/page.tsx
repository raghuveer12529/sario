"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";
import { useAuth } from "@/hooks/use-auth";

interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  pricePaise: number;
  variant: {
    id: string;
    name: string;
    sku: string;
    product: { name: string; slug: string };
    images: Array<{ url: string }>;
    inventory: { quantity: number; reservedQuantity: number };
  };
}

interface Cart {
  id: string;
  items: CartItem[];
  summary: {
    subtotalPaise: number;
    shippingPaise: number;
    totalPaise: number;
    itemCount: number;
    freeShippingThreshold: number;
  };
}

function CartIcon() {
  return (
    <svg className="mx-auto h-16 w-16 text-gray-200" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  );
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setLoading(false); return; }
    
    void apiFetch<Cart>("/cart")
      .then(setCart)
      .catch((err) => setError(err.message || "Could not load cart. Please refresh."))
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading]);

  const updateQty = async (variantId: string, quantity: number, max: number) => {
    if (quantity > max && quantity !== 0) return; // Prevent exceeding stock
    
    setUpdatingId(variantId);
    setError(null);
    try {
      let updated: Cart;
      if (quantity < 1) {
        updated = await apiFetch<Cart>(`/cart/items/${variantId}`, { method: "DELETE" });
      } else {
        updated = await apiFetch<Cart>(`/cart/items/${variantId}`, {
          method: "PATCH",
          body: JSON.stringify({ quantity }),
        });
      }
      setCart(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update cart.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="bg-[#F5F5F5] min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-[#F0F0F0] bg-white" />
          ))}
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="bg-[#F5F5F5] min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-[#F0F0F0] bg-white p-8 text-center shadow-sm">
          <CartIcon />
          <h1 className="mt-4 text-xl font-bold text-[#1A1A1A]">Your cart is waiting</h1>
          <p className="mt-2 text-sm text-[#696969]">Sign in to see the items you've added and complete your purchase.</p>
          <Link
            href="/auth"
            className="mt-8 block rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            Sign In to Cart
          </Link>
          <Link href="/" className="mt-4 block text-sm font-bold text-primary hover:underline">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  const items = cart?.items ?? [];
  const summary = cart?.summary ?? { subtotalPaise: 0, shippingPaise: 0, totalPaise: 0, itemCount: 0, freeShippingThreshold: 200000 };
  
  const subtotal = summary.subtotalPaise;
  const shipping = summary.shippingPaise;
  const total = summary.totalPaise;
  const threshold = summary.freeShippingThreshold;

  const hasOutOfStock = items.some(i => (i.variant.inventory.quantity - i.variant.inventory.reservedQuantity) < i.quantity);

  if (!items.length) {
    return (
      <main className="bg-[#F5F5F5] min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-[#F0F0F0] bg-white p-10 text-center shadow-sm">
          <CartIcon />
          <h1 className="mt-6 text-2xl font-bold text-[#1A1A1A]">Cart is empty</h1>
          <p className="mt-2 text-sm text-[#696969]">Your favorite sarees are waiting to be picked up!</p>
          <Link
            href="/"
            className="mt-8 block rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            Start Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#F5F5F5] min-h-screen pb-12">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Shopping Cart</h1>
          <p className="text-sm text-[#696969] mt-0.5">{items.length} product{items.length !== 1 ? "s" : ""} selected</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 animate-in slide-in-from-top-2">
            <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const isUpdating = updatingId === item.variantId;
              const avail = item.variant.inventory.quantity - item.variant.inventory.reservedQuantity;
              const isOutOfStock = avail < item.quantity;
              
              return (
                <div key={item.id} className={`group flex gap-4 rounded-2xl border border-[#F0F0F0] bg-white p-4 shadow-sm transition-all hover:shadow-md ${isUpdating ? "opacity-60 grayscale" : ""} ${isOutOfStock ? "border-red-200 bg-red-50/20" : ""}`}>
                  <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100 shadow-inner">
                    {item.variant.images[0] && (
                      <Image
                        src={item.variant.images[0].url}
                        alt={item.variant.product.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">Limited Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 min-w-0 py-1">
                    <div className="flex justify-between items-start gap-2">
                      <Link
                        href={`/p/${item.variant.product.slug}`}
                        className="text-base font-bold text-[#1A1A1A] leading-tight hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.variant.product.name}
                      </Link>
                      <p className="shrink-0 text-base font-extrabold text-primary">
                        {formatPaise(item.pricePaise * item.quantity)}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-[#696969]">{item.variant.name}</p>
                    <p className="text-xs text-[#9B9B9B] mt-1 font-mono uppercase tracking-tighter">SKU: {item.variant.sku}</p>
                    
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm">
                          <button
                            onClick={() => { void updateQty(item.variantId, item.quantity - 1, avail); }}
                            disabled={isUpdating}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-primary transition-colors disabled:opacity-30"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 12H4" /></svg>
                          </button>
                          <span className="w-8 text-center text-sm font-extrabold text-[#1A1A1A]">{item.quantity}</span>
                          <button
                            onClick={() => { void updateQty(item.variantId, item.quantity + 1, avail); }}
                            disabled={isUpdating || item.quantity >= avail}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-primary transition-colors disabled:opacity-30"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                          </button>
                        </div>
                        <button
                          onClick={() => { void updateQty(item.variantId, 0, avail); }}
                          disabled={isUpdating}
                          className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      
                      {isOutOfStock && (
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">
                          {avail === 0 ? "Out of Stock" : `Only ${avail} available`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order summary */}
          <div className="h-fit sticky top-24 space-y-4">
            <div className="rounded-2xl border border-[#F0F0F0] bg-white shadow-sm overflow-hidden">
              <div className="border-b border-[#F0F0F0] bg-gray-50/50 px-6 py-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#9B9B9B]">Order Summary</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#696969]">Items ({items.length})</span>
                  <span className="font-bold text-[#1A1A1A]">{formatPaise(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#696969]">Shipping</span>
                  <span className={shipping === 0 ? "font-bold text-[#26A541]" : "font-bold text-[#1A1A1A]"}>
                    {shipping === 0 ? "FREE" : formatPaise(shipping)}
                  </span>
                </div>
                <div className="border-t border-dashed border-gray-100 pt-4 flex justify-between items-center">
                  <span className="text-base font-bold text-[#1A1A1A]">Total</span>
                  <span className="text-xl font-extrabold text-primary">{formatPaise(total)}</span>
                </div>
                
                {subtotal < threshold && subtotal > 0 && (
                  <p className="text-[10px] font-medium text-[#696969] text-center bg-gray-50 rounded-lg py-2">
                    Add {formatPaise(threshold - subtotal)} more for <span className="font-bold text-primary">FREE SHIPPING</span>
                  </p>
                )}
              </div>
              <div className="px-6 pb-6">
                {hasOutOfStock ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center">
                    <p className="text-sm font-bold text-red-700">Some items exceed available stock</p>
                    <p className="mt-1 text-xs text-red-500">Reduce quantities above before proceeding</p>
                  </div>
                ) : (
                  <Link
                    href="/checkout"
                    className="block w-full rounded-xl bg-primary py-4 text-center text-sm font-extrabold text-white shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
                  >
                    Proceed to Checkout
                  </Link>
                )}
                {hasOutOfStock && (
                  <p className="mt-3 text-center text-[10px] font-bold text-red-500 uppercase tracking-tight">
                    Some items exceed available stock
                  </p>
                )}
              </div>
            </div>
            
            {/* Trust Badges */}
            <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#1A1A1A] uppercase tracking-wider">Secure Payment</p>
                  <p className="text-[10px] text-[#696969]">128-bit SSL Encryption</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 011 1v-7a1 1 0 011-1h3.05a2.5 2.5 0 014.9 0H21a1 1 0 001-1V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0015.586 3H13V2a1 1 0 00-1-1H4a1 1 0 00-1 1v2zm0 2h8v4H3V6z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#1A1A1A] uppercase tracking-wider">Fast Delivery</p>
                  <p className="text-[10px] text-[#696969]">Shiprocket Partnered</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

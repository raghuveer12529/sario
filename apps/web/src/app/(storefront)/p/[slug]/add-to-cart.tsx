"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";

interface Variant {
  id: string;
  name: string;
  pricePaise: number;
  mrpPaise: number;
  color?: string;
  inventory: { quantity: number; reservedQuantity: number };
}

export function AddToCart({ variants }: { variants: Variant[] }) {
  const router = useRouter();

  // Find first available variant or default to first
  const firstAvailable = variants.find(v => (v.inventory.quantity - v.inventory.reservedQuantity) > 0) || variants[0];
  const [selectedId, setSelectedId] = useState<string>(firstAvailable?.id ?? "");
  
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingBuy, setLoadingBuy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === selectedId);
  const lowestPrice = Math.min(...variants.map((v) => v.pricePaise));
  const highestMrp = Math.max(...variants.map((v) => v.mrpPaise));
  
  const price = selected?.pricePaise ?? lowestPrice;
  const mrp = selected?.mrpPaise ?? highestMrp;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const selectedAvailable = selected
    ? selected.inventory.quantity - selected.inventory.reservedQuantity
    : 0;

  const doAdd = async (): Promise<boolean> => {
    if (!selectedId) return false;
    setError(null);
    // Works for guests too — the cart is anonymous until login, then merged.
    await apiFetch("/cart/items", {
      method: "POST",
      body: JSON.stringify({ variantId: selectedId, quantity: 1 }),
    });
    return true;
  };

  const handleAdd = async () => {
    setLoadingAdd(true);
    try {
      const ok = await doAdd();
      if (ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to cart. Please try again.");
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleBuy = async () => {
    setLoadingBuy(true);
    try {
      const ok = await doAdd();
      if (ok) router.push("/checkout");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoadingBuy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pricing */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-extrabold text-primary">
            {formatPaise(price)}
          </span>
          {discount > 0 && (
            <span className="text-lg text-[#9B9B9B] line-through">
              {formatPaise(mrp)}
            </span>
          )}
          {discount > 0 && (
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-[#26A541] border border-green-100">
              {discount}% OFF
            </span>
          )}
        </div>
        {discount > 0 && (
          <p className="text-sm font-medium text-[#26A541]">
            Inclusive of all taxes · Save {formatPaise(mrp - price)}
          </p>
        )}
      </div>

      {/* Stock state */}
      <div className="flex items-center gap-2">
        {selectedAvailable === 0 ? (
          <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-[#E02B2B] border border-red-100">
            <span className="h-2 w-2 rounded-full bg-[#E02B2B]"></span>
            Out of Stock
          </div>
        ) : selectedAvailable <= 3 ? (
          <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#E8590C] border border-orange-100 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-[#E8590C]"></span>
            Hurry, only {selectedAvailable} left!
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-[#26A541] border border-green-100">
            <span className="h-2 w-2 rounded-full bg-[#26A541]"></span>
            In Stock
          </div>
        )}
      </div>

      {/* Variant picker */}
      {variants.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-[#1A1A1A]">Select Color/Style</p>
            {selected?.color && <span className="text-xs font-medium text-[#696969]">{selected.color}</span>}
          </div>
          <div className="flex flex-wrap gap-3">
            {variants.map((v) => {
              const avail = v.inventory.quantity - v.inventory.reservedQuantity;
              const isSelected = selectedId === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => { setSelectedId(v.id); setError(null); }}
                  disabled={avail <= 0}
                  className={`group relative flex items-center gap-2 rounded-xl border-2 p-2 transition-all disabled:opacity-40 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-[#F0F0F0] hover:border-primary/50"
                  }`}
                >
                  {v.color && (
                    <span 
                      className="h-5 w-5 rounded-full border border-gray-200 shadow-inner" 
                      style={{ backgroundColor: v.color.toLowerCase().replace(/ /g, "") }}
                    />
                  )}
                  <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-[#4D4D4D]"}`}>
                    {v.name}
                  </span>
                  {isSelected && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white shadow-sm">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline error */}
      {error && (
        <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-600">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* CTA buttons — sticky on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex gap-3 bg-white/80 p-4 backdrop-blur-md border-t border-[#F0F0F0] sm:relative sm:bg-transparent sm:p-0 sm:border-0 sm:backdrop-blur-none">
        <button
          onClick={() => { void handleAdd(); }}
          disabled={loadingAdd || loadingBuy || !selectedId || selectedAvailable === 0}
          className="flex-1 rounded-xl border-2 border-primary bg-white py-4 text-sm font-extrabold text-primary transition-all hover:bg-primary hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-primary active:scale-95"
        >
          {loadingAdd ? "ADDING..." : added ? "✓ ADDED" : "ADD TO CART"}
        </button>
        <button
          onClick={() => { void handleBuy(); }}
          disabled={loadingAdd || loadingBuy || !selectedId || selectedAvailable === 0}
          className="flex-1 rounded-xl bg-primary py-4 text-sm font-extrabold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:shadow-none"
        >
          {loadingBuy ? "LOADING..." : "BUY NOW"}
        </button>
      </div>
      
      {/* Spacer for sticky mobile buttons */}
      <div className="h-20 sm:hidden"></div>

      {added && (
        <div className="flex items-center justify-between rounded-xl border border-[#26A541] bg-[#F0FFF4] px-5 py-4 text-sm shadow-sm animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 font-bold text-[#26A541]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Added to your cart
          </div>
          <Link href="/cart" className="text-xs font-extrabold uppercase tracking-widest text-[#26A541] hover:underline">View Cart →</Link>
        </div>
      )}
    </div>
  );
}

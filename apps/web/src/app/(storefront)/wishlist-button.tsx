"use client";

import { useState } from "react";

export function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const list: string[] = JSON.parse(localStorage.getItem("sario_wishlist") ?? "[]");
      return list.includes(productId);
    } catch {
      return false;
    }
  });

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list: string[] = JSON.parse(localStorage.getItem("sario_wishlist") ?? "[]");
    const next = saved ? list.filter((id) => id !== productId) : [...list, productId];
    localStorage.setItem("sario_wishlist", JSON.stringify(next));
    setSaved(!saved);
  };

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={className ?? "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"}
    >
      <svg
        className={`h-4 w-4 transition-colors ${saved ? "fill-primary stroke-primary" : "fill-none stroke-[#696969]"}`}
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  );
}

"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  primaryImageUrl?: string | undefined;
  price: number;       // paise
  mrp?: number | undefined;        // paise
  vendorName?: string | undefined;
  vendorSlug?: string | undefined;
  fabric?: string | undefined;
  region?: string | undefined;
  avgRating?: number | undefined;
  reviewCount?: number | undefined;
  colors?: string[] | undefined;   // hex values
  isNew?: boolean | undefined;
  sizes?: string | undefined;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className="h-[9px] w-[9px]"
          viewBox="0 0 24 24"
          fill={n <= Math.round(rating) ? "#F59E0B" : "#E5E7EB"}
          stroke="none"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export function ProductCard({
  id,
  name,
  slug,
  primaryImageUrl,
  price,
  mrp = 0,
  vendorName,
  vendorSlug,
  fabric,
  region,
  avgRating,
  reviewCount = 0,
  colors = [],
  isNew = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
}: ProductCardProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const list: string[] = JSON.parse(localStorage.getItem("sario_wishlist") ?? "[]");
      return list.includes(id);
    } catch {
      return false;
    }
  });
  const [heartBeat, setHeartBeat] = useState(false);

  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const savingsPaise = mrp > price ? mrp - price : 0;

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list: string[] = JSON.parse(localStorage.getItem("sario_wishlist") ?? "[]");
    const next = saved ? list.filter((i) => i !== id) : [...list, id];
    localStorage.setItem("sario_wishlist", JSON.stringify(next));
    setSaved(!saved);
    setHeartBeat(true);
    setTimeout(() => setHeartBeat(false), 500);
  };

  const goToVendor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (vendorSlug) router.push(`/weavers/${vendorSlug}` as Route);
  };

  return (
    <motion.div
      className="group relative h-full"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
    >
      <Link
        href={`/p/${slug}` as Route}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#EDE8E3] bg-[#FDFCFB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-[box-shadow,border-color] duration-300 hover:border-[#DACED4] hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)]"
      >
        {/* ── Image ─────────────────────────────────────── */}
        <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F0EB]">
          {primaryImageUrl ? (
            <Image
              src={primaryImageUrl}
              alt={name}
              fill
              sizes={sizes}
              className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5">
              <svg
                className="h-9 w-9 text-[#D5C9C0]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#C5B8AF]">
                No Image
              </span>
            </div>
          )}

          {/* Subtle bottom vignette */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/15 to-transparent" />

          {/* ── Discount ribbon ───────────────────────── */}
          {discount > 0 && (
            <div className="absolute left-0 top-3.5">
              <span className="inline-flex items-center rounded-r-full bg-[#6B1414] px-2.5 py-[3.5px] text-[8.5px] font-extrabold uppercase tracking-[0.1em] text-[#FBBF24] shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
                {discount}% OFF
              </span>
            </div>
          )}

          {/* ── New tag (only when no discount) ───────── */}
          {isNew && !discount && (
            <div className="absolute left-0 top-3.5">
              <span className="inline-flex items-center rounded-r-full bg-[#1E0533] px-2.5 py-[3.5px] text-[8.5px] font-extrabold uppercase tracking-[0.1em] text-white/90 shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
                NEW
              </span>
            </div>
          )}
        </div>

        {/* ── Content ───────────────────────────────────── */}
        <div className="flex flex-1 flex-col px-3 pt-2.5 pb-3">
          {/* Product name */}
          <p className="font-display line-clamp-2 text-[13px] font-semibold leading-snug text-[#1A1A1A]">
            {name}
          </p>

          {/* Vendor */}
          {vendorName && vendorSlug && (
            <button
              onClick={goToVendor}
              className="mt-[3px] block w-full truncate text-left text-[10px] font-medium text-[#A89080] transition-colors hover:text-primary"
            >
              by {vendorName}
            </button>
          )}

          {/* Rating */}
          {avgRating !== undefined && reviewCount > 0 && (
            <div className="mt-1 flex items-center gap-1.5">
              <StarRow rating={avgRating} />
              <span className="text-[10px] font-medium text-[#9B9B9B]">
                {avgRating.toFixed(1)}{" "}
                <span className="font-normal text-[#BBBBBB]">
                  ({reviewCount.toLocaleString("en-IN")})
                </span>
              </span>
            </div>
          )}

          {/* Fabric / region metadata */}
          {(fabric || region) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {fabric && (
                <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2 py-[2.5px] text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#92400E]">
                  {fabric}
                </span>
              )}
              {region && (
                <span className="text-[9px] font-medium text-[#C0B0A8]">
                  • {region}
                </span>
              )}
            </div>
          )}

          {/* ── Price block ───────────────────────────── */}
          <div className="mt-auto pt-2 space-y-0.5">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[15px] font-bold tracking-tight text-[#1A1A1A]">
                ₹{Math.round(price / 100).toLocaleString("en-IN")}
              </span>
              {discount > 0 && (
                <span className="text-[11px] font-normal text-[#BABABA] line-through">
                  ₹{Math.round(mrp / 100).toLocaleString("en-IN")}
                </span>
              )}
            </div>
            {savingsPaise > 0 && (
              <p className="text-[10px] font-semibold text-emerald-700">
                You save ₹{Math.round(savingsPaise / 100).toLocaleString("en-IN")}
              </p>
            )}
          </div>

          {/* Color swatches */}
          {colors.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              {colors.slice(0, 5).map((hex, i) => (
                <span
                  key={i}
                  className="h-[10px] w-[10px] rounded-full ring-1 ring-black/10 ring-offset-1"
                  style={{ backgroundColor: hex }}
                />
              ))}
              {colors.length > 5 && (
                <span className="text-[9px] font-medium text-[#AAAAAA]">
                  +{colors.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Free delivery */}
          <p className="mt-1.5 text-[10px] font-semibold text-emerald-700">Free Delivery</p>
        </div>
      </Link>

      {/* ── Wishlist button ───────────────────────────── */}
      <motion.button
        onClick={toggleWishlist}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        className="absolute right-2.5 top-2.5 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/92 shadow-[0_2px_8px_rgba(0,0,0,0.14)] backdrop-blur-[6px]"
        animate={heartBeat ? { scale: [1, 1.4, 0.85, 1.1, 1] } : { scale: 1 }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <svg
          className="h-[14px] w-[14px] transition-all duration-200"
          viewBox="0 0 24 24"
          strokeWidth="2"
          style={{
            fill: saved ? "hsl(var(--primary))" : "transparent",
            stroke: saved ? "hsl(var(--primary))" : "#9B9B9B",
          }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      </motion.button>
    </motion.div>
  );
}

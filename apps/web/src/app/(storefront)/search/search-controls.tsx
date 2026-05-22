"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState, useEffect } from "react";

const SORT_OPTIONS = [
  { label: "Relevance", value: "" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Newest First", value: "newest" },
];

const FABRIC_FILTERS = [
  "Kanjivaram", "Banarasi", "Pochampally", "Chanderi",
  "Mysore Silk", "Tussar", "Patola", "Sambalpuri",
];

const OCCASION_FILTERS = [
  "Wedding", "Reception", "Festival", "Puja",
  "Navratri", "Office", "Casual",
];

interface SearchControlsProps {
  q: string;
  sort: string;
  fabric: string;
  categoryId: string;
  region: string;
  totalHits: number;
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function SearchControls({ q, sort, fabric, categoryId, region, totalHits }: SearchControlsProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const buildUrl = (overrides: { q?: string; sort?: string; fabric?: string; page?: string }) => {
    const params = new URLSearchParams();
    const nq = overrides.q ?? q;
    const ns = overrides.sort ?? sort;
    const nf = overrides.fabric ?? fabric;
    if (nq) params.set("q", nq);
    if (ns) params.set("sort", ns);
    if (nf) params.set("fabric", nf);
    if (categoryId) params.set("categoryId", categoryId);
    if (region) params.set("region", region);
    return `/search?${params.toString()}`;
  };

  const navigate = (overrides: Parameters<typeof buildUrl>[0]) => {
    router.push(buildUrl(overrides) as Route);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Top control bar */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#F0F0F0] bg-white px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-[#696969]">
            <span className="font-semibold text-[#1A1A1A]">{totalHits}</span>{" "}
            {q ? <>results for <span className="font-semibold text-[#1A1A1A]">"{q}"</span></> : "sarees found"}
          </p>

          {/* Active filter chips */}
          {fabric && (
            <button
              onClick={() => navigate({ fabric: "" })}
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-[#F9F0F9] px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {fabric} <XIcon />
            </button>
          )}
          {sort && (
            <button
              onClick={() => navigate({ sort: "" })}
              className="inline-flex items-center gap-1 rounded-full border border-[#E0E0E0] bg-[#F5F5F5] px-2.5 py-0.5 text-xs font-medium text-[#4D4D4D]"
            >
              {SORT_OPTIONS.find((s) => s.value === sort)?.label} <XIcon />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile filter button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#E8E8E8] bg-white px-3 py-1.5 text-xs font-medium text-[#4D4D4D] lg:hidden"
          >
            <FilterIcon />
            Filters
            {fabric && <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-xs text-white flex items-center justify-center">1</span>}
          </button>

          {/* Sort select */}
          <select
            value={sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-lg border border-[#E8E8E8] bg-white px-3 py-1.5 text-xs text-[#4D4D4D] outline-none focus:border-primary"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div
            className="w-full rounded-t-2xl border-t bg-white px-5 pt-4 pb-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-bold text-[#1A1A1A]">Filters</p>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-1 hover:bg-[#F5F5F5]">
                <svg className="h-5 w-5 text-[#4D4D4D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#696969]">Fabric / Type</p>
            <div className="flex flex-wrap gap-2">
              {FABRIC_FILTERS.map((f) => {
                const active = fabric === f;
                return (
                  <button
                    key={f}
                    onClick={() => navigate({ fabric: active ? "" : f })}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-primary bg-[#F9F0F9] text-primary"
                        : "border-[#E8E8E8] text-[#4D4D4D] hover:border-primary"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            {fabric && (
              <button
                onClick={() => navigate({ fabric: "" })}
                className="mt-4 w-full rounded-lg border border-[#E8E8E8] py-2.5 text-sm font-medium text-[#4D4D4D] hover:bg-[#F5F5F5]"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const PRICE_RANGES = [
  { label: "Under ₹2,000", min: 0, max: 200000 },
  { label: "₹2,000 – ₹5,000", min: 200000, max: 500000 },
  { label: "₹5,000 – ₹10,000", min: 500000, max: 1000000 },
  { label: "Above ₹10,000", min: 1000000, max: 0 },
];

const REGIONS = ["Varanasi", "Kanchipuram", "Hyderabad", "Surat", "Kolkata", "Jaipur", "Bhopal", "Cuttack"];

export function SidebarFilters({ q, sort, fabric, categoryId, region, minPrice: minPriceProp, maxPrice: maxPriceProp, occasion }: { q: string; sort: string; fabric: string; categoryId: string; region: string; minPrice: string; maxPrice: string; occasion: string }) {
  const router = useRouter();
  const [minPrice, setMinPrice] = useState(Number(minPriceProp) || 0);
  const [maxPrice, setMaxPrice] = useState(Number(maxPriceProp) || 0);

  useEffect(() => {
    setMinPrice(Number(minPriceProp) || 0);
    setMaxPrice(Number(maxPriceProp) || 0);
  }, [minPriceProp, maxPriceProp]);

  const navigate = (overrides: { fabric?: string; sort?: string; region?: string; minPrice?: number; maxPrice?: number; occasion?: string }) => {
    const params = new URLSearchParams();
    const ns = overrides.sort ?? sort;
    const nf = overrides.fabric ?? fabric;
    const nr = overrides.region ?? region;
    const nMin = overrides.minPrice ?? minPrice;
    const nMax = overrides.maxPrice ?? maxPrice;
    const no = overrides.occasion ?? occasion;
    if (q) params.set("q", q);
    if (ns) params.set("sort", ns);
    if (nf) params.set("fabric", nf);
    if (categoryId) params.set("categoryId", categoryId);
    if (nr) params.set("region", nr);
    if (nMin) params.set("minPrice", String(nMin));
    if (nMax) params.set("maxPrice", String(nMax));
    if (no) params.set("occasion", no);
    router.push(`/search?${params.toString()}` as Route);
  };

  const hasFilters = !!(fabric || region || minPrice || maxPrice || occasion);

  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-white overflow-hidden">
      <div className="border-b border-[#F0F0F0] px-4 py-3 flex items-center justify-between">
        <p className="text-sm font-bold text-[#1A1A1A]">Filters</p>
        {hasFilters && (
          <button
            onClick={() => { setMinPrice(0); setMaxPrice(0); navigate({ fabric: "", region: "", minPrice: 0, maxPrice: 0 }); }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="border-b border-[#F0F0F0] px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#696969]">Price Range</p>
        <div className="space-y-1">
          {PRICE_RANGES.map((range) => {
            const isActive = minPrice === range.min && maxPrice === range.max;
            return (
              <button
                key={range.label}
                onClick={() => {
                  const newMin = isActive ? 0 : range.min;
                  const newMax = isActive ? 0 : range.max;
                  setMinPrice(newMin);
                  setMaxPrice(newMax);
                  navigate({ minPrice: newMin, maxPrice: newMax });
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[#F5F5F5] ${isActive ? "font-semibold text-primary" : "text-[#4D4D4D]"}`}
              >
                <span className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${isActive ? "border-primary bg-primary" : "border-[#CCCCCC]"}`}>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Region */}
      <div className="border-b border-[#F0F0F0] px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#696969]">Weaving Region</p>
        <div className="space-y-1.5">
          {REGIONS.map((r) => {
            const active = region === r;
            return (
              <button
                key={r}
                onClick={() => navigate({ region: active ? "" : r })}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-[#F5F5F5] ${active ? "font-semibold text-primary" : "text-[#4D4D4D]"}`}
              >
                <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${active ? "border-primary bg-primary" : "border-[#CCCCCC]"}`}>
                  {active && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" /></svg>}
                </span>
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-b border-[#F0F0F0] px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#696969]">Fabric / Type</p>
        <div className="space-y-1.5">
          {FABRIC_FILTERS.map((f) => {
            const active = fabric === f;
            return (
              <button
                key={f}
                onClick={() => navigate({ fabric: active ? "" : f })}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-[#F5F5F5] ${active ? "font-semibold text-primary" : "text-[#4D4D4D]"}`}
              >
                <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${active ? "border-primary bg-primary" : "border-[#CCCCCC]"}`}>
                  {active && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" />
                    </svg>
                  )}
                </span>
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Occasion */}
      <div className="border-b border-[#F0F0F0] px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#696969]">Occasion</p>
        <div className="space-y-1.5">
          {OCCASION_FILTERS.map((o) => {
            const active = occasion === o;
            return (
              <button
                key={o}
                onClick={() => navigate({ occasion: active ? "" : o })}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-[#F5F5F5] ${active ? "font-semibold text-primary" : "text-[#4D4D4D]"}`}
              >
                <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${active ? "border-primary bg-primary" : "border-[#CCCCCC]"}`}>
                  {active && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" /></svg>}
                </span>
                {o}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

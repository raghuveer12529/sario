import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { SearchControls, SidebarFilters } from "./search-controls";

export const metadata: Metadata = { title: "Search Sarees — Sario" };

interface SearchHit {
  id: string;
  name: string;
  slug: string;
  region?: string;
  fabric?: string;
  minPricePaise: number;
  mrpPaise?: number;
  primaryImageUrl?: string;
}

interface SearchResult {
  hits: SearchHit[];
  estimatedTotalHits: number;
}

const SUGGESTIONS = ["Kanjivaram", "Banarasi", "Silk", "Chanderi", "Tussar"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const q = searchParams["q"] ?? "";
  const page = Number(searchParams["page"] ?? 1);
  const fabric = searchParams["fabric"] ?? "";
  const sort = searchParams["sort"] ?? "";

  let result: SearchResult = { hits: [], estimatedTotalHits: 0 };
  try {
    const params = new URLSearchParams({ q, page: String(page), limit: "24" });
    const categoryId = searchParams["categoryId"];
    const region = searchParams["region"];
    if (categoryId) params.set("categoryId", categoryId);
    if (region) params.set("region", region);
    if (fabric) params.set("fabric", fabric);
    if (sort) params.set("sort", sort);
    result = await apiFetch<SearchResult>(`/catalog/search?${params.toString()}`);
  } catch {
    // API unavailable — show empty state
  }

  const totalPages = Math.ceil(result.estimatedTotalHits / 24);

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex gap-6">
        {/* Filters sidebar — desktop only */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <SidebarFilters q={q} sort={sort} fabric={fabric} />
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Controls: sort, mobile filters, active chips */}
          <SearchControls q={q} sort={sort} fabric={fabric} totalHits={result.estimatedTotalHits} />

          {result.hits.length === 0 ? (
            <div className="rounded-xl border border-[#F0F0F0] bg-white py-20 text-center">
              <svg className="mx-auto mb-3 h-12 w-12 text-[#CCCCCC]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <p className="text-base font-semibold text-[#1A1A1A]">No results found</p>
              <p className="mt-1 text-sm text-[#696969]">
                {q ? `No sarees found for "${q}".` : "No sarees match your filters."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <Link
                    key={s}
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="rounded-full border border-[#E8E8E8] px-3 py-1 text-sm font-medium text-[#4D4D4D] hover:border-primary hover:text-primary"
                  >
                    {s}
                  </Link>
                ))}
              </div>
              <Link href="/" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                Go to Home
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {result.hits.map((hit) => {
                  const price = hit.minPricePaise;
                  const mrp = hit.mrpPaise ?? 0;
                  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
                  return (
                    <Link
                      key={hit.id}
                      href={`/p/${hit.slug}`}
                      className="group block bg-white rounded-xl border border-[#F0F0F0] overflow-hidden hover:shadow-md hover:border-[#E0E0E0] transition-all"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F5F5]">
                        {hit.primaryImageUrl ? (
                          <img
                            src={hit.primaryImageUrl}
                            alt={hit.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <svg className="h-12 w-12 text-[#DDDDDD]" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                            </svg>
                          </div>
                        )}
                        {discount > 0 && (
                          <span className="absolute left-0 top-2 bg-[#E8590C] px-2 py-0.5 text-xs font-bold text-white rounded-r-sm">
                            {discount}% OFF
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 text-xs font-medium text-[#1A1A1A] leading-tight">{hit.name}</p>
                        {hit.region && (
                          <p className="mt-0.5 text-xs text-[#9B9B9B]">{hit.region}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
                          <span className="text-sm font-bold text-[#1A1A1A]">
                            ₹{Math.round(price / 100).toLocaleString("en-IN")}
                          </span>
                          {discount > 0 && (
                            <>
                              <span className="text-xs text-[#9B9B9B] line-through">
                                ₹{Math.round(mrp / 100).toLocaleString("en-IN")}
                              </span>
                              <span className="text-xs font-semibold text-[#26A541]">{discount}% off</span>
                            </>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-[#26A541]">Free Delivery</p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/search?${new URLSearchParams({ q, sort, fabric, page: String(page - 1) }).toString()}`}
                      className="flex items-center gap-1 rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#4D4D4D] hover:border-primary hover:text-primary"
                    >
                      ← Prev
                    </Link>
                  )}
                  <span className="text-sm text-[#696969]">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={`/search?${new URLSearchParams({ q, sort, fabric, page: String(page + 1) }).toString()}`}
                      className="flex items-center gap-1 rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#4D4D4D] hover:border-primary hover:text-primary"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import type { Route } from "next";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { SearchControls, SidebarFilters } from "./search-controls";
import { ProductCard } from "@/components/product-card";

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
  vendorName?: string;
  vendorSlug?: string;
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
  const categoryId = searchParams["categoryId"] ?? "";
  const region = searchParams["region"] ?? "";
  const minPrice = searchParams["minPrice"] ?? "";
  const maxPrice = searchParams["maxPrice"] ?? "";
  const occasion = searchParams["occasion"] ?? "";

  let result: SearchResult = { hits: [], estimatedTotalHits: 0 };
  try {
    const params = new URLSearchParams({ q, page: String(page), limit: "24" });
    if (categoryId) params.set("categoryId", categoryId);
    if (region) params.set("region", region);
    if (fabric) params.set("fabric", fabric);
    if (sort) params.set("sort", sort);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (occasion) params.set("occasion", occasion);
    result = await apiFetch<SearchResult>(`/catalog/search?${params.toString()}`, { cache: "no-store" });
  } catch {
    // API unavailable — show empty state
  }

  const totalPages = Math.ceil(result.estimatedTotalHits / 24);

  const buildPageUrl = (p: number) => {
    const ps = new URLSearchParams();
    if (q) ps.set("q", q);
    if (sort) ps.set("sort", sort);
    if (fabric) ps.set("fabric", fabric);
    if (categoryId) ps.set("categoryId", categoryId);
    if (region) ps.set("region", region);
    if (minPrice) ps.set("minPrice", minPrice);
    if (maxPrice) ps.set("maxPrice", maxPrice);
    ps.set("page", String(p));
    return `/search?${ps.toString()}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex gap-6">
        {/* Filters sidebar — desktop only */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <SidebarFilters q={q} sort={sort} fabric={fabric} categoryId={categoryId} region={region} minPrice={minPrice} maxPrice={maxPrice} occasion={occasion} />
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Controls: sort, mobile filters, active chips */}
          <SearchControls q={q} sort={sort} fabric={fabric} categoryId={categoryId} region={region} totalHits={result.estimatedTotalHits} />

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
                    href={`/search?q=${encodeURIComponent(s)}` as Route}
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
                {result.hits.map((hit) => (
                  <ProductCard
                    key={hit.id}
                    id={hit.id}
                    name={hit.name}
                    slug={hit.slug}
                    primaryImageUrl={hit.primaryImageUrl}
                    price={hit.minPricePaise}
                    mrp={hit.mrpPaise ?? 0}
                    vendorName={hit.vendorName}
                    vendorSlug={hit.vendorSlug}
                    fabric={hit.fabric}
                    region={hit.region}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link
                      href={buildPageUrl(page - 1) as Route}
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
                      href={buildPageUrl(page + 1) as Route}
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

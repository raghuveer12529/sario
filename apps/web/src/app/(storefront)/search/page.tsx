import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Search Sarees" };

interface SearchHit {
  id: string;
  name: string;
  slug: string;
  region?: string;
  fabric?: string;
  minPricePaise: number;
  primaryImageUrl?: string;
}

interface SearchResult {
  hits: SearchHit[];
  estimatedTotalHits: number;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const q = searchParams["q"] ?? "";
  const page = Number(searchParams["page"] ?? 1);

  let result: SearchResult = { hits: [], estimatedTotalHits: 0 };
  try {
    const params = new URLSearchParams({ q, page: String(page), limit: "24" });
    if (searchParams["categoryId"]) params.set("categoryId", searchParams["categoryId"]!);
    if (searchParams["region"]) params.set("region", searchParams["region"]!);
    if (searchParams["fabric"]) params.set("fabric", searchParams["fabric"]!);
    result = await apiFetch<SearchResult>(`/catalog/search?${params.toString()}`);
  } catch {
    // show empty state
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {q ? `Results for "${q}"` : "All sarees"}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({result.estimatedTotalHits} found)
          </span>
        </h1>
      </div>

      {result.hits.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg">No results found.</p>
          <p className="mt-1 text-sm">Try a different search term or browse by category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.hits.map((hit) => (
            <a key={hit.id} href={`/p/${hit.slug}`} className="group block">
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                {hit.primaryImageUrl && (
                  <img
                    src={hit.primaryImageUrl}
                    alt={hit.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <p className="mt-2 text-sm font-medium">{hit.name}</p>
              {hit.region && <p className="text-xs text-muted-foreground">{hit.region}</p>}
              <p className="text-sm">₹{Math.round(hit.minPricePaise / 100).toLocaleString("en-IN")}</p>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}

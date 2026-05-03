import { Suspense } from "react";
import { apiFetch } from "@/lib/api";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Sario — Premium Sarees, Direct from Weavers",
};

interface Product {
  id: string;
  name: string;
  slug: string;
  images: Array<{ url: string; altText?: string }>;
  variants: Array<{ pricePaise: number; mrpPaise: number }>;
}

async function getFeatured(): Promise<Product[]> {
  try {
    return await apiFetch<Product[]>("/catalog/featured?limit=12");
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const products = await getFeatured();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Sarees, from the loom to you
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Handpicked Kanjivaram, Banarasi, Pochampally — verified weaver origin on every piece.
        </p>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">Featured</h2>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid products={products} />
        </Suspense>
      </section>
    </main>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return <p className="text-muted-foreground">No products yet — check back soon.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <a key={p.id} href={`/p/${p.slug}`} className="group block">
          <div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted">
            {p.images[0] && (
              <img
                src={p.images[0].url}
                alt={p.images[0].altText ?? p.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
          <p className="mt-2 text-sm font-medium">{p.name}</p>
          {p.variants[0] && (
            <p className="text-sm text-muted-foreground">
              ₹{Math.round(p.variants[0].pricePaise / 100).toLocaleString("en-IN")}
            </p>
          )}
        </a>
      ))}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
          <div className="mt-1 h-3 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

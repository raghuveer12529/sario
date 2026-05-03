import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  fabric?: string;
  region?: string;
  weaverStory?: string;
  giTag?: string;
  vendor: { businessName: string; about?: string };
  category: { name: string };
  variants: Array<{
    id: string;
    name: string;
    pricePaise: number;
    mrpPaise: number;
    color?: string;
    inventory: { quantity: number; reservedQuantity: number };
  }>;
  images: Array<{ url: string; altText?: string; isPrimary: boolean }>;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const p = await apiFetch<ProductDetail>(`/catalog/products/${params.slug}`);
    return {
      title: p.name,
      description: p.description.slice(0, 160),
      openGraph: { images: p.images.find((i) => i.isPrimary)?.url ? [p.images.find((i) => i.isPrimary)!.url] : [] },
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product: ProductDetail;
  try {
    product = await apiFetch<ProductDetail>(`/catalog/products/${params.slug}`);
  } catch {
    notFound();
  }

  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const lowestPrice = Math.min(...product.variants.map((v) => v.pricePaise));
  const highestMrp = Math.max(...product.variants.map((v) => v.mrpPaise));
  const discount = Math.round(((highestMrp - lowestPrice) / highestMrp) * 100);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          {primaryImage && (
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted">
              <img src={primaryImage.url} alt={primaryImage.altText ?? product.name} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(0, 4).map((img) => (
              <div key={img.url} className="aspect-square overflow-hidden rounded-lg bg-muted">
                <img src={img.url} alt={img.altText ?? ""} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">{product.category.name}</p>
            <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">by {product.vendor.businessName}</p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold">₹{Math.round(lowestPrice / 100).toLocaleString("en-IN")}</span>
            {discount > 0 && (
              <>
                <span className="text-muted-foreground line-through">₹{Math.round(highestMrp / 100).toLocaleString("en-IN")}</span>
                <span className="text-sm font-medium text-green-600">{discount}% off</span>
              </>
            )}
          </div>

          {product.giTag && (
            <p className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              GI Tag: {product.giTag}
            </p>
          )}

          {/* Variants */}
          <div>
            <p className="mb-2 text-sm font-medium">Select variant</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => {
                const available = v.inventory.quantity - v.inventory.reservedQuantity;
                return (
                  <button
                    key={v.id}
                    disabled={available <= 0}
                    className="rounded-lg border px-4 py-2 text-sm transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {v.name} {available <= 3 && available > 0 && <span className="text-orange-500">(only {available} left)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button className="w-full rounded-xl bg-foreground py-3 text-background font-medium hover:opacity-90 transition-opacity">
            Add to cart
          </button>

          {/* Fabric & details */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {product.fabric && <><dt className="text-muted-foreground">Fabric</dt><dd>{product.fabric}</dd></>}
            {product.region && <><dt className="text-muted-foreground">Region</dt><dd>{product.region}</dd></>}
          </dl>

          {product.weaverStory && (
            <div className="rounded-xl bg-muted p-4">
              <p className="mb-1 text-sm font-semibold">Weaver story</p>
              <p className="text-sm text-muted-foreground">{product.weaverStory}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">{product.description}</p>
        </div>
      </div>
    </main>
  );
}

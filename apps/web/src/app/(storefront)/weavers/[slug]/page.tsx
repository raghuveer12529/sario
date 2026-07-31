import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatPaise } from "@sario/ui";
import { apiFetch } from "@/lib/api";

interface Vendor {
  id: string;
  businessName: string;
  slug: string;
  about?: string | null;
  bannerUrl?: string | null;
}

// Shape returned by the Meilisearch-backed /catalog/search endpoint (flat, not variant/image arrays).
interface Product {
  id: string;
  name: string;
  slug: string;
  minPricePaise: number;
  mrpPaise: number;
  primaryImageUrl?: string | null;
}

async function getVendor(slug: string): Promise<Vendor | null> {
  try {
    return await apiFetch<Vendor>(`/catalog/vendors/${slug}`, { next: { revalidate: 300 } } as RequestInit);
  } catch {
    return null;
  }
}

async function getVendorProducts(vendorId: string): Promise<Product[]> {
  try {
    const data = await apiFetch<{ hits: Product[] }>(
      `/catalog/search?vendorId=${encodeURIComponent(vendorId)}&limit=12`,
      { next: { revalidate: 60 } } as RequestInit,
    );
    return data.hits ?? [];
  } catch {
    return [];
  }
}

export default async function WeaverPage({ params }: { params: { slug: string } }) {
  const vendor = await getVendor(params.slug);
  if (!vendor) notFound();

  const products = await getVendorProducts(vendor.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-[#1A1A1A]" style={{ minHeight: 220 }}>
        {vendor.bannerUrl && (
          <Image
            src={vendor.bannerUrl}
            alt=""
            fill
            className="object-cover opacity-50"
          />
        )}
        <div className="relative z-10 flex flex-col justify-end p-8" style={{ minHeight: 220 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A96E] mb-1">Master Weaver</p>
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            {vendor.businessName}
          </h1>
        </div>
      </div>

      {vendor.about && (
        <div className="mb-10 max-w-2xl">
          <p className="text-base leading-relaxed text-[#4D4D4D]">{vendor.about}</p>
        </div>
      )}

      {products.length > 0 && (
        <>
          <h2 className="mb-4 font-display text-xl font-bold text-[#1A1A1A]">
            Sarees by {vendor.businessName}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const price = p.minPricePaise ?? 0;
              const mrp = p.mrpPaise ?? 0;
              const img = p.primaryImageUrl ?? "";
              return (
                <Link
                  key={p.id}
                  href={`/p/${p.slug}`}
                  className="group rounded-xl border border-[#F0F0F0] bg-white overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="relative aspect-[3/4] bg-[#F9F9F9]">
                    {img && (
                      <Image
                        src={img}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-[#1A1A1A] line-clamp-2 leading-snug">{p.name}</p>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-sm font-extrabold text-primary">{formatPaise(price)}</span>
                      {mrp > price && (
                        <span className="text-[10px] text-[#9B9B9B] line-through">{formatPaise(mrp)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

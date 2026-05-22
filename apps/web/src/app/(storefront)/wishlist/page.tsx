"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPaise } from "@sario/ui";

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/v1";

function encodeWishlist(ids: string[]): string {
  return btoa(JSON.stringify(ids));
}

function decodeWishlist(encoded: string): string[] {
  try {
    const parsed: unknown = JSON.parse(atob(encoded));
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

interface Variant { pricePaise: number; mrpPaise: number }
interface ProductImage { url: string; altText?: string }
interface Product {
  id: string;
  name: string;
  slug: string;
  images: ProductImage[];
  variants: Variant[];
}

function HeartFilledIcon() {
  return (
    <svg className="h-4 w-4 fill-primary stroke-primary" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

export default function WishlistPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("shared");
    if (shared) {
      setIds(decodeWishlist(shared));
      return;
    }
    try {
      const stored: string[] = JSON.parse(localStorage.getItem("sario_wishlist") ?? "[]");
      setIds(stored);
    } catch {
      setIds([]);
    }
  }, []);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    setLoading(true);
    Promise.all(
      ids.map((id) =>
        fetch(`${API_BASE}/storefront/products/${id}`)
          .then((r) => (r.ok ? (r.json() as Promise<Product>) : null))
          .catch(() => null)
      )
    )
      .then((results) => setProducts(results.filter(Boolean) as Product[]))
      .finally(() => setLoading(false));
  }, [ids]);

  const remove = (id: string) => {
    const next = ids.filter((x) => x !== id);
    localStorage.setItem("sario_wishlist", JSON.stringify(next));
    setIds(next);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-[#1A1A1A]">Saved Items</h1>
          {!loading && (
            <p className="mt-1 text-sm text-[#696969]">
              {products.length === 0 ? "Your wishlist is empty" : `${products.length} item${products.length !== 1 ? "s" : ""} saved`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {ids.length > 0 && (
            <button
              onClick={() => {
                const encoded = encodeWishlist(ids);
                const url = `${window.location.origin}/wishlist?shared=${encoded}`;
                const text = encodeURIComponent(`Check out my saree wishlist on Sario: ${url}`);
                window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-bold text-[#4D4D4D] hover:border-[#25D366] hover:text-[#25D366] transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.094.537 4.065 1.479 5.784L0 24l6.395-1.667A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.652-.51-5.168-1.399l-.371-.22-3.801.991.998-3.698-.242-.382A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
              Share via WhatsApp
            </button>
          )}
          <Link href="/search" className="text-sm font-bold text-primary hover:underline">
            Continue Shopping →
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#E8E8E8] text-center">
          <div className="text-5xl">🤍</div>
          <p className="text-lg font-bold text-[#1A1A1A]">Nothing saved yet</p>
          <p className="text-sm text-[#696969]">Tap the heart on any product to save it here.</p>
          <Link
            href="/search"
            className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Browse Sarees
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => {
            const price = p.variants[0]?.pricePaise ?? 0;
            const mrp = p.variants[0]?.mrpPaise ?? 0;
            const img = p.images[0]?.url ?? "";
            return (
              <div key={p.id} className="group relative rounded-xl border border-[#F0F0F0] bg-white overflow-hidden hover:shadow-md hover:border-[#E0E0E0] transition-all">
                <Link href={`/p/${p.slug}`} className="block">
                  <div className="relative aspect-[3/4] bg-[#F9F9F9]">
                    {img ? (
                      <Image
                        src={img}
                        alt={p.images[0]?.altText ?? p.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">🥻</div>
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
                <button
                  onClick={() => remove(p.id)}
                  aria-label="Remove from wishlist"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                >
                  <HeartFilledIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

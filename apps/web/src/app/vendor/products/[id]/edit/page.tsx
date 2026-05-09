"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ProductForm, type ProductFormData } from "../../_product-form";

interface RawVariant {
  id: string;
  name: string;
  sku: string;
  color?: string;
  pricePaise: number;
  mrpPaise: number;
  weightGrams?: number;
  quantity?: number;
}

interface RawProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  fabric?: string;
  region?: string;
  weaverStory?: string;
  giTag?: string;
  hsnCode?: string;
  tags?: string[];
  variants: RawVariant[];
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<RawProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    apiFetch<RawProduct>(`/vendors/me/products/${params.id}`)
      .then(setProduct)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load product."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <p className="text-sm font-semibold text-red-600">{error || "Product not found."}</p>
      </div>
    );
  }

  const initialData: ProductFormData = {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    fabric: product.fabric ?? "",
    region: product.region ?? "",
    weaverStory: product.weaverStory ?? "",
    giTag: product.giTag ?? "",
    hsnCode: product.hsnCode ?? "",
    tags: product.tags?.join(", ") ?? "",
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      color: v.color ?? "",
      priceRupees: String(v.pricePaise / 100),
      mrpRupees: String(v.mrpPaise / 100),
      weightGrams: v.weightGrams ? String(v.weightGrams) : "",
      quantity: v.quantity != null ? String(v.quantity) : "",
    })),
  };

  return (
    <ProductForm
      title={`Edit: ${product.name}`}
      initialData={initialData}
      productId={product.id}
    />
  );
}

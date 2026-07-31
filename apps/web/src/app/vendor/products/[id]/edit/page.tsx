"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ProductForm, type ProductFormValues } from "../../../_components/product-form";

interface ProductVariantFull {
  id: string;
  name: string;
  sku: string;
  color?: string | null;
  pricePaise: number;
  mrpPaise: number;
  weightGrams?: number | null;
  inventory: { quantity: number; reservedQuantity: number };
}

interface FullProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  fabric?: string | null;
  region?: string | null;
  weaverStory?: string | null;
  giTag?: string | null;
  hsnCode?: string | null;
  tags: string[];
  occasion: string[];
  variants: ProductVariantFull[];
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<Partial<ProductFormValues> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<FullProduct>(`/vendors/me/products/${params.id}`)
      .then((p) => {
        setInitial({
          name: p.name,
          description: p.description,
          categoryId: p.categoryId,
          fabric: p.fabric ?? "",
          region: p.region ?? "",
          weaverStory: p.weaverStory ?? "",
          giTag: p.giTag ?? "",
          hsnCode: p.hsnCode ?? "",
          occasion: p.occasion.join(", "),
          tags: p.tags.join(", "),
          variants: p.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            color: v.color ?? "",
            priceRupees: String(v.pricePaise / 100),
            mrpRupees: String(v.mrpPaise / 100),
            weightGrams: v.weightGrams ? String(v.weightGrams) : "",
            quantity: String(v.inventory.quantity),
          })),
        });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load product."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-[#1A1A1A]">Edit Product</h1>
      {initial && <ProductForm initialValues={initial} productId={params.id} />}
    </div>
  );
}

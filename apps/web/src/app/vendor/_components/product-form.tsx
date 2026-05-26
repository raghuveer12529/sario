"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { VariantEditor, type VariantRow, EMPTY_VARIANT } from "./variant-editor";

interface Category {
  id: string;
  name: string;
  children?: Category[];
}

export interface ProductFormValues {
  name: string;
  description: string;
  categoryId: string;
  fabric: string;
  region: string;
  occasion: string;
  tags: string;
  weaverStory: string;
  giTag: string;
  hsnCode: string;
  variants: VariantRow[];
}

interface Props {
  initialValues?: Partial<ProductFormValues>;
  productId?: string;
}

const EMPTY_FORM: ProductFormValues = {
  name: "", description: "", categoryId: "", fabric: "", region: "",
  occasion: "", tags: "", weaverStory: "", giTag: "", hsnCode: "",
  variants: [{ ...EMPTY_VARIANT }],
};

function flattenCategories(cats: Category[]): Category[] {
  return cats.flatMap((c) => [c, ...(c.children ? flattenCategories(c.children) : [])]);
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#4D4D4D]">
      {children}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { value: string; onChange: (v: string) => void }) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors resize-none"
    />
  );
}

export function ProductForm({ initialValues, productId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>({ ...EMPTY_FORM, ...initialValues });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiFetch<Category[]>("/catalog/categories")
      .then((cats) => setCategories(flattenCategories(cats)))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (initialValues) setForm((prev) => ({ ...prev, ...initialValues }));
  }, [initialValues]);

  const set = (field: keyof ProductFormValues) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): string => {
    if (!form.name.trim()) return "Product name is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.categoryId) return "Please select a category.";
    for (const v of form.variants) {
      if (!v.name.trim()) return "Each variant must have a name.";
      if (!v.sku.trim()) return "Each variant must have a SKU.";
      const price = parseFloat(v.priceRupees);
      const mrp = parseFloat(v.mrpRupees);
      if (!v.priceRupees || isNaN(price) || price <= 0) return "Each variant must have a valid price.";
      if (!v.mrpRupees || isNaN(mrp) || mrp <= 0) return "Each variant must have a valid MRP.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name,
      description: form.description,
      categoryId: form.categoryId,
      ...(form.fabric && { fabric: form.fabric }),
      ...(form.region && { region: form.region }),
      ...(form.weaverStory && { weaverStory: form.weaverStory }),
      ...(form.giTag && { giTag: form.giTag }),
      ...(form.hsnCode && { hsnCode: form.hsnCode }),
      ...(form.occasion && { occasion: form.occasion.split(",").map((s) => s.trim()).filter(Boolean) }),
      ...(form.tags && { tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean) }),
      variants: form.variants.map((v) => ({
        name: v.name,
        sku: v.sku,
        ...(v.color && { color: v.color }),
        pricePaise: Math.round(parseFloat(v.priceRupees) * 100),
        mrpPaise: Math.round(parseFloat(v.mrpRupees) * 100),
        ...(v.weightGrams && { weightGrams: parseInt(v.weightGrams) }),
        ...(v.quantity && { quantity: parseInt(v.quantity) }),
      })),
    };

    try {
      if (productId) {
        await apiFetch(`/vendors/me/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess("Product updated successfully.");
      } else {
        await apiFetch("/vendors/me/products", { method: "POST", body: JSON.stringify(payload) });
        router.push("/vendor/products");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Product Details</h2>
        <div>
          <FieldLabel required>Product Name</FieldLabel>
          <Input value={form.name} onChange={set("name")} placeholder="Pure Kanjivaram Silk Saree" />
        </div>
        <div>
          <FieldLabel required>Description</FieldLabel>
          <Textarea value={form.description} onChange={set("description")} placeholder="Describe the saree, its unique features, weaving technique…" rows={5} />
        </div>
        <div>
          <FieldLabel required>Category</FieldLabel>
          <select
            value={form.categoryId}
            onChange={(e) => set("categoryId")(e.target.value)}
            className="w-full rounded-xl border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Fabric</FieldLabel>
            <Input value={form.fabric} onChange={set("fabric")} placeholder="Pure Silk" />
          </div>
          <div>
            <FieldLabel>Region / Origin</FieldLabel>
            <Input value={form.region} onChange={set("region")} placeholder="Kanchipuram, Tamil Nadu" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Occasion</FieldLabel>
            <Input value={form.occasion} onChange={set("occasion")} placeholder="Wedding, Festival" />
            <p className="mt-1 text-[10px] text-[#9B9B9B]">Comma-separated</p>
          </div>
          <div>
            <FieldLabel>Tags</FieldLabel>
            <Input value={form.tags} onChange={set("tags")} placeholder="silk, handloom, zari" />
            <p className="mt-1 text-[10px] text-[#9B9B9B]">Comma-separated</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>GI Tag</FieldLabel>
            <Input value={form.giTag} onChange={set("giTag")} placeholder="Kanjivaram Silk" />
          </div>
          <div>
            <FieldLabel>HSN Code</FieldLabel>
            <Input value={form.hsnCode} onChange={set("hsnCode")} placeholder="5007" />
          </div>
        </div>
        <div>
          <FieldLabel>Weaver Story</FieldLabel>
          <Textarea value={form.weaverStory} onChange={set("weaverStory")} placeholder="Share the story behind this creation…" rows={4} />
        </div>
      </div>

      <div className="rounded-xl border border-[#F0F0F0] bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">Variants</h2>
        <p className="text-xs text-[#696969]">Add at least one variant. Each variant has its own price and stock.</p>
        <VariantEditor
          variants={form.variants}
          onChange={(variants) => setForm((prev) => ({ ...prev, variants }))}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/vendor/products")}
          className="rounded-xl border border-[#E8E8E8] px-6 py-2.5 text-sm font-bold text-[#4D4D4D] hover:bg-[#F5F5F5] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-primary px-8 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Saving…" : productId ? "Save Changes" : "Submit for Review"}
        </button>
      </div>
    </form>
  );
}

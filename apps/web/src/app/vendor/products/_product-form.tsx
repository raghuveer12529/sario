"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariantDraft {
  id?: string;
  name: string;
  sku: string;
  color: string;
  priceRupees: string;
  mrpRupees: string;
  weightGrams: string;
  quantity: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  categoryId: string;
  fabric: string;
  region: string;
  weaverStory: string;
  giTag: string;
  hsnCode: string;
  tags: string;
  variants: VariantDraft[];
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

function emptyVariant(): VariantDraft {
  return { name: "", sku: "", color: "", priceRupees: "", mrpRupees: "", weightGrams: "", quantity: "" };
}

function rupeesToPaise(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputCls = (err?: boolean) =>
  `w-full rounded-sm border px-3 py-2.5 text-sm text-[#1A1A1A] outline-none transition-colors placeholder:text-[#C0C0C0] ${
    err
      ? "border-red-400 bg-red-50 focus:border-red-500"
      : "border-[#E8E8E8] bg-white focus:border-primary"
  }`;

function Field({
  label,
  children,
  error,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D]">
        {label}
        {required && <span className="ml-0.5 text-red-500"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-[#9B9B9B]">{hint}</p>}
    </div>
  );
}

// ─── Main form component ──────────────────────────────────────────────────────

export function ProductForm({
  initialData,
  productId,
  title,
}: {
  initialData?: Partial<ProductFormData>;
  productId?: string;
  title: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    categoryId: initialData?.categoryId ?? "",
    fabric: initialData?.fabric ?? "",
    region: initialData?.region ?? "",
    weaverStory: initialData?.weaverStory ?? "",
    giTag: initialData?.giTag ?? "",
    hsnCode: initialData?.hsnCode ?? "",
    tags: initialData?.tags ?? "",
    variants: initialData?.variants?.length ? initialData.variants : [emptyVariant()],
  });

  useEffect(() => {
    apiFetch<{ data?: Category[]; categories?: Category[] } | Category[]>("/catalog/categories")
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { data?: Category[]; categories?: Category[] }).data ?? (res as { data?: Category[]; categories?: Category[] }).categories ?? [];
        setCategories(list);
      })
      .catch(() => {});
  }, []);

  const set = (key: keyof ProductFormData, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    setFieldErrors((e) => ({ ...e, [key]: "" }));
  };

  const setVariant = (idx: number, key: keyof VariantDraft, val: string) => {
    setForm((f) => {
      const variants = f.variants.map((v, i) =>
        i === idx ? { ...v, [key]: val } as VariantDraft : v,
      );
      return { ...f, variants };
    });
    setFieldErrors((e) => ({ ...e, [`variant_${idx}_${key}`]: "" }));
  };

  const addVariant = () =>
    setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }));

  const removeVariant = (idx: number) =>
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Product name is required.";
    if (form.name.length > 200) errors.name = "Name must be under 200 characters.";
    if (!form.description.trim()) errors.description = "Description is required.";
    if (!form.categoryId) errors.categoryId = "Please select a category.";
    if (form.variants.length === 0) errors.variants = "At least one variant is required.";

    form.variants.forEach((v, i) => {
      if (!v.name.trim()) errors[`variant_${i}_name`] = "Variant name required.";
      if (!v.sku.trim()) errors[`variant_${i}_sku`] = "SKU required.";
      const price = rupeesToPaise(v.priceRupees);
      const mrp = rupeesToPaise(v.mrpRupees);
      if (price <= 0) errors[`variant_${i}_priceRupees`] = "Price must be greater than ₹0.";
      if (mrp <= 0) errors[`variant_${i}_mrpRupees`] = "MRP must be greater than ₹0.";
      if (mrp < price) errors[`variant_${i}_mrpRupees`] = "MRP must be ≥ sale price.";
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      ...(form.fabric ? { fabric: form.fabric.trim() } : {}),
      ...(form.region ? { region: form.region.trim() } : {}),
      ...(form.weaverStory ? { weaverStory: form.weaverStory.trim() } : {}),
      ...(form.giTag ? { giTag: form.giTag.trim() } : {}),
      ...(form.hsnCode ? { hsnCode: form.hsnCode.trim() } : {}),
      ...(form.tags ? { tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) } : {}),
      variants: form.variants.map((v) => ({
        name: v.name.trim(),
        sku: v.sku.trim(),
        ...(v.color ? { color: v.color.trim() } : {}),
        pricePaise: rupeesToPaise(v.priceRupees),
        mrpPaise: rupeesToPaise(v.mrpRupees),
        ...(v.weightGrams ? { weightGrams: parseInt(v.weightGrams, 10) } : {}),
        ...(v.quantity ? { quantity: parseInt(v.quantity, 10) } : {}),
      })),
    };

    try {
      if (productId) {
        await apiFetch(`/vendors/me/products/${productId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/vendors/me/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      router.push("/vendor/products");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setServerError(Array.isArray(msg) ? ((msg as string[])[0] ?? "Something went wrong.") : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/vendor/products"
          className="text-[#696969] hover:text-primary text-sm font-semibold transition-colors"
        >
          ← Products
        </Link>
        <span className="text-[#C0C0C0]">/</span>
        <h1 className="text-xl font-extrabold text-[#1A1A1A]">{title}</h1>
      </div>

      {serverError && (
        <div className="mb-5 rounded-sm border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* ── Basic Info ── */}
        <section className="rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
          <div className="border-b border-[#F0F0F0] px-5 py-4">
            <h2 className="text-sm font-extrabold text-[#1A1A1A]">Basic Information</h2>
          </div>
          <div className="space-y-5 px-5 py-5">
            <Field label="Product Name" error={fieldErrors.name} required>
              <input
                type="text"
                maxLength={200}
                placeholder="e.g. Pure Kanjivaram Silk Saree — Peacock Motif"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputCls(!!fieldErrors.name)}
              />
            </Field>

            <Field label="Description" error={fieldErrors.description} required hint="Tell buyers about the fabric, weave, occasion, care instructions.">
              <textarea
                rows={5}
                maxLength={5000}
                placeholder="Pure mulberry silk Kanjivaram with intricate zari work…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={inputCls(!!fieldErrors.description) + " resize-none"}
              />
            </Field>

            <Field label="Category" error={fieldErrors.categoryId} required>
              <select
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                className={inputCls(!!fieldErrors.categoryId) + " cursor-pointer"}
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? "  └ " : ""}{c.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Fabric / Material" hint="e.g. Pure Silk, Cotton, Tussar">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Pure Silk"
                  value={form.fabric}
                  onChange={(e) => set("fabric", e.target.value)}
                  className={inputCls()}
                />
              </Field>
              <Field label="Region / Origin" hint="e.g. Kanjivaram, Banarasi">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Kanjivaram"
                  value={form.region}
                  onChange={(e) => set("region", e.target.value)}
                  className={inputCls()}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* ── Story & Compliance ── */}
        <section className="rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
          <div className="border-b border-[#F0F0F0] px-5 py-4">
            <h2 className="text-sm font-extrabold text-[#1A1A1A]">Story & Compliance</h2>
            <p className="mt-0.5 text-xs text-[#9B9B9B]">All fields optional — they help buyers discover and trust your listings.</p>
          </div>
          <div className="space-y-5 px-5 py-5">
            <Field label="Weaver Story" hint="Share the craft, the artisan, or the tradition behind this saree.">
              <textarea
                rows={3}
                maxLength={3000}
                placeholder="Hand-woven by master craftsmen in Kanchipuram using traditional pit-looms…"
                value={form.weaverStory}
                onChange={(e) => set("weaverStory", e.target.value)}
                className={inputCls() + " resize-none"}
              />
            </Field>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Field label="GI Tag" hint="Geographical Indication tag if applicable">
                <input
                  type="text"
                  placeholder="Kanjivaram Silk GI"
                  value={form.giTag}
                  onChange={(e) => set("giTag", e.target.value)}
                  className={inputCls()}
                />
              </Field>
              <Field label="HSN Code" hint="For GST filing">
                <input
                  type="text"
                  maxLength={8}
                  placeholder="5007"
                  value={form.hsnCode}
                  onChange={(e) => set("hsnCode", e.target.value)}
                  className={inputCls()}
                />
              </Field>
              <Field label="Tags" hint="Comma-separated keywords">
                <input
                  type="text"
                  placeholder="silk, bridal, zari, peacock"
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  className={inputCls()}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* ── Variants ── */}
        <section className="rounded-sm border border-[#E8E8E8] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F0F0F0] px-5 py-4">
            <div>
              <h2 className="text-sm font-extrabold text-[#1A1A1A]">Variants & Pricing</h2>
              <p className="mt-0.5 text-xs text-[#9B9B9B]">Each variant is a distinct colour, size, or style. At least one is required.</p>
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="rounded-sm border border-primary px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
            >
              + Add Variant
            </button>
          </div>

          {fieldErrors.variants && (
            <p className="px-5 pt-3 text-xs text-red-600">{fieldErrors.variants}</p>
          )}

          <div className="divide-y divide-[#F5F5F5]">
            {form.variants.map((v, i) => (
              <div key={i} className="px-5 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#696969]">
                    Variant {i + 1}
                  </p>
                  {form.variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Variant Name *" error={fieldErrors[`variant_${i}_name`]}>
                    <input
                      type="text"
                      placeholder="e.g. Red with Gold Zari"
                      value={v.name}
                      onChange={(e) => setVariant(i, "name", e.target.value)}
                      className={inputCls(!!fieldErrors[`variant_${i}_name`])}
                    />
                  </Field>
                  <Field label="SKU *" error={fieldErrors[`variant_${i}_sku`]} hint="Unique identifier for inventory">
                    <input
                      type="text"
                      placeholder="KNJ-RED-001"
                      value={v.sku}
                      onChange={(e) => setVariant(i, "sku", e.target.value.toUpperCase())}
                      className={inputCls(!!fieldErrors[`variant_${i}_sku`]) + " font-mono"}
                    />
                  </Field>
                  <Field label="Colour" hint="Visible to buyers on product page">
                    <input
                      type="text"
                      placeholder="Deep Red"
                      value={v.color}
                      onChange={(e) => setVariant(i, "color", e.target.value)}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="Weight (grams)" hint="Needed for accurate shipping rates">
                    <input
                      type="number"
                      min={0}
                      placeholder="600"
                      value={v.weightGrams}
                      onChange={(e) => setVariant(i, "weightGrams", e.target.value)}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="Sale Price (₹) *" error={fieldErrors[`variant_${i}_priceRupees`]}>
                    <div className={`flex overflow-hidden rounded-sm border transition-colors ${fieldErrors[`variant_${i}_priceRupees`] ? "border-red-400" : "border-[#E8E8E8] focus-within:border-primary"}`}>
                      <span className="flex items-center border-r border-[#E8E8E8] bg-[#F5F5F5] px-3 text-sm font-semibold text-[#696969]">₹</span>
                      <input
                        type="number"
                        min={1}
                        step={0.01}
                        placeholder="2500.00"
                        value={v.priceRupees}
                        onChange={(e) => setVariant(i, "priceRupees", e.target.value)}
                        className="flex-1 bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none"
                      />
                    </div>
                  </Field>
                  <Field label="MRP (₹) *" error={fieldErrors[`variant_${i}_mrpRupees`]} hint="Original / crossed-out price">
                    <div className={`flex overflow-hidden rounded-sm border transition-colors ${fieldErrors[`variant_${i}_mrpRupees`] ? "border-red-400" : "border-[#E8E8E8] focus-within:border-primary"}`}>
                      <span className="flex items-center border-r border-[#E8E8E8] bg-[#F5F5F5] px-3 text-sm font-semibold text-[#696969]">₹</span>
                      <input
                        type="number"
                        min={1}
                        step={0.01}
                        placeholder="3500.00"
                        value={v.mrpRupees}
                        onChange={(e) => setVariant(i, "mrpRupees", e.target.value)}
                        className="flex-1 bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none"
                      />
                    </div>
                  </Field>
                  <Field label="Stock Quantity" hint="Leave blank for unlimited">
                    <input
                      type="number"
                      min={0}
                      placeholder="10"
                      value={v.quantity}
                      onChange={(e) => setVariant(i, "quantity", e.target.value)}
                      className={inputCls()}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Image note ── */}
        <div className="rounded-sm border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-sm font-bold text-blue-800">📸 Product Images</p>
          <p className="mt-1 text-xs text-blue-600">
            Image upload is coming soon. After your product is created, contact support to add
            photos to your listing.
          </p>
        </div>

        {/* ── Submit ── */}
        <div className="flex items-center justify-between">
          <Link
            href="/vendor/products"
            className="text-sm font-semibold text-[#696969] hover:text-primary transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-sm bg-primary px-8 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting
              ? productId
                ? "Saving…"
                : "Creating…"
              : productId
              ? "Save Changes"
              : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

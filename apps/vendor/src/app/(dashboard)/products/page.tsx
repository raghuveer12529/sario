"use client";

import { useEffect, useState, useCallback } from "react";
import { vendorFetch } from "@/lib/api";

interface Variant {
  id?: string;
  name: string;
  sku: string;
  color?: string;
  pricePaise: number;
  mrpPaise: number;
  weightGrams?: number;
  quantity?: number;
}

interface Product {
  id: string;
  name: string;
  status: string;
  fabric?: string;
  region?: string;
  createdAt: string;
  variants: Variant[];
  category?: { name: string };
  rejectionReason?: string | null;
}

interface ProductPage {
  data: Product[];
  meta: { total: number; page: number; totalPages: number };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function formatPaise(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

const EMPTY_VARIANT: Variant = { name: "", sku: "", pricePaise: 0, mrpPaise: 0, color: "", quantity: 0 };

interface ProductFormData {
  name: string;
  description: string;
  categoryId: string;
  fabric: string;
  region: string;
  variants: Variant[];
}

const EMPTY_FORM: ProductFormData = {
  name: "",
  description: "",
  categoryId: "",
  fabric: "",
  region: "",
  variants: [{ ...EMPTY_VARIANT }],
};

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await vendorFetch<ProductPage>(`/vendors/me/products?page=${p}&limit=20`);
      setProducts(res.data);
      setMeta(res.meta);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(page); }, [load, page]);

  const openCreate = () => {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      description: "",
      categoryId: product.category ? "" : "",
      fabric: product.fabric ?? "",
      region: product.region ?? "",
      variants: product.variants.length > 0
        ? product.variants.map((v) => ({ ...v }))
        : [{ ...EMPTY_VARIANT }],
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditProduct(null); setError(""); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId || undefined,
        fabric: form.fabric || undefined,
        region: form.region || undefined,
        variants: form.variants.map((v) => ({
          name: v.name,
          sku: v.sku,
          color: v.color || undefined,
          pricePaise: Number(v.pricePaise),
          mrpPaise: Number(v.mrpPaise),
          weightGrams: v.weightGrams ? Number(v.weightGrams) : undefined,
          quantity: v.quantity ? Number(v.quantity) : undefined,
        })),
      };

      if (editProduct) {
        await vendorFetch(`/vendors/me/products/${editProduct.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await vendorFetch("/vendors/me/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeForm();
      await load(page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await vendorFetch(`/vendors/me/products/${id}`, { method: "DELETE" });
      await load(page);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const updateVariant = (i: number, field: keyof Variant, value: string | number) => {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], [field]: value } as Variant;
      return { ...f, variants };
    });
  };

  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { ...EMPTY_VARIANT }] }));
  const removeVariant = (i: number) => setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.total} product{meta.total !== 1 ? "s" : ""} listed</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add product
        </button>
      </div>

      {error && !showForm && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed gap-3">
          <p className="text-sm text-muted-foreground">No products yet</p>
          <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Add your first product
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold truncate">{product.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[product.status] ?? "bg-gray-100"}`}>
                      {product.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {product.fabric && <span>Fabric: {product.fabric}</span>}
                    {product.region && <span>Region: {product.region}</span>}
                    <span>{product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}</span>
                    {product.variants[0] && (
                      <span>{formatPaise(product.variants[0].pricePaise)}</span>
                    )}
                  </div>
                  {product.status === "REJECTED" && product.rejectionReason && (
                    <p className="mt-2 text-xs text-red-600">Rejected: {product.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(product)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void deleteProduct(product.id)}
                    disabled={deletingId === product.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === product.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-40">Previous</button>
          <span className="text-sm text-muted-foreground">Page {page} of {meta.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Product form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{editProduct ? "Edit product" : "New product"}</h2>
              <button onClick={closeForm} className="rounded-lg p-1 hover:bg-accent">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { void handleSave(e); }} className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Product name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Banarasi Silk Saree"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the saree — weave, occasion, care instructions…"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Fabric</label>
                  <input
                    value={form.fabric}
                    onChange={(e) => setForm((f) => ({ ...f, fabric: e.target.value }))}
                    placeholder="e.g. Pure Silk"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Region / Origin</label>
                  <input
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                    placeholder="e.g. Varanasi, Kanchipuram"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium">Variants *</label>
                  <button type="button" onClick={addVariant} className="text-xs font-medium text-primary hover:underline">
                    + Add variant
                  </button>
                </div>
                <div className="space-y-4">
                  {form.variants.map((v, i) => (
                    <div key={i} className="rounded-xl border bg-background p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Variant {i + 1}</p>
                        {form.variants.length > 1 && (
                          <button type="button" onClick={() => removeVariant(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium">Name *</label>
                          <input
                            required
                            value={v.name}
                            onChange={(e) => updateVariant(i, "name", e.target.value)}
                            placeholder="e.g. Red"
                            className="w-full rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">SKU *</label>
                          <input
                            required
                            value={v.sku}
                            onChange={(e) => updateVariant(i, "sku", e.target.value)}
                            placeholder="e.g. BNR-RED-001"
                            className="w-full rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">Price (₹) *</label>
                          <input
                            required
                            type="number"
                            min="0"
                            value={v.pricePaise / 100 || ""}
                            onChange={(e) => updateVariant(i, "pricePaise", Math.round(parseFloat(e.target.value || "0") * 100))}
                            placeholder="0"
                            className="w-full rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">MRP (₹) *</label>
                          <input
                            required
                            type="number"
                            min="0"
                            value={v.mrpPaise / 100 || ""}
                            onChange={(e) => updateVariant(i, "mrpPaise", Math.round(parseFloat(e.target.value || "0") * 100))}
                            placeholder="0"
                            className="w-full rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">Color</label>
                          <input
                            value={v.color ?? ""}
                            onChange={(e) => updateVariant(i, "color", e.target.value)}
                            placeholder="e.g. Crimson Red"
                            className="w-full rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">Stock qty</label>
                          <input
                            type="number"
                            min="0"
                            value={v.quantity ?? ""}
                            onChange={(e) => updateVariant(i, "quantity", parseInt(e.target.value || "0", 10))}
                            placeholder="0"
                            className="w-full rounded-lg border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-accent">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : editProduct ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

export interface VariantRow {
  name: string;
  sku: string;
  color: string;
  priceRupees: string;
  mrpRupees: string;
  weightGrams: string;
  quantity: string;
}

export const EMPTY_VARIANT: VariantRow = {
  name: "", sku: "", color: "", priceRupees: "", mrpRupees: "", weightGrams: "", quantity: "",
};

interface Props {
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
}

function VariantInput({ value, onChange, placeholder, type = "text" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[#E8E8E8] px-3 py-2 text-xs text-[#1A1A1A] outline-none focus:border-primary transition-colors"
    />
  );
}

export function VariantEditor({ variants, onChange }: Props) {
  const update = (index: number, field: keyof VariantRow, value: string) => {
    onChange(variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const add = () => onChange([...variants, { ...EMPTY_VARIANT }]);

  const remove = (index: number) => {
    if (variants.length <= 1) return;
    onChange(variants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="hidden sm:grid grid-cols-7 gap-2 px-1">
        {["Name *", "SKU *", "Color", "Price ₹ *", "MRP ₹ *", "Weight g", "Stock"].map((h) => (
          <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">{h}</p>
        ))}
      </div>

      {variants.map((v, i) => (
        <div key={i} className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] p-3">
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Name *</p>
              <VariantInput value={v.name} onChange={(val) => update(i, "name", val)} placeholder="e.g. Red" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">SKU *</p>
              <VariantInput value={v.sku} onChange={(val) => update(i, "sku", val)} placeholder="SKU-001" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Color</p>
              <VariantInput value={v.color} onChange={(val) => update(i, "color", val)} placeholder="Red" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Price ₹ *</p>
              <VariantInput value={v.priceRupees} onChange={(val) => update(i, "priceRupees", val)} placeholder="5000" type="number" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">MRP ₹ *</p>
              <VariantInput value={v.mrpRupees} onChange={(val) => update(i, "mrpRupees", val)} placeholder="6000" type="number" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Weight g</p>
              <VariantInput value={v.weightGrams} onChange={(val) => update(i, "weightGrams", val)} placeholder="800" type="number" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#9B9B9B] sm:hidden">Stock</p>
              <VariantInput value={v.quantity} onChange={(val) => update(i, "quantity", val)} placeholder="10" type="number" />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={variants.length <= 1}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 disabled:text-[#CCCCCC] disabled:cursor-not-allowed transition-colors"
            >
              Remove variant
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-xl border border-dashed border-primary px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
      >
        + Add Variant
      </button>
    </div>
  );
}

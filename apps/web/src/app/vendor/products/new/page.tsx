"use client";

import { ProductForm } from "../../_components/product-form";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-[#1A1A1A]">Add New Product</h1>
      <ProductForm />
    </div>
  );
}

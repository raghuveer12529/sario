import type { MetadataRoute } from "next";
import { apiFetch } from "@/lib/api";

export const revalidate = 3600;

interface ProductEntry {
  slug: string;
  updatedAt: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://sario.in";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await apiFetch<ProductEntry[]>("/catalog/sitemap");
    productRoutes = products.map((p) => ({
      url: `${base}/p/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // silently skip — don't break builds on API unavailability
  }

  return [...staticRoutes, ...productRoutes];
}

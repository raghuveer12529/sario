import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://sario.in";
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/p/", "/c/", "/search"], disallow: ["/api/", "/checkout/", "/me/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

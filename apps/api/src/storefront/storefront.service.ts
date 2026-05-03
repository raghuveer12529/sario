import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { MeilisearchService } from "../catalog/meilisearch.service.js";

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: MeilisearchService,
  ) {}

  async searchProducts(opts: {
    q?: string;
    categoryId?: string;
    region?: string;
    fabric?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    limit: number;
  }) {
    const filters: string[] = [];
    if (opts.categoryId) filters.push(`categoryId = "${opts.categoryId}"`);
    if (opts.region) filters.push(`region = "${opts.region}"`);
    if (opts.fabric) filters.push(`fabric = "${opts.fabric}"`);
    if (opts.minPrice) filters.push(`minPricePaise >= ${opts.minPrice}`);
    if (opts.maxPrice) filters.push(`minPricePaise <= ${opts.maxPrice}`);

    return this.search.search(
      opts.q ?? "",
      {
        filter: filters.length ? filters.join(" AND ") : undefined,
        sort: opts.sort ? [opts.sort] : undefined,
      },
      opts.page,
      opts.limit,
    );
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug, status: ProductStatus.APPROVED, deletedAt: null },
      include: {
        vendor: { select: { id: true, businessName: true, slug: true, about: true } },
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isActive: true },
          include: { inventory: { select: { quantity: true, reservedQuantity: true } }, images: true },
        },
        images: { orderBy: { sortOrder: "asc" } },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, rating: true, title: true, body: true, imageUrls: true, createdAt: true },
        },
      },
    });

    if (!product) throw new NotFoundException("Product not found.");
    return product;
  }

  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: { children: { where: { isActive: true } } },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getFeaturedProducts(limit = 12) {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.APPROVED, deletedAt: null },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isActive: true }, select: { pricePaise: true, mrpPaise: true }, take: 1 },
      },
      orderBy: { qualityScore: "desc" },
      take: limit,
    });
  }
}

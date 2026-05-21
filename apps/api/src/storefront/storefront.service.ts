import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { MeilisearchService } from "../catalog/meilisearch.service.js";
import { RedisService } from "../redis/redis.service.js";

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: MeilisearchService,
    private readonly redis: RedisService,
  ) {}

  private async getAllCategories() {
    const cacheKey = "category:all";
    let cached: string | null = null;
    try { cached = await this.redis.get(cacheKey); } catch { /* Redis down, fallthrough */ }
    if (cached) {
      try { return JSON.parse(cached) as { id: string; parentId: string | null; isActive: boolean }[]; } catch { /* corrupt, fallthrough */ }
    }

    const categories = await this.prisma.category.findMany({
      select: { id: true, parentId: true, isActive: true },
    });
    try { await this.redis.setex(cacheKey, 300, JSON.stringify(categories)); } catch { /* non-fatal */ }
    return categories;
  }

  private async getDescendantCategoryIds(categoryId: string): Promise<string[]> {
    const all = await this.getAllCategories();
    const result: string[] = [];
    const visited = new Set<string>([categoryId]);
    const queue = [categoryId];
    while (queue.length) {
      const current = queue.shift()!;
      const children = all.filter((c) => c.parentId === current && c.isActive);
      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        result.push(child.id);
        queue.push(child.id);
      }
    }
    return result;
  }

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
    if (opts.categoryId) {
      const descendantIds = await this.getDescendantCategoryIds(opts.categoryId);
      const allIds = [opts.categoryId, ...descendantIds];
      filters.push(
        allIds.length === 1
          ? `categoryId = "${allIds[0]}"`
          : `categoryId IN [${allIds.map((id) => `"${id}"`).join(", ")}]`,
      );
    }
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
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
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

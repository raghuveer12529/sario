import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ProductStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { MeilisearchService } from "./meilisearch.service.js";
import { RedisService } from "../redis/redis.service.js";
import type { CreateProductDto } from "./dto/create-product.dto.js";

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: MeilisearchService,
    private readonly redis: RedisService,
  ) {}

  async create(vendorId: string, dto: CreateProductDto) {
    const slug = await this.buildUniqueSlug(dto.name);

    const product = await this.prisma.product.create({
      data: {
        vendorId,
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description,
        ...(dto.fabric ? { fabric: dto.fabric } : {}),
        ...(dto.region ? { region: dto.region } : {}),
        ...(dto.weaverStory ? { weaverStory: dto.weaverStory } : {}),
        ...(dto.giTag ? { giTag: dto.giTag } : {}),
        ...(dto.hsnCode ? { hsnCode: dto.hsnCode } : {}),
        tags: dto.tags ?? [],
        status: ProductStatus.PENDING_REVIEW,
        variants: {
          create: dto.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            ...(v.color ? { color: v.color } : {}),
            pricePaise: v.pricePaise,
            mrpPaise: v.mrpPaise,
            weightGrams: v.weightGrams ?? 0,
            inventory: { create: { quantity: v.quantity ?? 0 } },
          })),
        },
      },
      include: { variants: { include: { inventory: true } }, images: true },
    });

    return product;
  }

  async update(vendorId: string, productId: string, data: Partial<CreateProductDto>) {
    const product = await this.assertOwnership(vendorId, productId);

    const needsReview =
      product.status === ProductStatus.APPROVED ||
      product.status === ProductStatus.REJECTED;

    const updateData = {
      ...(needsReview ? { status: ProductStatus.PENDING_REVIEW } : {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.description ? { description: data.description } : {}),
      ...(data.fabric !== undefined ? { fabric: data.fabric } : {}),
      ...(data.region !== undefined ? { region: data.region } : {}),
      ...(data.weaverStory !== undefined ? { weaverStory: data.weaverStory } : {}),
      ...(data.tags ? { tags: data.tags } : {}),
    };

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: updateData,
    });
    await this.redis.del(`product:slug:${updatedProduct.slug}`).catch(() => {});
    return updatedProduct;
  }

  async softDelete(vendorId: string, productId: string) {
    await this.assertOwnership(vendorId, productId);
    const deleted = await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED },
    });
    await this.search.delete(productId);
    return deleted;
  }

  async listForVendor(
    vendorId: string,
    opts: { status?: ProductStatus; search?: string; page: number; limit: number },
  ) {
    const where = {
      vendorId,
      deletedAt: null,
      ...(opts.status && { status: opts.status }),
      ...(opts.search && { name: { contains: opts.search, mode: "insensitive" as const } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { variants: { select: { pricePaise: true, inventory: true } }, images: { where: { isPrimary: true }, take: 1 } },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { total, page: opts.page, limit: opts.limit, totalPages: Math.ceil(total / opts.limit) } };
  }

  // Called by admin approval flow
  async approveAndIndex(productId: string) {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.APPROVED, searchIndexedAt: new Date() },
      include: { variants: { select: { pricePaise: true } }, images: { where: { isPrimary: true }, take: 1 } },
    });

    await this.redis.del(`product:slug:${product.slug}`).catch(() => {});

    const minPricePaise = Math.min(...product.variants.map((v) => v.pricePaise));
    await this.search.upsert({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      fabric: product.fabric,
      region: product.region,
      tags: product.tags,
      occasion: product.occasion,
      categoryId: product.categoryId,
      vendorId: product.vendorId,
      minPricePaise,
      ...(product.images[0]?.url ? { primaryImageUrl: product.images[0].url } : {}),
    });

    return product;
  }

  private async buildUniqueSlug(name: string): Promise<string> {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const suffix = Date.now().toString(36);
    const candidate = `${base}-${suffix}`;
    const existing = await this.prisma.product.findUnique({ where: { slug: candidate } });
    return existing ? `${candidate}-2` : candidate;
  }

  private async assertOwnership(vendorId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException("Product not found.");
    if (product.vendorId !== vendorId) throw new ForbiddenException("Not your product.");
    return product;
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ProductStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { MeilisearchService } from "./meilisearch.service.js";
import { RedisService } from "../redis/redis.service.js";
import { VendorService } from "../vendor/vendor.service.js";
import type { CreateProductDto } from "./dto/create-product.dto.js";

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: MeilisearchService,
    private readonly redis: RedisService,
    private readonly vendor: VendorService,
  ) {}

  async create(userId: string, dto: CreateProductDto) {
    const vendorId = await this.vendor.resolveVendorId(userId);
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

  async update(userId: string, productId: string, data: Partial<CreateProductDto>) {
    const vendorId = await this.vendor.resolveVendorId(userId);
    const product = await this.assertOwnership(vendorId, productId);

    // Only content changes require re-moderation. Pure price/stock edits stay live so
    // vendors can restock or reprice without their listing going dark.
    const contentChanged =
      data.name !== undefined ||
      data.description !== undefined ||
      data.fabric !== undefined ||
      data.region !== undefined ||
      data.weaverStory !== undefined ||
      data.tags !== undefined;
    const needsReview =
      contentChanged &&
      (product.status === ProductStatus.APPROVED || product.status === ProductStatus.REJECTED);

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

    // Apply variant price / MRP / stock edits.
    if (data.variants?.length) {
      // Only variants that actually belong to this product may be edited by id.
      const owned = new Set(
        (await this.prisma.productVariant.findMany({ where: { productId }, select: { id: true } })).map(
          (x) => x.id,
        ),
      );
      for (const v of data.variants) {
        if (v.id) {
          if (!owned.has(v.id)) continue;
          await this.prisma.productVariant.update({
            where: { id: v.id },
            data: {
              name: v.name,
              sku: v.sku,
              ...(v.color !== undefined ? { color: v.color } : {}),
              pricePaise: v.pricePaise,
              mrpPaise: v.mrpPaise,
              ...(v.weightGrams !== undefined ? { weightGrams: v.weightGrams } : {}),
            },
          });
          if (v.quantity !== undefined) {
            await this.prisma.inventory.update({
              where: { variantId: v.id },
              data: { quantity: v.quantity },
            });
          }
        } else {
          await this.prisma.productVariant.create({
            data: {
              productId,
              name: v.name,
              sku: v.sku,
              ...(v.color ? { color: v.color } : {}),
              pricePaise: v.pricePaise,
              mrpPaise: v.mrpPaise,
              weightGrams: v.weightGrams ?? 0,
              inventory: { create: { quantity: v.quantity ?? 0 } },
            },
          });
        }
      }
    }

    await this.redis.del(`product:slug:${updatedProduct.slug}`).catch(() => {});
    // Keep search in sync: re-index if still approved (price/availability changed),
    // or drop from the index if the edit pushed it back into review.
    await this.syncSearchIndex(productId).catch(() => {});
    return updatedProduct;
  }

  async softDelete(userId: string, productId: string) {
    const vendorId = await this.vendor.resolveVendorId(userId);
    await this.assertOwnership(vendorId, productId);
    const deleted = await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED },
    });
    await this.search.delete(productId);
    return deleted;
  }

  async listForVendor(
    userId: string,
    opts: { status?: ProductStatus; search?: string; page: number; limit: number },
  ) {
    const vendorId = await this.vendor.resolveVendorId(userId);
    const where = {
      vendorId,
      deletedAt: null,
      ...(opts.status && { status: opts.status }),
      ...(opts.search && { name: { contains: opts.search, mode: "insensitive" as const } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          variants: { include: { inventory: { select: { quantity: true, reservedQuantity: true } } } },
          images: { where: { isPrimary: true }, take: 1 },
          category: { select: { id: true, name: true } },
        },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { total, page: opts.page, limit: opts.limit, totalPages: Math.ceil(total / opts.limit) } };
  }

  async getForVendor(userId: string, productId: string) {
    const vendorId = await this.vendor.resolveVendorId(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId, deletedAt: null },
      include: {
        variants: { include: { inventory: { select: { quantity: true, reservedQuantity: true } } } },
        images: true,
        category: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new NotFoundException("Product not found.");
    if (product.vendorId !== vendorId) throw new ForbiddenException("Not your product.");
    return product;
  }

  // Called by admin approval flow
  async approveAndIndex(productId: string) {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.APPROVED, searchIndexedAt: new Date() },
    });
    await this.redis.del(`product:slug:${product.slug}`).catch(() => {});
    await this.syncSearchIndex(productId);
    return product;
  }

  /** Upsert the product into search if APPROVED, otherwise remove it. Safe to call after any edit. */
  private async syncSearchIndex(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: { where: { isActive: true }, select: { pricePaise: true, mrpPaise: true } },
        images: { where: { isPrimary: true }, take: 1 },
        vendor: { select: { businessName: true, slug: true } },
      },
    });

    if (!product || product.status !== ProductStatus.APPROVED || product.deletedAt) {
      await this.search.delete(productId).catch(() => {});
      return;
    }
    if (product.variants.length === 0) {
      // No sellable variants — don't surface a product with a bogus price.
      await this.search.delete(productId).catch(() => {});
      return;
    }

    const minPricePaise = Math.min(...product.variants.map((v) => v.pricePaise));
    const maxMrpPaise = Math.max(...product.variants.map((v) => v.mrpPaise ?? 0));
    const searchIndexedAt = product.searchIndexedAt
      ? Math.floor(product.searchIndexedAt.getTime() / 1000)
      : Math.floor(Date.now() / 1000);
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
      vendorName: product.vendor.businessName,
      vendorSlug: product.vendor.slug,
      minPricePaise,
      ...(maxMrpPaise > 0 ? { mrpPaise: maxMrpPaise } : {}),
      searchIndexedAt,
      ...(product.images[0]?.url ? { primaryImageUrl: product.images[0].url } : {}),
    });
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

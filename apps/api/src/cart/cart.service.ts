import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import type { Prisma } from "@sario/db";
import { extractInclusiveGstPaise } from "@sario/shared";
import { PrismaService } from "../prisma/prisma.service.js";

const MAX_QTY_PER_ITEM = 10;

/** A cart belongs to either a logged-in user or an anonymous (cookie-keyed) guest. */
export type CartOwner = { userId: string } | { anonymousId: string };

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private ownerWhere(owner: CartOwner): Prisma.CartWhereUniqueInput {
    return "userId" in owner ? { userId: owner.userId } : { anonymousId: owner.anonymousId };
  }

  async getCart(owner: CartOwner) {
    const cart = await this.prisma.cart.upsert({
      where: this.ownerWhere(owner),
      create: owner,
      update: {},
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, slug: true, vendorId: true } },
                images: { where: { isPrimary: true }, take: 1 },
                inventory: { select: { quantity: true, reservedQuantity: true } },
              },
            },
          },
        },
      },
    });

    const subtotalPaise = cart.items.reduce((s, i) => s + i.pricePaise * i.quantity, 0);
    const shippingPaise = subtotalPaise >= 200000 ? 0 : subtotalPaise > 0 ? 5000 : 0;
    const totalPaise = subtotalPaise + shippingPaise;
    // Prices are tax-inclusive; surface the embedded GST for transparency (does not change total).
    const taxPaise = extractInclusiveGstPaise(subtotalPaise);

    return {
      ...cart,
      summary: {
        subtotalPaise,
        shippingPaise,
        taxPaise,
        totalPaise,
        itemCount: cart.items.length,
        freeShippingThreshold: 200000,
      },
    };
  }

  async addItem(owner: CartOwner, variantId: string, quantity: number) {
    if (quantity < 1) throw new BadRequestException("Quantity must be at least 1.");

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId, isActive: true },
      include: { inventory: true },
    });
    if (!variant) throw new NotFoundException("Variant not found.");

    const cart = await this.prisma.cart.upsert({
      where: this.ownerWhere(owner),
      create: owner,
      update: {},
    });

    // "Add" means add to the existing quantity, not replace it.
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    const desired = (existing?.quantity ?? 0) + quantity;

    if (desired > MAX_QTY_PER_ITEM) {
      throw new BadRequestException(`You can order at most ${MAX_QTY_PER_ITEM} of this item.`);
    }
    const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0);
    if (available < desired) {
      throw new BadRequestException(`Only ${available} unit(s) available.`);
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity: desired, pricePaise: variant.pricePaise },
      // Keep the price snapshot fresh; checkout re-validates against the live price anyway.
      update: { quantity: desired, pricePaise: variant.pricePaise },
    });

    return this.getCart(owner);
  }

  async updateItem(owner: CartOwner, variantId: string, quantity: number) {
    if (quantity < 1) return this.removeItem(owner, variantId);
    if (quantity > MAX_QTY_PER_ITEM) {
      throw new BadRequestException(`You can order at most ${MAX_QTY_PER_ITEM} of this item.`);
    }

    const cart = await this.prisma.cart.findUnique({ where: this.ownerWhere(owner) });
    if (!cart) throw new NotFoundException("Cart not found.");

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId, isActive: true },
      include: { inventory: true },
    });
    if (!variant) throw new NotFoundException("Variant not found.");

    const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0);
    if (available < quantity) {
      throw new BadRequestException(`Only ${available} unit(s) available.`);
    }

    await this.prisma.cartItem.update({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      data: { quantity, pricePaise: variant.pricePaise },
    });

    return this.getCart(owner);
  }

  async removeItem(owner: CartOwner, variantId: string) {
    const cart = await this.prisma.cart.findUnique({ where: this.ownerWhere(owner) });
    if (!cart) throw new NotFoundException("Cart not found.");

    await this.prisma.cartItem.delete({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    }).catch(() => null);

    return this.getCart(owner);
  }

  async clearCart(owner: CartOwner) {
    const cart = await this.prisma.cart.findUnique({ where: this.ownerWhere(owner) });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }

  /**
   * Merge a guest's anonymous cart into the user's cart on login, then discard the
   * anonymous cart. Quantities are added (capped/stock-checked via addItem).
   */
  async mergeAnonymousCart(anonymousId: string, userId: string) {
    const anon = await this.prisma.cart.findUnique({
      where: { anonymousId },
      include: { items: true },
    });
    if (anon) {
      for (const item of anon.items) {
        // Best-effort: skip items that are now out of stock / over the cap.
        await this.addItem({ userId }, item.variantId, item.quantity).catch(() => null);
      }
      await this.prisma.cart.delete({ where: { id: anon.id } }).catch(() => null);
    }
    return this.getCart({ userId });
  }
}

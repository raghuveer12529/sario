import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
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

    return {
      ...cart,
      summary: {
        subtotalPaise,
        shippingPaise,
        totalPaise,
        itemCount: cart.items.length,
        freeShippingThreshold: 200000,
      },
    };
  }

  async addItem(userId: string, variantId: string, quantity: number) {
    if (quantity < 1) throw new BadRequestException("Quantity must be at least 1.");

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId, isActive: true },
      include: { inventory: true },
    });
    if (!variant) throw new NotFoundException("Variant not found.");

    const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0);
    if (available < quantity) {
      throw new BadRequestException(`Only ${available} unit(s) available.`);
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity, pricePaise: variant.pricePaise },
      update: { quantity, pricePaise: variant.pricePaise },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: string, variantId: string, quantity: number) {
    if (quantity < 1) return this.removeItem(userId, variantId);

    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException("Cart not found.");

    await this.prisma.cartItem.update({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, variantId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException("Cart not found.");

    await this.prisma.cartItem.delete({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    }).catch(() => null);

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }
}

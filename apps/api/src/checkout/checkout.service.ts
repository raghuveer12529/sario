import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PaymentStatus, OrderStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { CartService } from "../cart/cart.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";
import { randomUUID } from "crypto";

export interface CheckoutInitDto {
  addressId: string;
  couponCode?: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly razorpay: RazorpayService,
  ) {}

  async initiate(userId: string, dto: CheckoutInitDto) {
    const cart = await this.cartService.getCart(userId);
    if (!cart.items.length) throw new BadRequestException("Cart is empty.");

    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId, userId, deletedAt: null },
    });
    if (!address) throw new NotFoundException("Address not found.");

    // Validate stock
    for (const item of cart.items) {
      const available =
        (item.variant.inventory?.quantity ?? 0) -
        (item.variant.inventory?.reservedQuantity ?? 0);
      if (available < item.quantity) {
        throw new BadRequestException(
          `"${item.variant.product.name}" has only ${available} unit(s) available.`,
        );
      }
    }

    // Reserve inventory
    await Promise.all(
      cart.items.map((item) =>
        this.prisma.inventory.update({
          where: { variantId: item.variantId },
          data: { reservedQuantity: { increment: item.quantity } },
        }),
      ),
    );

    const subtotalPaise = cart.items.reduce((s, i) => s + i.pricePaise * i.quantity, 0);
    const shippingPaise = subtotalPaise >= 200000 ? 0 : 5000;
    const totalPaise = subtotalPaise + shippingPaise;
    const idempotencyKey = randomUUID();
    const checkoutNote = `checkout:${idempotencyKey}`;

    // Group items by vendor
    const vendorGroups = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const vid = item.variant.product.vendorId;
      vendorGroups.set(vid, [...(vendorGroups.get(vid) ?? []), item]);
    }

    const addressSnapshot = {
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
    };

    // Create one PENDING Order per vendor
    const orders = await Promise.all(
      [...vendorGroups.entries()].map(async ([vendorId, items], index) => {
        const vendorSubtotal = items.reduce((s, i) => s + i.pricePaise * i.quantity, 0);
        const orderShippingPaise = index === 0 ? shippingPaise : 0;
        return this.prisma.order.create({
          data: {
            userId,
            vendorId,
            addressId: address.id,
            addressSnapshot,
            status: OrderStatus.PENDING,
            subtotalPaise: vendorSubtotal,
            shippingPaise: orderShippingPaise,
            totalPaise: vendorSubtotal + orderShippingPaise,
            notes: checkoutNote,
            items: {
              create: items.map((i) => ({
                variantId: i.variantId,
                productSnapshot: {
                  productName: i.variant.product.name,
                  variantName: i.variant.name,
                  sku: i.variant.sku,
                },
                quantity: i.quantity,
                unitPricePaise: i.pricePaise,
                totalPaise: i.pricePaise * i.quantity,
              })),
            },
          },
        });
      }),
    );

    const rzOrder = await this.razorpay.createOrder(totalPaise, idempotencyKey);

    const paymentOrder = orders[0];
    if (!paymentOrder) throw new BadRequestException("No orders were created.");

    // Create payment linked to first order (payment covers all vendor orders)
    await this.prisma.payment.create({
      data: {
        orderId: paymentOrder.id,
        razorpayOrderId: rzOrder.id,
        amountPaise: totalPaise,
        idempotencyKey,
        status: PaymentStatus.CREATED,
      },
    });

    return {
      razorpayOrderId: rzOrder.id,
      amountPaise: totalPaise,
      currency: "INR",
      orderIds: orders.map((o) => o.id),
    };
  }

  async handleWebhook(rawBody: string, signature: string) {
    if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException("Invalid webhook signature.");
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      payload: { payment: { entity: { id: string; order_id: string; status: string } } };
    };

    const { entity } = event.payload.payment;

    if (event.event === "payment.captured") {
      await this.confirmPayment(entity.order_id, entity.id);
    } else if (event.event === "payment.failed") {
      await this.prisma.payment.updateMany({
        where: { razorpayOrderId: entity.order_id },
        data: { status: PaymentStatus.FAILED, failureReason: "Payment failed via webhook" },
      });
      await this.releaseInventoryForRazorpayOrder(entity.order_id);
    }
  }

  async verifyAndConfirm(userId: string, dto: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    const isValid = this.razorpay.verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    if (!isValid) {
      throw new UnauthorizedException("Invalid payment signature.");
    }

    await this.confirmPayment(dto.razorpayOrderId, dto.razorpayPaymentId);
    return { success: true };
  }

  /** Called by both webhook and the dev bypass endpoint */
  async confirmPayment(razorpayOrderId: string, razorpayPaymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { razorpayOrderId } });
    if (!payment || payment.status === PaymentStatus.CAPTURED) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId,
        status: PaymentStatus.CAPTURED,
        capturedAt: new Date(),
      },
    });

    const anchorOrder = await this.prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!anchorOrder) return;

    const orderGroupWhere = anchorOrder.notes
      ? { userId: anchorOrder.userId, notes: anchorOrder.notes }
      : { id: anchorOrder.id };

    await this.prisma.order.updateMany({
      where: {
        ...orderGroupWhere,
        status: OrderStatus.PENDING,
      },
      data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
    });

    // Clear cart
    await this.cartService.clearCart(anchorOrder.userId);

    this.logger.log(`Payment confirmed: ${razorpayOrderId} → orders confirmed for user ${anchorOrder.userId}`);
  }

  private async releaseInventoryForRazorpayOrder(razorpayOrderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: { order: true },
    });
    if (!payment) return;

    const orders = await this.prisma.order.findMany({
      where: payment.order.notes
        ? { userId: payment.order.userId, notes: payment.order.notes }
        : { id: payment.order.id },
      include: { items: true },
    });

    for (const item of orders.flatMap((order) => order.items)) {
      await this.prisma.inventory.update({
        where: { variantId: item.variantId },
        data: { reservedQuantity: { decrement: item.quantity } },
      }).catch(() => null);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcileOrphanPayments() {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const orphans = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.CREATED, createdAt: { lt: cutoff } },
    });

    for (const p of orphans) {
      try {
        const rz = await this.razorpay.fetchPayment(p.razorpayOrderId);
        if (rz.status === "captured") {
          await this.confirmPayment(p.razorpayOrderId, p.razorpayOrderId);
        } else if (rz.status === "failed") {
          await this.prisma.payment.update({
            where: { id: p.id },
            data: { status: PaymentStatus.FAILED, failureReason: "Reconciled as failed" },
          });
        }
      } catch (err) {
        this.logger.error(`Reconciliation failed for payment ${p.id}:`, err);
      }
    }
  }
}

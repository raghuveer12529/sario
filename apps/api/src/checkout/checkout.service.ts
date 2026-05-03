import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
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

    // Validate stock and lock inventory
    for (const item of cart.items) {
      const available =
        (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reservedQuantity ?? 0);
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

    // Calculate totals (simplified: no GST split for now)
    const subtotalPaise = cart.items.reduce((sum, i) => sum + i.pricePaise * i.quantity, 0);
    const shippingPaise = subtotalPaise >= 200000 ? 0 : 5000; // free shipping above ₹2,000
    const totalPaise = subtotalPaise + shippingPaise;

    const idempotencyKey = randomUUID();
    const rzOrder = await this.razorpay.createOrder(totalPaise, idempotencyKey);

    // Group items by vendor (create one order per vendor)
    const vendorGroups = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const vendorId = item.variant.product.id; // TODO: look up vendorId from product
      const g = vendorGroups.get(vendorId) ?? [];
      g.push(item);
      vendorGroups.set(vendorId, g);
    }

    // Create payment record (order created after webhook confirms payment)
    const payment = await this.prisma.payment.create({
      data: {
        orderId: "pending", // placeholder until order is created post-payment
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
      paymentId: payment.id,
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
      await this.releaseInventoryForOrder(entity.order_id);
    }
  }

  private async confirmPayment(razorpayOrderId: string, razorpayPaymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { razorpayOrderId } });
    if (!payment || payment.status === PaymentStatus.CAPTURED) return;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { razorpayPaymentId, status: PaymentStatus.CAPTURED, capturedAt: new Date() },
    });
    // TODO: create Order records from cart snapshot (simplified here)
  }

  private async releaseInventoryForOrder(razorpayOrderId: string) {
    this.logger.warn(`Releasing inventory for failed order ${razorpayOrderId}`);
    // In prod: look up cart items linked to this payment and decrement reservedQuantity
  }

  /** Reconcile payments older than 10 min that are still CREATED */
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

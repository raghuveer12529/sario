import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PaymentStatus, OrderStatus } from "@sario/db";
import { extractInclusiveGstPaise } from "@sario/shared";
import { PrismaService } from "../prisma/prisma.service.js";
import { CartService } from "../cart/cart.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";
import { RedisService } from "../redis/redis.service.js";
import { PayoutService } from "../payout/payout.service.js";
import { captureException } from "../observability/sentry.js";
import { randomUUID } from "crypto";

export interface CheckoutInitDto {
  addressId: string;
  /** Client-supplied key (Idempotency-Key header) so retries don't duplicate orders. */
  idempotencyKey?: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly razorpay: RazorpayService,
    private readonly redis: RedisService,
    private readonly payouts: PayoutService,
  ) {}

  async initiate(userId: string, dto: CheckoutInitDto) {
    const idempotencyKey = dto.idempotencyKey ?? randomUUID();

    // Idempotency: a retry with the same key returns the original checkout instead of
    // re-reserving stock and creating duplicate orders.
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      const priorOrders = await this.prisma.order.findMany({
        where: { userId, checkoutGroupId: idempotencyKey },
        select: { id: true },
      });
      return {
        razorpayOrderId: existing.razorpayOrderId,
        amountPaise: existing.amountPaise,
        currency: "INR",
        orderIds: priorOrders.map((o) => o.id),
      };
    }

    const cart = await this.cartService.getCart({ userId });
    if (!cart.items.length) throw new BadRequestException("Cart is empty.");

    const address = await this.prisma.address.findUnique({
      where: { id: dto.addressId, userId, deletedAt: null },
    });
    if (!address) throw new NotFoundException("Address not found.");

    // Guard against stale cart prices: if a vendor changed a price since the item was
    // added, refresh the cart to the live price and make the buyer re-confirm — never
    // silently charge a price different from what was shown.
    const stale = cart.items.filter((i) => i.pricePaise !== i.variant.pricePaise);
    if (stale.length) {
      await Promise.all(
        stale.map((i) =>
          this.prisma.cartItem.update({
            where: { cartId_variantId: { cartId: i.cartId, variantId: i.variantId } },
            data: { pricePaise: i.variant.pricePaise },
          }),
        ),
      );
      throw new BadRequestException("Some prices changed since you added them. Please review your cart.");
    }

    // Atomically reserve inventory. The conditional UPDATE (quantity - reserved >= qty)
    // executes as a single locked statement per row, so two concurrent checkouts cannot
    // both reserve the last unit. If any item is short, the transaction rolls back and
    // every prior reservation in this checkout is released.
    await this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const affected = await tx.$executeRaw`
          UPDATE "Inventory"
          SET "reservedQuantity" = "reservedQuantity" + ${item.quantity}
          WHERE "variantId" = ${item.variantId}
            AND "quantity" - "reservedQuantity" >= ${item.quantity}
        `;
        if (affected === 0) {
          throw new BadRequestException(
            `"${item.variant.product.name}" does not have enough stock.`,
          );
        }
      }
    });

    const subtotalPaise = cart.items.reduce((s, i) => s + i.pricePaise * i.quantity, 0);
    const shippingPaise = subtotalPaise >= 200000 ? 0 : 5000;
    const totalPaise = subtotalPaise + shippingPaise;

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
            // Prices are GST-inclusive; record the embedded tax for invoicing (total unchanged).
            taxPaise: extractInclusiveGstPaise(vendorSubtotal),
            totalPaise: vendorSubtotal + orderShippingPaise,
            checkoutGroupId: idempotencyKey,
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
      event_id?: string;
      payload: { payment: { entity: { id: string; order_id: string; status: string } } };
    };

    const { entity } = event.payload.payment;

    // Idempotency: use event_id if present, fall back to payment entity id; include event type to avoid collision
    const idempotencyKey = `webhook:${event.event}:${event.event_id ?? entity.id}`;
    let acquired = false;
    try {
      acquired = (await this.redis.set(idempotencyKey, "1", "EX", 259200, "NX")) === "OK";
    } catch {
      // Redis unavailable — proceed without dedup (better than dropping all webhooks)
      acquired = true;
    }

    if (!acquired) {
      this.logger.warn(`Duplicate webhook ignored: ${idempotencyKey}`);
      return;
    }

    if (event.event === "payment.captured") {
      await this.confirmPayment(entity.order_id, entity.id);
    } else if (event.event === "payment.failed") {
      const payment = await this.prisma.payment.findUnique({
        where: { razorpayOrderId: entity.order_id },
      });
      if (payment && payment.status !== PaymentStatus.CAPTURED) {
        await this.failAndRelease(payment.id, entity.order_id, "Payment failed via webhook");
      }
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

    const orderGroupWhere = anchorOrder.checkoutGroupId
      ? { userId: anchorOrder.userId, checkoutGroupId: anchorOrder.checkoutGroupId }
      : { id: anchorOrder.id };

    await this.prisma.order.updateMany({
      where: {
        ...orderGroupWhere,
        status: OrderStatus.PENDING,
      },
      data: { status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
    });

    // Convert the reservation into a real stock decrement. The CAPTURED guard above
    // makes this run exactly once per payment, so it is idempotent.
    const groupOrders = await this.prisma.order.findMany({
      where: orderGroupWhere,
      include: { items: { select: { variantId: true, quantity: true } } },
    });
    for (const item of groupOrders.flatMap((o) => o.items)) {
      await this.prisma.inventory
        .update({
          where: { variantId: item.variantId },
          data: {
            quantity: { decrement: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        })
        .catch((err) => {
          this.logger.error(`Inventory write failed for variant ${item.variantId}`, err);
          captureException(err, { variantId: item.variantId });
          return null;
        });
    }

    // Split the captured payment to each vendor's Route account, retaining commission.
    // Per-order failures are recorded as FAILED payouts internally and never thrown,
    // so this must not break order confirmation for the buyer.
    await this.payouts.createPayoutsForGroup(
      razorpayPaymentId,
      groupOrders.map((o) => ({ id: o.id, vendorId: o.vendorId, totalPaise: o.totalPaise })),
      payment.id,
    );

    // Clear cart
    await this.cartService.clearCart({ userId: anchorOrder.userId });

    this.logger.log(`Payment confirmed: ${razorpayOrderId} → orders confirmed for user ${anchorOrder.userId}`);
  }

  private async releaseInventoryForRazorpayOrder(razorpayOrderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: { order: true },
    });
    if (!payment) return;

    const orders = await this.prisma.order.findMany({
      where: payment.order.checkoutGroupId
        ? { userId: payment.order.userId, checkoutGroupId: payment.order.checkoutGroupId }
        : { id: payment.order.id },
      include: { items: true },
    });

    for (const item of orders.flatMap((order) => order.items)) {
      await this.prisma.inventory.update({
        where: { variantId: item.variantId },
        data: { reservedQuantity: { decrement: item.quantity } },
      }).catch((err) => {
        this.logger.error(`Inventory write failed for variant ${item.variantId}`, err);
        captureException(err, { variantId: item.variantId });
        return null;
      });
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcileOrphanPayments() {
    const now = Date.now();
    const cutoff = new Date(now - 10 * 60 * 1000);
    const abandonCutoff = new Date(now - 30 * 60 * 1000);
    const orphans = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.CREATED, createdAt: { lt: cutoff } },
    });

    for (const p of orphans) {
      try {
        const rz = await this.razorpay.fetchPayment(p.razorpayOrderId);
        if (rz.status === "captured") {
          await this.confirmPayment(p.razorpayOrderId, p.razorpayOrderId);
        } else if (rz.status === "failed") {
          await this.failAndRelease(p.id, p.razorpayOrderId, "Reconciled as failed");
        } else if (p.createdAt < abandonCutoff) {
          // Still unpaid 30+ min after creation — treat as abandoned and free the hold
          await this.failAndRelease(p.id, p.razorpayOrderId, "Abandoned checkout — reservation released");
        }
      } catch (err) {
        this.logger.error(`Reconciliation failed for payment ${p.id}:`, err);
      }
    }
  }

  /** Mark a payment failed, release its reserved stock, and cancel the pending orders. */
  private async failAndRelease(paymentId: string, razorpayOrderId: string, reason: string) {
    await this.releaseInventoryForRazorpayOrder(razorpayOrderId);
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED, failureReason: reason },
    });

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;
    const anchor = await this.prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!anchor) return;
    const where = anchor.checkoutGroupId
      ? { userId: anchor.userId, checkoutGroupId: anchor.checkoutGroupId }
      : { id: anchor.id };
    await this.prisma.order.updateMany({
      where: { ...where, status: OrderStatus.PENDING },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason },
    });
  }
}

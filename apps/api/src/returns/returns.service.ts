import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { OrderStatus, RefundStatus, PaymentStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";
import { VendorService } from "../vendor/vendor.service.js";

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly vendor: VendorService,
  ) {}

  // ─── Buyer ─────────────────────────────────────────────────────────────────

  async initiateReturn(userId: string, orderId: string, reason: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.userId !== userId) throw new ForbiddenException();
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException("Only DELIVERED orders can be returned.");
    }
    const windowMs = 7 * 24 * 3600 * 1000;
    if (!order.deliveredAt || Date.now() - order.deliveredAt.getTime() > windowMs) {
      throw new BadRequestException("Return window expired.");
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.RETURN_REQUESTED, notes: reason },
    });
  }

  // ─── Vendor ────────────────────────────────────────────────────────────────

  async approveReturn(userId: string, orderId: string) {
    const vendorId = await this.vendor.resolveVendorId(userId);
    const order = await this.assertVendorOrder(vendorId, orderId);
    if (order.status !== OrderStatus.RETURN_REQUESTED) {
      throw new BadRequestException("No pending return request.");
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.RETURN_APPROVED },
    });
  }

  async rejectReturn(userId: string, orderId: string, reason: string) {
    const vendorId = await this.vendor.resolveVendorId(userId);
    const order = await this.assertVendorOrder(vendorId, orderId);
    if (order.status !== OrderStatus.RETURN_REQUESTED) {
      throw new BadRequestException("No pending return request.");
    }
    // Vendor has 48h to reject; after that, admin can escalate
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.RETURN_REJECTED, notes: reason },
    });
  }

  // ─── Admin / post-QC refund ─────────────────────────────────────────────────

  async processRefund(orderId: string, amountPaise?: number) {
    const refund = await this.issueRefund(orderId, amountPaise, "Return approved");
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.REFUNDED },
    });
    return refund;
  }

  /**
   * Reusable refund core: group-aware payment lookup, idempotent, capped at the order
   * total and the payment's remaining refundable balance. Restocks the order's items.
   * Does NOT change order status — the caller decides REFUNDED vs CANCELLED.
   */
  async issueRefund(orderId: string, amountPaise: number | undefined, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { variantId: true, quantity: true } } },
    });
    if (!order) throw new NotFoundException();

    // Idempotency: never refund an order twice.
    const existing = await this.prisma.refund.findFirst({
      where: { orderId, status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSED] } },
    });
    if (existing) return existing;

    const payment = await this.findGroupPayment(order);
    if (!payment) throw new BadRequestException("No captured payment found.");
    if (!payment.razorpayPaymentId) throw new BadRequestException("Missing Razorpay payment ID.");

    // Cap: this order's total, and never more than the payment's remaining refundable balance.
    const priorRefundsPaise = await this.sumPaymentRefunds(payment.id);
    const remainingPaise = payment.amountPaise - priorRefundsPaise;
    const requested = amountPaise ?? order.totalPaise;
    const refundAmount = Math.min(requested, order.totalPaise, remainingPaise);
    if (refundAmount <= 0) {
      throw new BadRequestException("Nothing left to refund on this payment.");
    }

    const rzRefund = await this.razorpay.createRefund(payment.razorpayPaymentId, refundAmount);

    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        paymentId: payment.id,
        razorpayRefundId: rzRefund.id,
        amountPaise: refundAmount,
        reason,
        status: RefundStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    // Return the units to sellable stock.
    for (const item of order.items) {
      await this.prisma.inventory
        .update({
          where: { variantId: item.variantId },
          data: { quantity: { increment: item.quantity } },
        })
        .catch(() => null);
    }

    return refund;
  }

  /** Find the captured payment for an order's checkout group (payment sits on the anchor order). */
  private async findGroupPayment(order: { id: string; userId: string; checkoutGroupId: string | null }) {
    const own = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: PaymentStatus.CAPTURED },
    });
    if (own) return own;
    if (!order.checkoutGroupId) return null;

    const groupOrders = await this.prisma.order.findMany({
      where: { userId: order.userId, checkoutGroupId: order.checkoutGroupId },
      select: { id: true },
    });
    return this.prisma.payment.findFirst({
      where: { orderId: { in: groupOrders.map((o) => o.id) }, status: PaymentStatus.CAPTURED },
    });
  }

  private async sumPaymentRefunds(paymentId: string): Promise<number> {
    const agg = await this.prisma.refund.aggregate({
      where: { paymentId, status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSED] } },
      _sum: { amountPaise: true },
    });
    return agg._sum.amountPaise ?? 0;
  }

  private async assertVendorOrder(vendorId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException();
    if (order.vendorId !== vendorId) throw new ForbiddenException();
    return order;
  }
}

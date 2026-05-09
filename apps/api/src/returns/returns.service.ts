import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { OrderStatus, RefundStatus, PaymentStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
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

  async approveReturn(vendorId: string, orderId: string) {
    const order = await this.assertVendorOrder(vendorId, orderId);
    if (order.status !== OrderStatus.RETURN_REQUESTED) {
      throw new BadRequestException("No pending return request.");
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.RETURN_APPROVED },
    });
  }

  async rejectReturn(vendorId: string, orderId: string, reason: string) {
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
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { where: { status: PaymentStatus.CAPTURED } } },
    });
    if (!order) throw new NotFoundException();

    const payment = order.payments[0];
    if (!payment) throw new BadRequestException("No captured payment found.");
    if (!payment.razorpayPaymentId) throw new BadRequestException("Missing Razorpay payment ID.");

    const refundAmount = amountPaise ?? order.totalPaise;

    const rzRefund = await this.razorpay.createRefund(payment.razorpayPaymentId, refundAmount);

    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        paymentId: payment.id,
        razorpayRefundId: rzRefund.id,
        amountPaise: refundAmount,
        reason: "Return approved",
        status: RefundStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.REFUNDED },
    });

    return refund;
  }

  private async assertVendorOrder(vendorId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException();
    if (order.vendorId !== vendorId) throw new ForbiddenException();
    return order;
  }
}

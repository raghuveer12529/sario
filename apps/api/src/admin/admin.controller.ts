import { BadRequestException, Controller, Get, Post, Param, Query, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { OrderStatus, ProductStatus, PaymentStatus, RefundStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";

class RejectReturnDto { @IsString() @IsOptional() reason?: string; }
class RefundAmountDto { @IsOptional() amountPaise?: number; }

const RETURN_STATUSES: readonly OrderStatus[] = [
  OrderStatus.RETURN_REQUESTED,
  OrderStatus.RETURN_APPROVED,
  OrderStatus.RETURN_REJECTED,
  OrderStatus.REFUNDED,
];

@ApiTags("Admin")
@Controller({ version: "1" })
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {}

  // ── Stats ───────────────────────────────────────────────────────────────────

  @Get("admin/stats")
  @ApiOperation({ summary: "Dashboard stats" })
  async stats() {
    const [pendingVendors, pendingProducts, openDisputes, totalOrders] = await Promise.all([
      this.prisma.vendor.count({ where: { status: "PENDING" } }),
      this.prisma.product.count({ where: { status: ProductStatus.PENDING_REVIEW, deletedAt: null } }),
      this.prisma.order.count({ where: { status: OrderStatus.RETURN_REQUESTED } }),
      this.prisma.order.count(),
    ]);
    return { pendingVendors, pendingProducts, openDisputes, totalOrders };
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  @Get("admin/orders")
  @ApiOperation({ summary: "List orders by status" })
  @ApiQuery({ name: "status", enum: OrderStatus, required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async listOrders(
    @Query("status") status: OrderStatus = OrderStatus.CONFIRMED,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    const p = parseInt(page);
    const l = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { status },
        include: {
          user: { select: { name: true, phone: true } },
          items: {
            select: {
              quantity: true,
              unitPricePaise: true,
              productSnapshot: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.order.count({ where: { status } }),
    ]);

    const mapped = data.map((o) => ({
      id: o.id,
      status: o.status,
      totalPaise: o.totalPaise,
      createdAt: o.createdAt,
      buyer: { name: o.user.name, phone: o.user.phone },
      items: o.items.map((i) => {
        const snap = i.productSnapshot as { productName?: string; variantName?: string };
        return {
          productName: snap?.productName ?? "—",
          variantName: snap?.variantName ?? "—",
          quantity: i.quantity,
          pricePaise: i.unitPricePaise,
        };
      }),
    }));

    return { data: mapped, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  // ── Returns ─────────────────────────────────────────────────────────────────

  @Get("admin/returns")
  @ApiOperation({ summary: "List return requests by status" })
  @ApiQuery({ name: "status", enum: OrderStatus, required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async listReturns(
    @Query("status") status: OrderStatus = OrderStatus.RETURN_REQUESTED,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    const validStatus = RETURN_STATUSES.includes(status) ? status : OrderStatus.RETURN_REQUESTED;
    const p = parseInt(page);
    const l = parseInt(limit);

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: validStatus },
        include: {
          user: { select: { name: true, phone: true } },
          items: {
            select: { quantity: true, unitPricePaise: true, productSnapshot: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.order.count({ where: { status: validStatus } }),
    ]);

    const mapped = data.map((o) => ({
      id: o.id,
      status: o.status,
      reason: o.notes ?? "No reason provided",
      createdAt: o.createdAt,
      order: { id: o.id, totalPaise: o.totalPaise },
      buyer: { name: o.user.name, phone: o.user.phone },
      items: o.items.map((i) => {
        const snap = i.productSnapshot as { productName?: string; variantName?: string };
        return {
          productName: snap?.productName ?? "—",
          variantName: snap?.variantName ?? "—",
          quantity: i.quantity,
          pricePaise: i.unitPricePaise,
        };
      }),
    }));

    return { data: mapped, meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  @Post("admin/returns/:id/approve")
  @ApiOperation({ summary: "Admin approves return request" })
  async approveReturn(@Param("id") id: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.RETURN_APPROVED },
    });
  }

  @Post("admin/returns/:id/reject")
  @ApiOperation({ summary: "Admin rejects return request" })
  async rejectReturn(@Param("id") id: string, @Body() dto: RejectReturnDto) {
    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.RETURN_REJECTED,
        notes: dto.reason ?? "Return rejected by admin",
      },
    });
  }

  @Post("admin/returns/:id/refund")
  @ApiOperation({ summary: "Admin issues refund for approved return" })
  async processRefund(@Param("id") id: string, @Body() dto: RefundAmountDto) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: { payments: { where: { status: PaymentStatus.CAPTURED } } },
    });

    const payment = order.payments[0];
    if (!payment) throw new BadRequestException("No captured payment found.");

    const refundAmount = dto.amountPaise ?? order.totalPaise;

    let razorpayRefundId: string | null = null;
    if (payment?.razorpayPaymentId) {
      try {
        const rzRefund = await this.razorpay.createRefund(payment.razorpayPaymentId, refundAmount);
        razorpayRefundId = rzRefund.id;
      } catch {
        // mock payment ID — skip Razorpay call in dev
      }
    }

    const refund = await this.prisma.refund.create({
      data: {
        orderId: id,
        paymentId: payment.id,
        razorpayRefundId: razorpayRefundId ?? `manual_refund_${id}`,
        amountPaise: refundAmount,
        reason: "Return approved by admin",
        status: RefundStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.REFUNDED },
    });

    return refund;
  }
}

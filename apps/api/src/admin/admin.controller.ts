import { Controller, Get, Post, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min } from "class-validator";
import { OrderStatus, ProductStatus } from "@sario/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { ReturnsService } from "../returns/returns.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";

class RejectReturnDto { @IsString() @IsOptional() reason?: string; }
class RefundAmountDto { @IsInt() @Min(1) @IsOptional() amountPaise?: number; }

const RETURN_STATUSES: readonly OrderStatus[] = [
  OrderStatus.RETURN_REQUESTED,
  OrderStatus.RETURN_APPROVED,
  OrderStatus.RETURN_REJECTED,
  OrderStatus.REFUNDED,
];

@ApiTags("Admin")
@Controller({ version: "1" })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "SUPPORT")
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly returnsService: ReturnsService,
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
    // Delegate to the single source of truth: group-aware, idempotent, capped refunds.
    return this.returnsService.processRefund(id, dto.amountPaise);
  }
}

import { Controller, Get, Post, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";
import { ProductStatus } from "@sario/db";
import { ProductService } from "./product.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";

class RejectProductDto {
  @IsString() @IsOptional() reason?: string;
}

@ApiTags("Admin — Products")
@Controller({ path: "admin/products", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List products by status" })
  list(
    @Query("status") status: ProductStatus = ProductStatus.PENDING_REVIEW,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    const p = parseInt(page);
    const l = parseInt(limit);
    const skip = (p - 1) * l;
    return this.prisma.product.findMany({
      where: { status, deletedAt: null },
      include: {
        vendor: { select: { businessName: true } },
        category: { select: { name: true } },
      },
      skip,
      take: l,
      orderBy: { createdAt: "asc" },
    });
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Approve product and index in Meilisearch" })
  approve(@Param("id") id: string) {
    return this.productService.approveAndIndex(id);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Reject product with reason" })
  async reject(@Param("id") id: string, @Body() dto: RejectProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.REJECTED, rejectionReason: dto.reason ?? null },
    });
  }

}

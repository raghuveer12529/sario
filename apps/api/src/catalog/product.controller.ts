import {
  Controller, Post, Patch, Delete, Get,
  Body, Param, Query, UseGuards,
  ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { ProductStatus } from "@sario/db";
import { ProductService } from "./product.service.js";
import { CreateProductDto } from "./dto/create-product.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

@ApiTags("Products (Vendor)")
@Controller({ path: "vendors/me/products", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: "Create a new product listing" })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateProductDto) {
    return this.productService.create(user.id, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a product" })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.productService.update(user.id, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete a product" })
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.productService.softDelete(user.id, id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single vendor product by ID" })
  getOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.productService.getForVendor(user.id, id);
  }

  @Get()
  @ApiOperation({ summary: "List own products with optional filters" })
  @ApiQuery({ name: "status", enum: ProductStatus, required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query("status") status?: ProductStatus,
    @Query("search") search?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.productService.listForVendor(user.id, {
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
      page,
      limit,
    });
  }
}

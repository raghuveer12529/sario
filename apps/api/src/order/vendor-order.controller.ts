import {
  Controller, Get, Post, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { OrderStatus } from "@sario/db";
import { OrderService } from "./order.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

@ApiTags("Orders (Vendor)")
@Controller({ path: "vendors/me/orders", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiQuery({ name: "status", enum: OrderStatus, required: false })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: OrderStatus,
  ) {
    return this.orderService.listForVendor(user.id, page, limit, status);
  }

  @Post(":id/advance")
  @ApiOperation({ summary: "Advance order status (CONFIRMED→PACKED→SHIPPED)" })
  advance(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.orderService.advanceOrderStatus(user.id, id);
  }

  @Post(":id/ship")
  @ApiOperation({ summary: "Create Shiprocket shipment" })
  ship(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.orderService.createShipment(user.id, id);
  }
}

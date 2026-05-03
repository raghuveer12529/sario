import {
  Controller, Get, Post, Param, Query,
  UseGuards, Version, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { OrderService } from "./order.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

@ApiTags("Orders (Vendor)")
@Controller("vendors/me/orders")
@Version("1")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.orderService.listForVendor(user.id, page, limit);
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

import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { OrderService } from "./order.service.js";
import { JwtUserAuthGuard } from "../auth/guards/jwt-user-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

class CancelOrderDto { @IsString() reason: string; }

@ApiTags("Orders (Buyer)")
@Controller({ path: "me/orders", version: "1" })
@UseGuards(JwtUserAuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.orderService.listForBuyer(user.id, page, limit);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order detail" })
  getOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.orderService.getOrderForBuyer(user.id, id);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string, @Body() dto: CancelOrderDto) {
    return this.orderService.cancelOrder(user.id, id, dto.reason);
  }

}

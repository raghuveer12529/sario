import { Controller, Post, Body, Headers, UseGuards, Version, RawBodyRequest, Req } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";
import { CheckoutService } from "./checkout.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";
import type { FastifyRequest } from "fastify";

class InitiateCheckoutDto {
  @IsString() addressId: string;
  @IsString() @IsOptional() couponCode?: string;
}

@ApiTags("Checkout")
@Controller("checkout")
@Version("1")
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post("initiate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Initiate checkout — returns Razorpay order details" })
  initiate(@CurrentUser() user: CurrentUserPayload, @Body() dto: InitiateCheckoutDto) {
    return this.checkoutService.initiate(user.id, dto);
  }

  @Post("webhook/razorpay")
  @ApiOperation({ summary: "Razorpay webhook receiver (no auth — signature verified internally)" })
  webhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers("x-razorpay-signature") signature: string,
  ) {
    const rawBody = (req.rawBody as Buffer | undefined)?.toString("utf8") ?? "{}";
    return this.checkoutService.handleWebhook(rawBody, signature);
  }
}

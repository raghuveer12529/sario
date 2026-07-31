import { Controller, Post, Body, Headers, Param, UseGuards, RawBodyRequest, Req } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { IsString } from "class-validator";
import { ConfigService } from "@nestjs/config";
import { CheckoutService } from "./checkout.service.js";
import { JwtUserAuthGuard } from "../auth/guards/jwt-user-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";
import type { FastifyRequest } from "fastify";

class InitiateCheckoutDto {
  @IsString() addressId: string;
}

class VerifyPaymentDto {
  @IsString() razorpayOrderId: string;
  @IsString() razorpayPaymentId: string;
  @IsString() razorpaySignature: string;
}

@ApiTags("Checkout")
@Controller({ path: "checkout", version: "1" })
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly config: ConfigService,
  ) {}

  @Post("initiate")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Initiate checkout — returns Razorpay order details" })
  initiate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InitiateCheckoutDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.checkoutService.initiate(user.id, {
      ...dto,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
  }

  @Post("webhook/razorpay")
  @SkipThrottle()
  @ApiOperation({ summary: "Razorpay webhook receiver (no auth — signature verified internally)" })
  webhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers("x-razorpay-signature") signature: string,
  ) {
    const rawBody = req.rawBody?.toString("utf8") ?? "{}";
    return this.checkoutService.handleWebhook(rawBody, signature);
  }

  @Post("verify")
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify Razorpay payment signature and confirm order" })
  async verify(@CurrentUser() user: CurrentUserPayload, @Body() dto: VerifyPaymentDto) {
    return this.checkoutService.verifyAndConfirm(user.id, dto);
  }

  /** Dev-only: simulate payment capture without Razorpay. Disabled in production. */
  @Post("dev/confirm/:razorpayOrderId")
  @ApiOperation({ summary: "[DEV] Manually confirm a mock Razorpay order" })
  async devConfirm(@Param("razorpayOrderId") razorpayOrderId: string) {
    if (this.config.get("NODE_ENV") === "production") {
      return { error: "Not available in production" };
    }
    await this.checkoutService.confirmPayment(razorpayOrderId, `dev_pay_${Date.now()}`);
    return { confirmed: true };
  }
}

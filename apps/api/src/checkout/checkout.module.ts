import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { CheckoutController } from "./checkout.controller.js";
import { CheckoutService } from "./checkout.service.js";
import { CartModule } from "../cart/cart.module.js";
import { RazorpayService } from "../payment/razorpay.service.js";
import { RedisModule } from "../redis/redis.module.js";

@Module({
  imports: [ScheduleModule.forRoot(), CartModule, RedisModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, RazorpayService],
  exports: [RazorpayService],
})
export class CheckoutModule {}

import { Module } from "@nestjs/common";
import { PayoutService } from "./payout.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";

@Module({
  providers: [PayoutService, RazorpayService],
  exports: [PayoutService],
})
export class PayoutModule {}

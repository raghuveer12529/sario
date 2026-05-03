import { Module } from "@nestjs/common";
import { ReturnsController } from "./returns.controller.js";
import { ReturnsService } from "./returns.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";

@Module({
  controllers: [ReturnsController],
  providers: [ReturnsService, RazorpayService],
})
export class ReturnsModule {}

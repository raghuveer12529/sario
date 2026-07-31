import { Module } from "@nestjs/common";
import { ReturnsController } from "./returns.controller.js";
import { ReturnsService } from "./returns.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";
import { VendorModule } from "../vendor/vendor.module.js";

@Module({
  imports: [VendorModule],
  controllers: [ReturnsController],
  providers: [ReturnsService, RazorpayService],
  exports: [ReturnsService],
})
export class ReturnsModule {}

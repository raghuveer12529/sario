import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller.js";
import { RazorpayService } from "../payment/razorpay.service.js";

@Module({
  controllers: [AdminController],
  providers: [RazorpayService],
})
export class AdminModule {}

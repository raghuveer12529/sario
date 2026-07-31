import { Module } from "@nestjs/common";
import { VendorController } from "./vendor.controller.js";
import { AdminVendorController } from "./admin-vendor.controller.js";
import { VendorService } from "./vendor.service.js";
import { PennyDropService } from "./penny-drop.service.js";
import { RazorpayService } from "../payment/razorpay.service.js";

@Module({
  controllers: [VendorController, AdminVendorController],
  providers: [VendorService, PennyDropService, RazorpayService],
  exports: [VendorService],
})
export class VendorModule {}

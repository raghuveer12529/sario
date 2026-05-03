import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller.js";
import { VendorOrderController } from "./vendor-order.controller.js";
import { OrderService } from "./order.service.js";
import { ShiprocketModule } from "../shiprocket/shiprocket.module.js";

@Module({
  imports: [ShiprocketModule],
  controllers: [OrderController, VendorOrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

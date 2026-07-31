import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller.js";
import { ReturnsModule } from "../returns/returns.module.js";

@Module({
  imports: [ReturnsModule],
  controllers: [AdminController],
})
export class AdminModule {}

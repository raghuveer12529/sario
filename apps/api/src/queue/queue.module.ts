import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QueueService } from "./queue.service.js";
import { NotificationProcessor } from "./notification.processor.js";
import { NotificationModule } from "../notification/notification.module.js";

@Module({
  imports: [ConfigModule, NotificationModule],
  providers: [QueueService, NotificationProcessor],
  exports: [QueueService],
})
export class QueueModule {}

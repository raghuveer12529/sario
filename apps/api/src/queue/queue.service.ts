import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import type { NotificationPayload } from "../notification/notification.types.js";

export type NotificationJob = NotificationPayload;

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  readonly notificationQueue: Queue<NotificationJob>;

  constructor(private readonly config: ConfigService) {
    const connection = {
      host: this.config.get<string>("REDIS_HOST", "localhost"),
      port: this.config.get<number>("REDIS_PORT", 6379),
      ...(this.config.get<string>("REDIS_PASSWORD")
        ? { password: this.config.get<string>("REDIS_PASSWORD") }
        : {}),
    };
    this.notificationQueue = new Queue<NotificationJob>("notifications", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      },
    });
  }

  async enqueueNotification(job: NotificationJob): Promise<void> {
    await this.notificationQueue.add(job.event, job);
    this.logger.debug(`Enqueued notification for event "${job.event}"`);
  }

  async onModuleDestroy() {
    await this.notificationQueue.close();
  }
}

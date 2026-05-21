import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker, Job } from "bullmq";
import { NotificationService } from "../notification/notification.service.js";
import type { NotificationJob } from "./queue.service.js";

@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private worker: Worker<NotificationJob> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {}

  async onModuleInit() {
    const connection = {
      host: this.config.get<string>("REDIS_HOST", "localhost"),
      port: this.config.get<number>("REDIS_PORT", 6379),
      ...(this.config.get<string>("REDIS_PASSWORD")
        ? { password: this.config.get<string>("REDIS_PASSWORD") }
        : {}),
    };

    this.worker = new Worker<NotificationJob>(
      "notifications",
      async (job: Job<NotificationJob>) => {
        await this.notifications.send(job.data);
      },
      { connection, concurrency: 5 },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Notification job ${job?.id} (event: ${job?.data?.event}) failed: ${err.message}`);
    });

    this.worker.on("error", (err) => {
      this.logger.error(`Notification worker error: ${err.message}`, err.stack);
    });

    this.worker.on("completed", (job) => {
      this.logger.debug(`Notification job ${job.id} (event: ${job.data.event}) completed`);
    });

    try {
      await this.worker.waitUntilReady();
      this.logger.log("Notification worker started");
    } catch (err) {
      this.logger.error(`Notification worker failed to connect to Redis: ${(err as Error).message}`);
      // Don't rethrow — allow app to boot even if Redis is temporarily unavailable
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}

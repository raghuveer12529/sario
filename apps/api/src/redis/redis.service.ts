import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(@Inject("REDIS_OPTIONS") options: { host: string; port: number; password?: string }) {
    super(options);
  }

  async onModuleDestroy() {
    await this.quit();
  }
}

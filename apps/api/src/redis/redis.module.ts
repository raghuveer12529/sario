import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "./redis.service.js";

@Global()
@Module({
  providers: [
    {
      provide: "REDIS_OPTIONS",
      useFactory: (config: ConfigService) => ({
        host: config.get("REDIS_HOST", "localhost"),
        port: config.get<number>("REDIS_PORT", 6379),
        password: config.get("REDIS_PASSWORD"),
      }),
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}

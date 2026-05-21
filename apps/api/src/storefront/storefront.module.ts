import { Module } from "@nestjs/common";
import { StorefrontController } from "./storefront.controller.js";
import { StorefrontService } from "./storefront.service.js";
import { CatalogModule } from "../catalog/catalog.module.js";
import { RedisModule } from "../redis/redis.module.js";

@Module({
  imports: [CatalogModule, RedisModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}

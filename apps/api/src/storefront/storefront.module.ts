import { Module } from "@nestjs/common";
import { StorefrontController } from "./storefront.controller.js";
import { StorefrontService } from "./storefront.service.js";
import { CatalogModule } from "../catalog/catalog.module.js";

@Module({
  imports: [CatalogModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}

import { Module } from "@nestjs/common";
import { ProductController } from "./product.controller.js";
import { ProductService } from "./product.service.js";
import { MeilisearchService } from "./meilisearch.service.js";

@Module({
  controllers: [ProductController],
  providers: [ProductService, MeilisearchService],
  exports: [ProductService, MeilisearchService],
})
export class CatalogModule {}

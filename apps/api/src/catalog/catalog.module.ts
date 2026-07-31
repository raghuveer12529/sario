import { Module } from "@nestjs/common";
import { ProductController } from "./product.controller.js";
import { ProductService } from "./product.service.js";
import { MeilisearchService } from "./meilisearch.service.js";
import { UploadModule } from "../upload/upload.module.js";
import { VendorModule } from "../vendor/vendor.module.js";
import { ProductImageController } from "./product-image.controller.js";

@Module({
  imports: [UploadModule, VendorModule],
  controllers: [ProductController, ProductImageController],
  providers: [ProductService, MeilisearchService],
  exports: [ProductService, MeilisearchService],
})
export class CatalogModule {}

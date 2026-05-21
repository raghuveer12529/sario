import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { StorefrontService } from "./storefront.service.js";

@ApiTags("Storefront")
@Controller({ path: "catalog", version: "1" })
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get("categories")
  @ApiOperation({ summary: "Get category tree" })
  getCategories() {
    return this.storefrontService.getCategories();
  }

  @Get("featured")
  @ApiOperation({ summary: "Get featured products for home page" })
  getFeatured(@Query("limit", new DefaultValuePipe(12), ParseIntPipe) limit: number) {
    return this.storefrontService.getFeaturedProducts(limit);
  }

  @Get("search")
  @ApiOperation({ summary: "Search products with facets" })
  @ApiQuery({ name: "q", required: false })
  @ApiQuery({ name: "categoryId", required: false })
  @ApiQuery({ name: "region", required: false })
  @ApiQuery({ name: "fabric", required: false })
  @ApiQuery({ name: "occasion", required: false })
  @ApiQuery({ name: "minPrice", required: false })
  @ApiQuery({ name: "maxPrice", required: false })
  @ApiQuery({ name: "sort", required: false, description: "e.g. minPricePaise:asc" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  search(
    @Query("q") q?: string,
    @Query("categoryId") categoryId?: string,
    @Query("region") region?: string,
    @Query("fabric") fabric?: string,
    @Query("occasion") occasion?: string,
    @Query("minPrice", new DefaultValuePipe(0), ParseIntPipe) minPrice = 0,
    @Query("maxPrice") maxPrice?: string,
    @Query("sort") sort?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.storefrontService.searchProducts({
      ...(q ? { q } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(region ? { region } : {}),
      ...(fabric ? { fabric } : {}),
      ...(occasion ? { occasion } : {}),
      ...(minPrice ? { minPrice } : {}),
      ...(maxPrice ? { maxPrice: parseInt(maxPrice) } : {}),
      ...(sort ? { sort } : {}),
      page,
      limit,
    });
  }

  @Get("products/:slug")
  @ApiOperation({ summary: "Get product detail by slug" })
  getProduct(@Param("slug") slug: string) {
    return this.storefrontService.getProductBySlug(slug);
  }
}

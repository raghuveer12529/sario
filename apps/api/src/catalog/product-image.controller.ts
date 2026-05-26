import {
  Controller, Post, Delete, Patch, Body, Param, UseGuards, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional, IsInt } from "class-validator";
import { PrismaService } from "../prisma/prisma.service.js";
import { UploadService } from "../upload/upload.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";
import { ProductService } from "./product.service.js";

class PresignDto {
  @IsString() filename!: string;
  @IsString() contentType!: string;
}

class SaveImageDto {
  @IsString() url!: string;
  @IsString() @IsOptional() altText?: string;
  @IsBoolean() @IsOptional() isPrimary?: boolean;
  @IsInt() @IsOptional() sortOrder?: number;
}

@ApiTags("Product Images (Vendor)")
@Controller({ path: "vendors/me/products/:productId/images", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductImageController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly upload: UploadService,
    private readonly products: ProductService,
  ) {}

  @Post("presign")
  @ApiOperation({ summary: "Get a presigned PUT URL for R2 image upload" })
  async presign(
    @CurrentUser() user: CurrentUserPayload,
    @Param("productId") productId: string,
    @Body() dto: PresignDto,
  ) {
    await this.products.getForVendor(user.id, productId);

    if (!this.upload.isAllowedType(dto.contentType)) {
      throw new BadRequestException("Only jpeg, png, and webp images are allowed.");
    }

    const dotIdx = dto.filename.lastIndexOf(".");
    const ext = dotIdx >= 0 ? dto.filename.slice(dotIdx + 1) : "jpg";
    const key = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { presignedUrl, publicUrl } = await this.upload.presign(key, dto.contentType);
    return { presignedUrl, publicUrl, key };
  }

  @Post()
  @ApiOperation({ summary: "Save a ProductImage record after upload" })
  async save(
    @CurrentUser() user: CurrentUserPayload,
    @Param("productId") productId: string,
    @Body() dto: SaveImageDto,
  ) {
    await this.products.getForVendor(user.id, productId);

    if (!dto.url.startsWith(this.upload.publicUrlBase + "/")) {
      throw new BadRequestException("Image URL must originate from the configured storage bucket.");
    }

    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        altText: dto.altText ?? null,
        isPrimary: dto.isPrimary ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Delete(":imageId")
  @ApiOperation({ summary: "Delete a product image record and R2 object" })
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param("productId") productId: string,
    @Param("imageId") imageId: string,
  ) {
    await this.products.getForVendor(user.id, productId);

    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) return { deleted: false };

    await this.upload.deleteObject(this.upload.keyFromUrl(image.url)).catch(() => null);
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }

  @Patch(":imageId/primary")
  @ApiOperation({ summary: "Set an image as primary" })
  async setPrimary(
    @CurrentUser() user: CurrentUserPayload,
    @Param("productId") productId: string,
    @Param("imageId") imageId: string,
  ) {
    await this.products.getForVendor(user.id, productId);

    await this.prisma.productImage.updateMany({
      where: { productId },
      data: { isPrimary: false },
    });
    return this.prisma.productImage.update({
      where: { id: imageId, productId },
      data: { isPrimary: true },
    });
  }
}

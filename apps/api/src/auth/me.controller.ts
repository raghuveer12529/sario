import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean, Matches, Length } from "class-validator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "./decorators/current-user.decorator.js";
import { PrismaService } from "../prisma/prisma.service.js";

class CreateAddressDto {
  @IsString() fullName: string;
  @IsString() @Matches(/^\d{10}$/, { message: "Phone must be 10 digits" }) phone: string;
  @IsString() line1: string;
  @IsString() @IsOptional() line2?: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() @Length(6, 6, { message: "Pincode must be 6 digits" }) pincode: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
}

@ApiTags("Me")
@Controller({ path: "me", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("addresses")
  @ApiOperation({ summary: "List saved delivery addresses" })
  async listAddresses(@CurrentUser() user: CurrentUserPayload) {
    return this.prisma.address.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  @Post("addresses")
  @ApiOperation({ summary: "Add a new delivery address" })
  async createAddress(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAddressDto,
  ) {
    // If this one is default, clear existing defaults first
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId: user.id, deletedAt: null },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId: user.id,
        fullName: dto.fullName,
        phone: dto.phone,
        line1: dto.line1,
        line2: dto.line2 ?? null,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  @Delete("addresses/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a saved delivery address" })
  async deleteAddress(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    const address = await this.prisma.address.findUnique({
      where: { id, deletedAt: null },
    });
    if (!address) throw new NotFoundException("Address not found.");
    if (address.userId !== user.id) throw new ForbiddenException();

    await this.prisma.address.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

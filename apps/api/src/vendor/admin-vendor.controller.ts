import { Controller, Get, Post, Query, Param, Body, UseGuards, Version } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { VendorStatus } from "@sario/db";
import { VendorService } from "./vendor.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";

class RejectVendorDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

@ApiTags("Admin — Vendors")
@Controller("admin/vendors")
@Version("1")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminVendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  @ApiOperation({ summary: "List vendors by status" })
  @ApiQuery({ name: "status", enum: VendorStatus, required: false })
  list(@Query("status") status?: VendorStatus) {
    return this.vendorService.listPending(status);
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Approve a pending vendor" })
  approve(@Param("id") id: string) {
    return this.vendorService.approve(id);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Reject a pending vendor" })
  reject(@Param("id") id: string, @Body() dto: RejectVendorDto) {
    return this.vendorService.reject(id, dto.reason);
  }

  @Post(":id/suspend")
  @ApiOperation({ summary: "Suspend an approved vendor" })
  suspend(@Param("id") id: string) {
    return this.vendorService.suspend(id);
  }
}

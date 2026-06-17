import { Controller, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, Min } from "class-validator";
import { ReturnsService } from "./returns.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { RolesGuard } from "../auth/guards/roles.guard.js";
import { Roles } from "../auth/decorators/roles.decorator.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

class ReturnRequestDto { @IsString() reason: string; }
class RejectReturnDto { @IsString() reason: string; }
class RefundDto {
  @IsInt() @Min(1) @IsOptional() amountPaise?: number;
}

@ApiTags("Returns")
@Controller({ version: "1" })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post("me/orders/:id/return")
  @ApiOperation({ summary: "Buyer requests return" })
  initiateReturn(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string, @Body() dto: ReturnRequestDto) {
    return this.returnsService.initiateReturn(user.id, id, dto.reason);
  }

  @Post("vendors/me/orders/:id/return/approve")
  @ApiOperation({ summary: "Vendor approves return" })
  approveReturn(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.returnsService.approveReturn(user.id, id);
  }

  @Post("vendors/me/orders/:id/return/reject")
  @ApiOperation({ summary: "Vendor rejects return" })
  rejectReturn(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string, @Body() dto: RejectReturnDto) {
    return this.returnsService.rejectReturn(user.id, id, dto.reason);
  }

  @Post("admin/orders/:id/refund")
  @Roles("SUPER_ADMIN", "SUPPORT")
  @ApiOperation({ summary: "Admin processes refund after QC pass" })
  processRefund(@Param("id") id: string, @Body() dto: RefundDto) {
    return this.returnsService.processRefund(id, dto.amountPaise);
  }
}

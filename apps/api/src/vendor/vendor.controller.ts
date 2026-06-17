import { Controller, Post, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { VendorService } from "./vendor.service.js";
import { ApplyVendorDto } from "./dto/apply-vendor.dto.js";
import { UpdateVendorDto } from "./dto/update-vendor.dto.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "../auth/decorators/current-user.decorator.js";

@ApiTags("Vendor")
@Controller({ path: "vendors", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post("apply")
  @ApiOperation({ summary: "Submit vendor application with KYC details" })
  apply(@CurrentUser() user: CurrentUserPayload, @Body() dto: ApplyVendorDto) {
    return this.vendorService.apply(user.id, dto);
  }

  @Get("me")
  @ApiOperation({ summary: "Get own vendor profile" })
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.vendorService.getMyVendor(user.id);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update own vendor profile" })
  updateMe(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateVendorDto) {
    // In prod, look up vendorId via user relationship; simplified here
    return this.vendorService.update(user.id, dto);
  }

  @Post("me/razorpay-link")
  @ApiOperation({ summary: "Create/link a Razorpay Route account for payouts" })
  linkRazorpay(@CurrentUser() user: CurrentUserPayload) {
    return this.vendorService.linkRazorpayAccount(user.id);
  }
}
